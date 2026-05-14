from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from accounts.models import EmailVerificationToken, User
from candidates.models import CandidateProfile
from consultants.models import ConsultantProfile


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = {
            "id": self.user.id,
            "email": self.user.email,
            "role": self.user.role,
            "is_email_verified": self.user.is_email_verified,
        }
        return data


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(choices=[User.Role.CANDIDATE, User.Role.CONSULTANT])
    display_name = serializers.CharField(max_length=160, required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email already registered.")
        return value.lower()

    def validate(self, attrs):
        if attrs["role"] not in (User.Role.CANDIDATE, User.Role.CONSULTANT):
            raise serializers.ValidationError({"role": "Invalid role for self-registration."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        email = validated_data["email"]
        password = validated_data["password"]
        role = validated_data["role"]
        display_name = (validated_data.get("display_name") or "").strip()
        if not display_name:
            display_name = email.split("@")[0]

        user = User.objects.create_user(email=email, password=password, role=role)
        if role == User.Role.CONSULTANT:
            ConsultantProfile.objects.create(
                user=user,
                display_name=display_name,
                approval_status=ConsultantProfile.ApprovalStatus.PENDING,
            )
        else:
            CandidateProfile.objects.create(user=user, display_name=display_name)
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8, write_only=True)

    def validate_new_password(self, value):
        validate_password(value)
        return value
