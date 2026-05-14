from rest_framework import generics

from candidates.models import CandidateProfile
from candidates.serializers import CandidateProfileSerializer
from core.permissions import IsCandidate


class CandidateMeView(generics.RetrieveUpdateAPIView):
    serializer_class = CandidateProfileSerializer
    permission_classes = [IsCandidate]

    def get_object(self):
        return CandidateProfile.objects.get(user=self.request.user)
