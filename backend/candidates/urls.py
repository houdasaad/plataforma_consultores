from django.urls import path

from candidates.views import CandidateMeView

urlpatterns = [
    path("me/", CandidateMeView.as_view(), name="candidate-me"),
]
