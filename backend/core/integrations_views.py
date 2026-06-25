from django.conf import settings
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class IntegrationsConfigView(APIView):
    """Public mock configuration examples for AI and payment providers."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                "currency_default": getattr(settings, "DEFAULT_CURRENCY", "USD"),
                "ai": {
                    "mode": "openai" if settings.OPENAI_API_KEY else "mock",
                    "model_example": settings.OPENAI_MODEL,
                    "embedding_model_example": settings.OPENAI_EMBEDDING_MODEL,
                    "capabilities": [
                        "consultant_profile_verification",
                        "cv_extraction",
                        "service_publication_review",
                        "marketplace_requirement_review",
                        "marketplace_draft_assist",
                    ],
                    "mock_note": "Sin OPENAI_API_KEY se usan reglas mock en core.services.mock_ai.",
                },
                "payments": {
                    "providers": ["mock", "mercadopago_mock"],
                    "mercadopago_live": bool(getattr(settings, "MERCADOPAGO_ACCESS_TOKEN", "")),
                    "mock_example": {
                        "access_token": "TEST-xxxxxxxx",
                        "public_key": "TEST-public-key",
                        "preference_endpoint": "/api/v1/payments/mercadopago/preference/",
                        "confirm_endpoint": "/api/v1/payments/mercadopago/confirm/",
                    },
                    "commission_rate": settings.PLATFORM_COMMISSION_RATE,
                },
            }
        )
