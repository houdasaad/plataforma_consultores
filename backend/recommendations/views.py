from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from consultants.serializers import ConsultantPublicSerializer
from core.permissions import IsCandidate
from recommendations.services import recommend_consultants_with_answers


class RecommendationView(APIView):
    permission_classes = [IsCandidate]

    def get(self, request):
        country_code = (request.query_params.get("country_code") or "").strip()
        scope = (request.query_params.get("scope") or "").strip()
        district = (request.query_params.get("district") or "").strip()

        # If nothing provided, try legacy submissions (can be defunct in MVP, but kept as fallback)
        if not scope and not country_code:
            try:
                from diagnostics.models import DiagnosticSubmission

                sub = (
                    DiagnosticSubmission.objects.filter(user=request.user)
                    .order_by("-created_at")
                    .first()
                )
                if sub and sub.answers:
                    from recommendations.services import recommend_consultants

                    profiles = recommend_consultants(sub)
                    data = ConsultantPublicSerializer(profiles, many=True).data
                    return Response(
                        {"source": "legacy_diagnostic", "submission_id": sub.id, "results": data},
                    )
            except Exception:
                pass

            # campaign_diagnostic is frozen, skip

        if not scope and not country_code:
            return Response(
                {"results": ConsultantPublicSerializer([], many=True).data, "scope": scope},
            )

        focus = {"national": "campaign", "regional": "coalition", "local": "media"}.get(
            scope, "campaign"
        )
        region = " ".join(filter(None, [country_code, district])).strip() or None
        profiles = recommend_consultants_with_answers(
            {"focus": focus, "region": region},
        )
        return Response(
            {
                "source": "query_params",
                "scope": scope,
                "country_code": country_code,
                "district": district,
                "results": ConsultantPublicSerializer(profiles, many=True).data,
            }
        )
