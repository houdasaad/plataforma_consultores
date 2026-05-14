from django.urls import path

from consultants.views import (
    ConsultantApproveView,
    ConsultantMeView,
    ConsultantPendingListView,
    ConsultantPublicDetailView,
    ConsultantPublicListView,
    ConsultantRejectView,
)

urlpatterns = [
    path("", ConsultantPublicListView.as_view(), name="consultant-list"),
    path("<int:pk>/", ConsultantPublicDetailView.as_view(), name="consultant-detail"),
    path("me/", ConsultantMeView.as_view(), name="consultant-me"),
    path("staff/pending/", ConsultantPendingListView.as_view(), name="consultant-pending"),
    path("staff/<int:pk>/approve/", ConsultantApproveView.as_view(), name="consultant-approve"),
    path("staff/<int:pk>/reject/", ConsultantRejectView.as_view(), name="consultant-reject"),
]
