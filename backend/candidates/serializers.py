from rest_framework import serializers

from candidates.models import CandidateProfile


class CandidateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CandidateProfile
        fields = ("display_name", "phone", "notes")
        read_only_fields = ()
