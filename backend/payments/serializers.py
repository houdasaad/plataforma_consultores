from rest_framework import serializers

from payments.models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    """Full payment detail — used by candidate, consultant, and provider views."""

    booking_id = serializers.IntegerField(source="booking.id", read_only=True)
    consultant_name = serializers.CharField(
        source="booking.consultant.display_name",
        read_only=True,
        allow_null=True,
    )
    provider_name = serializers.SerializerMethodField()
    candidate_name = serializers.SerializerMethodField()
    net_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = Payment
        fields = (
            "id",
            "booking_id",
            "consultant_name",
            "provider_name",
            "candidate_name",
            "amount",
            "commission_amount",
            "net_amount",
            "currency",
            "status",
            "provider",
            "external_id",
            "paid_at",
            "service_verified_at",
            "released_at",
            "created_at",
        )

    def get_provider_name(self, obj):
        if obj.booking.provider_id:
            return obj.booking.provider.name
        return None

    def get_candidate_name(self, obj):
        candidate = obj.booking.candidate
        from candidates.models import CandidateProfile
        profile = CandidateProfile.objects.filter(user=candidate).first()
        if profile:
            return profile.display_name
        return candidate.email


class StaffPaymentSerializer(PaymentSerializer):
    """Extended serializer for staff view — includes raw payload."""

    class Meta(PaymentSerializer.Meta):
        fields = PaymentSerializer.Meta.fields + ("raw_payload",)
