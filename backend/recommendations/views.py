from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from campaign_diagnostic.models import CampaignDiagnosticRun
from diagnostics.models import DiagnosticSubmission
from consultants.serializers import ConsultantPublicSerializer
from core.permissions import IsCandidate
from recommendations.services import (
    recommend_consultants,
    recommend_consultants_from_campaign_run,
)


class RecommendationView(APIView):
    permission_classes = [IsCandidate]

    def get(self, request):
        submission_id = request.query_params.get("submission_id")
        if submission_id:
            sub = get_object_or_404(
                DiagnosticSubmission,
                pk=submission_id,
                user=request.user,
            )
        else:
            sub = (
                DiagnosticSubmission.objects.filter(user=request.user)
                .order_by("-created_at")
                .first()
            )
        if sub:
            profiles = recommend_consultants(sub)
            data = ConsultantPublicSerializer(profiles, many=True).data
            return Response(
                {"submission_id": sub.id, "campaign_run_id": None, "results": data},
            )

        run = (
            CampaignDiagnosticRun.objects.filter(user=request.user)
            .order_by("-created_at")
            .first()
        )
        if run:
            profiles = recommend_consultants_from_campaign_run(run)
            data = ConsultantPublicSerializer(profiles, many=True).data
            return Response(
                {"submission_id": None, "campaign_run_id": run.id, "results": data},
            )

        return Response(
            {"detail": "Complete a campaign diagnostic or legacy questionnaire first."},
            status=status.HTTP_400_BAD_REQUEST,
        )
