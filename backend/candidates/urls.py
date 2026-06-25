from django.urls import path

from payments.views import CandidatePaymentListView
from candidates.views import (
    CandidateMeView,
    CandidatePortalSummaryView,
    CandidateVerifyView,
    MarketplaceBidAcceptView,
    MarketplaceBidCreateView,
    MarketplaceDashboardView,
    MarketplacePublicListView,
    MarketplaceRequirementAssistView,
    MarketplaceRequirementDetailView,
    MarketplaceRequirementListCreateView,
    MarketplaceRequirementPublishView,
)
from candidates.views_engagement import (
    CandidateClarificationReportCreateView,
    CandidatePublicForConsultantView,
    CandidateServiceInquiryListCreateView,
    ConsultantServiceInquiryListView,
    ConsultantServiceInquiryReplyView,
    FollowedServiceDestroyView,
    FollowedServiceListCreateView,
    StaffClarificationReportListView,
)

urlpatterns = [
    path("me/", CandidateMeView.as_view(), name="candidate-me"),
    path("me/verify/", CandidateVerifyView.as_view(), name="candidate-verify"),
    path("me/portal/", CandidatePortalSummaryView.as_view(), name="candidate-portal"),
    # FROZEN — FollowedService excluded from MVP (CORFO model v1)
    # path("me/followed-services/", FollowedServiceListCreateView.as_view(), name="followed-services"),
    # path(
    #     "me/followed-services/<int:service_id>/",
    #     FollowedServiceDestroyView.as_view(),
    #     name="followed-service-destroy",
    # ),
    # FROZEN — ServiceInquiry excluded from MVP (CORFO model v1)
    # path(
    #     "me/service-inquiries/",
    #     CandidateServiceInquiryListCreateView.as_view(),
    #     name="candidate-service-inquiries",
    # ),
    path(
        "public/<int:user_id>/",
        CandidatePublicForConsultantView.as_view(),
        name="candidate-public-consultant",
    ),
    path(
        "public/<int:user_id>/clarification-report/",
        CandidateClarificationReportCreateView.as_view(),
        name="candidate-clarification-report",
    ),
    # FROZEN — FollowedService / ServiceInquiry excluded from MVP (CORFO model v1)
    path(
        "consultant/service-inquiries/",
        ConsultantServiceInquiryListView.as_view(),
        name="consultant-service-inquiries",
    ),
    path(
        "consultant/service-inquiries/<int:pk>/reply/",
        ConsultantServiceInquiryReplyView.as_view(),
        name="consultant-service-inquiry-reply",
    ),
    path(
        "staff/clarification-reports/",
        StaffClarificationReportListView.as_view(),
        name="staff-clarification-reports",
    ),
    path(
        "marketplace/dashboard/",
        MarketplaceDashboardView.as_view(),
        name="marketplace-dashboard",
    ),
    path(
        "marketplace/requirements/",
        MarketplaceRequirementListCreateView.as_view(),
        name="marketplace-requirements",
    ),
    path(
        "marketplace/requirements/<int:pk>/",
        MarketplaceRequirementDetailView.as_view(),
        name="marketplace-requirement-detail",
    ),
    path(
        "marketplace/requirements/<int:pk>/publish/",
        MarketplaceRequirementPublishView.as_view(),
        name="marketplace-requirement-publish",
    ),
    path(
        "marketplace/requirements/assist/",
        MarketplaceRequirementAssistView.as_view(),
        name="marketplace-requirement-assist",
    ),
    path(
        "marketplace/feed/",
        MarketplacePublicListView.as_view(),
        name="marketplace-feed",
    ),
    path("marketplace/bids/", MarketplaceBidCreateView.as_view(), name="marketplace-bid-create"),
    path(
        "marketplace/bids/<int:pk>/accept/",
        MarketplaceBidAcceptView.as_view(),
        name="marketplace-bid-accept",
    ),
    path(
        "me/payments/",
        CandidatePaymentListView.as_view(),
        name="candidate-payment-history",
    ),
]
