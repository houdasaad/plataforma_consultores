"""Helpers for service follow / inquiries visibility."""

from django.conf import settings
from django.http import Http404
from django.shortcuts import get_object_or_404

from consultants.models import ConsultantProfile, ConsultantService


def get_catalog_service(service_id: int) -> ConsultantService:
    service = get_object_or_404(
        ConsultantService.objects.select_related("consultant", "category"),
        pk=service_id,
    )
    if service.consultant.approval_status != ConsultantProfile.ApprovalStatus.APPROVED:
        raise Http404
    if service.publication_status == ConsultantService.PublicationStatus.REJECTED:
        raise Http404
    if not getattr(settings, "MVP_AUTO_PUBLISH_SERVICES", False):
        if service.publication_status != ConsultantService.PublicationStatus.APPROVED:
            raise Http404
    return service
