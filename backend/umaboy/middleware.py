# Django imports
from django.http import HttpRequest, HttpResponse, JsonResponse

# App imports
from umaboy.authentication import OrganizationAwareJWTAuthentication
from umaboy.models import Organization

READ_ONLY_METHODS = {"GET", "HEAD", "OPTIONS"}


class GhostUserMiddleware:
    def __init__(self: "GhostUserMiddleware", get_response: callable) -> None:
        self.get_response = get_response
        self.auth = OrganizationAwareJWTAuthentication()

    def __call__(self: "GhostUserMiddleware", request: HttpRequest) -> HttpResponse:
        user = getattr(request, "user", None)

        # Try JWT authentication if not authenticated
        if not user or not user.is_authenticated:
            auth_res = self.auth.authenticate(request)
            if auth_res:
                request.user = user = auth_res[0]

        # If still not authenticated → continue request
        if not user or not user.is_authenticated:
            return self.get_response(request)

        # Ensure selected_organization exists
        if not getattr(user, "selected_organization", None):
            first_org = user.organizations.first()
            if first_org:
                user.selected_organization = first_org

        # Handle ghost users
        if getattr(user, "is_ghost", False):
            org_id = (
                request.headers.get("X-Organization-Id")
                or request.META.get("HTTP_X_ORGANIZATION_ID")
                or request.GET.get("organization_id")
            )

            is_impersonating = False

            if org_id and org_id not in {"null", "undefined"}:
                try:
                    organization = Organization.objects.filter(id=org_id).first()
                    if organization:
                        # Check impersonation
                        is_impersonating = not user.organizations.filter(
                            id=organization.id
                        ).exists()

                        # Always override org in request scope
                        user.selected_organization = organization
                except ValueError:
                    pass

            # Restrict write operations ONLY if impersonating + view access
            if (
                is_impersonating
                and getattr(user, "ghost_access_type", None) == "view"
                and request.method not in READ_ONLY_METHODS
            ):
                return JsonResponse(
                    {"error": "You have read-only access as a ghost user."},
                    status=403,
                )

        return self.get_response(request)
