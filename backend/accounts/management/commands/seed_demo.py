import os
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import User
from bookings.models import AvailabilitySlot, Booking
from candidates.models import CandidateProfile
from catalog.models import Category
from consultants.models import ConsultantProfile, ConsultantService, ConsultantCommunityRating
from diagnostics.models import DiagnosticQuestion, DiagnosticTemplate
from payments.models import Payment
from providers.models import Provider


class Command(BaseCommand):
    help = "Seed demo data (idempotent)."

    def handle(self, *args, **options):
        cats = [
            ("Campaña electoral", "campaign"),
            ("Coaliciones y alianzas", "coalition"),
            ("Comunicación y medios", "media"),
            ("Impresión electoral", "printing"),
            ("Publicidad digital", "digital-ads"),
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

        demo_email = os.environ.get("SEED_DEMO_EMAIL", "demo@example.com").strip().lower()
        demo_pass = os.environ.get("SEED_DEMO_PASSWORD", "1234")
        self._ensure_universal_demo(demo_email, demo_pass)

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
        from catalog.seed_categories import seed_political_categories

        seed_political_categories()

        seed_campaign_knowledge_documents()

        self._seed_providers()

        self._seed_payments()

        self._seed_reviews()

        pending_c = ConsultantProfile.objects.exclude(
            approval_status=ConsultantProfile.ApprovalStatus.APPROVED
        ).update(approval_status=ConsultantProfile.ApprovalStatus.APPROVED)
        pending_s = (
            ConsultantService.objects.exclude(
                publication_status=ConsultantService.PublicationStatus.APPROVED
            )
            .exclude(publication_status=ConsultantService.PublicationStatus.REJECTED)
            .update(publication_status=ConsultantService.PublicationStatus.APPROVED)
        )
        if pending_c or pending_s:
            self.stdout.write(f"Catalog sync: {pending_c} consultants, {pending_s} services.")

        self.stdout.write(
            self.style.SUCCESS(
                f"Seed completed. Demo universal: {demo_email} / {demo_pass} "
                "(staff + consultor + candidato)."
            )
        )

    def _ensure_universal_demo(self, email: str, password: str):
        """One account for staff, consultant portal, and candidate portal (demo only)."""
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "role": User.Role.ADMIN,
                "is_staff": True,
                "is_superuser": True,
                "is_email_verified": True,
            },
        )
        changed = False
        if not created:
            if user.role != User.Role.ADMIN:
                user.role = User.Role.ADMIN
                changed = True
            if not user.is_staff:
                user.is_staff = True
                changed = True
            if not user.is_superuser:
                user.is_superuser = True
                changed = True
            if not user.is_email_verified:
                user.is_email_verified = True
                changed = True
            if changed:
                user.save()
        if created or not user.has_usable_password():
            user.set_password(password)
            user.save()

        profile, _ = ConsultantProfile.objects.update_or_create(
            user=user,
            defaults={
                "display_name": "Demo Universal",
                "headline": "Cuenta de demostración — staff, consultor y candidato",
                "bio": "Perfil de consultor para recorrer el portal consultor y el catálogo público.",
                "default_meeting_url": "https://meet.google.com/mock-demo-universal",
                "hourly_rate": 150,
                "approval_status": ConsultantProfile.ApprovalStatus.APPROVED,
                "rejection_reason": "",
                "social_links": {
                    "linkedin": "https://www.linkedin.com/in/demo-universal",
                    "website": "https://example.com",
                },
            },
        )
        cats = Category.objects.filter(slug__in=["campaign", "media"])
        if cats.exists():
            profile.categories.set(cats)
        cat = Category.objects.filter(slug="campaign").first()
        if cat and not ConsultantService.objects.filter(consultant=profile).exists():
            ConsultantService.objects.create(
                consultant=profile,
                name="Paquete demo consultor",
                description="Servicio de ejemplo para la cuenta demo universal.",
                price_usd="999.00",
                category=cat,
                publication_status=ConsultantService.PublicationStatus.APPROVED,
            )
        base = timezone.now() + timedelta(days=3)
        base = base.replace(minute=0, second=0, microsecond=0)
        if not AvailabilitySlot.objects.filter(consultant=profile, is_booked=False).exists():
            AvailabilitySlot.objects.create(
                consultant=profile,
                start_at=base.replace(hour=10),
                end_at=base.replace(hour=11),
                is_booked=False,
            )

        CandidateProfile.objects.get_or_create(
            user=user,
            defaults={"display_name": "Demo Universal (candidato)"},
        )

        # Link a provider so the demo user can access the provider portal / marketplace
        provider, provider_created = Provider.objects.update_or_create(
            identifier="DEMO-UNIVERSAL",
            defaults={
                "name": "Demo Provider (Universal)",
                "contact_email": email,
                "phone": "+56 9 0000 0000",
                "website": "https://example.com",
                "description": (
                    "Proveedor demo para la cuenta universal. "
                    "Ve todos los rubros del marketplace."
                ),
                "approval_status": Provider.ApprovalStatus.APPROVED,
                "user": user,
            },
        )
        provider_cats = Category.objects.filter(slug__in=["printing", "digital-ads"])
        if provider_cats.exists():
            provider.categories.set(provider_cats)
        self.stdout.write(f"  Demo provider linked: {provider.name}")

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

        demo_services = [
            (
                category_slugs[0],
                "Asesoría estratégica de campaña",
                "Planificación territorial, mensaje y calendario electoral.",
                "1200.00",
            ),
            (
                category_slugs[-1] if category_slugs else "campaign",
                "Comunicación y redes",
                "Estrategia digital, contenidos y monitoreo de reputación.",
                "850.00",
            ),
        ]
        for slug, name, description, price in demo_services:
            cat = Category.objects.filter(slug=slug).first()
            if not cat:
                continue
            ConsultantService.objects.update_or_create(
                consultant=profile,
                name=name,
                defaults={
                    "description": description,
                    "price_usd": price,
                    "category": cat,
                    "publication_status": ConsultantService.PublicationStatus.APPROVED,
                },
            )

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

    def _seed_marketplace_requirements(self):
        """Create demo marketplace requirements for printing and digital-ads."""
        from candidates.models import MarketplaceRequirement

        candidate_user = User.objects.filter(role=User.Role.CANDIDATE).first()
        if not candidate_user:
            return

        cat_printing = Category.objects.filter(slug="printing").first()
        cat_digital = Category.objects.filter(slug="digital-ads").first()

        requirements_data = [
            {
                "title": "Impresión de volantes y afiches campaña municipal",
                "description": "Necesito 50,000 volantes full color tamaño A5 y 5,000 afiches tamaño A2 para campaña municipal en Santiago. Incluir diseño básico.",
                "max_deadline_days": 15,
                "max_budget_usd": "2500.00",
                "category": cat_printing,
            },
            {
                "title": "Campaña de publicidad digital en Meta Ads",
                "description": "Necesito campaña segmentada en Facebook e Instagram para llegar a votantes de 25-45 años en la Región Metropolitana. Duración 30 días.",
                "max_deadline_days": 10,
                "max_budget_usd": "4000.00",
                "category": cat_digital,
            },
            {
                "title": "Impresión de material para elecciones internas",
                "description": "Se requiere impresión de boletas de votación, sobres y material institucional para elecciones internas de partido. Cantidad: 10,000 sets.",
                "max_deadline_days": 20,
                "max_budget_usd": "5000.00",
                "category": cat_printing,
            },
            {
                "title": "Google Ads para campaña regional",
                "description": "Campaña de búsqueda y display en Google Ads para candidatura a gobernador regional. Keywords relacionados con política regional y propuestas programáticas.",
                "max_deadline_days": 7,
                "max_budget_usd": "3000.00",
                "category": cat_digital,
            },
        ]

        seeded = 0
        for rd in requirements_data:
            if not rd["category"]:
                continue
            _, created = MarketplaceRequirement.objects.get_or_create(
                candidate=candidate_user,
                title=rd["title"],
                defaults={
                    "description": rd["description"],
                    "max_deadline_days": rd["max_deadline_days"],
                    "max_budget_usd": rd["max_budget_usd"],
                    "category": rd["category"],
                    "status": MarketplaceRequirement.Status.PUBLISHED,
                    "ai_status": MarketplaceRequirement.AiStatus.APPROVED,
                    "ai_review": {"approved": True, "notes": "Demo seed"},
                },
            )
            if created:
                seeded += 1
        if seeded:
            self.stdout.write(f"  {seeded} marketplace requirements seeded.")

    def _seed_providers(self):
        """Create demo providers and link user accounts for provider portal access."""
        cat_printing = Category.objects.filter(slug="printing").first()
        cat_digital = Category.objects.filter(slug="digital-ads").first()

        providers_data = [
            {
                "name": "Impresiones Nacionales S.A.",
                "identifier": "RUT-76.123.456-7",
                "contact_email": "ventas@impresionesnacionales.cl",
                "phone": "+56 2 2123 4567",
                "website": "https://www.impresionesnacionales.cl",
                "description": "Especialistas en impresión de material electoral, boletas, afiches y gigantografías con cobertura nacional.",
                "approval_status": Provider.ApprovalStatus.APPROVED,
                "user_email": "proveedor1@example.com",
                "user_password": "1234",
            },
            {
                "name": "DigitalAds Pro Ltda.",
                "identifier": "RUT-77.987.654-3",
                "contact_email": "info@digitaladspro.cl",
                "phone": "+56 9 8765 4321",
                "website": "https://www.digitaladspro.cl",
                "description": "Agencia de publicidad digital enfocada en campañas políticas. Google Ads, Meta Ads, y segmentación electoral.",
                "approval_status": Provider.ApprovalStatus.APPROVED,
                "user_email": "proveedor2@example.com",
                "user_password": "1234",
            },
            {
                "name": "PrintFast Servicios Gráficos",
                "identifier": "RUT-78.555.111-0",
                "contact_email": "cotizaciones@printfst.cl",
                "phone": "+56 2 2890 1111",
                "website": "https://www.printfast.cl",
                "description": "Impresión digital y offset para campañas electorales. Entrega express.",
                "approval_status": Provider.ApprovalStatus.PENDING,
                "user_email": "proveedor3@example.com",
                "user_password": "1234",
            },
        ]

        for pd in providers_data:
            # Idempotent: update_or_create ensures fields and user link stay correct on re-runs
            provider_defaults = {
                k: v for k, v in pd.items()
                if k not in ("user_email", "user_password")
            }
            # Ensure a linked user account exists for provider portal access
            user_email = pd.get("user_email")
            if user_email:
                user, user_created = User.objects.get_or_create(
                    email=user_email,
                    defaults={
                        "role": User.Role.CANDIDATE,
                        "is_email_verified": True,
                    },
                )
                if user_created or not user.has_usable_password():
                    user.set_password(pd.get("user_password", "1234"))
                    user.save()
                provider_defaults["user"] = user

            provider, created = Provider.objects.get_or_create(
                identifier=pd["identifier"],
                defaults=provider_defaults,
            )
            if not created:
                # Update existing provider's fields (idempotent re-run)
                changed = False
                for field, value in provider_defaults.items():
                    if getattr(provider, field) != value:
                        setattr(provider, field, value)
                        changed = True
                if changed:
                    provider.save()

            if pd["approval_status"] == Provider.ApprovalStatus.APPROVED:
                cats = []
                if "impres" in pd["name"].lower() or "print" in pd["name"].lower():
                    if cat_printing:
                        cats.append(cat_printing)
                if "digital" in pd["name"].lower() or "ads" in pd["name"].lower():
                    if cat_digital:
                        cats.append(cat_digital)
                if cats:
                    provider.categories.set(cats)

            self.stdout.write(f"  Provider seeded: {provider.name}")

        if providers_data:
            self.stdout.write(f"  {len(providers_data)} demo providers ready.")

        self._seed_marketplace_requirements()

    def _seed_payments(self):
        """Create demo bookings and payments so payment history tabs show data."""
        candidate_user = User.objects.filter(role=User.Role.CANDIDATE).first()
        consultant = ConsultantProfile.objects.filter(
            approval_status=ConsultantProfile.ApprovalStatus.APPROVED,
        ).first()
        if not candidate_user or not consultant:
            return

        from datetime import timedelta

        payment_data = [
            {
                "status": Payment.Status.SUCCEEDED,
                "amount": 150,
                "commission": 22.50,
            },
            {
                "status": Payment.Status.HELD,
                "amount": 200,
                "commission": 30.00,
            },
            {
                "status": Payment.Status.RELEASED,
                "amount": 180,
                "commission": 27.00,
            },
        ]

        now = timezone.now()
        seeded = 0

        for i, pd in enumerate(payment_data):
            booking, _ = Booking.objects.get_or_create(
                candidate=candidate_user,
                consultant=consultant,
                status=Booking.Status.CONFIRMED,
                amount=pd["amount"],
                currency="USD",
                defaults={
                    "meeting_url": consultant.default_meeting_url or "https://meet.google.com/mock",
                },
            )

            payment_exists = Payment.objects.filter(
                booking=booking,
                amount=pd["amount"],
            ).exists()
            if payment_exists:
                continue

            extra = {}
            if pd["status"] == Payment.Status.RELEASED:
                extra["paid_at"] = now - timedelta(days=7)
                extra["service_verified_at"] = now - timedelta(days=3)
                extra["released_at"] = now - timedelta(days=2)
            elif pd["status"] == Payment.Status.HELD:
                extra["paid_at"] = now - timedelta(days=5)
                extra["service_verified_at"] = None
                extra["released_at"] = None
            else:
                extra["paid_at"] = now - timedelta(days=10)

            Payment.objects.create(
                booking=booking,
                amount=pd["amount"],
                commission_amount=pd["commission"],
                currency="USD",
                status=pd["status"],
                provider="mock",
                external_id=f"seed_demo_payment_{i}",
                raw_payload={"seed": True, "index": i},
                **extra,
            )
            seeded += 1

        if seeded:
            self.stdout.write(f"  {seeded} demo payments seeded.")

    def _seed_reviews(self):
        """Create demo community ratings (positive and negative) for demo consultants.

        Reviews are linked to demo bookings that have slot.end_at in the past
        and a payment with service_verified_at set.
        """
        from datetime import timedelta

        # Find consultants we can create reviews for
        consultants = ConsultantProfile.objects.filter(
            approval_status=ConsultantProfile.ApprovalStatus.APPROVED,
        )[:2]

        writer = User.objects.filter(email="candidate@example.com").first()

        if not consultants or not writer:
            return

        seeded = 0
        now = timezone.now()

        # Positive reviews (4-5 stars)
        positive_reviews = [
            {
                "work_quality_score": 5,
                "comment": (
                    "Muy profesional y puntual. Conocimiento profundo del área "
                    "de {headline}. Totalmente recomendable."
                ),
            },
            {
                "work_quality_score": 4,
                "comment": (
                    "Buena asesoría, muy claro al explicar la estrategia. "
                    "Solo faltó un poco más de seguimiento post-sesión."
                ),
            },
        ]

        # Negative reviews (1-2 stars)
        negative_reviews = [
            {
                "work_quality_score": 2,
                "comment": (
                    "Llegó 20 minutos tarde a la videollamada sin avisar. "
                    "El contenido fue superficial, esperaba más profundidad."
                ),
            },
            {
                "work_quality_score": 1,
                "comment": (
                    "No cumplió con lo prometido. El material entregado era genérico "
                    "y no adaptado al contexto de nuestra campaña local."
                ),
            },
        ]

        day_offset = 0

        for consultant in consultants:
            for review_data in positive_reviews + negative_reviews:
                day_offset += 1

                slot = AvailabilitySlot.objects.create(
                    consultant=consultant,
                    start_at=now - timedelta(days=day_offset + 20),
                    end_at=now - timedelta(days=day_offset + 20, hours=-1),
                    is_booked=True,
                )

                booking = Booking.objects.create(
                    candidate=writer,
                    consultant=consultant,
                    slot=slot,
                    status=Booking.Status.CONFIRMED,
                    amount=consultant.hourly_rate or 100,
                    currency="USD",
                    meeting_url=consultant.default_meeting_url or "https://meet.google.com/mock",
                )

                Payment.objects.create(
                    booking=booking,
                    amount=booking.amount,
                    commission_amount=round(float(booking.amount) * 0.15, 2),
                    currency="USD",
                    status=Payment.Status.RELEASED,
                    provider="mock",
                    external_id=f"seed_review_payment_{booking.id}",
                    paid_at=now - timedelta(days=day_offset + 15),
                    service_verified_at=now - timedelta(days=day_offset + 13),
                    released_at=now - timedelta(days=day_offset + 12),
                )

                comment = review_data["comment"].format(headline=consultant.headline)

                _, created = ConsultantCommunityRating.objects.get_or_create(
                    reviewer=writer,
                    booking=booking,
                    defaults={
                        "consultant": consultant,
                        "work_quality_score": review_data["work_quality_score"],
                        "comment": comment,
                    },
                )
                if created:
                    seeded += 1

        if seeded:
            self.stdout.write(f"  {seeded} demo community ratings seeded (positive and negative).")
