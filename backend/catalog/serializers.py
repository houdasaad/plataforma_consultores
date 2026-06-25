from rest_framework import serializers

from catalog.models import Category


class CategorySerializer(serializers.ModelSerializer):
    parent_slug = serializers.SlugField(source="parent.slug", read_only=True, allow_null=True)

    class Meta:
        model = Category
        fields = ("id", "name", "slug", "description", "parent", "parent_slug")
