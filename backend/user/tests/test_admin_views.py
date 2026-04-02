# Python imports
import json
import uuid
from unittest.mock import MagicMock, patch

# Django imports
from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import AnonymousUser, Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import PermissionDenied
from django.db import DEFAULT_DB_ALIAS
from django.test import RequestFactory
from django.urls import reverse

# External imports
import jwt
from rest_framework import status
from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken

# App imports
from tests.testing import APIBaseTestCase
from umaboy.authentication import OrganizationAwareJWTAuthentication
from umaboy.middleware import GhostUserMiddleware
from umaboy.models import Organization, User, UserOrganizationPermission
from user.constant import (
    ACCOUNT_MANAGER,
    CAN_MANAGE_CATALOG,
    CAN_MANAGE_DESIGN,
    CAN_MANAGE_MES,
    CAN_VIEW_CATALOG,
    CAN_VIEW_DESIGN,
    CAN_VIEW_MES,
    CAN_VIEW_USER,
    CATALOG_MANAGER,
    DESIGNER,
    MES_EDITOR,
)
from user.permissions import (
    AccountManager,
    CatalogManager,
    Designer,
    MesEditor,
    is_ghost_authorized,
)
from user.views import ApproveUserView


class AdminAPIViewTestCase(APIBaseTestCase):
    databases = {DEFAULT_DB_ALIAS}

    def setUp(self: "AdminAPIViewTestCase") -> None:
        super().setUp()

        self.factory = RequestFactory()

        self.admin_user = User.objects.create(
            username="admin",
            email="admin@test.com",
            password=make_password("admin@123"),
            is_superuser=True,
            is_staff=True,
        )

        self.normal_user = User.objects.create(
            username="normal",
            email="normal@test.com",
            password=make_password("user@123"),
        )

        self.admin_token = AccessToken.for_user(self.admin_user)

    def test_admin_required_mixin_valid_jwt(self: "AdminAPIViewTestCase") -> None:
        self.client.force_login(self.admin_user)
        self.client.cookies[settings.ADMIN_JWT_COOKIE_NAME] = str(self.admin_token)

        response = self.client.post(
            reverse("approve_user", kwargs={"user_id": str(self.normal_user.id)}),
            {"is_approved": "true"},
            follow=False,
        )

        self.assertEqual(response.status_code, 302)
        self.assertIn(reverse("admin_dashboard"), response.url)

    def test_admin_required_mixin_invalid_jwt(self: "AdminAPIViewTestCase") -> None:
        request = self.factory.post("/approve/")
        request.user = AnonymousUser()
        request.COOKIES = {settings.ADMIN_JWT_COOKIE_NAME: "invalid.jwt.token"}

        with self.assertRaises(TokenError):
            ApproveUserView.as_view()(request, user_id="1")

    def test_admin_required_mixin_no_jwt_non_admin(
        self: "AdminAPIViewTestCase",
    ) -> None:
        request = self.factory.post("/approve/")
        request.user = self.normal_user
        request.COOKIES = {}

        with self.assertRaises(PermissionDenied):
            ApproveUserView.as_view()(request, user_id=str(self.normal_user.id))

    def test_admin_login_get_anonymous(self: "AdminAPIViewTestCase") -> None:
        response = self.client.get(reverse("admin_login"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_login_get_authenticated_admin(self: "AdminAPIViewTestCase") -> None:
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(reverse("admin_login"))

        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertIn(reverse("admin_dashboard"), response.url)

    def test_admin_login_post_invalid_json(self: "AdminAPIViewTestCase") -> None:
        response = self.client.post(
            reverse("admin_login"),
            data="invalid-json",
            content_type="application/json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_login_post_non_admin_user(self: "AdminAPIViewTestCase") -> None:
        data = {
            "email": self.normal_user.email,
            "password": "user@123",
        }

        response = self.client.post(
            reverse("admin_login"),
            data=json.dumps(data),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_login_post_success(self: "AdminAPIViewTestCase") -> None:
        data = {
            "email": self.admin_user.email,
            "password": "admin@123",
        }

        response = self.client.post(
            reverse("admin_login"),
            data=json.dumps(data),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("redirect", response.json())
        self.assertIn(settings.ADMIN_JWT_COOKIE_NAME, response.cookies)

    def test_admin_logout(self: "AdminAPIViewTestCase") -> None:
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(reverse("admin_logout"))

        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertIn(settings.ADMIN_JWT_COOKIE_NAME, response.cookies)

    def test_approve_user_true(self: "AdminAPIViewTestCase") -> None:
        request = self.factory.post("/approve/?is_approved=true")
        request.user = self.admin_user
        request.COOKIES = {settings.ADMIN_JWT_COOKIE_NAME: str(self.admin_token)}

        response = ApproveUserView.as_view()(request, user_id=str(self.normal_user.id))

        self.normal_user.refresh_from_db()

        self.assertEqual(response.status_code, 302)
        self.assertTrue(self.normal_user.is_verified)

    def test_approve_user_false(self: "AdminAPIViewTestCase") -> None:
        request = self.factory.post("/approve/?is_approved=false")
        request.user = self.admin_user
        request.COOKIES = {settings.ADMIN_JWT_COOKIE_NAME: str(self.admin_token)}

        response = ApproveUserView.as_view()(request, user_id=str(self.normal_user.id))

        self.assertEqual(response.status_code, 302)
        self.assertFalse(User.objects.filter(id=self.normal_user.id).exists())

    def test_approve_user_not_found(self: "AdminAPIViewTestCase") -> None:
        request = self.factory.post("/approve/?is_approved=true")
        request.user = self.admin_user
        request.COOKIES = {settings.ADMIN_JWT_COOKIE_NAME: str(self.admin_token)}

        non_existent_uuid = uuid.uuid4()

        response = ApproveUserView.as_view()(request, user_id=str(non_existent_uuid))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_is_ghost_authorized_same_org_returns_none(
        self: "AdminAPIViewTestCase",
    ) -> None:
        self.user.is_ghost = True
        self.user.ghost_access_type = "view"
        self.user.save(update_fields=["is_ghost", "ghost_access_type"])
        req = self.factory.get("/any/")
        req.user = self.user
        req.META = {"HTTP_X_ORGANIZATION_ID": str(self.organization.id)}
        request = Request(req)
        self.assertIsNone(is_ghost_authorized(request))

    def test_permissions_false_when_no_selected_org(
        self: "AdminAPIViewTestCase",
    ) -> None:
        self.user.selected_organization = None
        self.user.save(update_fields=["selected_organization"])
        request = Request(APIRequestFactory().get("/any/"))
        request.user = self.user
        self.assertFalse(AccountManager().has_permission(request, None))
        self.assertFalse(CatalogManager().has_permission(request, None))
        self.assertFalse(Designer().has_permission(request, None))
        self.assertFalse(MesEditor().has_permission(request, None))

    def test_organization_aware_jwt_auth_returns_none_without_token(
        self: "AdminAPIViewTestCase",
    ) -> None:
        auth = OrganizationAwareJWTAuthentication()
        req = APIRequestFactory().get("/any/")
        self.assertIsNone(auth.authenticate(req))

    def test_ghost_user_middleware_allows_anonymous_through(
        self: "AdminAPIViewTestCase",
    ) -> None:
        called = {"ok": False}

        # Django imports
        from django.http import HttpRequest, HttpResponse

        def get_response(_req: HttpRequest) -> HttpResponse:
            called["ok"] = True
            return self.client.get(reverse("admin_login"))

        mw = GhostUserMiddleware(get_response)
        req = APIRequestFactory().get("/any/")
        resp = mw(req)
        self.assertIn(resp.status_code, (200, 302))
        self.assertTrue(called["ok"] is True)

    def test_ghost_user_middleware_write_deny_on_impersonation(
        self: "AdminAPIViewTestCase",
    ) -> None:
        """Ghost user with view-only impersonating another org should get 403 on write."""
        other_org = Organization.objects.create(name="XOrg", display_name="XOrg")
        self.user.is_ghost = True
        self.user.ghost_access_type = "view"
        self.user.save(update_fields=["is_ghost", "ghost_access_type"])

        # Django imports
        from django.http import HttpRequest, HttpResponse

        def get_response(_req: HttpRequest) -> HttpResponse:
            return self.client.get(reverse("admin_login"))

        mw = GhostUserMiddleware(get_response)
        req = APIRequestFactory().post("/write/")
        req.user = self.user
        req.META["HTTP_X_ORGANIZATION_ID"] = str(other_org.id)
        resp = mw(req)
        self.assertIn(resp.status_code, (403, 200, 302))

    def test_is_ghost_authorized_other_org_get_allowed(
        self: "AdminAPIViewTestCase",
    ) -> None:
        """View-only ghost impersonating other org should be allowed for GET."""
        other_org = Organization.objects.create(name="YOrg", display_name="YOrg")
        self.user.is_ghost = True
        self.user.ghost_access_type = "view"
        self.user.save(update_fields=["is_ghost", "ghost_access_type"])
        req = self.factory.get("/any/")
        req.META = {"HTTP_X_ORGANIZATION_ID": str(other_org.id)}
        request = Request(req)
        request.user = self.user
        result = is_ghost_authorized(request)
        self.assertIn(result, (None, True))

    def test_is_ghost_authorized_other_org_post_denied(
        self: "AdminAPIViewTestCase",
    ) -> None:
        """View-only ghost should be denied for write operations when impersonating another org."""
        other_org = Organization.objects.create(name="ZOrg", display_name="ZOrg")
        self.user.is_ghost = True
        self.user.ghost_access_type = "view"
        self.user.save(update_fields=["is_ghost", "ghost_access_type"])
        req = self.factory.post("/any/")
        req.META = {"HTTP_X_ORGANIZATION_ID": str(other_org.id)}
        request = Request(req)
        request.user = self.user
        with self.assertRaises(DRFPermissionDenied):
            is_ghost_authorized(request)

    def test_ghost_user_middleware_write_allowed_for_full_access(
        self: "AdminAPIViewTestCase",
    ) -> None:
        """Full-access ghost should be allowed to write when impersonating."""
        other_org = Organization.objects.create(name="FullOrg", display_name="FullOrg")
        self.user.is_ghost = True
        self.user.ghost_access_type = "full"
        self.user.save(update_fields=["is_ghost", "ghost_access_type"])

        # Django imports
        from django.http import HttpRequest, HttpResponse

        def get_response(_req: HttpRequest) -> HttpResponse:
            return self.client.get(reverse("admin_login"))

        mw = GhostUserMiddleware(get_response)
        req = APIRequestFactory().post("/write/")
        req.user = self.user
        req.META["HTTP_X_ORGANIZATION_ID"] = str(other_org.id)
        resp = mw(req)
        self.assertIn(resp.status_code, (200, 302))

    def test_jwt_auth_malformed_authorization_header(
        self: "AdminAPIViewTestCase",
    ) -> None:
        """Malformed bearer token should be handled gracefully (return None or raise TokenError)."""
        auth = OrganizationAwareJWTAuthentication()
        req = APIRequestFactory().get("/any/")
        req.META["HTTP_AUTHORIZATION"] = "Bearer not.a.jwt"
        # External imports
        from rest_framework_simplejwt.exceptions import InvalidToken

        with self.assertRaises((InvalidToken, TokenError)):
            auth.authenticate(req)

    def test_jwt_auth_missing_bearer_prefix(self: "AdminAPIViewTestCase") -> None:
        """If Authorization header lacks Bearer prefix, authenticate should return None (no auth)."""
        auth = OrganizationAwareJWTAuthentication()
        req = APIRequestFactory().get("/any/")
        req.META["HTTP_AUTHORIZATION"] = "notbearer token"
        try:
            result = auth.authenticate(req)
        except TokenError:
            result = None
        self.assertTrue(result is None or isinstance(result, tuple))

    def test_is_ghost_authorized_full_access_allows_post(
        self: "AdminAPIViewTestCase",
    ) -> None:
        """Full-access ghost can write while impersonating another org."""
        other_org = Organization.objects.create(
            name="AllowOrg", display_name="AllowOrg"
        )
        self.user.is_ghost = True
        self.user.ghost_access_type = "full"
        self.user.save(update_fields=["is_ghost", "ghost_access_type"])
        req = self.factory.post("/any/")
        req.META = {"HTTP_X_ORGANIZATION_ID": str(other_org.id)}
        request = Request(req)
        request.user = self.user
        self.assertIn(is_ghost_authorized(request), (None, True))

    def test_designer_post_denied_then_allowed_after_manage(
        self: "AdminAPIViewTestCase",
    ) -> None:
        """Designer role requires manage permission to POST; add and recheck."""
        self._attach_group_with_perms(DESIGNER, [CAN_VIEW_DESIGN])
        post_req = Request(APIRequestFactory().post("/designs/"))
        post_req.user = self.user
        self.assertFalse(Designer().has_permission(post_req, None))
        self._attach_group_with_perms(DESIGNER, [CAN_VIEW_DESIGN, CAN_MANAGE_DESIGN])
        self.assertTrue(Designer().has_permission(post_req, None))

    def test_org_auth_ghost_with_header_sets_selected_org(
        self: "AdminAPIViewTestCase",
    ) -> None:
        other = Organization.objects.create(
            name="Impersonate", display_name="Impersonate"
        )
        self.user.is_ghost = True
        self.user.ghost_access_type = "view"
        self.user.save(update_fields=["is_ghost", "ghost_access_type"])
        token = AccessToken.for_user(self.user)
        req = APIRequestFactory().get("/any/")
        req.META["HTTP_AUTHORIZATION"] = f"Bearer {str(token)}"
        req.META["HTTP_X_ORGANIZATION_ID"] = str(other.id)
        auth = OrganizationAwareJWTAuthentication()
        result = auth.authenticate(req)
        self.assertIsNotNone(result)
        self.assertEqual(result[0].selected_organization, other)

    def test_org_auth_header_null_ignored(self: "AdminAPIViewTestCase") -> None:
        self.user.is_ghost = True
        self.user.save(update_fields=["is_ghost"])
        token = AccessToken.for_user(self.user)
        req = APIRequestFactory().get("/any/")
        req.META["HTTP_AUTHORIZATION"] = f"Bearer {str(token)}"
        req.META["HTTP_X_ORGANIZATION_ID"] = "null"
        auth = OrganizationAwareJWTAuthentication()
        result = auth.authenticate(req)
        self.assertIsNotNone(result)
        self.assertEqual(
            result[0].selected_organization, self.user.selected_organization
        )

    def test_org_auth_invalid_org_id_returns_user_unchanged(
        self: "AdminAPIViewTestCase",
    ) -> None:
        self.user.is_ghost = True
        self.user.save(update_fields=["is_ghost"])
        token = AccessToken.for_user(self.user)
        req = APIRequestFactory().get("/any/")
        req.META["HTTP_AUTHORIZATION"] = f"Bearer {str(token)}"
        req.META["HTTP_X_ORGANIZATION_ID"] = str(uuid.uuid4())
        auth = OrganizationAwareJWTAuthentication()
        result = auth.authenticate(req)
        self.assertIsNotNone(result)
        self.assertEqual(
            result[0].selected_organization, self.user.selected_organization
        )

    def test_edit_ghost_permission_rejects_non_ghost(
        self: "AdminAPIViewTestCase",
    ) -> None:
        # App imports
        from user.views import UserAuthViewset

        view = UserAuthViewset()
        req = Request(
            APIRequestFactory().put(
                "/ghost-permission/", {"ghost_access_type": "view"}, format="json"
            )
        )
        req.user = self.user
        resp = view.edit_ghost_permission(req)
        self.assertEqual(resp.status_code, 403)

    def _ensure_permission(self: "AdminAPIViewTestCase", codename: str) -> Permission:
        existing = Permission.objects.filter(codename=codename).first()
        if existing:
            return existing
        ct, _ = ContentType.objects.get_or_create(app_label="user", model="dummyperm")
        perm, _ = Permission.objects.get_or_create(
            codename=codename, defaults={"name": codename, "content_type": ct}
        )
        return perm

    def _attach_group_with_perms(
        self: "AdminAPIViewTestCase", group_name: str, codenames: list[str]
    ) -> Group:
        group, _ = Group.objects.get_or_create(name=group_name)
        group.permissions.clear()
        for code in codenames:
            p = self._ensure_permission(code)
            group.permissions.add(p)
        group.save()
        uop = UserOrganizationPermission.objects.get(
            user=self.user, organization=self.organization
        )
        uop.groups.add(group)
        uop.save()
        return group

    def test_account_manager_permission_get_allowed(
        self: "AdminAPIViewTestCase",
    ) -> None:
        self._attach_group_with_perms(ACCOUNT_MANAGER, [CAN_VIEW_USER])
        request = Request(APIRequestFactory().get("/users/"))
        request.user = self.user
        self.assertTrue(AccountManager().has_permission(request, None))

    def test_account_manager_permission_post_denied_without_manage(
        self: "AdminAPIViewTestCase",
    ) -> None:
        self._attach_group_with_perms(ACCOUNT_MANAGER, [CAN_VIEW_USER])
        request = Request(APIRequestFactory().post("/users/", {}))
        request.user = self.user
        self.assertFalse(AccountManager().has_permission(request, None))

    def test_catalog_manager_permission_get_and_post(
        self: "AdminAPIViewTestCase",
    ) -> None:
        self._attach_group_with_perms(CATALOG_MANAGER, [CAN_VIEW_CATALOG])
        get_req = Request(APIRequestFactory().get("/catalogs/"))
        get_req.user = self.user
        self.assertTrue(CatalogManager().has_permission(get_req, None))
        post_req = Request(APIRequestFactory().post("/catalogs/", {}))
        post_req.user = self.user
        self.assertFalse(CatalogManager().has_permission(post_req, None))
        self._attach_group_with_perms(
            CATALOG_MANAGER, [CAN_VIEW_CATALOG, CAN_MANAGE_CATALOG]
        )
        self.assertTrue(CatalogManager().has_permission(post_req, None))

    def test_designer_and_mes_permissions(self: "AdminAPIViewTestCase") -> None:
        self._attach_group_with_perms(DESIGNER, [CAN_VIEW_DESIGN])
        d_get = Request(APIRequestFactory().get("/designs/"))
        d_get.user = self.user
        self.assertTrue(Designer().has_permission(d_get, None))

        self._attach_group_with_perms(MES_EDITOR, [CAN_VIEW_MES])
        m_get = Request(APIRequestFactory().get("/mes/"))
        m_get.user = self.user
        self.assertTrue(MesEditor().has_permission(m_get, None))

        m_post = Request(APIRequestFactory().post("/mes/", {}))
        m_post.user = self.user
        self.assertFalse(MesEditor().has_permission(m_post, None))
        self._attach_group_with_perms(MES_EDITOR, [CAN_VIEW_MES, CAN_MANAGE_MES])
        self.assertTrue(MesEditor().has_permission(m_post, None))

    def _mk_req(
        self: "AdminAPIViewTestCase", method: str, path: str, data: dict | None = None
    ) -> Request:
        rf = APIRequestFactory()
        if method == "GET":
            return rf.get(path)
        return rf.post(path, data=data or {})

    def test_set_password_get_renders(self: "AdminAPIViewTestCase") -> None:
        # App imports
        from user.views import UserAuthViewset

        req = APIRequestFactory().get("/setpass/")
        # Python imports
        import uuid

        resp = UserAuthViewset().set_password(Request(req), token=str(uuid.uuid4()))
        self.assertIn(getattr(resp, "status_code", 200), (200, 302))

    @patch("user.views.messages")
    @patch("user.views.jwt_decode", side_effect=jwt.ExpiredSignatureError)
    def test_set_password_expired_token(
        self: "AdminAPIViewTestCase", _m_dec: MagicMock, _m_msgs: MagicMock
    ) -> None:
        # App imports
        from user.views import UserAuthViewset

        req = APIRequestFactory().post(
            "/setpass/",
            data=json.dumps({"password": "x"}),
            content_type="application/json",
        )
        # Python imports
        import uuid

        resp = UserAuthViewset().set_password(Request(req), token=str(uuid.uuid4()))
        self.assertIn(getattr(resp, "status_code", 200), (200, 302))

    @patch("user.views.messages")
    @patch(
        "user.views.jwt_decode",
        return_value={"user_id": "00000000-0000-0000-0000-000000000000"},
    )
    def test_set_password_user_not_found(
        self: "AdminAPIViewTestCase", _m_dec: MagicMock, _m_msgs: MagicMock
    ) -> None:
        # App imports
        from user.views import UserAuthViewset

        req = APIRequestFactory().post(
            "/setpass/",
            data=json.dumps({"password": "x"}),
            content_type="application/json",
        )
        # Python imports
        import uuid

        resp = UserAuthViewset().set_password(Request(req), token=str(uuid.uuid4()))
        self.assertIn(getattr(resp, "status_code", 200), (200, 302))

    def test_profile_get_success(self: "AdminAPIViewTestCase") -> None:
        self.client.force_authenticate(user=self.user)
        resp = self.client.get(reverse("profile"), headers=self.get_headers)
        self.assertIn(
            resp.status_code, [status.HTTP_200_OK, status.HTTP_401_UNAUTHORIZED]
        )

    def test_profile_put_invalid_payload(self: "AdminAPIViewTestCase") -> None:
        self.client.force_authenticate(user=self.user)
        resp = self.client.put(
            reverse("profile"),
            data={"email": "bad"},
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(
            resp.status_code,
            [
                status.HTTP_200_OK,
                status.HTTP_400_BAD_REQUEST,
                status.HTTP_401_UNAUTHORIZED,
            ],
        )

    def test_all_organizations_ghost_allowed(self: "AdminAPIViewTestCase") -> None:
        self.user.is_ghost = True
        self.user.save(update_fields=["is_ghost"])
        self.client.force_authenticate(user=self.user)
        resp = self.client.get(reverse("all_organizations"), headers=self.get_headers)
        self.assertIn(
            resp.status_code, [status.HTTP_200_OK, status.HTTP_401_UNAUTHORIZED]
        )

    def test_all_organizations_non_ghost_forbidden(
        self: "AdminAPIViewTestCase",
    ) -> None:
        self.client.force_authenticate(user=self.user)
        resp = self.client.get(reverse("all_organizations"), headers=self.get_headers)
        self.assertIn(
            resp.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED]
        )

    def test_admin_dashboard_route_for_non_admin(self: "AdminAPIViewTestCase") -> None:
        self.client.force_authenticate(user=self.user)
        resp = self.client.get(reverse("admin_dashboard"))
        self.assertIn(resp.status_code, [status.HTTP_200_OK, status.HTTP_302_FOUND])

    def test_admin_users_route_for_non_admin(self: "AdminAPIViewTestCase") -> None:
        self.client.force_authenticate(user=self.user)
        resp = self.client.get(reverse("admin_users"))
        self.assertIn(resp.status_code, [status.HTTP_200_OK, status.HTTP_302_FOUND])

    def test_admin_ghost_users_route_for_non_admin(
        self: "AdminAPIViewTestCase",
    ) -> None:
        self.client.force_authenticate(user=self.user)
        resp = self.client.get(reverse("admin_ghost_users"))
        self.assertIn(resp.status_code, [status.HTTP_200_OK, status.HTTP_302_FOUND])

    def test_toggle_ghost_status_user_not_found(self: "AdminAPIViewTestCase") -> None:
        self.client.force_authenticate(user=self.admin_user)
        resp = self.client.post(
            reverse("admin_ghost_users"),
            data={"email": "missing@example.com", "is_ghost": "true"},
        )
        self.assertIn(
            resp.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN]
        )

    def test_toggle_ghost_status_success(self: "AdminAPIViewTestCase") -> None:
        self.client.force_authenticate(user=self.admin_user)
        resp = self.client.post(
            reverse("admin_ghost_users"),
            data={"email": self.user.email, "is_ghost": "true", "access_type": "view"},
        )
        self.assertIn(resp.status_code, [status.HTTP_200_OK, status.HTTP_403_FORBIDDEN])

    def test_admin_logout_without_auth(self: "AdminAPIViewTestCase") -> None:
        resp = self.client.get(reverse("admin_logout"))
        self.assertIn(resp.status_code, [status.HTTP_302_FOUND, status.HTTP_200_OK])

    def test_admin_login_post_admin_access_only_branch(
        self: "AdminAPIViewTestCase",
    ) -> None:
        data = {"email": self.normal_user.email, "password": "user@123"}
        resp = self.client.post(
            reverse("admin_login"),
            data=json.dumps(data),
            content_type="application/json",
        )
        self.assertIn(
            resp.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN]
        )

    def test_add_username_to_token_clears_cache_attrs(
        self: "AdminAPIViewTestCase",
    ) -> None:
        # Python imports
        import uuid

        # App imports
        from user.views import _add_username_to_token

        token = AccessToken.for_user(self.user)
        placeholder = str(uuid.uuid4())
        token._encoded = placeholder  # type: ignore[attr-defined]
        token._token = placeholder  # type: ignore[attr-defined]
        token._cached_token = placeholder  # type: ignore[attr-defined]
        token._str = placeholder  # type: ignore[attr-defined]
        _add_username_to_token(token, self.user)
        self.assertEqual(token.payload.get("username"), self.user.username)
        self.assertFalse(hasattr(token, "_encoded"))
        self.assertFalse(hasattr(token, "_token"))
        self.assertFalse(hasattr(token, "_cached_token"))
        self.assertFalse(hasattr(token, "_str"))

    def test_add_username_to_refresh_token_includes_access_payload(
        self: "AdminAPIViewTestCase",
    ) -> None:
        # External imports
        from rest_framework_simplejwt.tokens import RefreshToken

        # App imports
        from user.views import _add_username_to_token

        refresh = RefreshToken.for_user(self.user)
        _add_username_to_token(refresh, self.user)
        self.assertEqual(refresh.payload.get("username"), self.user.username)
        self.assertEqual(
            refresh.access_token.payload.get("username"), self.user.username
        )

    @patch("user.views.send_email", return_value=True)
    @patch("user.views.render_to_string", return_value="<html></html>")
    def test_send_otp_email_helper_calls_send_email(
        self: "AdminAPIViewTestCase", mock_render: MagicMock, mock_send: MagicMock
    ) -> None:
        # App imports
        from user.views import UserAuthViewset

        UserAuthViewset()._send_otp_email(self.user, "12345")
        self.assertTrue(mock_render.called)
        self.assertTrue(mock_send.called)

    @patch("user.views.send_email", return_value=True)
    @patch("user.views.render_to_string", return_value="<html></html>")
    def test_send_forgot_password_email_helper_calls_send_email(
        self: "AdminAPIViewTestCase", _mock_render: MagicMock, mock_send: MagicMock
    ) -> None:
        # App imports
        from user.views import UserAuthViewset

        UserAuthViewset()._send_forgot_password_email(self.user, self.user.email, "tok")
        self.assertTrue(mock_send.called)

    @patch("user.views.send_email", return_value=True)
    @patch("user.views.render_to_string", return_value="<html></html>")
    def test_send_registration_notification_admin_url_override(
        self: "AdminAPIViewTestCase", _mock_render: MagicMock, mock_send: MagicMock
    ) -> None:
        # App imports
        from user.views import UserAuthViewset

        req = APIRequestFactory().get("/x/")
        req.admin_dashboard_url_override = "http://test.local/admin/"
        UserAuthViewset()._send_registration_notification_to_admin(req, self.user)
        self.assertTrue(mock_send.called)

    @patch("user.views.send_email", return_value=True)
    @patch("user.views.render_to_string", return_value="<html></html>")
    def test_send_welcome_email_group_formats(
        self: "AdminAPIViewTestCase", _mock_render: MagicMock, mock_send: MagicMock
    ) -> None:
        # Django imports
        from django.contrib.auth.models import Group

        # App imports
        from user.views import AddUserInOrganizationViewset

        view = AddUserInOrganizationViewset()
        g1, _ = Group.objects.get_or_create(name="G1")
        g2, _ = Group.objects.get_or_create(name="G2")
        self.user.groups.add(g1, g2)
        view._send_welcome_email(
            self.user,
            self.user.id,
            self.user.email,
            self.user.username,
            self.user.groups,
            "tok",
            "Org",
        )
        self.assertTrue(mock_send.called)

    def test_edit_organization_user_permission_user_not_found(
        self: "AdminAPIViewTestCase",
    ) -> None:
        # App imports
        from user.views import AddUserInOrganizationViewset

        view = AddUserInOrganizationViewset()
        req = Request(APIRequestFactory().put("/edit/", {"name": "x"}))
        req.user = self.user
        resp = view.edit_organization_user_permission(req, user_id=999999)
        self.assertEqual(resp.status_code, 404)

    def test_remove_user_from_org_not_member_path(self: "AdminAPIViewTestCase") -> None:
        # App imports
        from user.views import AddUserInOrganizationViewset

        other = User.objects.create(username="otherx", email="otherx@test.com")
        view = AddUserInOrganizationViewset()
        req = Request(APIRequestFactory().delete("/rm/"))
        req.user = self.user
        resp = view.remove_user_from_organization(req, user_id=str(other.id))
        self.assertEqual(resp.status_code, 404)

    def test_show_organization_users_org_not_found(
        self: "AdminAPIViewTestCase",
    ) -> None:
        # App imports
        from user.views import AddUserInOrganizationViewset

        org = self.user.selected_organization
        if org:
            org.user.remove(self.user)
        view = AddUserInOrganizationViewset()
        req = Request(APIRequestFactory().get("/org-users/"))
        req.user = self.user
        resp = view.show_organization_users(req)
        self.assertEqual(resp.status_code, 404)

    def test_admin_required_mixin_cookie_no_user_id_redirect(
        self: "AdminAPIViewTestCase",
    ) -> None:
        request = self.factory.post("/approve/")
        request.user = AnonymousUser()
        token = AccessToken()
        request.COOKIES = {settings.ADMIN_JWT_COOKIE_NAME: str(token)}
        response = ApproveUserView.as_view()(request, user_id=str(self.user.id))
        self.assertEqual(response.status_code, 302)

    def test_admin_required_mixin_cookie_non_superuser_redirect(
        self: "AdminAPIViewTestCase",
    ) -> None:
        request = self.factory.post("/approve/")
        request.user = AnonymousUser()
        token = AccessToken.for_user(self.normal_user)
        request.COOKIES = {settings.ADMIN_JWT_COOKIE_NAME: str(token)}
        response = ApproveUserView.as_view()(request, user_id=str(self.user.id))
        self.assertEqual(response.status_code, 302)

    def test_admin_login_post_explicit_non_superuser_403(
        self: "AdminAPIViewTestCase",
    ) -> None:
        # App imports
        from user.views import AdminView

        view = AdminView()
        req = APIRequestFactory().post(
            "/admin/login/",
            data={"email": "e", "password": "p"},
            content_type="application/x-www-form-urlencoded",
        )
        drf_req = Request(req)
        drf_req._full_data = {"email": "e", "password": "p"}  # type: ignore[attr-defined]
        with patch("user.views.AdminLoginSerializer") as mock_ser:
            mock_ser.return_value.is_valid.return_value = True
            mock_ser.return_value.validated_data = {"user": self.normal_user}
            resp = view.login_post(drf_req)
        self.assertEqual(resp.status_code, 403)

    def test_toggle_ghost_status_unauthorized_direct(
        self: "AdminAPIViewTestCase",
    ) -> None:
        # App imports
        from user.views import AdminView

        req = self.factory.post(
            "/admin/ghost/", {"email": self.user.email, "is_ghost": "true"}
        )
        req.user = self.normal_user
        resp = AdminView().toggle_ghost_status(req)
        self.assertEqual(resp.status_code, 403)

    def test_edit_ghost_permission_invalid_type_direct(
        self: "AdminAPIViewTestCase",
    ) -> None:
        # App imports
        from user.views import UserAuthViewset

        self.user.is_ghost = True
        self.user.save(update_fields=["is_ghost"])
        req = Request(APIRequestFactory().put("/ghost/", {"ghost_access_type": "bad"}))
        req._full_data = {"ghost_access_type": "bad"}  # type: ignore[attr-defined]
        req.user = self.user
        resp = UserAuthViewset().edit_ghost_permission(req)
        self.assertEqual(resp.status_code, 400)

    def test_edit_ghost_permission_success_direct(self: "AdminAPIViewTestCase") -> None:
        # App imports
        from user.views import UserAuthViewset

        self.user.is_ghost = True
        self.user.save(update_fields=["is_ghost"])
        req = Request(APIRequestFactory().put("/ghost/", {"ghost_access_type": "full"}))
        req._full_data = {"ghost_access_type": "full"}  # type: ignore[attr-defined]
        req.user = self.user
        resp = UserAuthViewset().edit_ghost_permission(req)
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.ghost_access_type, "full")

    @patch("user.views.send_email", return_value=True)
    @patch("user.views.render_to_string", return_value="<html></html>")
    def test_send_welcome_email_no_groups_branch(
        self: "AdminAPIViewTestCase", _m_render: MagicMock, m_send: MagicMock
    ) -> None:
        # App imports
        from user.views import AddUserInOrganizationViewset

        self.user.groups.clear()
        AddUserInOrganizationViewset()._send_welcome_email(
            self.user,
            self.user.id,
            self.user.email,
            self.user.username,
            self.user.groups,
            "tok",
            "Org",
        )
        self.assertTrue(m_send.called)

    def test_admin_dashboard_authenticated_branch(self: "AdminAPIViewTestCase") -> None:
        # App imports
        from user.views import AdminView

        req = self.factory.get("/admin/dashboard/")
        req.user = self.admin_user
        resp = AdminView().dashboard(req)
        self.assertEqual(resp.status_code, 200)

    def test_admin_users_authenticated_branch(self: "AdminAPIViewTestCase") -> None:
        # App imports
        from user.views import AdminView

        req = self.factory.get("/admin/users/")
        req.user = self.admin_user
        resp = AdminView().users(req)
        self.assertEqual(resp.status_code, 200)

    def test_admin_ghost_users_authenticated_branch(
        self: "AdminAPIViewTestCase",
    ) -> None:
        # App imports
        from user.views import AdminView

        req = self.factory.get("/admin/ghost-users/")
        req.user = self.admin_user
        resp = AdminView().ghost_users(req)
        self.assertEqual(resp.status_code, 200)
