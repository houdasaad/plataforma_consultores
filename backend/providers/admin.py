"""Django admin registration for Provider models."""

from django.contrib import admin

from providers.models import Provider, ProviderReview


@admin.register(Provider)
class ProviderAdmin(admin.ModelAdmin):
    list_display = ("name", "identifier", "approval_status", "contact_email", "created_at")
    list_filter = ("approval_status", "categories")
    search_fields = ("name", "identifier", "contact_email")
    ordering = ("-created_at",)


@admin.register(ProviderReview)
class ProviderReviewAdmin(admin.ModelAdmin):
    list_display = ("provider", "reviewer", "score", "created_at")
    list_filter = ("score", "created_at")
    search_fields = ("provider__name", "reviewer__email")
    ordering = ("-created_at",)
