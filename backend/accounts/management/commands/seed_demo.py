import os
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import User
from bookings.models import AvailabilitySlot
from candidates.models import CandidateProfile
from catalog.models import Category
from consultants.models import ConsultantProfile
from diagnostics.models import DiagnosticQuestion, DiagnosticTemplate


class Command(BaseCommand):
    help = "Seed demo data (idempotent)."

    def handle(self, *args, **options):
        cats = [
            ("Campaña electoral", "campaign"),
            ("Coaliciones y alianzas", "coalition"),
            ("Comunicación y medios", "media"),
        ]
        for name, slug in cats:
            Category.objects.get_or_create(slug=slug, defaults={"name": name, "description": name})

        tpl, _ = DiagnosticTemplate.objects.get_or_create(
            slug="mvp",
            defaults={"title": "Diagnóstico inicial MVP", "version": 1, "is_active": True},
        )
        if not tpl.questions.exists():
            DiagnosticQuestion.objects.bulk_create(
                [
                    DiagnosticQuestion(
                        template=tpl,
                        order=1,
                        key="focus",
                        prompt="¿En qué área necesitas más apoyo?",
                        question_type=DiagnosticQuestion.QuestionType.SINGLE,
                        options=[
                            {"value": "campaign", "label": "Campaña electoral"},
                            {"value": "coalition", "label": "Coaliciones y alianzas"},
                            {"value": "media", "label": "Comunicación y medios"},
                        ],
                        required=True,
                    ),
                    DiagnosticQuestion(
                        template=tpl,
                        order=2,
                        key="region",
                        prompt="¿País o región principal? (texto libre)",
                        question_type=DiagnosticQuestion.QuestionType.TEXT,
                        options=[],
                        required=False,
                    ),
                ]
            )

        admin_email = os.environ.get("SEED_ADMIN_EMAIL", "admin@example.com")
        admin_pass = os.environ.get("SEED_ADMIN_PASSWORD", "adminadmin12")
        admin, created = User.objects.get_or_create(
            email=admin_email,
            defaults={
                "role": User.Role.ADMIN,
                "is_staff": True,
                "is_superuser": True,
                "is_email_verified": True,
            },
        )
        if created:
            admin.set_password(admin_pass)
            admin.save()
        else:
            if not admin.is_staff:
                admin.is_staff = True
                admin.is_superuser = True
                admin.role = User.Role.ADMIN
                admin.save()

        self._ensure_consultant(
            email="consultant1@example.com",
            password=os.environ.get("SEED_CONSULTANT_PASSWORD", "consultant12"),
            display_name="Consultora Demo",
            headline="Estrategia electoral",
            bio="Experiencia en campañas en LATAM.",
            category_slugs=["campaign", "media"],
            meeting_url="https://meet.google.com/mock-consultant-1",
        )
        self._ensure_consultant(
            email="consultant2@example.com",
            password=os.environ.get("SEED_CONSULTANT2_PASSWORD", "consultant12"),
            display_name="Consultor Demo 2",
            headline="Coaliciones",
            bio="Coaliciones y negociación política.",
            category_slugs=["coalition"],
            meeting_url="https://meet.google.com/mock-consultant-2",
        )

        cand_email = os.environ.get("SEED_CANDIDATE_EMAIL", "candidate@example.com")
        cand_pass = os.environ.get("SEED_CANDIDATE_PASSWORD", "candidate12")
        c_user, c_created = User.objects.get_or_create(
            email=cand_email,
            defaults={
                "role": User.Role.CANDIDATE,
                "is_email_verified": True,
            },
        )
        if c_created:
            c_user.set_password(cand_pass)
            c_user.save()
        CandidateProfile.objects.get_or_create(
            user=c_user, defaults={"display_name": "Candidata Demo"}
        )

        from campaign_diagnostic.seed_data import seed_campaign_knowledge_documents

        seed_campaign_knowledge_documents()

        self.stdout.write(self.style.SUCCESS("Seed completed."))

    def _ensure_consultant(self, email, password, display_name, headline, bio, category_slugs, meeting_url):
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "role": User.Role.CONSULTANT,
                "is_email_verified": True,
            },
        )
        if created:
            user.set_password(password)
            user.save()
        profile, _ = ConsultantProfile.objects.update_or_create(
            user=user,
            defaults={
                "display_name": display_name,
                "headline": headline,
                "bio": bio,
                "default_meeting_url": meeting_url,
                "hourly_rate": 120,
                "approval_status": ConsultantProfile.ApprovalStatus.APPROVED,
                "rejection_reason": "",
            },
        )
        cats = Category.objects.filter(slug__in=category_slugs)
        profile.categories.set(cats)

        base = timezone.now() + timedelta(days=2)
        base = base.replace(minute=0, second=0, microsecond=0)
        if not AvailabilitySlot.objects.filter(consultant=profile, is_booked=False).exists():
            AvailabilitySlot.objects.create(
                consultant=profile,
                start_at=base.replace(hour=15),
                end_at=base.replace(hour=16),
                is_booked=False,
            )
            AvailabilitySlot.objects.create(
                consultant=profile,
                start_at=base.replace(hour=17),
                end_at=base.replace(hour=18),
                is_booked=False,
            )
