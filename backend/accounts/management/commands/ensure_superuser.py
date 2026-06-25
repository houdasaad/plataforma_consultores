import os

from django.core.management.base import BaseCommand

from accounts.models import User


class Command(BaseCommand):
    help = "Create or update a Django admin superuser (non-interactive). Uses SEED_ADMIN_* env vars by default."

    def add_arguments(self, parser):
        parser.add_argument(
            "--email",
            default=os.environ.get("SEED_ADMIN_EMAIL", "admin@example.com"),
            help="Superuser email (default: SEED_ADMIN_EMAIL or admin@example.com).",
        )
        parser.add_argument(
            "--password",
            default=os.environ.get("SEED_ADMIN_PASSWORD", "adminadmin12"),
            help="Password (default: SEED_ADMIN_PASSWORD or adminadmin12).",
        )

    def handle(self, *args, **options):
        email = User.objects.normalize_email(options["email"])
        password = options["password"]
        if not password:
            self.stderr.write(self.style.ERROR("Password is required (use --password or SEED_ADMIN_PASSWORD)."))
            return

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "role": User.Role.ADMIN,
                "is_staff": True,
                "is_superuser": True,
                "is_email_verified": True,
            },
        )
        user.role = User.Role.ADMIN
        user.is_staff = True
        user.is_superuser = True
        user.is_email_verified = True
        user.set_password(password)
        user.save()

        if created:
            self.stdout.write(self.style.SUCCESS(f"Created superuser: {email}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Updated superuser: {email}"))
