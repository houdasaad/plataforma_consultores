"""Views for the Provider app."""

from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, permissions, status, views
from rest_framework.response import Response

from core.permissions import IsCandidate, IsStaffUser
from providers.models import Provider, ProviderReview
from providers.serializers import (
    ProviderPublicSerializer,
    ProviderReviewSerializer,
    ProviderStaffCreateSerializer,
    ProviderStaffSerializer,
    ProviderStaffUpdateSerializer,
)


# ---------------------------------------------------------------------------
# Public endpoints
# ---------------------------------------------------------------------------

class ProviderPublicListView(generics.ListAPIView):
    """Public: list all approved providers, filterable by category."""

    serializer_class = ProviderPublicSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["categories__slug"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        return Provider.objects.filter(
            approval_status=Provider.ApprovalStatus.APPROVED,
        ).prefetch_related("categories", "reviews__reviewer__candidate_profile")


class ProviderPublicDetailView(generics.RetrieveAPIView):
    """Public: retrieve a single approved provider."""

    serializer_class = ProviderPublicSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "pk"

    def get_queryset(self):
        return Provider.objects.filter(
            approval_status=Provider.ApprovalStatus.APPROVED,
        ).prefetch_related("categories", "reviews__reviewer__candidate_profile")


# ---------------------------------------------------------------------------
# Staff endpoints
# ---------------------------------------------------------------------------

class ProviderStaffListView(generics.ListAPIView):
    """Staff: list all providers (any status), with filters."""

    serializer_class = ProviderStaffSerializer
    permission_classes = [IsStaffUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["approval_status", "categories__slug"]
    search_fields = ["name", "identifier", "contact_email"]
    ordering_fields = ["name", "created_at", "updated_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return Provider.objects.all().prefetch_related(
            "categories", "reviews__reviewer__candidate_profile"
        )


class ProviderStaffCreateView(generics.CreateAPIView):
    """Staff: create a new provider."""

    serializer_class = ProviderStaffCreateSerializer
    permission_classes = [IsStaffUser]


class ProviderStaffDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Staff: retrieve, update, or delete a single provider."""

    queryset = Provider.objects.all().prefetch_related(
        "categories", "reviews__reviewer__candidate_profile"
    )
    permission_classes = [IsStaffUser]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return ProviderStaffUpdateSerializer
        return ProviderStaffSerializer


class ProviderStaffChangeStatusView(views.APIView):
    """Staff: change a provider's approval status."""

    permission_classes = [IsStaffUser]

    def post(self, request, pk):
        try:
            provider = Provider.objects.get(pk=pk)
        except Provider.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        new_status = (request.data.get("approval_status") or "").strip()
        valid_statuses = [choice[0] for choice in Provider.ApprovalStatus.choices]
        if new_status not in valid_statuses:
            return Response(
                {"detail": f"Invalid status. Valid: {', '.join(valid_statuses)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        provider.approval_status = new_status
        provider.rejection_reason = (request.data.get("rejection_reason") or "").strip()
        provider.updated_at = timezone.now()
        provider.save(update_fields=["approval_status", "rejection_reason", "updated_at"])

        return Response(ProviderStaffSerializer(provider).data)


# ---------------------------------------------------------------------------
# Review endpoints
# ---------------------------------------------------------------------------

class ProviderReviewCreateView(generics.CreateAPIView):
    """Candidate leaves a star rating + comment for a provider."""

    serializer_class = ProviderReviewSerializer
    permission_classes = [IsCandidate]

    def perform_create(self, serializer):
        provider_id = self.kwargs.get("pk")
        provider = Provider.objects.get(pk=provider_id)

        # Only allow reviewed approved providers.
        if provider.approval_status != Provider.ApprovalStatus.APPROVED:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("You can only review approved providers.")

        serializer.save(provider=provider, reviewer=self.request.user)


# ---------------------------------------------------------------------------
# Provider Portal endpoints (marketplace for providers)
# ---------------------------------------------------------------------------

class ProviderMeView(views.APIView):
    """Authenticated user gets their linked provider profile."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        provider = Provider.objects.filter(
            user=request.user,
            approval_status=Provider.ApprovalStatus.APPROVED,
        ).prefetch_related("categories").first()
        if not provider:
            return Response(
                {"detail": "No approved provider profile linked to your account."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(ProviderPublicSerializer(provider).data)


class ProviderMarketplaceRequirementListView(generics.ListAPIView):
    """Provider sees marketplace requirements matching their registered categories."""

    serializer_class = None  # set below to avoid circular import
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        from candidates.serializers import MarketplaceRequirementSerializer
        return MarketplaceRequirementSerializer

    def get_queryset(self):
        from candidates.models import MarketplaceRequirement

        provider = Provider.objects.filter(
            user=self.request.user,
            approval_status=Provider.ApprovalStatus.APPROVED,
        ).prefetch_related("categories").first()
        if not provider:
            return MarketplaceRequirement.objects.none()

        show_all = self.request.query_params.get("all", "").lower() in ("1", "true", "yes")

        if show_all:
            qs = MarketplaceRequirement.objects.filter(
                status=MarketplaceRequirement.Status.PUBLISHED,
                ai_status=MarketplaceRequirement.AiStatus.APPROVED,
            ).select_related("category").prefetch_related("bids__provider").order_by("-created_at")

            category_slug = self.request.query_params.get("category")
            if category_slug:
                qs = qs.filter(category__slug=category_slug)
            return qs

        provider_category_slugs = list(provider.categories.values_list("slug", flat=True))
        qs = MarketplaceRequirement.objects.filter(
            status=MarketplaceRequirement.Status.PUBLISHED,
            ai_status=MarketplaceRequirement.AiStatus.APPROVED,
            category__slug__in=provider_category_slugs,
        ).select_related("category").prefetch_related("bids__provider").order_by("-created_at")

        category_slug = self.request.query_params.get("category")
        if category_slug and category_slug in provider_category_slugs:
            qs = qs.filter(category__slug=category_slug)

        return qs


class ProviderMarketplaceBidListView(generics.ListAPIView):
    """Provider sees their own marketplace bids."""

    serializer_class = None
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        from candidates.serializers import MarketplaceBidSerializer
        return MarketplaceBidSerializer

    def get_queryset(self):
        from candidates.models import MarketplaceBid
        provider = Provider.objects.filter(
            user=self.request.user,
            approval_status=Provider.ApprovalStatus.APPROVED,
        ).first()
        if not provider:
            return MarketplaceBid.objects.none()
        return MarketplaceBid.objects.filter(provider=provider).select_related(
            "requirement__category"
        ).order_by("-created_at")


class ProviderMarketplaceBidCreateView(generics.CreateAPIView):
    """Provider creates a bid on a marketplace requirement."""

    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        from candidates.serializers import MarketplaceBidSerializer
        return MarketplaceBidSerializer

    def perform_create(self, serializer):
        provider = Provider.objects.filter(
            user=self.request.user,
            approval_status=Provider.ApprovalStatus.APPROVED,
        ).first()
        if not provider:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("No approved provider profile linked to your account.")
        serializer.save(provider=provider)
