import uuid
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from bookings.models import Booking
from core.permissions import IsStaffUser
from core.services import mock_mercadopago
from notifications.emails import send_booking_confirmed_email
from payments.models import Payment


def _confirm_booking_payment(booking: Booking, provider: str, external_id: str, raw: dict) -> Payment:
    rate = Decimal(str(settings.PLATFORM_COMMISSION_RATE))
    commission = (booking.amount * rate).quantize(Decimal("0.01"))
    payment = Payment.objects.create(
        booking=booking,
        amount=booking.amount,
        commission_amount=commission,
        currency=booking.currency or "USD",
        status=Payment.Status.SUCCEEDED,
        provider=provider,
        external_id=external_id,
        raw_payload=raw,
        paid_at=timezone.now(),
    )
    booking.status = Booking.Status.CONFIRMED
    booking.meeting_url = booking.consultant.default_meeting_url or ""
    booking.save(update_fields=["status", "meeting_url", "updated_at"])
    send_booking_confirmed_email(booking)
    return payment


class MockCheckoutView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "payments"

    @transaction.atomic
    def post(self, request):
        booking_id = request.data.get("booking_id")
        if not booking_id:
            return Response({"detail": "booking_id required."}, status=status.HTTP_400_BAD_REQUEST)
        booking = get_object_or_404(
            Booking.objects.select_for_update().select_related("consultant", "candidate"),
            pk=booking_id,
        )
        if booking.candidate_id != request.user.id:
            return Response(status=status.HTTP_403_FORBIDDEN)
        if booking.status != Booking.Status.PENDING_PAYMENT:
            return Response(
                {"detail": "Booking is not awaiting payment."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing = (
            Payment.objects.filter(booking=booking, status=Payment.Status.SUCCEEDED)
            .order_by("-id")
            .first()
        )
        if existing:
            return Response(
                {
                    "detail": "Already paid.",
                    "payment_id": existing.id,
                    "booking_status": booking.status,
                }
            )

        payment = _confirm_booking_payment(
            booking,
            provider="mock",
            external_id=f"mock_{uuid.uuid4().hex[:24]}",
            raw={"mock": True},
        )
        return Response(
            {
                "payment_id": payment.id,
                "booking_id": booking.id,
                "status": booking.status,
                "provider": "mock",
            },
            status=status.HTTP_200_OK,
        )


class MercadoPagoPreferenceView(APIView):
    """Create mock Mercado Pago checkout preference (redirect flow)."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "payments"

    def post(self, request):
        booking_id = request.data.get("booking_id")
        booking = get_object_or_404(
            Booking.objects.select_related("candidate", "consultant"),
            pk=booking_id,
        )
        if booking.candidate_id != request.user.id:
            return Response(status=status.HTTP_403_FORBIDDEN)
        if booking.status != Booking.Status.PENDING_PAYMENT:
            return Response({"detail": "Booking is not awaiting payment."}, status=400)
        pref = mock_mercadopago.create_preference(
            booking_id=booking.id,
            amount=float(booking.amount),
            currency=booking.currency or "USD",
            payer_email=booking.candidate.email,
            title=f"Consultoría — {booking.consultant.display_name}",
        )
        return Response(pref)


class MercadoPagoConfirmView(APIView):
    """Simulate return from Mercado Pago and confirm booking."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "payments"

    @transaction.atomic
    def post(self, request):
        booking_id = request.data.get("booking_id")
        preference_id = request.data.get("preference_id", "")
        booking = get_object_or_404(
            Booking.objects.select_for_update().select_related("consultant", "candidate"),
            pk=booking_id,
        )
        if booking.candidate_id != request.user.id:
            return Response(status=status.HTTP_403_FORBIDDEN)
        result = mock_mercadopago.confirm_mock_payment(preference_id, booking.id)
        payment = _confirm_booking_payment(
            booking,
            provider="mercadopago_mock",
            external_id=result["payment_id"],
            raw=result,
        )
        return Response(
            {
                "payment_id": payment.id,
                "booking_id": booking.id,
                "status": booking.status,
                "mercadopago": result,
            }
        )


class MockWebhookView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response({"received": True, "detail": "Mock webhook stub."})


class MercadoPagoWebhookView(APIView):
    permission_classes = []  # public stub for MP IPN simulation

    def post(self, request):
        return Response(
            {
                "received": True,
                "detail": "Mercado Pago webhook stub (mock).",
                "example_payload": request.data,
            }
        )


class StaffPaymentSummaryView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        from django.db.models import Sum

        succeeded = Payment.objects.filter(status=Payment.Status.SUCCEEDED)
        total_amount = succeeded.aggregate(Sum("amount"))["amount__sum"] or 0
        total_commission = succeeded.aggregate(Sum("commission_amount"))["commission_amount__sum"] or 0
        count = succeeded.count()

        return Response(
            {
                "payments_count": count,
                "total_amount": str(total_amount),
                "total_commission": str(total_commission),
                "currency": "USD",
            }
        )


# ---------------------------------------------------------------------------
# Payment history endpoints — per-role
# ---------------------------------------------------------------------------

from payments.serializers import PaymentSerializer, StaffPaymentSerializer
from core.permissions import IsCandidate, IsConsultant, IsStaffUser
from providers.models import Provider


class CandidatePaymentListView(generics.ListAPIView):
    """Payments made by the authenticated candidate (linked to their bookings)."""

    serializer_class = PaymentSerializer
    permission_classes = [IsCandidate]

    def get_queryset(self):
        return (
            Payment.objects
            .filter(booking__candidate=self.request.user)
            .select_related(
                "booking__consultant",
                "booking__provider",
                "booking__candidate",
            )
            .order_by("-created_at")
        )


class ConsultantPaymentListView(generics.ListAPIView):
    """Payments received by the authenticated consultant."""

    serializer_class = PaymentSerializer
    permission_classes = [IsConsultant]

    def get_queryset(self):
        from consultants.models import ConsultantProfile
        profile = ConsultantProfile.objects.filter(user=self.request.user).first()
        if not profile:
            return Payment.objects.none()
        return (
            Payment.objects
            .filter(booking__consultant=profile)
            .select_related(
                "booking__consultant",
                "booking__provider",
                "booking__candidate",
            )
            .order_by("-created_at")
        )


class ProviderPaymentListView(generics.ListAPIView):
    """Payments received by the authenticated provider."""

    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        provider = Provider.objects.filter(
            user=self.request.user,
            approval_status=Provider.ApprovalStatus.APPROVED,
        ).first()
        if not provider:
            return Payment.objects.none()
        return (
            Payment.objects
            .filter(booking__provider=provider)
            .select_related(
                "booking__consultant",
                "booking__provider",
                "booking__candidate",
            )
            .order_by("-created_at")
        )


class StaffPaymentListView(generics.ListAPIView):
    """Staff: list all payments with full detail."""

    serializer_class = StaffPaymentSerializer
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        return (
            Payment.objects
            .select_related(
                "booking__consultant",
                "booking__provider",
                "booking__candidate",
            )
            .order_by("-created_at")
        )
