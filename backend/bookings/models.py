from django.conf import settings
from django.db import models

from consultants.models import ConsultantProfile


class AvailabilitySlot(models.Model):
    consultant = models.ForeignKey(
        ConsultantProfile, on_delete=models.CASCADE, related_name="availability_slots"
    )
    start_at = models.DateTimeField(db_index=True)
    end_at = models.DateTimeField(db_index=True)
    is_booked = models.BooleanField(default=False)

    class Meta:
        ordering = ["start_at"]
        indexes = [
            models.Index(fields=["consultant", "start_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.consultant_id} {self.start_at}"


class Booking(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PENDING_PAYMENT = "pending_payment", "Pending payment"
        CONFIRMED = "confirmed", "Confirmed"
        CANCELLED = "cancelled", "Cancelled"

    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="candidate_bookings",
    )
    consultant = models.ForeignKey(
        ConsultantProfile, on_delete=models.CASCADE, related_name="bookings"
    )
    slot = models.OneToOneField(
        AvailabilitySlot,
        on_delete=models.PROTECT,
        related_name="booking",
    )
    diagnostic_submission = models.ForeignKey(
        "diagnostics.DiagnosticSubmission",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="bookings",
    )
    status = models.CharField(
        max_length=30, choices=Status.choices, default=Status.DRAFT, db_index=True
    )
    meeting_url = models.URLField(max_length=500, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default="USD")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Booking {self.pk} ({self.status})"
