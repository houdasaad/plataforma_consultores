from django.contrib.auth import get_user_model
from rest_framework.response import Response
from rest_framework.views import APIView

from bookings.models import Booking
from consultants.models import ConsultantProfile
from core.permissions import IsStaffUser
from payments.models import Payment

User = get_user_model()


class MetricsSummaryView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        data = {
            "users_total": User.objects.count(),
            "consultants_pending": ConsultantProfile.objects.filter(
                approval_status=ConsultantProfile.ApprovalStatus.PENDING
            ).count(),
            "bookings_total": Booking.objects.count(),
            "payments_succeeded": Payment.objects.filter(status=Payment.Status.SUCCEEDED).count(),
        }
        return Response(data)
