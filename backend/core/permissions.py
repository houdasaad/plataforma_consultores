from rest_framework import permissions

from accounts.models import User
from core.demo_access import user_has_demo_capability


class IsStaffUser(permissions.BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(
            u
            and u.is_authenticated
            and (
                u.is_staff
                or getattr(u, "role", None) == User.Role.ADMIN
                or user_has_demo_capability(u, "admin")
            )
        )


class IsConsultant(permissions.BasePermission):
    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated):
            return False
        if u.role == User.Role.CONSULTANT:
            return True
        return user_has_demo_capability(u, "consultant")


class IsCandidate(permissions.BasePermission):
    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated):
            return False
        if u.role == User.Role.CANDIDATE:
            return True
        return user_has_demo_capability(u, "candidate")
