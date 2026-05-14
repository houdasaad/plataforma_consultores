from datetime import date

from django.db import transaction
from rest_framework import status
from core.permissions import IsCandidate
from rest_framework.response import Response
from rest_framework.views import APIView

from campaign_diagnostic.models import CampaignDiagnosticRun
from campaign_diagnostic.serializers import CampaignAnalyzeSerializer, CampaignRunSerializer
from campaign_diagnostic.services.retrieval import retrieve_documents
from campaign_diagnostic.services.schedule import (
    build_base_cronograma,
    llm_refine_cronograma,
    merge_llm_into_cronograma,
)


class CampaignAnalyzeView(APIView):
    permission_classes = [IsCandidate]

    @transaction.atomic
    def post(self, request):
        ser = CampaignAnalyzeSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        country = ser.validated_data["country_code"]
        scope = ser.validated_data["scope"]
        election_date = ser.validated_data["election_date"]
        district = (ser.validated_data.get("district") or "").strip()

        query_parts = [
            f"Country {country}",
            f"Scope {scope}",
            f"Election {election_date.isoformat()}",
        ]
        if district:
            query_parts.append(f"District {district}")
        query = " · ".join(query_parts)

        retrieved = retrieve_documents(
            country_code=country,
            scope=scope,
            district=district,
            query=query,
            limit=8,
        )
        chunks = [f"{d.title}\n{d.body}" for d, _, _ in retrieved]
        doc_ids = [d.id for d, _, _ in retrieved]
        scores = [{"id": d.id, "score": float(s), "method": m} for d, s, m in retrieved]

        today = date.today()
        base = build_base_cronograma(
            today=today,
            election_date=election_date,
            country_code=country,
            scope=scope,
            district=district,
        )
        llm_json, narrative, mode = llm_refine_cronograma(
            base_cronograma=base,
            context_chunks=chunks,
            country_code=country,
            scope=scope,
            district=district,
            election_date=election_date,
        )
        final = merge_llm_into_cronograma(base, llm_json) if llm_json else base

        from django.conf import settings as dj_settings

        model_name = getattr(dj_settings, "OPENAI_MODEL", "") if mode == "openai" else ""

        run = CampaignDiagnosticRun.objects.create(
            user=request.user,
            country_code=country,
            scope=scope,
            election_date=election_date,
            district=district,
            retrieved_doc_ids=doc_ids,
            retrieval_scores=scores,
            cronograma=final,
            llm_narrative=narrative,
            llm_model=model_name,
            llm_mode=mode,
        )
        return Response(CampaignRunSerializer(run).data, status=status.HTTP_201_CREATED)


class CampaignRunDetailView(APIView):
    permission_classes = [IsCandidate]

    def get(self, request, pk):
        try:
            run = CampaignDiagnosticRun.objects.get(pk=pk, user=request.user)
        except CampaignDiagnosticRun.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(CampaignRunSerializer(run).data)


class CampaignRunListView(APIView):
    permission_classes = [IsCandidate]

    def get(self, request):
        qs = CampaignDiagnosticRun.objects.filter(user=request.user)[:30]
        return Response(CampaignRunSerializer(qs, many=True).data)
