import uuid
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from bookings.models import Booking
from notifications.emails import send_booking_confirmed_email
from payments.models import Payment


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

        rate = Decimal(str(settings.PLATFORM_COMMISSION_RATE))
        commission = (booking.amount * rate).quantize(Decimal("0.01"))
        payment = Payment.objects.create(
            booking=booking,
            amount=booking.amount,
            commission_amount=commission,
            currency=booking.currency,
            status=Payment.Status.SUCCEEDED,
            provider="mock",
            external_id=f"mock_{uuid.uuid4().hex[:24]}",
            raw_payload={"mock": True},
        )
        booking.status = Booking.Status.CONFIRMED
        booking.meeting_url = booking.consultant.default_meeting_url or ""
        booking.save(update_fields=["status", "meeting_url", "updated_at"])
        send_booking_confirmed_email(booking)
        return Response(
            {
                "payment_id": payment.id,
                "booking_id": booking.id,
                "status": booking.status,
            },
            status=status.HTTP_200_OK,
        )


class MockWebhookView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response({"received": True, "detail": "Mock webhook stub."})
