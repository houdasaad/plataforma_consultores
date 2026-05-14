from django.urls import path

from diagnostics.views import (
    DiagnosticSubmitView,
    DiagnosticSubmissionListView,
    DiagnosticTemplateDetailView,
    DiagnosticTemplateListView,
)

urlpatterns = [
    path("templates/", DiagnosticTemplateListView.as_view(), name="diagnostic-template-list"),
    path("templates/<slug:slug>/", DiagnosticTemplateDetailView.as_view(), name="diagnostic-template-detail"),
    path("templates/<slug:slug>/submit/", DiagnosticSubmitView.as_view(), name="diagnostic-submit"),
    path("submissions/", DiagnosticSubmissionListView.as_view(), name="diagnostic-submission-list"),
]
