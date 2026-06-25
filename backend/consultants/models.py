from django.conf import settings
from django.db import models

from catalog.models import Category


class ConsultantProfile(models.Model):
    class ApprovalStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        MANUAL_REVIEW = "manual_review", "Manual review"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="consultant_profile",
    )
    display_name = models.CharField(max_length=160)
    full_name = models.CharField(max_length=200, blank=True)
    identity_document = models.CharField(max_length=64, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    city = models.CharField(max_length=120, blank=True)
    country = models.CharField(max_length=80, blank=True)
    professional_title = models.CharField(max_length=200, blank=True)
    academic_titles = models.JSONField(default=list, blank=True)
    headline = models.CharField(max_length=255, blank=True)
    bio = models.TextField(blank=True)
    default_meeting_url = models.URLField(
        max_length=500,
        blank=True,
        help_text="Default video call link (Zoom, Meet, etc.)",
    )
    social_links = models.JSONField(
        default=dict,
        blank=True,
        help_text="URLs: linkedin, twitter, instagram, facebook, youtube, website.",
    )
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    payout_account_number = models.CharField(
        max_length=80,
        blank=True,
        help_text="Bank account or wallet ID to receive payouts (USD).",
    )
    cv_draft = models.JSONField(default=dict, blank=True)
    cv_profile = models.JSONField(
        default=dict,
        blank=True,
        help_text="Structured CV: education[] and campaign_experience[].",
    )
    cv_publication_status = models.CharField(
        max_length=20,
        choices=[
            ("draft", "Draft"),
            ("published", "Published"),
        ],
        default="draft",
        db_index=True,
    )
    cv_snapshot_code = models.CharField(
        max_length=32,
        blank=True,
        help_text="Code to reload saved CV profile into the form.",
    )
    cv_approved_by_user = models.BooleanField(default=False)
    interest_countries = models.JSONField(default=list, blank=True)
    interest_cities = models.JSONField(default=list, blank=True)
    election_levels_interest = models.JSONField(default=list, blank=True)
    verification_score = models.FloatField(null=True, blank=True)
    verification_flags = models.JSONField(default=list, blank=True)
    needs_manual_review = models.BooleanField(default=False)
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


class ConsultantService(models.Model):
    class PublicationStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        PENDING_AI = "pending_ai", "Pending AI review"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        MANUAL_REVIEW = "manual_review", "Manual review"

    consultant = models.ForeignKey(
        ConsultantProfile, on_delete=models.CASCADE, related_name="services"
    )
    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, related_name="consultant_services"
    )
    name = models.CharField(max_length=200)
    description = models.TextField()
    price_usd = models.DecimalField(max_digits=12, decimal_places=2)
    accepts_counteroffer = models.BooleanField(default=True)
    requests_clarification = models.BooleanField(
        default=False,
        help_text="If true, clarification requests are emailed to the candidate.",
    )
    publication_status = models.CharField(
        max_length=20,
        choices=PublicationStatus.choices,
        default=PublicationStatus.DRAFT,
        db_index=True,
    )
    ai_review = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} ({self.consultant_id})"


class ConsultantCommunityRating(models.Model):
    """Candidate review left after a completed 1-hour consultation.
    Each confirmed booking can be reviewed at most once."""

    consultant = models.ForeignKey(
        ConsultantProfile, on_delete=models.CASCADE, related_name="community_ratings"
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="consultant_ratings_given",
    )
    booking = models.ForeignKey(
        "bookings.Booking",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="community_ratings",
    )
    work_quality_score = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["reviewer", "booking"],
                name="unique_reviewer_booking_rating",
                condition=models.Q(booking__isnull=False),
            ),
        ]
