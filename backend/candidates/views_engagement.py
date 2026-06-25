from django.contrib.auth import get_user_model
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status, views
from rest_framework.response import Response

from accounts.models import User
from candidates.engagement import get_catalog_service
from candidates.models import (
    CandidateClarificationReport,
    CandidateProfile,
    FollowedService,
    ServiceInquiry,
)
from candidates.serializers import (
    CandidateClarificationReportCreateSerializer,
    CandidateClarificationReportSerializer,
    CandidatePublicForConsultantSerializer,
    FollowedServiceSerializer,
    ServiceInquiryCreateSerializer,
    ServiceInquiryReplySerializer,
    ServiceInquirySerializer,
)
from consultants.models import ConsultantProfile
from core.permissions import IsCandidate, IsConsultant, IsStaffUser

UserModel = get_user_model()


class FollowedServiceListCreateView(views.APIView):
    permission_classes = [IsCandidate]

    def get(self, request):
        rows = (
            FollowedService.objects.filter(candidate=request.user)
            .select_related("service__consultant", "service__category")
            .order_by("-created_at")
        )
        return Response(FollowedServiceSerializer(rows, many=True).data)

    def post(self, request):
        service_id = request.data.get("service_id")
        if not service_id:
            return Response({"detail": "service_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            service = get_catalog_service(int(service_id))
        except Http404:
            return Response({"detail": "Service not available."}, status=status.HTTP_404_NOT_FOUND)
        row, created = FollowedService.objects.get_or_create(
            candidate=request.user, service=service
        )
        data = FollowedServiceSerializer(row).data
        data["created"] = created
        return Response(data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class FollowedServiceDestroyView(views.APIView):
    permission_classes = [IsCandidate]

    def delete(self, request, service_id):
        deleted, _ = FollowedService.objects.filter(
            candidate=request.user, service_id=service_id
        ).delete()
        if not deleted:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CandidateServiceInquiryListCreateView(views.APIView):
    permission_classes = [IsCandidate]

    def get(self, request):
        rows = (
            ServiceInquiry.objects.filter(candidate=request.user)
            .select_related("service__consultant", "candidate__candidate_profile")
            .order_by("-created_at")
        )
        return Response(ServiceInquirySerializer(rows, many=True).data)

    def post(self, request):
        ser = ServiceInquiryCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            service = get_catalog_service(ser.validated_data["service_id"])
        except Http404:
            return Response({"detail": "Service not available."}, status=status.HTTP_404_NOT_FOUND)
        inquiry = ServiceInquiry.objects.create(
            candidate=request.user,
            service=service,
            question=ser.validated_data["question"].strip(),
        )
        return Response(
            ServiceInquirySerializer(inquiry).data,
            status=status.HTTP_201_CREATED,
        )


class ConsultantServiceInquiryListView(views.APIView):
    permission_classes = [IsConsultant]

    def get(self, request):
        profile = ConsultantProfile.objects.get(user=request.user)
        rows = (
            ServiceInquiry.objects.filter(service__consultant=profile)
            .select_related("service", "candidate__candidate_profile")
            .order_by("-created_at")
        )
        return Response(ServiceInquirySerializer(rows, many=True).data)


class ConsultantServiceInquiryReplyView(views.APIView):
    permission_classes = [IsConsultant]

    def post(self, request, pk):
        profile = ConsultantProfile.objects.get(user=request.user)
        inquiry = get_object_or_404(
            ServiceInquiry.objects.select_related("service"),
            pk=pk,
            service__consultant=profile,
        )
        ser = ServiceInquiryReplySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        inquiry.consultant_reply = ser.validated_data["reply"].strip()
        inquiry.status = ServiceInquiry.Status.ANSWERED
        inquiry.answered_at = timezone.now()
        inquiry.save(update_fields=["consultant_reply", "status", "answered_at"])
        return Response(ServiceInquirySerializer(inquiry).data)


class CandidatePublicForConsultantView(views.APIView):
    permission_classes = [IsConsultant]

    def get(self, request, user_id):
        profile = get_object_or_404(
            CandidateProfile.objects.select_related("user"),
            user_id=user_id,
            user__role=User.Role.CANDIDATE,
        )
        return Response(CandidatePublicForConsultantSerializer(profile).data)


class CandidateClarificationReportCreateView(views.APIView):
    permission_classes = [IsConsultant]

    def post(self, request, user_id):
        candidate_user = get_object_or_404(UserModel, pk=user_id, role=User.Role.CANDIDATE)
        profile = ConsultantProfile.objects.get(user=request.user)
        ser = CandidateClarificationReportCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        report = CandidateClarificationReport.objects.create(
            consultant=profile,
            candidate=candidate_user,
            message=ser.validated_data["message"].strip(),
        )
        return Response(
            CandidateClarificationReportSerializer(report).data,
            status=status.HTTP_201_CREATED,
        )


class StaffClarificationReportListView(generics.ListAPIView):
    permission_classes = [IsStaffUser]
    serializer_class = CandidateClarificationReportSerializer

    def get_queryset(self):
        return CandidateClarificationReport.objects.select_related(
            "consultant", "candidate__candidate_profile"
        ).order_by("-created_at")
