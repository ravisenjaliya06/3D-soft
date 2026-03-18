from __future__ import annotations

# Python imports
from typing import Optional, Tuple

# External imports
from rest_framework.request import Request
from rest_framework_simplejwt.authentication import JWTAuthentication

# App imports
from umaboy.models import Organization, User


class OrganizationAwareJWTAuthentication(JWTAuthentication):
    """
    JWT auth that applies X-Organization-Id for ghost impersonation *in-memory* (no DB write).

    This ensures DRF views/serializers that read `request.user.selected_organization`
    will see the impersonated organization for the current request.
    """

    def authenticate(
        self: "OrganizationAwareJWTAuthentication", request: Request
    ) -> Optional[Tuple[User, str]]:
        auth_res = super().authenticate(request)
        if not auth_res:
            return None

        user, token = auth_res
        if not getattr(user, "is_ghost", False):
            return (user, token)

        org_id = (request.headers.get("X-Organization-Id") 
            or request.headers.get("x-organization-id")
            or request.META.get("HTTP_X_ORGANIZATION_ID")
        )
        if not org_id or org_id in {"null", "undefined"}:
            return (user, token)

        organization = Organization.objects.filter(id=str(org_id)).first()
        if not organization:
            return (user, token)

        # Only treat as impersonation when org is not user's own.
        if not user.organizations.filter(id=organization.id).exists():
            user.selected_organization = organization

        return (user, token)
