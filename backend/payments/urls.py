from django.urls import path

from payments.views import MockCheckoutView, MockWebhookView

urlpatterns = [
    path("mock-checkout/", MockCheckoutView.as_view(), name="mock-checkout"),
    path("webhooks/mock/", MockWebhookView.as_view(), name="mock-webhook"),
]
