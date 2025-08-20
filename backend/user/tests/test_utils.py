# Python imports
import smtplib
from datetime import timedelta
from unittest.mock import MagicMock, patch

# Django imports
from django.core.exceptions import ValidationError
from django.utils import timezone

# External imports
import pytest

# App imports
from tests.testing import DEFAULT_DATABASE, APIBaseTestCase
from umaboy.models import Organization, UserOrganizationPermission
from user.constant import ACCOUNTS_MANAGER, CATALOG_MANAGER, DESIGNER, MES_EDITOR
from user.typing import EmailData
from user.utils import add_user_to_organization, send_email, verify_otp

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
            ACCOUNTS_MANAGER,
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
