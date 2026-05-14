from django.urls import path

from campaign_diagnostic.views import CampaignAnalyzeView, CampaignRunDetailView, CampaignRunListView

urlpatterns = [
    path("analyze/", CampaignAnalyzeView.as_view(), name="campaign-analyze"),
    path("runs/", CampaignRunListView.as_view(), name="campaign-run-list"),
    path("runs/<int:pk>/", CampaignRunDetailView.as_view(), name="campaign-run-detail"),
]
