"""Provider models — companies offering printing and digital-ads services."""

from django.conf import settings
from django.db import models

from catalog.models import Category


class Provider(models.Model):
    """Service provider company (distinct from individual consultants)."""

    class ApprovalStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="provider_profile",
        help_text="Optional link to a platform user account for provider portal access.",
    )
    name = models.CharField(max_length=200)
    identifier = models.CharField(max_length=80, unique=True, help_text="RUT or fiscal ID")
    contact_email = models.EmailField()
    phone = models.CharField(max_length=40, blank=True)
    website = models.URLField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    categories = models.ManyToManyField(Category, related_name="providers", blank=True)
    approval_status = models.CharField(
        max_length=20,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING,
        db_index=True,
    )
    rejection_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name

    @property
    def avg_rating(self) -> float | None:
        reviews = self.reviews.all()
        if not reviews:
            return None
        return round(sum(r.score for r in reviews) / len(reviews), 1)

    @property
    def total_reviews(self) -> int:
        return self.reviews.count()

    @property
    def is_verified(self) -> bool:
        return self.approval_status == self.ApprovalStatus.APPROVED

    def recent_reviews(self):
        """Return the 3 most recent reviews with reviewer info."""
        return self.reviews.select_related("reviewer__candidate_profile").order_by("-created_at")[:3]


class ProviderReview(models.Model):
    """Review left by a candidate for a provider after using their services."""

    provider = models.ForeignKey(
        Provider, on_delete=models.CASCADE, related_name="reviews"
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="provider_reviews",
    )
    score = models.PositiveSmallIntegerField(
        help_text="1-5 stars"
    )
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["provider", "reviewer"],
                name="unique_provider_reviewer",
            ),
        ]

    def __str__(self) -> str:
        return f"Review for {self.provider.name} by {self.reviewer.email} ({self.score}/5)"
