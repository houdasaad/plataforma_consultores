from django.contrib.auth.tokens import default_token_generator
from django.utils import timezone
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.models import EmailVerificationToken, User
from accounts.serializers import (
    EmailTokenObtainPairSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
)
from notifications.emails import send_password_reset_email, send_verification_email


class ThrottledTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        ser = RegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.save()
        evt = EmailVerificationToken.objects.create(user=user)
        send_verification_email(user, evt.token)
        return Response({"detail": "Registered. Check your email to verify."}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([AllowAny])
def verify_email(request, token):
    try:
        evt = EmailVerificationToken.objects.select_related("user").get(token=token)
    except EmailVerificationToken.DoesNotExist:
        return Response({"detail": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)
    if not evt.is_valid():
        return Response({"detail": "Token expired."}, status=status.HTTP_400_BAD_REQUEST)
    user = evt.user
    user.is_email_verified = True
    user.save(update_fields=["is_email_verified"])
    evt.consumed_at = timezone.now()
    evt.save(update_fields=["consumed_at"])
    return Response({"detail": "Email verified."})


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        ser = PasswordResetRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        email = ser.validated_data["email"].lower()
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({"detail": "If the email exists, instructions were sent."})
        send_password_reset_email(user)
        return Response({"detail": "If the email exists, instructions were sent."})


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request):
        ser = PasswordResetConfirmSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        uid = ser.validated_data["uid"]
        token = ser.validated_data["token"]
        new_password = ser.validated_data["new_password"]
        try:
            uid_int = int(force_str(urlsafe_base64_decode(uid)))
            user = User.objects.get(pk=uid_int)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            return Response({"detail": "Invalid uid."}, status=status.HTTP_400_BAD_REQUEST)
        if not default_token_generator.check_token(user, token):
            return Response({"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save(update_fields=["password"])
        return Response({"detail": "Password updated."})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        u = request.user
        data = {
            "id": u.id,
            "email": u.email,
            "role": u.role,
            "is_email_verified": u.is_email_verified,
        }
        return Response(data)
