from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, permissions, status, views
from rest_framework.response import Response

from consultants.models import ConsultantProfile
from consultants.serializers import (
    ConsultantPublicSerializer,
    ConsultantSelfSerializer,
    ConsultantStaffSerializer,
)
from core.permissions import IsConsultant, IsStaffUser
from notifications.emails import send_consultant_status_email


class ConsultantPublicListView(generics.ListAPIView):
    serializer_class = ConsultantPublicSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["categories__slug"]
    search_fields = ["display_name", "headline", "bio"]
    ordering_fields = ["display_name", "hourly_rate"]
    ordering = ["display_name"]

    def get_queryset(self):
        return (
            ConsultantProfile.objects.filter(
                approval_status=ConsultantProfile.ApprovalStatus.APPROVED
            )
            .select_related("user")
            .prefetch_related("categories")
        )


class ConsultantPublicDetailView(generics.RetrieveAPIView):
    serializer_class = ConsultantPublicSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "pk"

    def get_queryset(self):
        return ConsultantProfile.objects.filter(
            approval_status=ConsultantProfile.ApprovalStatus.APPROVED
        ).prefetch_related("categories")


class ConsultantMeView(generics.RetrieveUpdateAPIView):
    serializer_class = ConsultantSelfSerializer
    permission_classes = [IsConsultant]

    def get_object(self):
        return ConsultantProfile.objects.get(user=self.request.user)


class ConsultantPendingListView(generics.ListAPIView):
    serializer_class = ConsultantStaffSerializer
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        return ConsultantProfile.objects.filter(
            approval_status=ConsultantProfile.ApprovalStatus.PENDING
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
