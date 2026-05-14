from django.contrib import admin

from candidates.models import CandidateProfile


@admin.register(CandidateProfile)
class CandidateProfileAdmin(admin.ModelAdmin):
    list_display = ("display_name", "user", "created_at")
    search_fields = ("display_name", "user__email")
    raw_id_fields = ("user",)
