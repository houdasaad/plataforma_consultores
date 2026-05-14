from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import (
    MeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
    ThrottledTokenObtainPairView,
    verify_email,
)

urlpatterns = [
    path("token/", ThrottledTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("register/", RegisterView.as_view(), name="register"),
    path("verify-email/<uuid:token>/", verify_email, name="verify_email"),
    path("password-reset/request/", PasswordResetRequestView.as_view(), name="password_reset_request"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"),
    path("me/", MeView.as_view(), name="me"),
]
