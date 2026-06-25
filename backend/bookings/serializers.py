from django.utils import timezone
from rest_framework import serializers

from bookings.models import AvailabilitySlot, Booking
from consultants.models import ConsultantProfile


class AvailabilitySlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvailabilitySlot
        fields = ("id", "consultant", "start_at", "end_at", "is_booked")
        read_only_fields = ("id", "is_booked", "consultant")


class AvailabilitySlotWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvailabilitySlot
        fields = ("start_at", "end_at")

    def validate(self, attrs):
        if attrs["end_at"] <= attrs["start_at"]:
            raise serializers.ValidationError("end_at must be after start_at.")
        if attrs["start_at"] < timezone.now():
            raise serializers.ValidationError("start_at must be in the future.")
        return attrs


class BookingSerializer(serializers.ModelSerializer):
    consultant_name = serializers.CharField(source="consultant.display_name", read_only=True)
    slot_start_at = serializers.DateTimeField(source="slot.start_at", read_only=True, allow_null=True)
    slot_end_at = serializers.DateTimeField(source="slot.end_at", read_only=True, allow_null=True)
    service_verified = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = (
            "id",
            "consultant",
            "consultant_name",
            "slot",
            "slot_start_at",
            "slot_end_at",
            "diagnostic_submission",
            "status",
            "meeting_url",
            "amount",
            "currency",
            "created_at",
            "service_verified",
        )
        read_only_fields = (
            "id",
            "consultant",
            "consultant_name",
            "status",
            "meeting_url",
            "amount",
            "currency",
            "created_at",
        )

    def get_service_verified(self, obj) -> bool:
        return obj.payments.filter(service_verified_at__isnull=False).exists()


class BookingCreateSerializer(serializers.Serializer):
    slot_id = serializers.IntegerField()
    consultant_service_id = serializers.IntegerField(required=False, allow_null=True)
    diagnostic_submission_id = serializers.IntegerField(required=False, allow_null=True)
