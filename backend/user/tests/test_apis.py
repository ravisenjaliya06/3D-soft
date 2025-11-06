# Python imports
import uuid
from datetime import timedelta
from unittest.mock import patch

# Django imports
from django.contrib.messages import get_messages
from django.core.exceptions import ValidationError as DjangoValidationError
from django.urls import reverse
from django.utils import timezone

# External imports
import jwt
import pytest
from rest_framework import serializers, status
from rest_framework_simplejwt.tokens import AccessToken

# App imports
from tests.testing import DEFAULT_DATABASE, APIBaseTestCase
from umaboy.models import Organization, User
from user.constant import ACCOUNT_MANAGER, CATALOG_MANAGER, MES_EDITOR
from user.serializers import AddUserInOrganizationSerializer, SetPasswordSerializer

FORGET_PASSWORD = "umaboy@321"  # noqa: S105
FORGET_CONFIRM_PASSWORD_MICHMACH = "umaboy@31"  # noqa: S105
NOT_VALID_PASSWORD = "123"  # noqa: S105


@pytest.mark.django_db
class APIViewTestCase(APIBaseTestCase):
    databases = {DEFAULT_DATABASE}

    def setUp(self: "APIViewTestCase") -> None:
        super().setUp()
        self.user = User.objects.using(DEFAULT_DATABASE).get(
            username=self.user.username
        )
        self.token = AccessToken.for_user(self.user)

    def test_user_register(self: "APIViewTestCase") -> None:
        user_count_before = User.objects.using(DEFAULT_DATABASE).count()

        response = self.client.post(
            reverse("register"),
            {
                "username": "new_user",
                "name": "new_user_name",
                "email": "new_user@gmail.com",
                "password": "new_password@123",
                "confirm_password": "new_password@123",
                "phone": "1234567890",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), user_count_before + 1)
        self.assertEqual(response.data["message"], "User registered")

    def test_user_registration_with_short_password(self: "APIViewTestCase") -> None:
        data = {
            "username": self.user.username,
            "email": self.user.email,
            "name": self.user.name,
            "password": "123",
            "confirm_password": "123",
            "phone": self.user.phone,
        }

        response = self.client.post(reverse("register"), data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["password"][0], "Password must be at least 8 characters long."
        )

    def test_user_registration_with_invalid_phone_number(
        self: "APIViewTestCase",
    ) -> None:
        data = {
            "username": self.user.username,
            "email": self.user.email,
            "name": self.user.name,
            "password": self.user.password,
            "confirm_password": self.user.password,
            "phone": 123456789789,
        }

        response = self.client.post(reverse("register"), data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["phone"][0],
            "Phone number must be 10 digits long and contain only numbers.",
        )

    def test_user_registration_with_invalid_email_format(
        self: "APIViewTestCase",
    ) -> None:
        data = {
            "username": self.user.username,
            "email": "testinguser.com",
            "name": self.user.name,
            "password": self.user.password,
            "confirm_password": self.user.password,
            "phone": self.user.phone,
        }

        response = self.client.post(reverse("register"), data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["email"][0], "Enter a valid email address.")

    def test_user_registration_with_password_mismatch(self: "APIViewTestCase") -> None:
        data = {
            "username": self.user.username,
            "email": self.user.email,
            "name": self.user.name,
            "password": "tesitng@123",
            "confirm_password": "tesitng123@123",
            "phone": "1234567890",
        }

        response = self.client.post(reverse("register"), data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["non_field_errors"][0], "Passwords do not match."
        )

    def test_user_registration_with_invalid_password_format(
        self: "APIViewTestCase",
    ) -> None:
        data = {
            "username": self.user.username,
            "email": self.user.email,
            "name": self.user.name,
            "password": "12345678",
            "confirm_password": "12345678",
            "phone": self.user.phone,
        }

        response = self.client.post(reverse("register"), data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["non_field_errors"][0], "This password is too common."
        )

    def test_missing_password_in_registration(self: "APIViewTestCase") -> None:
        data = {
            "username": "testuser",
            "email": "test@example.com",
            "name": "Test User",
            "confirm_password": "password123",
            "phone": "1234567890",
        }
        response = self.client.post(reverse("register"), data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.assertIn("password", response.data)

    def test_user_registration_with_existing_username(self: "APIViewTestCase") -> None:
        data = {
            "email": self.user.email,
            "username": self.user.username,
            "name": self.user.name,
            "password": self.user.password,
            "confirm_password": self.user.password,
            "phone": self.user.phone,
        }

        response = self.client.post(reverse("register"), data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_registration_with_existing_email(self: "APIViewTestCase") -> None:
        data = {
            "email": self.user.email,
            "username": "email_check",
            "name": self.user.name,
            "password": self.user.password,
            "confirm_password": self.user.password,
            "phone": self.user.phone,
        }

        response = self.client.post(reverse("register"), data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.assertEqual(
            response.data["email"][0], "A user with this email already exists."
        )

    def test_user_registration_in_organization_with_all_permissions(
        self: "APIViewTestCase",
    ) -> None:
        user_count_before = User.objects.using(DEFAULT_DATABASE).count()

        response = self.client.post(
            reverse("register"),
            {
                "username": "new_user",
                "email": "new_user@gmail.com",
                "name": "new_user_name",
                "password": "new_password@123",
                "confirm_password": "new_password@123",
                "phone": "1234567890",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), user_count_before + 1)
        self.assertEqual(response.data["message"], "User registered")

    def test_send_otp(self: "APIViewTestCase") -> None:
        response = self.client.post(
            reverse("send_otp"), {"email": self.user.email}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Mail sent successfully")

    def test_invalid_otp_verification(self: "APIViewTestCase") -> None:
        invalid_otp = "123456"
        response = self.client.post(
            reverse("otp"),
            {"email": self.user.email, "otp": invalid_otp},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_expired_otp_verification(self: "APIViewTestCase") -> None:
        self.user.otp_expiration_time = timezone.now() - timedelta(minutes=11)
        self.user.save()
        response = self.client.post(
            reverse("otp"),
            {"email": self.user.email, "otp": self.user.otp},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_verify_user(self: "APIViewTestCase") -> None:
        response = self.client.post(
            reverse("otp"),
            {"email": self.user.email, "otp": self.user.otp},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_verify_user_not_found(self: "APIViewTestCase") -> None:
        response = self.client.post(
            reverse("otp"),
            {"email": "QKd9o@example.com", "otp": "123456"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "User not found.")

    def test_verify_user_with_missing_otp(self: "APIViewTestCase") -> None:
        response = self.client.post(
            reverse("otp"),
            {"email": self.user.email},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["otp"][0], "This field is required.")

    def test_user_login(self: "APIViewTestCase") -> None:
        response = self.client.post(
            reverse("login"),
            {"email": self.user.email, "password": "umaboy@123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Logged in")
        self.assertIn("payload", response.data)
        self.assertIn("access", response.data["payload"])

    def test_user_login_with_invalid_credentials(self: "APIViewTestCase") -> None:
        response = self.client.post(
            reverse("login"),
            {"email": self.user.email, "password": "Testing@976"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["non_field_errors"][0],
            "Unable to log in with provided credentials. Please try again.",
        )

    def test_user_login_with_invalid_email(self: "APIViewTestCase") -> None:
        response = self.client.post(
            reverse("login"),
            {"email": "umaboy11@gmail.com", "password": "umaboy@123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["non_field_errors"][0],
            "Invalid user email address or username.",
        )

    def test_user_login_with_missing_email(self: "APIViewTestCase") -> None:
        response = self.client.post(
            reverse("login"),
            {"password": "umaboy@123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["email"][0], "This field is required.")

    def test_user_login_with_missing_password(self: "APIViewTestCase") -> None:
        response = self.client.post(
            reverse("login"),
            {"email": self.user.email},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["password"][0], "This field is required.")

    def test_user_login_without_user_verification(self: "APIViewTestCase") -> None:
        self.user.is_verified = False
        self.user.save()
        response = self.client.post(
            reverse("login"),
            {"email": self.user.email, "password": "umaboy@123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["non_field_errors"][0],
            "Account is not verified. Please verify account with the OTP.",
        )

    def test_send_forgot_password_mail(self: "APIViewTestCase") -> None:
        response = self.client.post(
            reverse("request_otp"), {"email": self.user.email}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Mail sent successfully")

    def test_send_forgot_password_mail_with_invalid_email(
        self: "APIViewTestCase",
    ) -> None:
        response = self.client.post(
            reverse("request_otp"), {"email": "umaboy123@gmail.com"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["non_field_errors"][0],
            "User not found. Please enter correct email address",
        )

    def test_send_forgot_password_otp_with_invalid_email_format(
        self: "APIViewTestCase",
    ) -> None:
        response = self.client.post(
            reverse("request_otp"), {"email": "umaboygmail.com"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["email"][0], "Enter a valid email address.")

    def test_send_forgot_password_otp_with_missing_email(
        self: "APIViewTestCase",
    ) -> None:
        response = self.client.post(reverse("request_otp"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["email"][0], "This field is required.")

    def test_set_password_with_get_method(self: "APIViewTestCase") -> None:
        response = self.client.get(
            reverse("set_password", kwargs={"token": str(self.token)})
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_set_password_with_expired_token(self: "APIViewTestCase") -> None:
        """Test set_password endpoint with an expired JWT token"""
        data = {
            "password": "newpassword@123",
            "confirm_password": "newpassword@123",
        }
        with patch("user.views.jwt_decode") as mock_jwt_decode:
            mock_jwt_decode.side_effect = jwt.ExpiredSignatureError()
            response = self.client.post(
                reverse("set_password", kwargs={"token": str(self.token)}),
                data=data,
                format="json",
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertIn("show_form", response.context)
            self.assertFalse(response.context["show_form"])
            messages = list(get_messages(response.wsgi_request))
            self.assertTrue(
                any(message.message == "Token has expired." for message in messages)
            )

    def test_set_password_with_nonexistent_user(self: "APIViewTestCase") -> None:
        """Test set_password endpoint when user does not exist"""
        data = {
            "password": "newpassword@123",
            "confirm_password": "newpassword@123",
        }
        with patch("user.views.jwt_decode") as mock_jwt_decode:
            mock_jwt_decode.return_value = {"user_id": uuid.uuid4()}
            response = self.client.post(
                reverse("set_password", kwargs={"token": str(self.token)}),
                data=data,
                format="json",
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertIn("show_form", response.context)
            self.assertFalse(response.context["show_form"])
            messages = list(get_messages(response.wsgi_request))
            self.assertEqual(len(messages), 1)
            self.assertEqual(str(messages[0]), "User not found.")

    def test_set_password_with_password_not_match(self: "APIViewTestCase") -> None:
        """Test set_password endpoint when user does not exist"""
        data = {
            "password": "newpassword@123",
            "password_123": "newpassword",
        }
        response = self.client.post(
            reverse("set_password", kwargs={"token": str(self.token)}),
            data=data,
            format="json",
        )
        self.assertIn("show_form", response.context)
        self.assertTrue(response.context["show_form"])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_set_password_with_password_validation(self: "APIViewTestCase") -> None:
        """Test set_password endpoint when user does not exist"""
        data = {
            "password": "newpassword@123",
            "confirm_password": "newpassword",
        }
        response = self.client.post(
            reverse("set_password", kwargs={"token": str(self.token)}),
            data=data,
            format="json",
        )
        self.assertIn("show_form", response.context)
        self.assertTrue(response.context["show_form"])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_set_password_with_password_success(self: "APIViewTestCase") -> None:
        """Test set_password endpoint when user does not exist"""
        data = {
            "password": "newpassword@123",
            "confirm_password": "newpassword@123",
        }
        response = self.client.post(
            reverse("set_password", kwargs={"token": str(self.token)}),
            data=data,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_302_FOUND)

    def test_set_password_serializer_django_validation_error_on_save(
        self: "APIViewTestCase",
    ) -> None:
        """Test SetPasswordSerializer raises django validation error on save"""

        data = {"password": "123456", "confirm_password": "123456"}
        with patch("user.serializers.django_validate_password") as mock_validate:
            mock_validate.side_effect = [
                None,
                DjangoValidationError(["Password is too simple"]),
            ]

            serializer = SetPasswordSerializer(data=data, context={"user": self.user})
            self.assertTrue(serializer.is_valid())
            with self.assertRaises(serializers.ValidationError) as cm:
                serializer.save()
            self.assertIn("Password is too simple", str(cm.exception))

    def test_profile_get(self: "APIViewTestCase") -> None:
        response = self.client.get(reverse("profile"), headers=self.get_headers)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_edit_profile(self: "APIViewTestCase") -> None:
        data = {
            "name": "testing1",
            "phone": "1234567890",
        }
        response = self.client.put(
            reverse("profile"),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "profile updated successfully.")

        updated_user = User.objects.get(id=self.user.id)
        self.assertEqual(updated_user.name, data["name"])
        self.assertEqual(updated_user.phone, data["phone"])

    def test_edit_profile_with_invalid_phone_number(self: "APIViewTestCase") -> None:
        data = {
            "name": "testing1",
            "phone": 123456789123,
        }
        response = self.client.put(
            reverse("profile"),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["phone"][0],
            "Phone number must be 10 digits long and contain only numbers.",
        )

    def test_add_user_in_organization(self: "APIViewTestCase") -> None:
        user_count_before = User.objects.using(DEFAULT_DATABASE).count()
        data = {
            "username": "test456",
            "email": "testing_organization1@gmail.com",
            "groups": [ACCOUNT_MANAGER, MES_EDITOR, CATALOG_MANAGER],
        }
        response = self.client.post(
            reverse("add_organization_user"),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        organization = (
            Organization.objects.using(DEFAULT_DATABASE).filter(user=self.user).first()
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            User.objects.using(DEFAULT_DATABASE).count(), user_count_before + 1
        )
        self.assertIsNotNone(organization)
        self.assertEqual(response.data["message"], "User invited in organization")

    def test_add_user_in_organization_with_one_group(self: "APIViewTestCase") -> None:
        user_count_before = User.objects.using(DEFAULT_DATABASE).count()
        data = {
            "username": "test789",
            "email": "testing_organization@gmail.com",
            "groups": [ACCOUNT_MANAGER],
        }
        response = self.client.post(
            reverse("add_organization_user"),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        organization = (
            Organization.objects.using(DEFAULT_DATABASE).filter(user=self.user).first()
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            User.objects.using(DEFAULT_DATABASE).count(), user_count_before + 1
        )
        self.assertIsNotNone(organization)
        self.assertEqual(response.data["message"], "User invited in organization")

    def test_add_user_in_organization_with_invalid_email(
        self: "APIViewTestCase",
    ) -> None:
        user_count_before = User.objects.using(DEFAULT_DATABASE).count()
        data = {
            "name": "test321",
            "email": "test321gmail.com",
            "groups": [ACCOUNT_MANAGER],
        }

        response = self.client.post(
            reverse("add_organization_user"),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            User.objects.using(DEFAULT_DATABASE).count(), user_count_before
        )
        self.assertEqual(response.data["email"][0], "Enter a valid email address.")

    def test_add_user_in_organization_without_access_token(
        self: "APIViewTestCase",
    ) -> None:
        user_count_before = User.objects.using(DEFAULT_DATABASE).count()
        data = {
            "name": "test321",
            "email": "testing_organization@gmail.com",
            "groups": [ACCOUNT_MANAGER],
        }
        response = self.client.post(
            reverse("add_organization_user"), data=data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            User.objects.using(DEFAULT_DATABASE).count(), user_count_before
        )
        self.assertEqual(
            response.data["detail"], "Authentication credentials were not provided."
        )

    def test_add_existing_user_to_organization(self: "APIViewTestCase") -> None:
        existing_user = User.objects.using(DEFAULT_DATABASE).create(
            username="existing_user",
            email="existing_user@example.com",
            password=FORGET_PASSWORD,  ## noqa: S105
        )
        self.organization.user.add(existing_user)

        user_count_before = User.objects.count()
        data = {
            "username": "user",
            "email": "existing_user@example.com",
            "groups": [ACCOUNT_MANAGER],
        }
        response = self.client.post(
            reverse("add_organization_user"),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), user_count_before)
        self.assertIn("User invited in organization", response.data["message"])

    def test_add_user_in_organization_with_missing_email(
        self: "APIViewTestCase",
    ) -> None:
        user_count_before = User.objects.using(DEFAULT_DATABASE).count()
        data = {
            "username": "test321",
            "name": "test321",
            "groups": [ACCOUNT_MANAGER],
        }
        response = self.client.post(
            reverse("add_organization_user"),
            data=data,
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            User.objects.using(DEFAULT_DATABASE).count(), user_count_before
        )
        self.assertEqual(response.data["email"][0], "This field is required.")

    def test_add_user_in_organization_with_not_found_groups(
        self: "APIViewTestCase",
    ) -> None:
        user_count_before = User.objects.using(DEFAULT_DATABASE).count()
        data = {
            "email": "testing_organization@gmail.com",
        }
        response = self.client.post(
            reverse("add_organization_user"),
            data=data,
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            User.objects.using(DEFAULT_DATABASE).count(), user_count_before
        )
        self.assertEqual(response.data["groups"][0], "This field is required.")

    def test_add_user_in_organization_with_groups_data_not_found(
        self: "APIViewTestCase",
    ) -> None:
        user_count_before = User.objects.using(DEFAULT_DATABASE).count()
        data = {
            "email": "testing_organization@gmail.com",
            "groups": [],
        }
        response = self.client.post(
            reverse("add_organization_user"),
            data=data,
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            User.objects.using(DEFAULT_DATABASE).count(), user_count_before
        )
        self.assertEqual(
            response.data["groups"][0], "At least one group must be provided."
        )

    def test_add_user_in_organization_missing_request_context(
        self: "APIViewTestCase",
    ) -> None:
        """
        Test that creating a user in an organization without a request context raises a ValidationError.
        """
        user_count_before = User.objects.using(DEFAULT_DATABASE).count()
        data = {
            "username": "test321",
            "name": "test321",
            "email": "testing_organization@gmail.com",
            "phone": "1234567899",
            "groups": [ACCOUNT_MANAGER],
        }
        serializer = AddUserInOrganizationSerializer(data=data)
        with self.assertRaises(serializers.ValidationError) as context:
            serializer.is_valid(raise_exception=True)
            serializer.save()

        self.assertEqual(
            context.exception.detail["error"], "Request context is required."
        )
        user_count_after = User.objects.using(DEFAULT_DATABASE).count()
        self.assertEqual(user_count_after, user_count_before)

    def test_edit_user_in_organization_with_invalid_user(
        self: "APIViewTestCase",
    ) -> None:
        data = {
            "name": "test321",
            "groups": [ACCOUNT_MANAGER],
        }
        response = self.client.put(
            reverse(
                "edit_organization_user_permission",
                kwargs={"user_id": str(uuid.uuid4())},
            ),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "User not found.")

    def test_success_edit_user_permission_in_organization(
        self: "APIViewTestCase",
    ) -> None:
        data = {
            "name": "test321",
            "groups": [ACCOUNT_MANAGER],
        }
        response = self.client.put(
            reverse(
                "edit_organization_user_permission",
                kwargs={"user_id": str(self.invited_user.id)},
            ),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        response_data, status_code = response.json(), response.status_code
        self.assertEqual(status_code, status.HTTP_200_OK)
        self.assertEqual(response_data["message"], "User updated successfully.")

    def test_success_edit_user_permission_in_invalid_organization(
        self: "APIViewTestCase",
    ) -> None:
        data = {
            "name": "test321",
            "groups": [ACCOUNT_MANAGER],
        }
        response = self.client.put(
            reverse(
                "edit_organization_user_permission",
                kwargs={"user_id": str(self.invited_user.id)},
            ),
            data=data,
            format="json",
            headers=self.get_invalid_user_headers,
        )
        response_data, status_code = response.json(), response.status_code
        self.assertEqual(status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            response_data["detail"],
            "You do not have permission to perform this action.",
        )

    def test_edit_user_permission_with_invalid_data(self: "APIViewTestCase") -> None:
        """Test editing a user with invalid data that fails serializer validation"""
        invalid_data = {
            "name": "test321",
            "groups": ["INVALID_GROUP"],
        }

        response = self.client.put(
            reverse(
                "edit_organization_user_permission",
                kwargs={"user_id": str(self.invited_user.id)},
            ),
            data=invalid_data,
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("groups", response.data)

    def test_update_organization_details(self: "APIViewTestCase") -> None:
        response = self.client.put(
            reverse("update_organization_details"),
            data={"name": "test321"},
            format="json",
            headers=self.get_headers,
        )
        response_data, status_code = response.json(), response.status_code
        self.assertEqual(status_code, status.HTTP_200_OK)
        self.assertEqual(
            response_data["message"], "Organization details updated successfully."
        )

    def test_update_organization_details_with_invalid_data(
        self: "APIViewTestCase",
    ) -> None:
        response = self.client.put(
            reverse("update_organization_details"),
            data={"logo": 1},
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_organization_details(self: "APIViewTestCase") -> None:
        response = self.client.get(
            reverse("get_organization_details"),
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_show_organization_users(self: "APIViewTestCase") -> None:
        response = self.client.get(
            reverse("show_organization_users"),
            format="json",
            headers=self.get_headers,
        )
        response_data, status_code = response.json(), response.status_code
        self.assertEqual(status_code, status.HTTP_200_OK)
        self.assertEqual(response_data["message"], "Organization users retrieved")

    def test_show_organization_users_with_invalid_token(
        self: "APIViewTestCase",
    ) -> None:
        response = self.client.get(
            reverse("show_organization_users"),
            format="json",
            headers=self.get_invalid_user_headers,
        )
        response_data, status_code = response.json(), response.status_code
        self.assertEqual(status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            response_data["detail"],
            "You do not have permission to perform this action.",
        )

    def test_delete_user_in_organization(self: "APIViewTestCase") -> None:
        response = self.client.delete(
            reverse(
                "remove_user_from_organization",
                kwargs={"user_id": str(self.invited_user.id)},
            ),
            format="json",
            headers=self.get_headers,
        )
        organization = (
            Organization.objects.using(DEFAULT_DATABASE).filter(user=self.user).first()
        )
        is_user_in_org = organization.user.filter(id=self.invited_user.id).exists()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["message"], "User removed from organization successfully."
        )
        self.assertIsNotNone(organization)
        self.assertFalse(is_user_in_org)

    def test_delete_user_in_organization_with_out_access_token(
        self: "APIViewTestCase",
    ) -> None:
        response = self.client.delete(
            reverse(
                "remove_user_from_organization",
                kwargs={"user_id": str(self.invited_user.id)},
            ),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            response.data["detail"], "Authentication credentials were not provided."
        )

    def test_delete_user_in_organization_with_invalid_not_found_user_on_organization(
        self: "APIViewTestCase",
    ) -> None:
        response = self.client.delete(
            reverse(
                "remove_user_from_organization", kwargs={"user_id": str(uuid.uuid4())}
            ),
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["message"], "User not Found")

    def test_set_password_with_common_password(self: "APIViewTestCase") -> None:
        data = {
            "username": self.user.username,
            "email": self.user.email,
            "name": self.user.name,
            "password": "12345678",
            "confirm_password": "12345678",
            "phone": self.user.phone,
        }
        response = self.client.post(reverse("register"), data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["non_field_errors"][0], "This password is too common."
        )

    def test_get_organization_details_without_user(self: "APIViewTestCase") -> None:
        response = self.client.get(
            reverse("get_organization_details"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
