import pytest
from rest_framework.test import APIClient

from accounts.models import User


@pytest.mark.django_db
def test_health_ok():
    client = APIClient()
    res = client.get("/api/v1/health/")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


@pytest.mark.django_db
def test_register_and_token():
    client = APIClient()
    payload = {
        "email": "newuser@example.com",
        "password": "longpassword1",
        "role": User.Role.CANDIDATE,
        "display_name": "Test User",
    }
    res = client.post("/api/v1/auth/register/", payload, format="json")
    assert res.status_code == 201
    user = User.objects.get(email="newuser@example.com")
    user.is_email_verified = True
    user.save()
    res = client.post("/api/v1/auth/token/", {"email": "newuser@example.com", "password": "longpassword1"}, format="json")
    assert res.status_code == 200
    assert "access" in res.data
    assert res.data["user"]["role"] == User.Role.CANDIDATE
