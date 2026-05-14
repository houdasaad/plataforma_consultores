from rest_framework import permissions

from accounts.models import User


class IsStaffUser(permissions.BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(
            u and u.is_authenticated and (u.is_staff or getattr(u, "role", None) == User.Role.ADMIN)
        )


class IsConsultant(permissions.BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.role == User.Role.CONSULTANT)


class IsCandidate(permissions.BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.role == User.Role.CANDIDATE)
