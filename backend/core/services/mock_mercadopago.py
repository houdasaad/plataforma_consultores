"""
Mock Mercado Pago checkout flow (preference + payment confirmation).
Configure MERCADOPAGO_ACCESS_TOKEN for real integration later.
"""

from __future__ import annotations

import uuid
from typing import Any

from django.conf import settings


def is_live_mode() -> bool:
    return bool(getattr(settings, "MERCADOPAGO_ACCESS_TOKEN", ""))


def create_preference(
    *,
    booking_id: int,
    amount: float,
    currency: str = "USD",
    payer_email: str,
    title: str = "Consultoría política",
) -> dict[str, Any]:
    """
    Returns a mock Mercado Pago preference. In live mode, would call MP API.
    """
    pref_id = f"MP-MOCK-{uuid.uuid4().hex[:16].upper()}"
    base = getattr(settings, "FRONTEND_URL", "http://127.0.0.1:5173").rstrip("/")
    return {
        "id": pref_id,
        "init_point": f"{base}/pago/mercadopago-mock?preference_id={pref_id}&booking_id={booking_id}",
        "sandbox_init_point": f"{base}/pago/mercadopago-mock?preference_id={pref_id}&booking_id={booking_id}",
        "status": "pending",
        "amount": amount,
        "currency": currency,
        "payer_email": payer_email,
        "title": title,
        "mode": "mercadopago_live" if is_live_mode() else "mercadopago_mock",
        "mock_config_example": {
            "access_token": "TEST-xxxx (set MERCADOPAGO_ACCESS_TOKEN)",
            "public_key": "TEST-public-key",
            "webhook_url": "/api/v1/payments/webhooks/mercadopago/",
        },
    }


def confirm_mock_payment(preference_id: str, booking_id: int) -> dict[str, Any]:
    payment_id = f"MPAY-{uuid.uuid4().hex[:12].upper()}"
    return {
        "status": "approved",
        "preference_id": preference_id,
        "payment_id": payment_id,
        "booking_id": booking_id,
        "external_reference": str(booking_id),
        "mode": "mercadopago_mock",
    }
