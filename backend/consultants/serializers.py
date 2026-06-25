from rest_framework import serializers

from accounts.models import User
from catalog.models import Category
from core.services.mock_linkedin import default_social_links, normalize_social_links
from consultants.models import (
    ConsultantCommunityRating,
    ConsultantProfile,
    ConsultantService,
)


class ConsultantServicePublicSerializer(serializers.ModelSerializer):
    category = serializers.SlugRelatedField(read_only=True, slug_field="slug")
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = ConsultantService
        fields = (
            "id",
            "name",
            "description",
            "price_usd",
            "category",
            "category_name",
            "accepts_counteroffer",
        )


class ConsultantServiceSelfSerializer(serializers.ModelSerializer):
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source="category"
    )

    class Meta:
        model = ConsultantService
        fields = (
            "id",
            "name",
            "description",
            "price_usd",
            "category_id",
            "accepts_counteroffer",
            "requests_clarification",
            "publication_status",
            "ai_review",
        )
        read_only_fields = ("publication_status", "ai_review")


class RecentReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.SerializerMethodField()

    class Meta:
        model = ConsultantCommunityRating
        fields = ("id", "work_quality_score", "comment", "created_at", "reviewer_name")

    def get_reviewer_name(self, obj) -> str:
        # Use the reviewer's display name from their candidate profile if available.
        profile = getattr(obj.reviewer, "candidate_profile", None)
        return profile.display_name if profile else obj.reviewer.email


class ConsultantPublicSerializer(serializers.ModelSerializer):
    categories = serializers.SlugRelatedField(
        many=True, read_only=True, slug_field="slug"
    )
    services = ConsultantServicePublicSerializer(many=True, read_only=True)
    community_score_avg = serializers.SerializerMethodField()
    published_cv = serializers.SerializerMethodField()
    avg_rating = serializers.SerializerMethodField()
    total_ratings = serializers.SerializerMethodField()
    recent_reviews = serializers.SerializerMethodField()
    is_verified = serializers.SerializerMethodField()

    class Meta:
        model = ConsultantProfile
        fields = (
            "id",
            "display_name",
            "headline",
            "bio",
            "hourly_rate",
            "professional_title",
            "country",
            "city",
            "social_links",
            "categories",
            "services",
            "community_score_avg",
            "published_cv",
            "avg_rating",
            "total_ratings",
            "recent_reviews",
            "is_verified",
        )
        read_only_fields = fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["social_links"] = normalize_social_links(instance.social_links)
        return data

    def get_published_cv(self, obj) -> dict | None:
        if getattr(obj, "cv_publication_status", "draft") != "published":
            return None
        profile = obj.cv_profile or {}
        if not profile.get("education") and not profile.get("campaign_experience"):
            return None
        return {
            "education": profile.get("education") or [],
            "campaign_experience": profile.get("campaign_experience") or [],
        }

    def get_community_score_avg(self, obj) -> float | None:
        ratings = obj.community_ratings.all()
        if not ratings:
            return None
        return round(sum(r.work_quality_score for r in ratings) / len(ratings), 2)

    def get_avg_rating(self, obj) -> float | None:
        ratings = obj.community_ratings.all()
        if not ratings:
            return None
        return round(sum(r.work_quality_score for r in ratings) / len(ratings), 1)

    def get_total_ratings(self, obj) -> int:
        return obj.community_ratings.count()

    def get_recent_reviews(self, obj):
        recent = obj.community_ratings.select_related("reviewer__candidate_profile").order_by("-created_at")[:5]
        return RecentReviewSerializer(recent, many=True).data

    def get_is_verified(self, obj) -> bool:
        return obj.approval_status == ConsultantProfile.ApprovalStatus.APPROVED


class ConsultantSelfSerializer(serializers.ModelSerializer):
    category_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Category.objects.all(),
        required=False,
        write_only=True,
    )
    categories = serializers.SerializerMethodField(read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = ConsultantProfile
        fields = (
            "email",
            "display_name",
            "full_name",
            "identity_document",
            "phone",
            "city",
            "country",
            "professional_title",
            "academic_titles",
            "headline",
            "bio",
            "default_meeting_url",
            "social_links",
            "hourly_rate",
            "payout_account_number",
            "interest_countries",
            "interest_cities",
            "election_levels_interest",
            "cv_draft",
            "cv_profile",
            "cv_publication_status",
            "cv_snapshot_code",
            "cv_approved_by_user",
            "verification_score",
            "verification_flags",
            "needs_manual_review",
            "approval_status",
            "rejection_reason",
            "category_ids",
            "categories",
        )
        read_only_fields = (
            "approval_status",
            "rejection_reason",
            "verification_score",
            "verification_flags",
            "needs_manual_review",
            "cv_publication_status",
            "cv_snapshot_code",
        )

    def validate_social_links(self, value):
        return normalize_social_links(value)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["social_links"] = normalize_social_links(instance.social_links)
        return data

    def get_categories(self, obj) -> list[dict]:
        return [{"id": c.id, "name": c.name, "slug": c.slug} for c in obj.categories.all()]

    def update(self, instance, validated_data):
        category_ids = validated_data.pop("category_ids", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if category_ids is not None:
            instance.categories.set(category_ids)
        return instance


class ConsultantLinkedInImportSerializer(serializers.Serializer):
    linkedin_url = serializers.URLField(max_length=500)


class ConsultantLinkedInImportApplySerializer(serializers.Serializer):
    linkedin_url = serializers.URLField(max_length=500)
    apply = serializers.BooleanField(default=True)


class ConsultantStaffSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    categories = serializers.SlugRelatedField(
        many=True, read_only=True, slug_field="slug"
    )

    class Meta:
        model = ConsultantProfile
        fields = (
            "id",
            "email",
            "display_name",
            "full_name",
            "identity_document",
            "phone",
            "country",
            "city",
            "professional_title",
            "verification_score",
            "needs_manual_review",
            "approval_status",
            "rejection_reason",
            "categories",
            "created_at",
        )
        read_only_fields = ("id", "email", "created_at")


class ConsultantStaffCreateSerializer(serializers.ModelSerializer):
    """Used by staff to create a consultant profile (user is auto-created)."""

    email = serializers.EmailField(write_only=True)
    category_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Category.objects.all(),
        required=False,
        write_only=True,
    )

    class Meta:
        model = ConsultantProfile
        fields = (
            "email",
            "display_name",
            "full_name",
            "identity_document",
            "phone",
            "country",
            "city",
            "professional_title",
            "headline",
            "bio",
            "hourly_rate",
            "approval_status",
            "category_ids",
        )

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        email = validated_data.pop("email")
        category_ids = validated_data.pop("category_ids", [])
        user = User.objects.create_user(email=email, role=User.Role.CONSULTANT)
        profile = ConsultantProfile.objects.create(user=user, **validated_data)
        if category_ids:
            profile.categories.set(category_ids)
        return profile


class ConsultantStaffUpdateSerializer(serializers.ModelSerializer):
    category_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Category.objects.all(),
        required=False,
        write_only=True,
    )
    categories = serializers.SlugRelatedField(
        many=True, read_only=True, slug_field="slug"
    )

    class Meta:
        model = ConsultantProfile
        fields = (
            "id",
            "display_name",
            "full_name",
            "identity_document",
            "phone",
            "country",
            "city",
            "professional_title",
            "headline",
            "bio",
            "hourly_rate",
            "approval_status",
            "rejection_reason",
            "category_ids",
            "categories",
        )
        read_only_fields = ("id",)

    def update(self, instance, validated_data):
        category_ids = validated_data.pop("category_ids", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if category_ids is not None:
            instance.categories.set(category_ids)
        return instance


class CommunityRatingSerializer(serializers.ModelSerializer):
    booking_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = ConsultantCommunityRating
        fields = ("id", "work_quality_score", "comment", "created_at", "booking_id")
        read_only_fields = ("id", "created_at")
