# Python imports
import ipaddress
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Optional
from urllib.request import Request

# Django imports
from django.conf import settings
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError as DjangoValidationError
from django.forms.models import model_to_dict
from django.utils import timezone

# External imports
import requests

# App imports
from design.models import DesignCatalog
from material.models import Company, FinishesLibrary, Material, Properties
from umaboy.models import Organization, User, UserOrganizationPermission
from user.logger import UserLogger as Logger
from user.typing import EmailData


def send_email(email_data: EmailData) -> bool:
    common_debug_info = {
        "receiver_email": email_data.receiver_email,
        "subject": email_data.subject,
        "function": "send_email",
        "timestamp": timezone.now().isoformat(),
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


def send_google_chat_notification(webhook_url: str, message: str) -> None:
    """
    Send a notification to a Google Chat webhook.
    """
    if not webhook_url:
        return

    try:
        response = requests.post(
            webhook_url,
            json={"text": message},
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()
        Logger.info(
            {
                "message": "Google Chat notification sent",
                "text": message,
                "timestamp": timezone.now().isoformat(),
            }
        )
    except Exception as e:  # noqa: BLE001
        Logger.error(
            {
                "message": "Failed to send Google Chat notification",
                "error": str(e),
                "text": message,
                "timestamp": timezone.now().isoformat(),
            }
        )


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
    user: User, organization: Organization, groups: List[str], is_invited: bool = True
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
    permission_instance.is_invited = is_invited
    permission_instance.is_deleted = False
    permission_instance.save()


def default_material_data(organization: Organization) -> bool:
    """
    Creates default materials, companies, and their properties
    for a given organization.
    """
    Logger.info(
        {
            "message": f"Starting default_material_data for org {organization.id}",
            "timestamp": timezone.now().isoformat(),
        }
    )

    default_companies = Company.objects.filter(organization=None)
    company_map = {}
    for company in default_companies:
        company_data = {
            field.name: getattr(company, field.name)
            for field in company._meta.fields
            if field.name not in ("id", "organization")
        }
        new_company = Company.objects.create(**company_data, organization=organization)
        company_map[company.id] = new_company

    default_materials = Material.objects.filter(organization=None, is_deleted=False)
    material_map = {}
    for material in default_materials:
        material_data = {
            field.name: getattr(material, field.name)
            for field in material._meta.fields
            if field.name not in ("id", "organization", "company")
        }
        new_material = Material.objects.create(
            **material_data,
            organization=organization,
            company=company_map.get(material.company_id),
        )
        material_map[material.id] = new_material

        default_properties = Properties.objects.filter(material=material)
        for prop in default_properties:
            prop_data = {
                field.name: getattr(prop, field.name)
                for field in prop._meta.fields
                if field.name not in ("id", "material")
            }
            Properties.objects.create(**prop_data, material=new_material)

    Logger.info(
        {
            "message": f"Completed default_material_data for org {organization.id}",
            "timestamp": timezone.now().isoformat(),
        }
    )
    return True


def duplicate_default_textures(organization: Organization) -> None:
    Logger.info(
        {
            "message": f"Starting duplicate_default_textures for org {organization.id}",
            "timestamp": timezone.now().isoformat(),
        }
    )
    default_finishes = FinishesLibrary.objects.filter(organization__isnull=True)

    for finish in default_finishes:
        data = model_to_dict(finish, exclude=["id", "organization"])
        FinishesLibrary.objects.create(organization=organization, **data)

    Logger.info(
        {
            "message": f"Completed duplicate_default_textures for org {organization.id}",
            "timestamp": timezone.now().isoformat(),
        }
    )


def duplicate_default_catalogs_for_organization(organization: Organization) -> None:
    """
    Clone all default catalogs (organization IS NULL) into the given organization.
    Preserves parent-child relationships.
    """
    Logger.info(
        {
            "message": f"Starting duplicate_default_catalogs_for_organization for org {organization.id}",
            "timestamp": timezone.now().isoformat(),
        }
    )

    default_catalogs = DesignCatalog.objects.filter(organization__isnull=True).order_by(
        "created_at"
    )

    old_to_new = {}
    for catalog in default_catalogs:
        clone = DesignCatalog.objects.create(
            organization=organization,
            script_parent=catalog.id,
            is_script=True,
            is_library=True,
            version=None,
            type=catalog.type,
            name=catalog.name,
            parent=None,
            data={**catalog.data} if catalog.data else {},
        )

        clone.data["id"] = str(clone.id)
        clone.save(update_fields=["data"])

        clone.materials.set(catalog.materials.all())

        old_to_new[catalog.id] = clone

    for catalog in default_catalogs:
        if catalog.parent_id:
            child = old_to_new[catalog.id]
            parent = old_to_new.get(catalog.parent_id)

            if not parent:
                raise ValueError(f"Missing cloned parent for {catalog.id}")

            child.parent = parent
            child.data["parent"] = str(parent.id)
            child.save(update_fields=["parent", "data"])

    Logger.info(
        {
            "message": f"Completed duplicate_default_catalogs_for_organization for org {organization.id}",
            "timestamp": timezone.now().isoformat(),
        }
    )


def get_client_ip(request: Request) -> Optional[str]:
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def get_ip_location(ip_address: str) -> Optional[str]:
    try:
        ip = ipaddress.ip_address(ip_address)

        # Ignore loopback & private IPs
        if ip.is_loopback or ip.is_private:
            return None

        response = requests.get(
            f"http://ip-api.com/json/{ip}",
            timeout=3,
        )
        data = response.json()

        if data.get("status") == "success":
            return (
                f"{data.get('city', '')}, "
                f"{data.get('regionName', '')}, "
                f"{data.get('country', '')}"
            ).strip(", ")

    except (ValueError, requests.RequestException):
        return None

    return None
