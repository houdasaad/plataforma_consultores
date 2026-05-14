import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone

from accounts.managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        CONSULTANT = "consultant", "Consultant"
        CANDIDATE = "candidate", "Candidate"

    email = models.EmailField("email address", unique=True, db_index=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CANDIDATE)
    is_email_verified = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(default=timezone.now)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    objects = UserManager()

    def __str__(self) -> str:
        return self.email


class EmailVerificationToken(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="email_verification_tokens"
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    consumed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def is_valid(self) -> bool:
        if self.consumed_at is not None:
            return False
        return timezone.now() - self.created_at < timezone.timedelta(days=2)
