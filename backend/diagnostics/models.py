from django.conf import settings
from django.db import models


class DiagnosticTemplate(models.Model):
    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=200)
    version = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["slug"]

    def __str__(self) -> str:
        return f"{self.title} v{self.version}"


class DiagnosticQuestion(models.Model):
    class QuestionType(models.TextChoices):
        SINGLE = "single", "Single choice"
        MULTI = "multi", "Multiple choice"
        TEXT = "text", "Free text"

    template = models.ForeignKey(
        DiagnosticTemplate, on_delete=models.CASCADE, related_name="questions"
    )
    order = models.PositiveIntegerField(default=0)
    key = models.SlugField(max_length=80, help_text="Stable key for answers JSON")
    prompt = models.TextField()
    question_type = models.CharField(
        max_length=20, choices=QuestionType.choices, default=QuestionType.SINGLE
    )
    options = models.JSONField(
        default=list,
        blank=True,
        help_text='For choice types: [{"value":"campaign","label":"Campaña electoral"}, ...]',
    )
    required = models.BooleanField(default=True)

    class Meta:
        ordering = ["template_id", "order", "id"]
        unique_together = [("template", "key")]

    def __str__(self) -> str:
        return f"{self.template.slug}:{self.key}"


class DiagnosticSubmission(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="diagnostic_submissions",
    )
    template = models.ForeignKey(
        DiagnosticTemplate, on_delete=models.CASCADE, related_name="submissions"
    )
    answers = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.user_id} @ {self.created_at}"
