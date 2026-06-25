"""Approve pending consultants and publish draft services (MVP / local dev)."""

from django.core.management.base import BaseCommand

from consultants.models import ConsultantProfile, ConsultantService


class Command(BaseCommand):
    help = "Make existing consultants and services visible in the public catalog."

    def handle(self, *args, **options):
        consultants = ConsultantProfile.objects.exclude(
            approval_status=ConsultantProfile.ApprovalStatus.APPROVED
        ).update(approval_status=ConsultantProfile.ApprovalStatus.APPROVED)
        services = ConsultantService.objects.exclude(
            publication_status=ConsultantService.PublicationStatus.APPROVED
        ).exclude(
            publication_status=ConsultantService.PublicationStatus.REJECTED
        ).update(publication_status=ConsultantService.PublicationStatus.APPROVED)
        self.stdout.write(
            self.style.SUCCESS(
                f"Updated {consultants} consultant profile(s) and {services} service(s)."
            )
        )
