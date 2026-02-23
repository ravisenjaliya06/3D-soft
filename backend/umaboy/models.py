# Python imports
import uuid
from typing import Dict, List

# Django imports
from django.contrib.auth.models import AbstractUser, Group
from django.db import models
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    """
    User Model

    Fields:
    id (uuid): The unique id of the user
    email (str): The email of the user
    otp (int): The otp of the user
    otp_expiration_time (datetime): The expiration time of the otp
    phone (str): The phone number of the user
    is_verified (bool): Whether the user is verified or not
    """

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, unique=True
    )
    selected_organization = models.ForeignKey(
        "Organization",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="selected_users",
    )
    name = models.CharField(max_length=255, null=True, blank=True)
    email = models.EmailField(_("Email Address"), unique=True)
    otp = models.IntegerField(null=True, blank=True)
    otp_expiration_time = models.DateTimeField(null=True, blank=True)
    phone = models.CharField(max_length=15, blank=True)
    is_verified = models.BooleanField(default=False)
    profile_picture = models.ImageField(upload_to="profile_pictures", null=True)

    REQUIRED_FIELDS = ["email"]

    class Meta:
        unique_together = ("username", "email")

    def __str__(self: "User") -> str:
        return self.email

    def save(self: "User", *args: List[str], **kwargs: Dict[str, str]) -> None:
        super(User, self).save(*args, **kwargs)


class Organization(models.Model):
    """
    Organization Model

    Fields:
    id (uuid): The unique id of the organization
    name (str): The name of the organization
    display_name (str): The display name of the organization
    user (ManyToManyField): The users associated with the organization
    """

    id = models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)
    name = models.CharField(max_length=255)
    display_name = models.CharField(max_length=255, blank=True, null=True)
    logo = models.ImageField(upload_to="organization/logos", null=True, blank=True)
    user = models.ManyToManyField(User, related_name="organizations")

    company_name = models.CharField(max_length=255, null=True, blank=True)
    company_address = models.TextField(null=True, blank=True)
    company_email = models.EmailField(null=True, blank=True)
    company_phone = models.CharField(max_length=20, null=True, blank=True)
    company_website = models.CharField(max_length=255, null=True, blank=True)
    company_gstin = models.CharField(max_length=50, null=True, blank=True)
    company_pan = models.CharField(max_length=50, null=True, blank=True)

    bank_name = models.CharField(max_length=255, null=True, blank=True)
    account_name = models.CharField(max_length=255, null=True, blank=True)
    account_number = models.CharField(max_length=100, null=True, blank=True)
    account_type = models.CharField(max_length=100, null=True, blank=True)
    ifsc_code = models.CharField(max_length=50, null=True, blank=True)
    branch_name = models.CharField(max_length=255, null=True, blank=True)
    upi_id = models.CharField(max_length=100, null=True, blank=True)

    def __str__(self: "Organization") -> str:
        return self.name


class UserOrganizationPermission(models.Model):
    """
    UserOrganizationPermission Model

    Fields:
    id (uuid): The unique id of the user organization permission
    user (ForeignKey): The user associated with the user organization permission
    organization (ForeignKey): The organization associated with the user organization permission
    permission: The permissions granted to the user within the organization (list of permissions)

    """

    id = models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="user_oraganization_permissions"
    )
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    groups = models.ManyToManyField(Group, related_name="group_permissions")
    is_invited = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)

    def __str__(self: "UserOrganizationPermission") -> str:
        return f"{self.user} - {self.organization}"
