"""Serializers for the Provider app."""

from rest_framework import serializers

from catalog.models import Category
from providers.models import Provider, ProviderReview

# Provider category slugs (only printing and digital-ads)
PROVIDER_CATEGORY_SLUGS = ["printing", "digital-ads"]


def provider_category_queryset():
    return Category.objects.filter(slug__in=PROVIDER_CATEGORY_SLUGS)


class ProviderReviewSerializer(serializers.ModelSerializer):
    """Public review serializer — includes reviewer display name."""

    reviewer_name = serializers.SerializerMethodField()
    score = serializers.IntegerField(min_value=1, max_value=5)

    class Meta:
        model = ProviderReview
        fields = ("id", "score", "comment", "created_at", "reviewer_name")
        read_only_fields = ("id", "created_at", "reviewer_name")

    def get_reviewer_name(self, obj) -> str:
        profile = getattr(obj.reviewer, "candidate_profile", None)
        return profile.display_name if profile else obj.reviewer.email


class ProviderPublicSerializer(serializers.ModelSerializer):
    """Public-facing provider data with ratings and recent reviews."""

    categories = serializers.SlugRelatedField(
        many=True, read_only=True, slug_field="slug"
    )
    avg_rating = serializers.SerializerMethodField()
    total_reviews = serializers.SerializerMethodField()
    recent_reviews = serializers.SerializerMethodField()
    is_verified = serializers.SerializerMethodField()

    class Meta:
        model = Provider
        fields = (
            "id",
            "name",
            "identifier",
            "description",
            "categories",
            "approval_status",
            "website",
            "phone",
            "contact_email",
            "avg_rating",
            "total_reviews",
            "recent_reviews",
            "is_verified",
            "created_at",
        )
        read_only_fields = fields

    def get_avg_rating(self, obj) -> float | None:
        return obj.avg_rating

    def get_total_reviews(self, obj) -> int:
        return obj.total_reviews

    def get_recent_reviews(self, obj):
        recent = obj.recent_reviews()
        return ProviderReviewSerializer(recent, many=True).data

    def get_is_verified(self, obj) -> bool:
        return obj.is_verified


class ProviderStaffSerializer(serializers.ModelSerializer):
    """Full provider data for staff management (read)."""

    categories = serializers.SlugRelatedField(
        many=True, read_only=True, slug_field="slug"
    )
    avg_rating = serializers.SerializerMethodField()
    total_reviews = serializers.SerializerMethodField()
    is_verified = serializers.SerializerMethodField()

    class Meta:
        model = Provider
        fields = (
            "id",
            "name",
            "identifier",
            "contact_email",
            "phone",
            "website",
            "description",
            "categories",
            "approval_status",
            "rejection_reason",
            "avg_rating",
            "total_reviews",
            "is_verified",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def get_avg_rating(self, obj) -> float | None:
        return obj.avg_rating

    def get_total_reviews(self, obj) -> int:
        return obj.total_reviews

    def get_is_verified(self, obj) -> bool:
        return obj.is_verified


class ProviderStaffCreateSerializer(serializers.ModelSerializer):
    """Used by staff to create a new provider."""

    category_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=provider_category_queryset(),
        required=False,
        write_only=True,
    )

    class Meta:
        model = Provider
        fields = (
            "name",
            "identifier",
            "contact_email",
            "phone",
            "website",
            "description",
            "category_ids",
            "approval_status",
        )

    def validate_identifier(self, value):
        if Provider.objects.filter(identifier=value).exists():
            raise serializers.ValidationError("A provider with this identifier already exists.")
        return value

    def create(self, validated_data):
        category_ids = validated_data.pop("category_ids", [])
        provider = Provider.objects.create(**validated_data)
        if category_ids:
            provider.categories.set(category_ids)
        return provider


class ProviderStaffUpdateSerializer(serializers.ModelSerializer):
    """Used by staff to update an existing provider."""

    category_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=provider_category_queryset(),
        required=False,
        write_only=True,
    )
    categories = serializers.SlugRelatedField(
        many=True, read_only=True, slug_field="slug"
    )

    class Meta:
        model = Provider
        fields = (
            "id",
            "name",
            "identifier",
            "contact_email",
            "phone",
            "website",
            "description",
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
