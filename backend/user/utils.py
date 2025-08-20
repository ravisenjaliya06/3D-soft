# Python imports
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List

# Django imports
from django.conf import settings
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone

# App imports
from umaboy.models import Organization, User, UserOrganizationPermission
from user.logger import UserLogger as Logger
from user.typing import EmailData


def send_email(email_data: EmailData) -> bool:
    common_debug_info = {
        "receiver_email": email_data.receiver_email,
        "subject": email_data.subject,
        "function": "send_email",
    }
    Logger.info(
        {
            "message": "sending email",
            "smtp_server": settings.SMTP_SERVER,
            "smtp_port": settings.SMTP_PORT,
        }
        | common_debug_info
    )
    msg = MIMEMultipart()
    msg["From"] = email_data.sender_email
    msg["To"] = email_data.receiver_email
    msg["Subject"] = email_data.subject
    msg.attach(MIMEText(email_data.html, "html"))
    try:
        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(email_data.sender_email, email_data.sender_password)
            Logger.info({"message": "smtp login success"} | common_debug_info)
            server.sendmail(
                email_data.sender_email, email_data.receiver_email, msg.as_string()
            )
            Logger.info({"message": "email sent"} | common_debug_info)
        return True
    except smtplib.SMTPAuthenticationError as e:
        Logger.error(
            {
                "message": "authentication error",
                "error": f"{e.smtp_code} {e.smtp_error.decode() if isinstance(e.smtp_error, bytes) else e.smtp_error}",
            }
            | common_debug_info
        )
    except smtplib.SMTPConnectError as e:
        Logger.error(
            {
                "message": "connection error",
                "error": f"{e.smtp_code} {e.smtp_error.decode() if isinstance(e.smtp_error, bytes) else e.smtp_error}",
            }
            | common_debug_info
        )
    except smtplib.SMTPServerDisconnected as e:
        Logger.error(
            {
                "message": "server disconnected",
                "error": str(e),
            }
            | common_debug_info
        )
    except smtplib.SMTPResponseException as e:
        Logger.error(
            {
                "message": "smtp response error",
                "error": f"{e.smtp_code} {e.smtp_error.decode() if isinstance(e.smtp_error, bytes) else e.smtp_error}",
            }
            | common_debug_info
        )
    except smtplib.SMTPSenderRefused as e:
        Logger.error(
            {
                "message": "sender refused",
                "error": f"{e.smtp_code} {e.smtp_error.decode() if isinstance(e.smtp_error, bytes) else e.smtp_error}",
            }
            | common_debug_info
        )
    except smtplib.SMTPRecipientsRefused as e:
        Logger.error(
            {
                "message": "recipients refused",
                "error": str(e.recipients),
            }
            | common_debug_info
        )
    except smtplib.SMTPException as e:
        Logger.error({"message": "smtp exception", "error": str(e)} | common_debug_info)
    return False


def verify_otp(email: str | None, otp: str | None) -> User:
    user = User.objects.filter(email=email).first()
    if not user:
        raise DjangoValidationError(
            "User not found. Please enter the correct email address."
        )

    if user.otp != otp:
        raise DjangoValidationError("Invalid OTP. Please enter the correct OTP.")

    if not user.otp_expiration_time > timezone.now():
        raise DjangoValidationError("OTP expired. Please try again.")

    return user


def add_user_to_organization(
    user: User, organization: Organization, groups: List[str]
) -> None:
    permission_instance, created = UserOrganizationPermission.objects.get_or_create(
        user=user, organization=organization
    )
    for group_name in groups:
        if isinstance(group_name, int):
            group = Group.objects.get(id=group_name)
        else:
            group = Group.objects.get(name=group_name)

        permission_instance.groups.add(group)
    permission_instance.is_invited = True
    permission_instance.save()
