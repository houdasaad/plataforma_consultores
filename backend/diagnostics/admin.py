from django.contrib import admin

from diagnostics.models import DiagnosticQuestion, DiagnosticSubmission, DiagnosticTemplate


class DiagnosticQuestionInline(admin.TabularInline):
    model = DiagnosticQuestion
    extra = 0


@admin.register(DiagnosticTemplate)
class DiagnosticTemplateAdmin(admin.ModelAdmin):
    list_display = ("slug", "title", "version", "is_active")
    inlines = [DiagnosticQuestionInline]


@admin.register(DiagnosticSubmission)
class DiagnosticSubmissionAdmin(admin.ModelAdmin):
    list_display = ("user", "template", "created_at")
    raw_id_fields = ("user", "template")
