from rest_framework import generics, permissions, status, views
from rest_framework.response import Response

from candidates.models import (
    CandidateProfile,
    FollowedService,
    MarketplaceBid,
    MarketplaceRequirement,
    ServiceInquiry,
)
from candidates.serializers import (
    CandidateSelfSerializer,
    MarketplaceBidSerializer,
    MarketplaceRequirementSerializer,
)
from core.permissions import IsCandidate
from core.services import mock_ai
from providers.models import Provider

from django.shortcuts import get_object_or_404


class CandidateMeView(generics.RetrieveUpdateAPIView):
    serializer_class = CandidateSelfSerializer
    permission_classes = [IsCandidate]

    def get_object(self):
        return CandidateProfile.objects.select_related("user").get(user=self.request.user)


class CandidateVerifyView(views.APIView):
    permission_classes = [IsCandidate]

    def post(self, request):
        profile = CandidateProfile.objects.select_related("user").get(user=request.user)
        result = mock_ai.verify_consultant_profile(
            {
                "email": profile.user.email,
                "full_name": request.data.get("display_name") or profile.display_name,
                "identity_document": request.data.get("phone") or profile.phone,
                "country": request.data.get("election_country") or profile.election_country,
                "city": request.data.get("election_district") or profile.election_district,
                "academic_titles": [],
            }
        )
        profile.verification_score = result["score"]
        profile.verification_flags = result["flags"]
        profile.needs_manual_review = result["needs_manual_review"]
        profile.save(
            update_fields=["verification_score", "verification_flags", "needs_manual_review"]
        )
        return Response(result)


class CandidatePortalSummaryView(views.APIView):
    permission_classes = [IsCandidate]

    def get(self, request):
        profile = CandidateProfile.objects.get(user=request.user)
        reqs = MarketplaceRequirement.objects.filter(candidate=request.user)
        bookings = request.user.candidate_bookings.all()[:30]
        followed = FollowedService.objects.filter(candidate=request.user).count()
        open_inquiries = ServiceInquiry.objects.filter(
            candidate=request.user, status=ServiceInquiry.Status.OPEN
        ).count()
        return Response(
            {
                "profile": CandidateSelfSerializer(profile).data,
                "requirements": MarketplaceRequirementSerializer(reqs[:20], many=True).data,
                "bookings": [
                    {"id": b.id, "status": b.status, "amount": str(b.amount)}
                    for b in bookings
                ],
                "offers_received": MarketplaceBid.objects.filter(
                    requirement__candidate=request.user
                ).count(),
                "followed_services_count": followed,
                "open_inquiries_count": open_inquiries,
            }
        )


class MarketplaceRequirementListCreateView(generics.ListCreateAPIView):
    """Candidate creates marketplace requirements (printing/digital-ads only)."""

    serializer_class = MarketplaceRequirementSerializer
    permission_classes = [IsCandidate]

    def get_queryset(self):
        return MarketplaceRequirement.objects.filter(
            candidate=self.request.user
        ).select_related("category").prefetch_related("bids__provider")

    def perform_create(self, serializer):
        serializer.save(
            candidate=self.request.user,
            status=MarketplaceRequirement.Status.DRAFT,
        )


class MarketplaceRequirementDetailView(generics.RetrieveAPIView):
    """Retrieve a single marketplace requirement with bids."""

    serializer_class = MarketplaceRequirementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return MarketplaceRequirement.objects.filter(
            status=MarketplaceRequirement.Status.PUBLISHED,
        ).select_related("category").prefetch_related("bids__provider")


class MarketplaceRequirementPublishView(views.APIView):
    permission_classes = [IsCandidate]

    def post(self, request, pk):
        req = MarketplaceRequirement.objects.select_related("category").get(
            pk=pk, candidate=request.user
        )
        review = mock_ai.review_marketplace_requirement(
            req.title, req.description, req.category.slug
        )
        req.ai_review = review
        if review["approved"]:
            req.ai_status = MarketplaceRequirement.AiStatus.APPROVED
            req.status = MarketplaceRequirement.Status.PUBLISHED
        else:
            req.ai_status = MarketplaceRequirement.AiStatus.NEEDS_EDIT
        req.save(update_fields=["ai_review", "ai_status", "status"])
        return Response({"status": req.status, "ai_status": req.ai_status, "ai_review": review})


class MarketplaceRequirementAssistView(views.APIView):
    permission_classes = [IsCandidate]

    def post(self, request):
        prompt = (request.data.get("prompt") or "").strip()
        return Response(mock_ai.assist_marketplace_draft(prompt))


class MarketplacePublicListView(generics.ListAPIView):
    """Published requirements visible to providers (printing/digital-ads only)."""

    serializer_class = MarketplaceRequirementSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = MarketplaceRequirement.objects.filter(
            status=MarketplaceRequirement.Status.PUBLISHED,
            ai_status=MarketplaceRequirement.AiStatus.APPROVED,
            category__slug__in=["printing", "digital-ads"],
        ).select_related("category").prefetch_related("bids__provider")

        # Optional: filter by provider's registered categories
        category_slug = self.request.query_params.get("category")
        if category_slug:
            qs = qs.filter(category__slug=category_slug)
        return qs


class MarketplaceBidCreateView(generics.CreateAPIView):
    """Provider creates a bid on a marketplace requirement."""

    serializer_class = MarketplaceBidSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        provider = get_object_or_404(
            Provider,
            user=self.request.user,
            approval_status=Provider.ApprovalStatus.APPROVED,
        )
        serializer.save(provider=provider)


class MarketplaceDashboardView(generics.ListAPIView):
    """Public dashboard: ALL requirements with ALL bids, for provider/staff oversight.

    Accessible to authenticated users with the 'provider' demo capability,
    universal demo users, or staff/admin users.
    """

    serializer_class = MarketplaceRequirementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            MarketplaceRequirement.objects
            .select_related("category", "candidate__candidate_profile")
            .prefetch_related("bids__provider")
            .order_by("-created_at")
        )


class MarketplaceBidAcceptView(views.APIView):
    """Candidate accepts a provider bid and creates a Booking."""

    permission_classes = [IsCandidate]

    def post(self, request, pk):
        from bookings.models import Booking
        from django.db import transaction

        with transaction.atomic():
            bid = get_object_or_404(
                MarketplaceBid.objects.select_for_update().select_related(
                    "requirement", "provider"
                ),
                pk=pk,
            )
            req = bid.requirement
            if req.candidate_id != request.user.id:
                return Response(
                    {"detail": "Not your requirement."}, status=status.HTTP_403_FORBIDDEN
                )
            if bid.status != MarketplaceBid.Status.PENDING:
                return Response(
                    {"detail": f"Bid is {bid.status}."}, status=status.HTTP_400_BAD_REQUEST
                )
            if req.status != MarketplaceRequirement.Status.PUBLISHED:
                return Response(
                    {"detail": "Requirement is not active."}, status=status.HTTP_400_BAD_REQUEST
                )

            bid.status = MarketplaceBid.Status.ACCEPTED
            bid.save(update_fields=["status"])

            # Reject all other bids for this requirement
            MarketplaceBid.objects.filter(
                requirement=req
            ).exclude(pk=bid.pk).update(status=MarketplaceBid.Status.REJECTED)

            # Close the requirement
            req.status = MarketplaceRequirement.Status.CLOSED
            req.save(update_fields=["status"])

            # Create a Booking linked to the provider (no consultant slot needed)
            booking = Booking.objects.create(
                candidate=request.user,
                provider=bid.provider,
                marketplace_bid=bid,
                status=Booking.Status.PENDING_PAYMENT,
                amount=bid.max_price_usd,
                currency="USD",
            )

            return Response(
                {
                    "bid_id": bid.id,
                    "booking_id": booking.id,
                    "amount": str(booking.amount),
                    "status": booking.status,
                },
                status=status.HTTP_200_OK,
            )
