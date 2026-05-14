from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from core.metrics_views import MetricsSummaryView
from core.views import health

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/", health, name="health"),
    path("api/v1/metrics/summary/", MetricsSummaryView.as_view(), name="metrics-summary"),
    path("api/v1/auth/", include("accounts.urls")),
    path("api/v1/catalog/", include("catalog.urls")),
    path("api/v1/consultants/", include("consultants.urls")),
    path("api/v1/candidates/", include("candidates.urls")),
    path("api/v1/diagnostics/", include("diagnostics.urls")),
    path("api/v1/recommendations/", include("recommendations.urls")),
    path("api/v1/bookings/", include("bookings.urls")),
    path("api/v1/payments/", include("payments.urls")),
    path("api/v1/campaign-diagnostic/", include("campaign_diagnostic.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
