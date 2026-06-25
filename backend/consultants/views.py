from django.conf import settings
from django.db.models import Prefetch
from django.http import HttpResponse
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, permissions, status, views
from rest_framework.response import Response

from core.permissions import IsCandidate, IsConsultant, IsStaffUser
from core.services import mock_ai
from core.services.cv_profile import (
    empty_cv_profile,
    generate_cv_snapshot_code,
    merge_cv_profile_from_draft,
)
from core.services.cv_upload import extract_text_from_cv_file
from core.services.mock_cv_documents import build_mock_docx_bytes, build_mock_pdf_bytes
from bookings.models import Booking
from consultants.models import (
    ConsultantCommunityRating,
    ConsultantProfile,
    ConsultantService,
)
from consultants.serializers import (
    CommunityRatingSerializer,
    ConsultantLinkedInImportSerializer,
    ConsultantPublicSerializer,
    ConsultantSelfSerializer,
    ConsultantServiceSelfSerializer,
    ConsultantStaffCreateSerializer,
    ConsultantStaffSerializer,
    ConsultantStaffUpdateSerializer,
)
from core.services.mock_linkedin import extract_profile_from_linkedin_url, normalize_social_links
from notifications.emails import send_consultant_status_email


def public_services_queryset():
    qs = ConsultantService.objects.select_related("category")
    if getattr(settings, "MVP_AUTO_PUBLISH_SERVICES", False):
        return qs.exclude(publication_status=ConsultantService.PublicationStatus.REJECTED)
    return qs.filter(publication_status=ConsultantService.PublicationStatus.APPROVED)


class ConsultantPublicListView(generics.ListAPIView):
    serializer_class = ConsultantPublicSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["categories__slug", "country", "city"]
    search_fields = ["display_name", "headline", "bio", "professional_title"]
    ordering_fields = ["display_name", "hourly_rate"]
    ordering = ["display_name"]

    def get_queryset(self):
        approved_services = public_services_queryset()
        return (
            ConsultantProfile.objects.filter(
                approval_status=ConsultantProfile.ApprovalStatus.APPROVED
            )
            .select_related("user")
            .prefetch_related(
                "categories",
                "community_ratings",
                Prefetch("services", queryset=approved_services),
            )
        )


class ConsultantPublicDetailView(generics.RetrieveAPIView):
    serializer_class = ConsultantPublicSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "pk"

    def get_queryset(self):
        approved_services = public_services_queryset()
        return ConsultantProfile.objects.filter(
            approval_status=ConsultantProfile.ApprovalStatus.APPROVED
        ).prefetch_related(
            "categories",
            "community_ratings",
            Prefetch("services", queryset=approved_services),
        )


class ConsultantMeView(generics.RetrieveUpdateAPIView):
    serializer_class = ConsultantSelfSerializer
    permission_classes = [IsConsultant]

    def get_object(self):
        return ConsultantProfile.objects.select_related("user").prefetch_related("categories").get(user=self.request.user)


class ConsultantLinkedInImportView(views.APIView):
    """Preview or apply mock LinkedIn profile import."""

    permission_classes = [IsConsultant]

    def post(self, request):
        ser = ConsultantLinkedInImportSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        linkedin_url = ser.validated_data["linkedin_url"]
        try:
            extracted = extract_profile_from_linkedin_url(linkedin_url)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        apply = str(request.data.get("apply", "true")).lower() in ("1", "true", "yes")
        profile_data = None
        if apply:
            profile = ConsultantProfile.objects.select_related("user").get(
                user=request.user
            )
            for field in (
                "display_name",
                "full_name",
                "professional_title",
                "headline",
                "bio",
                "city",
                "country",
                "phone",
            ):
                if extracted.get(field):
                    setattr(profile, field, extracted[field])
            if extracted.get("academic_titles"):
                profile.academic_titles = extracted["academic_titles"]
            links = normalize_social_links(profile.social_links)
            for key, val in (extracted.get("social_links") or {}).items():
                if val:
                    links[key] = val
            profile.social_links = links
            profile.save()
            profile_data = ConsultantSelfSerializer(profile).data

        return Response(
            {
                "extracted": extracted,
                "applied": apply,
                "profile": profile_data,
            }
        )


class ConsultantVerifyView(views.APIView):
    permission_classes = [IsConsultant]

    def post(self, request):
        profile = ConsultantProfile.objects.select_related("user").get(user=request.user)
        result = mock_ai.verify_consultant_profile(
            {
                "email": profile.user.email,
                "full_name": request.data.get("full_name") or profile.full_name,
                "identity_document": request.data.get("identity_document")
                or profile.identity_document,
                "country": request.data.get("country") or profile.country,
                "city": request.data.get("city") or profile.city,
                "academic_titles": request.data.get("academic_titles") or profile.academic_titles,
            }
        )
        profile.verification_score = result["score"]
        profile.verification_flags = result["flags"]
        profile.needs_manual_review = result["needs_manual_review"]
        if result["needs_manual_review"]:
            profile.approval_status = ConsultantProfile.ApprovalStatus.MANUAL_REVIEW
        profile.save(
            update_fields=[
                "verification_score",
                "verification_flags",
                "needs_manual_review",
                "approval_status",
            ]
        )
        return Response(result)


def _normalize_cv_profile(data: dict | None) -> dict:
    base = empty_cv_profile()
    if not data:
        return base
    for edu in data.get("education") or []:
        if isinstance(edu, dict):
            base["education"].append(
                {
                    "type": str(edu.get("type") or "")[:120],
                    "university": str(edu.get("university") or "")[:200],
                    "year_start": str(edu.get("year_start") or "")[:4],
                    "year_end": str(edu.get("year_end") or "")[:4],
                }
            )
    for exp in data.get("campaign_experience") or []:
        if isinstance(exp, dict):
            base["campaign_experience"].append(
                {
                    "campaign": str(exp.get("campaign") or "")[:200],
                    "service": str(exp.get("service") or "")[:200],
                    "year": str(exp.get("year") or "")[:4],
                    "contact_name": str(exp.get("contact_name") or "")[:120],
                    "contact_email": str(exp.get("contact_email") or "")[:254],
                    "contact_phone": str(exp.get("contact_phone") or "")[:40],
                }
            )
    return base


class ConsultantCvProfileView(views.APIView):
    permission_classes = [IsConsultant]

    def get(self, request):
        profile = ConsultantProfile.objects.get(user=request.user)
        cv_profile = profile.cv_profile or empty_cv_profile()
        if not cv_profile.get("education") and not cv_profile.get("campaign_experience"):
            cv_profile = merge_cv_profile_from_draft(profile.cv_draft)
        return Response(
            {
                "cv_profile": cv_profile,
                "cv_publication_status": profile.cv_publication_status,
                "cv_snapshot_code": profile.cv_snapshot_code,
            }
        )

    def patch(self, request):
        profile = ConsultantProfile.objects.get(user=request.user)
        profile.cv_profile = _normalize_cv_profile(request.data.get("cv_profile"))
        profile.save(update_fields=["cv_profile", "updated_at"])
        return Response({"cv_profile": profile.cv_profile})


class ConsultantCvSaveView(views.APIView):
    permission_classes = [IsConsultant]

    def post(self, request):
        profile = ConsultantProfile.objects.get(user=request.user)
        profile.cv_profile = _normalize_cv_profile(
            request.data.get("cv_profile") or profile.cv_profile
        )
        if not profile.cv_snapshot_code:
            profile.cv_snapshot_code = generate_cv_snapshot_code()
        profile.cv_publication_status = "draft"
        profile.cv_approved_by_user = True
        profile.save(
            update_fields=[
                "cv_profile",
                "cv_snapshot_code",
                "cv_publication_status",
                "cv_approved_by_user",
                "updated_at",
            ]
        )
        return Response(
            {
                "detail": "CV guardado (borrador).",
                "cv_profile": profile.cv_profile,
                "cv_snapshot_code": profile.cv_snapshot_code,
                "cv_publication_status": profile.cv_publication_status,
            }
        )


class ConsultantCvPublishView(views.APIView):
    permission_classes = [IsConsultant]

    def post(self, request):
        profile = ConsultantProfile.objects.get(user=request.user)
        profile.cv_profile = _normalize_cv_profile(
            request.data.get("cv_profile") or profile.cv_profile
        )
        if not profile.cv_profile.get("education") and not profile.cv_profile.get(
            "campaign_experience"
        ):
            return Response(
                {"detail": "Agregue al menos educación o experiencia en campañas."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not profile.cv_snapshot_code:
            profile.cv_snapshot_code = generate_cv_snapshot_code()
        profile.cv_publication_status = "published"
        profile.cv_approved_by_user = True
        profile.save(
            update_fields=[
                "cv_profile",
                "cv_snapshot_code",
                "cv_publication_status",
                "cv_approved_by_user",
                "updated_at",
            ]
        )
        return Response(
            {
                "detail": "CV publicado. Visible en el catálogo público.",
                "cv_profile": profile.cv_profile,
                "cv_snapshot_code": profile.cv_snapshot_code,
                "cv_publication_status": profile.cv_publication_status,
            }
        )


class ConsultantCvImportView(views.APIView):
    permission_classes = [IsConsultant]

    def post(self, request):
        profile = ConsultantProfile.objects.get(user=request.user)
        code = (request.data.get("code") or "").strip().upper()
        if code:
            if code != (profile.cv_snapshot_code or "").upper():
                return Response(
                    {"detail": "Código no válido para su perfil guardado."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        cv_profile = profile.cv_profile or empty_cv_profile()
        if not cv_profile.get("education") and not cv_profile.get("campaign_experience"):
            cv_profile = merge_cv_profile_from_draft(profile.cv_draft)
        if not cv_profile.get("education") and not cv_profile.get("campaign_experience"):
            return Response(
                {"detail": "No hay CV guardado. Guarde primero o use Extraer con IA."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {
                "cv_profile": cv_profile,
                "cv_snapshot_code": profile.cv_snapshot_code,
                "imported_from": "saved_snapshot",
            }
        )


class ConsultantCvExtractView(views.APIView):
    permission_classes = [IsConsultant]

    def post(self, request):
        use_ocr = str(request.data.get("use_ocr", "")).lower() in ("1", "true", "yes")
        upload = request.FILES.get("file")
        if upload:
            try:
                text, filename, method = extract_text_from_cv_file(upload, use_ocr=use_ocr)
            except ValueError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        else:
            text = (request.data.get("text") or "").strip()
            filename = request.data.get("filename") or "cv.txt"
            method = "ocr_mock" if use_ocr else "text"
            if not text:
                return Response(
                    {"detail": "Provide CV text or upload a file (PDF, Word, TXT)."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        extracted = mock_ai.extract_cv_from_text(text, filename, extraction_method=method)
        cv_profile = extracted.get("cv_profile") or merge_cv_profile_from_draft(extracted)
        profile = ConsultantProfile.objects.get(user=request.user)
        profile.cv_draft = extracted
        profile.save(update_fields=["cv_draft"])
        return Response(
            {
                "extracted": extracted,
                "cv_profile": cv_profile,
                "requires_user_approval": True,
                "source_filename": filename,
                "extraction_method": method,
                "raw_text_preview": text[:2000],
            }
        )


class ConsultantCvApproveView(views.APIView):
    permission_classes = [IsConsultant]

    def post(self, request):
        profile = ConsultantProfile.objects.get(user=request.user)
        draft = request.data.get("cv_draft") or profile.cv_draft
        if not draft and not request.data.get("cv_profile"):
            return Response({"detail": "No CV draft."}, status=400)
        if request.data.get("cv_profile"):
            profile.cv_profile = _normalize_cv_profile(request.data["cv_profile"])
        elif draft:
            profile.cv_draft = draft
            profile.cv_profile = merge_cv_profile_from_draft(draft)
        profile.cv_approved_by_user = True
        if draft and draft.get("headline") and not profile.headline:
            profile.headline = str(draft["headline"])[:255]
        if draft and draft.get("summary") and not profile.bio:
            profile.bio = str(draft["summary"])[:2000]
        profile.save(
            update_fields=["cv_draft", "cv_profile", "cv_approved_by_user", "headline", "bio"]
        )
        return Response(
            {
                "detail": "CV saved.",
                "cv_draft": profile.cv_draft,
                "cv_profile": profile.cv_profile,
            }
        )


class ConsultantCvMockWordView(views.APIView):
    permission_classes = [IsConsultant]

    def get(self, request):
        data = build_mock_docx_bytes()
        response = HttpResponse(
            data,
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        response["Content-Disposition"] = 'attachment; filename="cv-ejemplo-consultor.docx"'
        return response


class ConsultantCvMockPdfView(views.APIView):
    permission_classes = [IsConsultant]

    def get(self, request):
        data = build_mock_pdf_bytes()
        response = HttpResponse(data, content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="cv-ejemplo-consultor-ocr.pdf"'
        return response


class ConsultantServiceListCreateView(generics.ListCreateAPIView):
    serializer_class = ConsultantServiceSelfSerializer
    permission_classes = [IsConsultant]

    def get_queryset(self):
        return ConsultantService.objects.filter(
            consultant__user=self.request.user
        ).select_related("category")

    def perform_create(self, serializer):
        profile = ConsultantProfile.objects.get(user=self.request.user)
        status = (
            ConsultantService.PublicationStatus.APPROVED
            if getattr(settings, "MVP_AUTO_PUBLISH_SERVICES", False)
            else ConsultantService.PublicationStatus.DRAFT
        )
        serializer.save(consultant=profile, publication_status=status)


class ConsultantServiceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ConsultantServiceSelfSerializer
    permission_classes = [IsConsultant]

    def get_queryset(self):
        return ConsultantService.objects.filter(consultant__user=self.request.user)


class ConsultantServicePublishView(views.APIView):
    permission_classes = [IsConsultant]

    def post(self, request, pk):
        service = ConsultantService.objects.get(pk=pk, consultant__user=request.user)
        review = mock_ai.review_service_publication(service.name, service.description)
        service.ai_review = review
        if getattr(settings, "MVP_AUTO_PUBLISH_SERVICES", False) and not review.get("issues"):
            service.publication_status = ConsultantService.PublicationStatus.APPROVED
        elif review["approved"]:
            service.publication_status = ConsultantService.PublicationStatus.APPROVED
        elif review.get("issues"):
            service.publication_status = ConsultantService.PublicationStatus.REJECTED
        else:
            service.publication_status = ConsultantService.PublicationStatus.MANUAL_REVIEW
        service.save(update_fields=["ai_review", "publication_status"])
        return Response(
            {"publication_status": service.publication_status, "ai_review": review}
        )


class ConsultantPortalSummaryView(views.APIView):
    permission_classes = [IsConsultant]

    def get(self, request):
        from candidates.models import ServiceInquiry

        profile = ConsultantProfile.objects.prefetch_related(
            "availability_slots",
        ).get(user=request.user)
        return Response(
            {
                "profile_status": profile.approval_status,
                "verification_score": profile.verification_score,
                "payout_account_number": profile.payout_account_number,
                "services": ConsultantServiceSelfSerializer(
                    profile.services.all(), many=True
                ).data,
                "bookings": [
                    {
                        "id": b.id,
                        "status": b.status,
                        "amount": str(b.amount),
                        "currency": b.currency,
                    }
                    for b in profile.bookings.all()[:30]
                ],
                "open_slots": profile.availability_slots.filter(is_booked=False).count(),
                "open_service_inquiries": ServiceInquiry.objects.filter(
                    service__consultant=profile,
                    status=ServiceInquiry.Status.OPEN,
                ).count(),
            }
        )


class ConsultantCommunityRatingCreateView(generics.CreateAPIView):
    """Candidate leaves a star rating + comment after a completed consultation.

    Rules:
    - The candidate must have a CONFIRMED booking whose slot is in the past.
    - The review is tied to a specific booking (one review per booking).
    - The booking's payment must have service_verified_at set (service verified as provided).
    """

    serializer_class = CommunityRatingSerializer
    permission_classes = [IsCandidate]

    def perform_create(self, serializer):
        from django.utils import timezone
        from rest_framework.exceptions import PermissionDenied, ValidationError

        consultant_id = self.request.data.get("consultant_id")
        booking_id = serializer.validated_data.get("booking_id")

        if not booking_id:
            raise ValidationError({"booking_id": "Must provide the booking this review belongs to."})

        profile = ConsultantProfile.objects.get(pk=consultant_id)

        # Find the confirmed booking that belongs to this candidate/consultant pair
        booking = Booking.objects.filter(
            pk=booking_id,
            candidate=self.request.user,
            consultant=profile,
            status=Booking.Status.CONFIRMED,
        ).select_related("slot").first()

        if not booking:
            raise PermissionDenied(
                "Booking not found or does not belong to you with this consultant."
            )

        # The booking slot must be in the past (consultation already happened)
        if booking.slot is None or booking.slot.end_at > timezone.now():
            raise PermissionDenied(
                "You can only review a consultation after it has finished."
            )

        # The service must be verified as completed (payment service_verified_at set)
        verified = booking.payments.filter(service_verified_at__isnull=False).exists()
        if not verified:
            raise PermissionDenied(
                "You can only review a consultation whose service has been verified as completed by staff."
            )

        serializer.save(consultant=profile, reviewer=self.request.user, booking=booking)


class ConsultantPendingListView(generics.ListAPIView):
    serializer_class = ConsultantStaffSerializer
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        return ConsultantProfile.objects.filter(
            approval_status__in=[
                ConsultantProfile.ApprovalStatus.PENDING,
                ConsultantProfile.ApprovalStatus.MANUAL_REVIEW,
            ]
        ).select_related("user")


class ConsultantApproveView(views.APIView):
    permission_classes = [IsStaffUser]

    def post(self, request, pk):
        try:
            profile = ConsultantProfile.objects.select_related("user").get(pk=pk)
        except ConsultantProfile.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        profile.approval_status = ConsultantProfile.ApprovalStatus.APPROVED
        profile.rejection_reason = ""
        profile.status_changed_at = timezone.now()
        profile.save(update_fields=["approval_status", "rejection_reason", "status_changed_at"])
        ConsultantService.objects.filter(
            consultant=profile,
            publication_status__in=[
                ConsultantService.PublicationStatus.DRAFT,
                ConsultantService.PublicationStatus.MANUAL_REVIEW,
            ],
        ).update(publication_status=ConsultantService.PublicationStatus.APPROVED)
        send_consultant_status_email(profile.user, approved=True)
        return Response({"detail": "Approved."})


class ConsultantRejectView(views.APIView):
    permission_classes = [IsStaffUser]

    def post(self, request, pk):
        try:
            profile = ConsultantProfile.objects.select_related("user").get(pk=pk)
        except ConsultantProfile.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        reason = (request.data.get("reason") or "").strip()
        profile.approval_status = ConsultantProfile.ApprovalStatus.REJECTED
        profile.rejection_reason = reason
        profile.status_changed_at = timezone.now()
        profile.save(update_fields=["approval_status", "rejection_reason", "status_changed_at"])
        send_consultant_status_email(profile.user, approved=False, reason=reason)
        return Response({"detail": "Rejected."})


# ---------------------------------------------------------------------------
# Staff CRUD endpoints for consultant management
# ---------------------------------------------------------------------------


class ConsultantStaffListView(generics.ListAPIView):
    """Staff: list all consultants (paginated)."""

    serializer_class = ConsultantStaffSerializer
    permission_classes = [IsStaffUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["approval_status", "country", "city"]
    search_fields = ["display_name", "full_name", "user__email"]
    ordering_fields = ["display_name", "created_at", "updated_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return ConsultantProfile.objects.all().select_related("user").prefetch_related("categories")


class ConsultantStaffDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Staff: retrieve, update, or delete a single consultant."""

    queryset = ConsultantProfile.objects.all().select_related("user").prefetch_related("categories")
    permission_classes = [IsStaffUser]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return ConsultantStaffUpdateSerializer
        return ConsultantStaffSerializer


class ConsultantStaffCreateView(generics.CreateAPIView):
    """Staff: create a new consultant (user + profile at once)."""

    serializer_class = ConsultantStaffCreateSerializer
    permission_classes = [IsStaffUser]


class ConsultantStaffChangeStatusView(views.APIView):
    """Staff: change a consultant's approval status (verify / reject / pending)."""

    permission_classes = [IsStaffUser]

    def post(self, request, pk):
        try:
            profile = ConsultantProfile.objects.select_related("user").get(pk=pk)
        except ConsultantProfile.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        new_status = (request.data.get("approval_status") or "").strip()
        valid_statuses = [choice[0] for choice in ConsultantProfile.ApprovalStatus.choices]
        if new_status not in valid_statuses:
            return Response(
                {"detail": f"Invalid status. Valid: {', '.join(valid_statuses)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile.approval_status = new_status
        profile.rejection_reason = (request.data.get("rejection_reason") or "").strip()
        profile.status_changed_at = timezone.now()
        profile.save(update_fields=["approval_status", "rejection_reason", "status_changed_at"])

        if new_status == ConsultantProfile.ApprovalStatus.APPROVED:
            send_consultant_status_email(profile.user, approved=True)
        elif new_status == ConsultantProfile.ApprovalStatus.REJECTED:
            send_consultant_status_email(
                profile.user, approved=False, reason=profile.rejection_reason or "No reason provided"
            )

        return Response(ConsultantStaffSerializer(profile).data)
