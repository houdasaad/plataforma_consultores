from django.conf import settings
from django.db import models


class KnowledgeDocument(models.Model):
    """
    Vector-store compatible chunks: optional embedding (JSON list) for cosine similarity.
    """

    country_code = models.CharField(max_length=2, db_index=True)
    district = models.CharField(max_length=160, blank=True, db_index=True)
    scope = models.CharField(
        max_length=20,
        blank=True,
        help_text="national | regional | local or empty for generic",
    )
    title = models.CharField(max_length=220)
    body = models.TextField()
    embedding = models.JSONField(null=True, blank=True)
    source = models.CharField(max_length=60, default="seed")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["country_code", "title"]
        indexes = [
            models.Index(fields=["country_code", "scope"]),
        ]
        constraints = [
            models.UniqueConstraint(fields=["country_code", "title"], name="uniq_knowledge_country_title"),
        ]

    def __str__(self) -> str:
        return f"{self.country_code} · {self.title}"


class CampaignDiagnosticRun(models.Model):
    class Scope(models.TextChoices):
        NATIONAL = "national", "National"
        REGIONAL = "regional", "Regional"
        LOCAL = "local", "Local"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="campaign_diagnostic_runs",
    )
    country_code = models.CharField(max_length=2)
    scope = models.CharField(max_length=20, choices=Scope.choices)
    election_date = models.DateField()
    district = models.CharField(max_length=160, blank=True)
    retrieved_doc_ids = models.JSONField(default=list)
    retrieval_scores = models.JSONField(default=list)
    cronograma = models.JSONField(default=dict)
    llm_narrative = models.TextField(blank=True)
    llm_model = models.CharField(max_length=80, blank=True)
    llm_mode = models.CharField(
        max_length=40,
        blank=True,
        help_text="openai | rules_fallback",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Run {self.pk} {self.country_code} {self.scope}"
