from rest_framework import serializers

from candidates.models import (
    CandidateClarificationReport,
    CandidateProfile,
    FollowedService,
    MarketplaceBid,
    MarketplaceRequirement,
    ServiceInquiry,
)
from catalog.models import Category


class CandidateSelfSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = CandidateProfile
        fields = (
            "email",
            "display_name",
            "phone",
            "notes",
            "election_country",
            "election_district",
            "election_date",
            "election_level",
            "interest_areas",
            "verification_score",
            "verification_flags",
            "needs_manual_review",
            "subscribed_category_slugs",
        )
        read_only_fields = ("verification_score", "verification_flags", "needs_manual_review")


class MarketplaceRequirementSerializer(serializers.ModelSerializer):
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.filter(slug__in=["printing", "digital-ads"]),
        source="category",
    )
    category_slug = serializers.SlugField(source="category.slug", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    candidate_name = serializers.SerializerMethodField()
    candidate_email = serializers.EmailField(source="candidate.email", read_only=True)
    bid_count = serializers.SerializerMethodField()
    bids = serializers.SerializerMethodField()

    class Meta:
        model = MarketplaceRequirement
        fields = (
            "id",
            "title",
            "description",
            "max_deadline_days",
            "max_budget_usd",
            "category_id",
            "category_slug",
            "category_name",
            "candidate_name",
            "candidate_email",
            "status",
            "ai_status",
            "ai_review",
            "bid_count",
            "bids",
            "created_at",
        )
        read_only_fields = ("status", "ai_status", "ai_review", "created_at")

    def get_candidate_name(self, obj) -> str:
        prof = getattr(obj.candidate, "candidate_profile", None)
        if prof:
            return prof.display_name
        return obj.candidate.email

    def get_bid_count(self, obj) -> int:
        return obj.bids.count()

    def get_bids(self, obj):
        return MarketplaceBidSerializer(obj.bids.all(), many=True).data


class MarketplaceBidSerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(source="provider.name", read_only=True)
    provider_id = serializers.IntegerField(source="provider.id", read_only=True)

    class Meta:
        model = MarketplaceBid
        fields = (
            "id",
            "requirement",
            "provider",
            "provider_id",
            "provider_name",
            "service_name",
            "description",
            "max_days",
            "max_price_usd",
            "status",
            "created_at",
        )
        read_only_fields = ("provider", "status", "created_at")


class FollowedServiceSerializer(serializers.ModelSerializer):
    service_id = serializers.IntegerField(source="service.id", read_only=True)
    service_name = serializers.CharField(source="service.name", read_only=True)
    service_description = serializers.CharField(source="service.description", read_only=True)
    price_usd = serializers.DecimalField(
        source="service.price_usd", max_digits=12, decimal_places=2, read_only=True
    )
    consultant_id = serializers.IntegerField(source="service.consultant_id", read_only=True)
    consultant_name = serializers.CharField(
        source="service.consultant.display_name", read_only=True
    )
    category_name = serializers.CharField(source="service.category.name", read_only=True)

    class Meta:
        model = FollowedService
        fields = (
            "id",
            "service_id",
            "service_name",
            "service_description",
            "price_usd",
            "consultant_id",
            "consultant_name",
            "category_name",
            "created_at",
        )
        read_only_fields = fields


class ServiceInquirySerializer(serializers.ModelSerializer):
    service_id = serializers.IntegerField(source="service.id", read_only=True)
    service_name = serializers.CharField(source="service.name", read_only=True)
    consultant_id = serializers.IntegerField(source="service.consultant_id", read_only=True)
    consultant_name = serializers.CharField(
        source="service.consultant.display_name", read_only=True
    )
    candidate_user_id = serializers.IntegerField(source="candidate.id", read_only=True)
    candidate_name = serializers.SerializerMethodField()
    candidate_email = serializers.EmailField(source="candidate.email", read_only=True)

    def get_candidate_name(self, obj) -> str:
        prof = getattr(obj.candidate, "candidate_profile", None)
        if prof:
            return prof.display_name
        return obj.candidate.email

    class Meta:
        model = ServiceInquiry
        fields = (
            "id",
            "service_id",
            "service_name",
            "consultant_id",
            "consultant_name",
            "candidate_user_id",
            "candidate_name",
            "candidate_email",
            "question",
            "consultant_reply",
            "status",
            "created_at",
            "answered_at",
        )
        read_only_fields = (
            "id",
            "service_id",
            "service_name",
            "consultant_id",
            "consultant_name",
            "candidate_user_id",
            "candidate_name",
            "candidate_email",
            "question",
            "consultant_reply",
            "status",
            "created_at",
            "answered_at",
        )


class ServiceInquiryCreateSerializer(serializers.Serializer):
    service_id = serializers.IntegerField()
    question = serializers.CharField(min_length=5, max_length=4000)


class ServiceInquiryReplySerializer(serializers.Serializer):
    reply = serializers.CharField(min_length=1, max_length=4000)


class CandidatePublicForConsultantSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    user_id = serializers.IntegerField(source="user.id", read_only=True)

    class Meta:
        model = CandidateProfile
        fields = (
            "user_id",
            "email",
            "display_name",
            "phone",
            "election_country",
            "election_district",
            "election_date",
            "election_level",
            "interest_areas",
            "verification_score",
        )
        read_only_fields = fields


class CandidateClarificationReportSerializer(serializers.ModelSerializer):
    candidate_name = serializers.SerializerMethodField()
    candidate_email = serializers.EmailField(source="candidate.email", read_only=True)

    def get_candidate_name(self, obj) -> str:
        prof = getattr(obj.candidate, "candidate_profile", None)
        if prof:
            return prof.display_name
        return obj.candidate.email
    consultant_name = serializers.CharField(source="consultant.display_name", read_only=True)

    class Meta:
        model = CandidateClarificationReport
        fields = (
            "id",
            "candidate",
            "candidate_name",
            "candidate_email",
            "consultant",
            "consultant_name",
            "message",
            "status",
            "created_at",
        )
        read_only_fields = (
            "id",
            "candidate",
            "candidate_name",
            "candidate_email",
            "consultant",
            "consultant_name",
            "status",
            "created_at",
        )


class CandidateClarificationReportCreateSerializer(serializers.Serializer):
    message = serializers.CharField(min_length=10, max_length=4000)
