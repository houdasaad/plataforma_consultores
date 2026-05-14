from django.contrib import admin

from consultants.models import ConsultantProfile


@admin.register(ConsultantProfile)
class ConsultantProfileAdmin(admin.ModelAdmin):
    list_display = ("display_name", "user", "approval_status", "created_at")
    list_filter = ("approval_status",)
    search_fields = ("display_name", "user__email")
    filter_horizontal = ("categories",)
    raw_id_fields = ("user",)
