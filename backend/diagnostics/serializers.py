from rest_framework import serializers

from diagnostics.models import DiagnosticQuestion, DiagnosticSubmission, DiagnosticTemplate


class DiagnosticQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiagnosticQuestion
        fields = (
            "id",
            "order",
            "key",
            "prompt",
            "question_type",
            "options",
            "required",
        )


class DiagnosticTemplateDetailSerializer(serializers.ModelSerializer):
    questions = DiagnosticQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = DiagnosticTemplate
        fields = ("id", "slug", "title", "version", "questions")


class DiagnosticSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiagnosticSubmission
        fields = ("id", "template", "answers", "created_at")
        read_only_fields = ("id", "created_at")
