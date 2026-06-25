from django.conf import settings
from django.db import models

from catalog.models import Category


class CandidateProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="candidate_profile",
    )
    display_name = models.CharField(max_length=160)
    phone = models.CharField(max_length=40, blank=True)
    notes = models.TextField(blank=True)
    election_country = models.CharField(max_length=80, blank=True)
    election_district = models.CharField(max_length=120, blank=True)
    election_date = models.DateField(null=True, blank=True)
    election_level = models.CharField(
        max_length=40,
        blank=True,
        help_text="national, regional, local, etc.",
    )
    interest_areas = models.TextField(blank=True)
    verification_score = models.FloatField(null=True, blank=True)
    verification_flags = models.JSONField(default=list, blank=True)
    needs_manual_review = models.BooleanField(default=False)
    subscribed_category_slugs = models.JSONField(
        default=list,
        blank=True,
        help_text="Categories for marketplace offer email alerts.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_name"]

    def __str__(self) -> str:
        return self.display_name


class MarketplaceRequirement(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        CLOSED = "closed", "Closed"

    class AiStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        NEEDS_EDIT = "needs_edit", "Needs edit"
        MANUAL_REVIEW = "manual_review", "Manual review"

    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="marketplace_requirements",
    )
    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, related_name="marketplace_requirements"
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    max_deadline_days = models.PositiveIntegerField(default=30)
    max_budget_usd = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True
    )
    ai_status = models.CharField(
        max_length=20, choices=AiStatus.choices, default=AiStatus.PENDING, db_index=True
    )
    ai_review = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title


class MarketplaceBid(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"

    requirement = models.ForeignKey(
        MarketplaceRequirement, on_delete=models.CASCADE, related_name="bids"
    )
    provider = models.ForeignKey(
        "providers.Provider",
        on_delete=models.CASCADE,
        related_name="marketplace_bids",
    )
    service_name = models.CharField(max_length=200)
    description = models.TextField()
    max_days = models.PositiveIntegerField()
    max_price_usd = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.service_name} → req {self.requirement_id}"


class FollowedService(models.Model):
    """Candidate bookmarks a consultant service for quick access."""

    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="followed_services",
    )
    service = models.ForeignKey(
        "consultants.ConsultantService",
        on_delete=models.CASCADE,
        related_name="followers",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["candidate", "service"],
                name="unique_candidate_followed_service",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.candidate_id} → service {self.service_id}"


class ServiceInquiry(models.Model):
    """Additional questions from a candidate about a specific service."""

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        ANSWERED = "answered", "Answered"

    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="service_inquiries",
    )
    service = models.ForeignKey(
        "consultants.ConsultantService",
        on_delete=models.CASCADE,
        related_name="inquiries",
    )
    question = models.TextField()
    consultant_reply = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    answered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Inquiry {self.pk} ({self.status})"


class CandidateClarificationReport(models.Model):
    """Consultant flags imprecise info on a candidate profile; sent to site admin."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        REVIEWED = "reviewed", "Reviewed"

    consultant = models.ForeignKey(
        "consultants.ConsultantProfile",
        on_delete=models.CASCADE,
        related_name="clarification_reports",
    )
    candidate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="clarification_reports_received",
    )
    message = models.TextField(
        help_text="Comment for the site administrator requesting candidate clarifications.",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Report {self.pk} candidate={self.candidate_id}"
