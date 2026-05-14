from django.contrib import admin

from campaign_diagnostic.models import CampaignDiagnosticRun, KnowledgeDocument


@admin.register(KnowledgeDocument)
class KnowledgeDocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "country_code", "scope", "district", "source", "created_at")
    list_filter = ("country_code", "scope")
    search_fields = ("title", "body", "district")


@admin.register(CampaignDiagnosticRun)
class CampaignDiagnosticRunAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "country_code", "scope", "election_date", "llm_mode", "created_at")
    list_filter = ("scope", "country_code")
    raw_id_fields = ("user",)
