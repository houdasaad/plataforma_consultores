from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status, views
from rest_framework.response import Response

from accounts.models import User
from bookings.models import AvailabilitySlot, Booking
from bookings.serializers import (
    AvailabilitySlotSerializer,
    AvailabilitySlotWriteSerializer,
    BookingCreateSerializer,
    BookingSerializer,
)
from consultants.models import ConsultantProfile, ConsultantService
from core.demo_access import user_has_demo_capability
from core.permissions import IsCandidate, IsConsultant
from diagnostics.models import DiagnosticSubmission


class ConsultantSlotListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsConsultant]

    def get_queryset(self):
        profile = ConsultantProfile.objects.get(user=self.request.user)
        qs = AvailabilitySlot.objects.filter(consultant=profile)
        from_param = self.request.query_params.get("from")
        to_param = self.request.query_params.get("to")
        if from_param and to_param:
            return qs.filter(start_at__gte=from_param, start_at__lt=to_param).order_by("start_at")
        return qs.filter(start_at__gte=timezone.now()).order_by("start_at")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AvailabilitySlotWriteSerializer
        return AvailabilitySlotSerializer

    def perform_create(self, serializer):
        profile = ConsultantProfile.objects.get(user=self.request.user)
        serializer.save(consultant=profile)


class ConsultantSlotDestroyView(generics.DestroyAPIView):
    permission_classes = [IsConsultant]

    def get_queryset(self):
        profile = ConsultantProfile.objects.get(user=self.request.user)
        return AvailabilitySlot.objects.filter(consultant=profile, is_booked=False)


class PublicSlotListView(generics.ListAPIView):
    serializer_class = AvailabilitySlotSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        consultant_id = self.request.query_params.get("consultant")
        if not consultant_id:
            return AvailabilitySlot.objects.none()
        get_object_or_404(
            ConsultantProfile,
            pk=consultant_id,
            approval_status=ConsultantProfile.ApprovalStatus.APPROVED,
        )
        return AvailabilitySlot.objects.filter(
            consultant_id=consultant_id,
            is_booked=False,
            start_at__gte=timezone.now(),
        ).order_by("start_at")


class BookingCreateView(views.APIView):
    permission_classes = [IsCandidate]

    @transaction.atomic
    def post(self, request):
        if not request.user.is_email_verified:
            return Response(
                {"detail": "Email must be verified."},
                status=status.HTTP_403_FORBIDDEN,
            )
        ser = BookingCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        slot = get_object_or_404(
            AvailabilitySlot.objects.select_for_update(),
            pk=ser.validated_data["slot_id"],
        )
        if slot.is_booked:
            return Response({"detail": "Slot unavailable."}, status=status.HTTP_409_CONFLICT)
        consultant = slot.consultant
        if consultant.approval_status != ConsultantProfile.ApprovalStatus.APPROVED:
            return Response({"detail": "Consultant not available."}, status=400)

        diag_id = ser.validated_data.get("diagnostic_submission_id")
        diag = None
        if diag_id:
            diag = DiagnosticSubmission.objects.filter(pk=diag_id, user=request.user).first()
            if not diag:
                return Response({"detail": "Invalid diagnostic submission."}, status=400)

        service = None
        service_id = ser.validated_data.get("consultant_service_id")
        if service_id:
            service = get_object_or_404(
                ConsultantService,
                pk=service_id,
                consultant=consultant,
                publication_status=ConsultantService.PublicationStatus.APPROVED,
            )
            amount = service.price_usd
        else:
            amount = consultant.hourly_rate or 100
        booking = Booking.objects.create(
            candidate=request.user,
            consultant=consultant,
            slot=slot,
            consultant_service=service,
            diagnostic_submission=diag,
            status=Booking.Status.PENDING_PAYMENT,
            amount=amount,
            currency="USD",
        )
        slot.is_booked = True
        slot.save(update_fields=["is_booked"])
        return Response(BookingSerializer(booking).data, status=status.HTTP_201_CREATED)


class BookingListView(generics.ListAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        u = self.request.user
        if u.is_staff or getattr(u, "role", None) == User.Role.ADMIN:
            return (
                Booking.objects.all()
                .select_related("candidate", "consultant", "slot")
                .order_by("-created_at")[:500]
            )
        if u.role == User.Role.CANDIDATE or user_has_demo_capability(u, "candidate"):
            return Booking.objects.filter(candidate=u).select_related("consultant", "slot")
        if u.role == User.Role.CONSULTANT or user_has_demo_capability(u, "consultant"):
            profile = ConsultantProfile.objects.filter(user=u).first()
            if not profile:
                return Booking.objects.none()
            return Booking.objects.filter(consultant=profile).select_related("candidate", "slot")
        return Booking.objects.none()
