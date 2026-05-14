from rest_framework import serializers

from catalog.models import Category
from consultants.models import ConsultantProfile


class ConsultantPublicSerializer(serializers.ModelSerializer):
    categories = serializers.SlugRelatedField(
        many=True, read_only=True, slug_field="slug"
    )

    class Meta:
        model = ConsultantProfile
        fields = (
            "id",
            "display_name",
            "headline",
            "bio",
            "hourly_rate",
            "categories",
        )
        read_only_fields = fields


class ConsultantSelfSerializer(serializers.ModelSerializer):
    category_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Category.objects.all(),
        required=False,
        write_only=True,
    )

    class Meta:
        model = ConsultantProfile
        fields = (
            "display_name",
            "headline",
            "bio",
            "default_meeting_url",
            "hourly_rate",
            "approval_status",
            "rejection_reason",
            "category_ids",
        )
        read_only_fields = ("approval_status", "rejection_reason")

    def update(self, instance, validated_data):
        category_ids = validated_data.pop("category_ids", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if category_ids is not None:
            instance.categories.set(category_ids)
        return instance


class ConsultantStaffSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = ConsultantProfile
        fields = (
            "id",
            "email",
            "display_name",
            "approval_status",
            "rejection_reason",
            "created_at",
        )
        read_only_fields = ("id", "email", "display_name", "created_at")
