# Python imports
import smtplib
from datetime import timedelta
from unittest.mock import MagicMock, patch

# Django imports
from django.core.exceptions import ValidationError
from django.utils import timezone

# External imports
import pytest
import requests

# App imports
from tests.testing import DEFAULT_DATABASE, APIBaseTestCase
from umaboy.models import Organization, UserOrganizationPermission
from user.constant import ACCOUNT_MANAGER, CATALOG_MANAGER, DESIGNER, MES_EDITOR
from user.typing import EmailData
from user.utils import (
    add_user_to_organization,
    default_material_data,
    duplicate_default_catalogs_for_organization,
    duplicate_default_textures,
    get_client_ip,
    get_ip_location,
    send_email,
    send_google_chat_notification,
    verify_otp,
)

EMAIL_PASSWORD = "smtp@123"  # noqa: S105


@pytest.mark.django_db
class UtilsTestCase(APIBaseTestCase):

    def setUp(self: "UtilsTestCase") -> None:
        super().setUp()

        self.email_data = EmailData(
            sender_email="testing@gmail.com",
            receiver_email="testing_receiver@gmail.com",
            subject="Testing ",
            html="<h1>Test Email</h1>",
            sender_password=EMAIL_PASSWORD,
        )

    @patch("smtplib.SMTP")
    def test_send_email_success(self: "UtilsTestCase", mock_smtp: MagicMock) -> None:
        mock_server = MagicMock()
        mock_smtp.return_value.__enter__.return_value = mock_server

        result = send_email(self.email_data)
        self.assertTrue(result)
        mock_server.sendmail.assert_called_once_with(
            self.email_data.sender_email,
            self.email_data.receiver_email,
            mock_server.sendmail.call_args[0][2],
        )

    @patch("smtplib.SMTP")
    def test_send_email_authentication_error(
        self: "UtilsTestCase", mock_smtp: MagicMock
    ) -> None:
        mock_smtp.side_effect = smtplib.SMTPAuthenticationError(
            535, b"Authentication failed"
        )

        result = send_email(self.email_data)
        self.assertFalse(result)

    @patch("smtplib.SMTP")
    def test_send_email_connection_error(
        self: "UtilsTestCase", mock_smtp: MagicMock
    ) -> None:
        mock_smtp.side_effect = smtplib.SMTPConnectError(421, b"Service not available")

        result = send_email(self.email_data)
        self.assertFalse(result)

    @patch("smtplib.SMTP")
    def test_send_email_server_disconnected(
        self: "UtilsTestCase", mock_smtp: MagicMock
    ) -> None:
        mock_smtp.side_effect = smtplib.SMTPServerDisconnected("Server disconnected")

        result = send_email(self.email_data)
        self.assertFalse(result)

    @patch("smtplib.SMTP")
    def test_send_email_invalid_recipient(
        self: "UtilsTestCase", mock_smtp: MagicMock
    ) -> None:
        mock_smtp.side_effect = smtplib.SMTPRecipientsRefused(
            {"receiver@example.com": (550, b"User not found")}
        )

        result = send_email(self.email_data)
        self.assertFalse(result)

    @patch("smtplib.SMTP")
    def test_send_email_sender_refused(
        self: "UtilsTestCase", mock_smtp: MagicMock
    ) -> None:
        mock_smtp.side_effect = smtplib.SMTPSenderRefused(
            550, b"Sender not allowed", self.email_data.sender_email
        )
        result = send_email(self.email_data)
        self.assertFalse(result)

    @patch("smtplib.SMTP")
    def test_send_email_response_exception(
        self: "UtilsTestCase", mock_smtp: MagicMock
    ) -> None:
        mock_smtp.side_effect = smtplib.SMTPResponseException(
            500, b"Internal Server Error"
        )

        result = send_email(self.email_data)
        self.assertFalse(result)

    @patch("smtplib.SMTP")
    def test_send_email_smtp_exception(
        self: "UtilsTestCase", mock_smtp: MagicMock
    ) -> None:
        mock_smtp.side_effect = smtplib.SMTPException("Generic SMTP error")

        result = send_email(self.email_data)
        self.assertFalse(result)

    def test_verify_otp_success(self: "UtilsTestCase") -> None:
        verified_user = verify_otp(self.user.email, self.user.otp)
        self.assertEqual(verified_user, self.user)

    def test_verify_otp_user_not_found(self: "UtilsTestCase") -> None:
        with pytest.raises(ValidationError) as excinfo:
            verify_otp("test@gmail.com", self.user.otp)
        self.assertIn(
            "User not found. Please enter the correct email address.",
            str(excinfo.value),
        )

    def test_verify_otp_invalid_otp(self: "UtilsTestCase") -> None:
        with pytest.raises(ValidationError) as excinfo:
            verify_otp(self.user.email, "987654")
        self.assertIn("Invalid OTP. Please enter the correct OTP.", str(excinfo.value))

    def test_verify_otp_expired_otp(self: "UtilsTestCase") -> None:
        self.user.otp_expiration_time = timezone.now() - timedelta(minutes=5)
        self.user.save()
        with pytest.raises(ValidationError) as excinfo:
            verify_otp(self.user.email, self.user.otp)
        self.assertIn("OTP expired. Please try again.", str(excinfo.value))

    def test_verify_otp_with_invalid_email(self: "UtilsTestCase") -> None:
        with pytest.raises(ValidationError) as excinfo:
            verify_otp("test@gmail.com", self.user.otp)
        self.assertIn(
            "User not found. Please enter the correct email address.",
            str(excinfo.value),
        )

    def test_add_user_to_organization_success(self: "UtilsTestCase") -> None:
        organization = (
            Organization.objects.using(DEFAULT_DATABASE).filter(user=self.user).first()
        )
        if not organization:
            organization = self.seed_organization(DEFAULT_DATABASE)
        groups = [
            ACCOUNT_MANAGER,
            MES_EDITOR,
            DESIGNER,
            CATALOG_MANAGER,
        ]
        self.assertIsNotNone(organization)
        add_user_to_organization(self.user, organization, groups)

        permission_instance, created = UserOrganizationPermission.objects.using(
            DEFAULT_DATABASE
        ).get_or_create(user=self.user, organization=organization)
        for group_name in groups:
            self.assertTrue(permission_instance.groups.filter(name=group_name).exists())
        self.assertEqual(permission_instance.groups.count(), len(groups))

    @patch("user.utils.requests.post")
    def test_send_google_chat_notification_success(self: "UtilsTestCase", mock_post: MagicMock) -> None:
        mock_resp = MagicMock()
        mock_resp.raise_for_status.return_value = None
        mock_post.return_value = mock_resp
        send_google_chat_notification("http://webhook.example", "hello")
        mock_post.assert_called_once()

    @patch("user.utils.requests.post")
    def test_send_google_chat_notification_failure(self: "UtilsTestCase", mock_post: MagicMock) -> None:
        mock_post.side_effect = Exception("boom")
        send_google_chat_notification("http://webhook.example", "hello")
        mock_post.assert_called_once()

    def test_get_client_ip_variants(self: "UtilsTestCase") -> None:
        req = MagicMock()
        req.META = {"HTTP_X_FORWARDED_FOR": "1.2.3.4, 5.6.7.8"}
        assert get_client_ip(req) == "1.2.3.4"
        req2 = MagicMock()
        req2.META = {"REMOTE_ADDR": "9.8.7.6"}
        assert get_client_ip(req2) == "9.8.7.6"

    @patch("user.utils.requests.get")
    def test_get_ip_location_private_loopback_returns_none(
        self: "UtilsTestCase", mock_get: MagicMock
    ) -> None:
        assert get_ip_location("192.168.1.10") is None
        assert get_ip_location("127.0.0.1") is None
        mock_get.assert_not_called()

    @patch("user.utils.requests.get")
    def test_get_ip_location_success_and_exception(
        self: "UtilsTestCase", mock_get: MagicMock
    ) -> None:
        mock_get.return_value.json.return_value = {
            "status": "success",
            "city": "City",
            "regionName": "Region",
            "country": "Country",
        }
        assert get_ip_location("8.8.8.8") == "City, Region, Country"

        mock_get.side_effect = requests.RequestException("network")
        assert get_ip_location("8.8.4.4") is None

    @patch("user.utils.requests.get")
    def test_get_ip_location_non_success_status(self: "UtilsTestCase", mock_get: MagicMock) -> None:
        mock_get.return_value.json.return_value = {"status": "fail"}
        assert get_ip_location("1.1.1.1") is None

    @patch("user.utils.requests.post")
    def test_send_google_chat_notification_timeout(self: "UtilsTestCase", mock_post: MagicMock) -> None:
        mock_post.side_effect = requests.Timeout("t")
        send_google_chat_notification("http://webhook.example", "hello")
        mock_post.assert_called_once()

    def test_add_user_to_organization_no_groups_is_noop(self: "UtilsTestCase") -> None:
        organization = (
            Organization.objects.using(DEFAULT_DATABASE).filter(user=self.user).first()
            or self.seed_organization(DEFAULT_DATABASE)
        )
        add_user_to_organization(self.user, organization, [])

    def test_get_ip_location_invalid_schema_missing_status(self: "UtilsTestCase") -> None:
        with patch("user.utils.requests.get") as mock_get:
            mock_get.return_value.json.return_value = {"city": "X"}
            assert get_ip_location("8.8.8.8") is None
        with patch("user.utils.requests.get") as mock_get2:
            mock_get2.return_value.json.return_value = {"status": "success", "country": "C"}
            assert get_ip_location("8.8.8.8") == "C"

    @patch("smtplib.SMTP")
    def test_send_email_generic_exception_and_tls_login_order(
        self: "UtilsTestCase", mock_smtp: MagicMock
    ) -> None:
        server = MagicMock()
        mock_smtp.return_value.__enter__.return_value = server
        server.sendmail.side_effect = Exception("boom")
        try:
            result = send_email(self.email_data)
            self.assertFalse(result)
        except Exception:
            pass
        self.assertTrue(mock_smtp.called)

    @patch("user.utils.requests.get")
    def test_get_ip_location_missing_fields_schema(self: "UtilsTestCase", mock_get: MagicMock) -> None:
        mock_get.return_value.json.return_value = {
            "status": "success",
            "country": "OnlyCountry",
        }
        assert get_ip_location("8.8.8.8") == "OnlyCountry"

    def test_get_client_ip_without_headers(self: "UtilsTestCase") -> None:
        req = MagicMock()
        req.META = {}
        assert get_client_ip(req) is None

    def test_add_user_to_organization_idempotent(self: "UtilsTestCase") -> None:
        organization = (
            Organization.objects.using(DEFAULT_DATABASE).filter(user=self.user).first()
            or self.seed_organization(DEFAULT_DATABASE)
        )
        groups = [ACCOUNT_MANAGER, MES_EDITOR]
        add_user_to_organization(self.user, organization, groups)
        add_user_to_organization(self.user, organization, groups)
        permission_instance = UserOrganizationPermission.objects.using(DEFAULT_DATABASE).get(
            user=self.user, organization=organization
        )
        names = set(permission_instance.groups.values_list("name", flat=True))
        for g in set(groups):
            self.assertIn(g, names)

    @patch("user.utils.Properties")
    @patch("user.utils.Material")
    @patch("user.utils.Company")
    def test_default_material_data_empty_defaults(
        self: "UtilsTestCase",
        mock_company: MagicMock,
        mock_material: MagicMock,
        mock_properties: MagicMock,
    ) -> None:
        mock_company.objects.filter.return_value = []
        mock_material.objects.filter.return_value = []
        out = default_material_data(self.organization)
        assert out is True
        mock_properties.objects.filter.assert_not_called()

    @patch("user.utils.Properties")
    @patch("user.utils.Material")
    @patch("user.utils.Company")
    def test_default_material_data_clones_company_material_and_properties(
        self: "UtilsTestCase",
        mock_company: MagicMock,
        mock_material: MagicMock,
        mock_properties: MagicMock,
    ) -> None:
        class F:
            def __init__(self, name: str) -> None:
                self.name = name

        src_company = MagicMock()
        src_company.id = 11
        src_company._meta.fields = [F("id"), F("organization"), F("name")]
        src_company.name = "C1"
        new_company = MagicMock()

        src_material = MagicMock()
        src_material.id = 22
        src_material.company_id = 11
        src_material._meta.fields = [F("id"), F("organization"), F("company"), F("name")]
        src_material.name = "M1"
        new_material = MagicMock()

        src_prop = MagicMock()
        src_prop._meta.fields = [F("id"), F("material"), F("density")]
        src_prop.density = 1.1

        mock_company.objects.filter.return_value = [src_company]
        mock_company.objects.create.return_value = new_company
        mock_material.objects.filter.return_value = [src_material]
        mock_material.objects.create.return_value = new_material
        mock_properties.objects.filter.return_value = [src_prop]

        out = default_material_data(self.organization)
        assert out is True
        assert mock_company.objects.create.called
        assert mock_material.objects.create.called
        assert mock_properties.objects.create.called

    @patch("user.utils.FinishesLibrary")
    @patch("user.utils.model_to_dict")
    def test_duplicate_default_textures_empty(self: "UtilsTestCase", mock_to_dict: MagicMock, mock_fin: MagicMock) -> None:
        mock_fin.objects.filter.return_value = []
        duplicate_default_textures(self.organization)
        mock_to_dict.assert_not_called()

    @patch("user.utils.FinishesLibrary")
    @patch("user.utils.model_to_dict")
    def test_duplicate_default_textures_creates_clones(
        self: "UtilsTestCase", mock_to_dict: MagicMock, mock_fin: MagicMock
    ) -> None:
        mock_fin.objects.filter.return_value = [MagicMock(), MagicMock()]
        mock_to_dict.return_value = {"name": "T1", "type": "x"}
        duplicate_default_textures(self.organization)
        assert mock_fin.objects.create.call_count == 2

    @patch("user.utils.DesignCatalog")
    def test_duplicate_default_catalogs_success(self: "UtilsTestCase", mock_dc: MagicMock) -> None:
        c1 = MagicMock()
        c1.id = "old-parent"
        c1.parent_id = None
        c1.type = "PLANK"
        c1.name = "Parent"
        c1.data = {"k": "v"}
        c1.materials.all.return_value = []

        c2 = MagicMock()
        c2.id = "old-child"
        c2.parent_id = "old-parent"
        c2.type = "PLANK"
        c2.name = "Child"
        c2.data = {"k2": "v2"}
        c2.materials.all.return_value = []

        mock_dc.objects.filter.return_value.order_by.return_value = [c1, c2]
        clone1 = MagicMock()
        clone1.id = "new-parent"
        clone1.data = {}
        clone2 = MagicMock()
        clone2.id = "new-child"
        clone2.data = {}
        mock_dc.objects.create.side_effect = [clone1, clone2]

        duplicate_default_catalogs_for_organization(self.organization)
        assert mock_dc.objects.create.call_count == 2
        assert clone2.save.called

    @patch("user.utils.DesignCatalog")
    def test_duplicate_default_catalogs_missing_parent_raises(self: "UtilsTestCase", mock_dc: MagicMock) -> None:
        orphan = MagicMock()
        orphan.id = "old-child"
        orphan.parent_id = "missing-parent"
        orphan.type = "PLANK"
        orphan.name = "Child"
        orphan.data = {}
        orphan.materials.all.return_value = []

        mock_dc.objects.filter.return_value.order_by.return_value = [orphan]
        clone = MagicMock()
        clone.id = "new-child"
        clone.data = {}
        mock_dc.objects.create.return_value = clone

        with self.assertRaises(ValueError):
            duplicate_default_catalogs_for_organization(self.organization)

    @patch("user.utils.requests.get")
    def test_get_ip_location_invalid_ip_valueerror(self: "UtilsTestCase", mock_get: MagicMock) -> None:
        assert get_ip_location("not-an-ip") is None
        mock_get.assert_not_called()

    @patch("smtplib.SMTP")
    def test_send_email_sender_refused_bytes_error_format(self: "UtilsTestCase", mock_smtp: MagicMock) -> None:
        mock_smtp.side_effect = smtplib.SMTPSenderRefused(550, b"bad sender", "x@test.com")
        assert send_email(self.email_data) is False

    @patch("user.utils.requests.get")
    def test_get_ip_location_success_partial_fields_trim(self: "UtilsTestCase", mock_get: MagicMock) -> None:
        mock_get.return_value.json.return_value = {"status": "success", "city": "OnlyCity"}
        assert get_ip_location("8.8.8.8") == "OnlyCity"
