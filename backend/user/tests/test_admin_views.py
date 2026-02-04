# Python imports
import json
import uuid

# Django imports
from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import AnonymousUser
from django.core.exceptions import PermissionDenied
from django.db import DEFAULT_DB_ALIAS
from django.test import RequestFactory
from django.urls import reverse

# External imports
from rest_framework import status
from rest_framework_simplejwt.tokens import AccessToken

# App imports
from tests.testing import APIBaseTestCase
from umaboy.models import User
from user.views import ApproveUserView
from rest_framework_simplejwt.exceptions import TokenError


class AdminAPIViewTestCase(APIBaseTestCase):
    databases = {DEFAULT_DB_ALIAS}

    def setUp(self: "AdminAPIViewTestCase") -> None:
        super().setUp()

        self.factory = RequestFactory()

        # Admin user
        self.admin_user = User.objects.create(
            username="admin",
            email="admin@test.com",
            password=make_password("admin@123"),
            is_superuser=True,
            is_staff=True,
        )

        # Normal user
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
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_required_mixin_invalid_jwt(self:"AdminAPIViewTestCase") -> None:
        request = self.factory.post("/approve/")
        request.user = AnonymousUser()
        request.COOKIES = {settings.ADMIN_JWT_COOKIE_NAME: "invalid.jwt.token"}

        # Expect TokenError to be raised
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

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(self.normal_user.is_verified)

    def test_approve_user_false(self: "AdminAPIViewTestCase") -> None:
        request = self.factory.post("/approve/?is_approved=false")
        request.user = self.admin_user
        request.COOKIES = {settings.ADMIN_JWT_COOKIE_NAME: str(self.admin_token)}

        response = ApproveUserView.as_view()(request, user_id=str(self.normal_user.id))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(User.objects.filter(id=self.normal_user.id).exists())

    def test_approve_user_not_found(self: "AdminAPIViewTestCase") -> None:
        request = self.factory.post("/approve/?is_approved=true")
        request.user = self.admin_user
        request.COOKIES = {settings.ADMIN_JWT_COOKIE_NAME: str(self.admin_token)}

        non_existent_uuid = uuid.uuid4()

        response = ApproveUserView.as_view()(request, user_id=str(non_existent_uuid))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
