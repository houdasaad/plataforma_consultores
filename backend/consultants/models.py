from django.conf import settings
from django.db import models

from catalog.models import Category


class ConsultantProfile(models.Model):
    class ApprovalStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="consultant_profile",
    )
    display_name = models.CharField(max_length=160)
    headline = models.CharField(max_length=255, blank=True)
    bio = models.TextField(blank=True)
    default_meeting_url = models.URLField(
        max_length=500,
        blank=True,
        help_text="Default video call link (Zoom, Meet, etc.)",
    )
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    approval_status = models.CharField(
        max_length=20,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING,
        db_index=True,
    )
    rejection_reason = models.TextField(blank=True)
    status_changed_at = models.DateTimeField(null=True, blank=True)
    categories = models.ManyToManyField(Category, related_name="consultants", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_name"]

    def __str__(self) -> str:
        return self.display_name
