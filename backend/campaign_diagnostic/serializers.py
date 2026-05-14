from datetime import date

from rest_framework import serializers

from campaign_diagnostic.models import CampaignDiagnosticRun


class CampaignAnalyzeSerializer(serializers.Serializer):
    country_code = serializers.CharField(max_length=2)
    scope = serializers.ChoiceField(choices=CampaignDiagnosticRun.Scope.choices)
    election_date = serializers.DateField()
    district = serializers.CharField(max_length=160, required=False, allow_blank=True)

    def validate_country_code(self, value):
        return value.strip().upper()

    def validate(self, attrs):
        if attrs["election_date"] <= date.today():
            raise serializers.ValidationError(
                {"election_date": "La fecha de elección debe ser posterior a hoy."}
            )
        if attrs["scope"] == CampaignDiagnosticRun.Scope.LOCAL and not (
            attrs.get("district") or ""
        ).strip():
            raise serializers.ValidationError(
                {"district": "Distrito o municipio requerido para campaña local."}
            )
        return attrs


class CampaignRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignDiagnosticRun
        fields = (
            "id",
            "country_code",
            "scope",
            "election_date",
            "district",
            "cronograma",
            "llm_narrative",
            "llm_model",
            "llm_mode",
            "retrieved_doc_ids",
            "retrieval_scores",
            "created_at",
        )
        read_only_fields = fields
