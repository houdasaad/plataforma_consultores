"""Universal demo user — access to staff, consultant, and candidate flows (dev/demo only)."""

from __future__ import annotations

from django.conf import settings

from accounts.models import User


def demo_universal_emails() -> frozenset[str]:
    raw = getattr(settings, "DEMO_UNIVERSAL_EMAILS", ("demo@example.com",))
    return frozenset(e.strip().lower() for e in raw if e and str(e).strip())


def is_universal_demo_user(user) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    return (user.email or "").strip().lower() in demo_universal_emails()


def _has_approved_provider(user) -> bool:
    """Check if the user is linked to an approved provider."""
    try:
        from providers.models import Provider
        return Provider.objects.filter(
            user=user,
            approval_status=Provider.ApprovalStatus.APPROVED,
        ).exists()
    except Exception:
        return False


def demo_capabilities_for(user) -> list[str]:
    """Roles the user may use in the SPA (staff / consultant / candidate / provider)."""
    if not user or not user.is_authenticated:
        return []
    caps: list[str] = []
    if is_universal_demo_user(user):
        caps.extend(["admin", "consultant", "candidate"])
        if _has_approved_provider(user):
            caps.append("provider")
        return caps
    if user.is_staff or user.role == User.Role.ADMIN:
        caps.append("admin")
    if user.role == User.Role.CONSULTANT:
        caps.append("consultant")
    if user.role == User.Role.CANDIDATE:
        caps.append("candidate")
    # Provider capability: any user linked to an approved provider
    if _has_approved_provider(user):
        caps.append("provider")
    return caps


def user_has_demo_capability(user, capability: str) -> bool:
    return capability in demo_capabilities_for(user)
