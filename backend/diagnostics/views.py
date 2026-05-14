from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from diagnostics.models import DiagnosticQuestion, DiagnosticSubmission, DiagnosticTemplate
from diagnostics.serializers import (
    DiagnosticSubmissionSerializer,
    DiagnosticTemplateDetailSerializer,
)
from core.permissions import IsCandidate


class DiagnosticTemplateListView(generics.ListAPIView):
    queryset = DiagnosticTemplate.objects.filter(is_active=True)
    serializer_class = DiagnosticTemplateDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .prefetch_related(
                "questions",
            )
        )


class DiagnosticTemplateDetailView(generics.RetrieveAPIView):
    queryset = DiagnosticTemplate.objects.filter(is_active=True).prefetch_related("questions")
    serializer_class = DiagnosticTemplateDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "slug"


class DiagnosticSubmitView(APIView):
    permission_classes = [IsCandidate]

    def post(self, request, slug):
        if not request.user.is_email_verified:
            return Response(
                {"detail": "Email must be verified."},
                status=status.HTTP_403_FORBIDDEN,
            )
        template = get_object_or_404(DiagnosticTemplate, slug=slug, is_active=True)
        questions = list(template.questions.all())
        answers = request.data.get("answers") or {}
        if not isinstance(answers, dict):
            return Response({"detail": "answers must be an object."}, status=400)

        errors = {}
        for q in questions:
            val = answers.get(q.key)
            if q.required and (val is None or val == "" or val == []):
                errors[q.key] = "Required."
                continue
            if val in (None, "", []):
                continue
            if q.question_type in (
                DiagnosticQuestion.QuestionType.SINGLE,
                DiagnosticQuestion.QuestionType.MULTI,
            ):
                allowed = {str(o.get("value")) for o in (q.options or []) if isinstance(o, dict)}
                if q.question_type == DiagnosticQuestion.QuestionType.SINGLE:
                    if str(val) not in allowed:
                        errors[q.key] = "Invalid choice."
                else:
                    if not isinstance(val, list):
                        errors[q.key] = "Expected list of values."
                    else:
                        for v in val:
                            if str(v) not in allowed:
                                errors[q.key] = "Invalid choice."
                                break
        if errors:
            return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

        sub = DiagnosticSubmission.objects.create(
            user=request.user,
            template=template,
            answers=answers,
        )
        return Response(DiagnosticSubmissionSerializer(sub).data, status=status.HTTP_201_CREATED)


class DiagnosticSubmissionListView(generics.ListAPIView):
    serializer_class = DiagnosticSubmissionSerializer
    permission_classes = [IsCandidate]

    def get_queryset(self):
        return DiagnosticSubmission.objects.filter(user=self.request.user).select_related("template")
