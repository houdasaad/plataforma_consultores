from django.urls import path

from payments.views import (
    CandidatePaymentListView,
    ConsultantPaymentListView,
    MercadoPagoConfirmView,
    MercadoPagoPreferenceView,
    MercadoPagoWebhookView,
    MockCheckoutView,
    MockWebhookView,
    ProviderPaymentListView,
    StaffPaymentListView,
    StaffPaymentSummaryView,
)

urlpatterns = [
    path("mock-checkout/", MockCheckoutView.as_view(), name="mock-checkout"),
    path("mercadopago/preference/", MercadoPagoPreferenceView.as_view(), name="mp-preference"),
    path("mercadopago/confirm/", MercadoPagoConfirmView.as_view(), name="mp-confirm"),
    path("webhooks/mock/", MockWebhookView.as_view(), name="mock-webhook"),
    path("webhooks/mercadopago/", MercadoPagoWebhookView.as_view(), name="mp-webhook"),
    path("staff/summary/", StaffPaymentSummaryView.as_view(), name="staff-payment-summary"),
    path("staff/list/", StaffPaymentListView.as_view(), name="staff-payment-list"),
    path("candidate/", CandidatePaymentListView.as_view(), name="candidate-payment-list"),
    path("consultant/", ConsultantPaymentListView.as_view(), name="consultant-payment-list"),
    path("provider/", ProviderPaymentListView.as_view(), name="provider-payment-list"),
]
