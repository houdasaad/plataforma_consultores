"""URL configuration for the Provider app."""

from django.urls import path

from payments.views import ProviderPaymentListView
from providers.views import (
    ProviderMarketplaceBidCreateView,
    ProviderMarketplaceBidListView,
    ProviderMarketplaceRequirementListView,
    ProviderMeView,
    ProviderPublicDetailView,
    ProviderPublicListView,
    ProviderReviewCreateView,
    ProviderStaffChangeStatusView,
    ProviderStaffCreateView,
    ProviderStaffDetailView,
    ProviderStaffListView,
)

urlpatterns = [
    # Public
    path("", ProviderPublicListView.as_view(), name="provider-list"),
    path("<int:pk>/", ProviderPublicDetailView.as_view(), name="provider-detail"),
    path("<int:pk>/reviews/", ProviderReviewCreateView.as_view(), name="provider-review-create"),
    # Provider portal
    path("me/", ProviderMeView.as_view(), name="provider-me"),
    path("me/marketplace/", ProviderMarketplaceRequirementListView.as_view(), name="provider-marketplace"),
    path("me/marketplace/bids/", ProviderMarketplaceBidListView.as_view(), name="provider-bid-list"),
    path("me/marketplace/bids/create/", ProviderMarketplaceBidCreateView.as_view(), name="provider-bid-create"),
    path("me/payments/", ProviderPaymentListView.as_view(), name="provider-payment-history"),
    # Staff
    path("staff/", ProviderStaffListView.as_view(), name="provider-staff-list"),
    path("staff/create/", ProviderStaffCreateView.as_view(), name="provider-staff-create"),
    path("staff/<int:pk>/", ProviderStaffDetailView.as_view(), name="provider-staff-detail"),
    path(
        "staff/<int:pk>/change-status/",
        ProviderStaffChangeStatusView.as_view(),
        name="provider-staff-change-status",
    ),
]
