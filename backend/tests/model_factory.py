# Python imports
from datetime import datetime, timedelta
from typing import Optional

# Django imports
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import Group
from django.utils import timezone

# App imports
from design.models import (
    Design,
    DesignCatalog,
    DesignSetting,
    DesignVersion,
)
from material.models import Company, Material
from umaboy.models import Organization, User, UserOrganizationPermission
from user.constant import ACCOUNT_MANAGER, CATALOG_MANAGER, DESIGNER, MES_EDITOR


def new_user(
    database: str,
    email: str,
    name: str,
    username: str,
    password: str,
    confirm_password: str,
    phone: str = "1234567899",
    otp: int = 1234,
    otp_expiration_time: Optional[datetime] = None,
    is_verified: bool = False,
    selected_organization: Optional[Organization] = None,
) -> User:
    if otp_expiration_time is None:
        otp_expiration_time = timezone.now() + timedelta(minutes=30)

    user = User.objects.using(database).create(
        email=email,
        username=username,
        name=name,
        password=make_password(password),
        phone=phone,
        otp=otp,
        otp_expiration_time=otp_expiration_time,
        is_verified=True,
        selected_organization=selected_organization,
    )
    if selected_organization:
        organization = selected_organization
        user.organization.add(organization)

    user.save()
    return user


def new_organization(database: str, user: User) -> Organization:
    organization = Organization.objects.using(database).create(
        name=f"{user.username}'s Organization"
    )
    organization.user.add(user)
    organization.save()
    return organization


def new_user_organization_permission(
    database: str,
    user: User,
    organization: Organization,
) -> UserOrganizationPermission:
    check_user = User.objects.using(database).filter(id=user.id).first()
    check_organization = (
        Organization.objects.using(database).filter(id=organization.id).first()
    )

    permission_instance = UserOrganizationPermission.objects.using(database).create(
        user=check_user, organization=check_organization
    )
    groups = [ACCOUNT_MANAGER, MES_EDITOR, DESIGNER, CATALOG_MANAGER]
    for group_name in groups:
        try:
            group = Group.objects.using(database).get(name=group_name)
            permission_instance.groups.add(group)
        except Group.DoesNotExist:
            continue

    return permission_instance


def new_design(
    database: str,
    organization: Organization,
    user: User,
    design_name: str,
    status: str = "DRAFT",
    created_at: Optional[datetime] = None,
    updated_at: Optional[datetime] = None,
) -> Design:
    return Design.objects.using(database).create(
        created_by=user,
        organization=organization,
        design_name=design_name,
        status=status,
        created_at=created_at,
        updated_at=updated_at,
    )


def new_design_setting(
    database: str,
    oraganization: Organization,
    design: Optional[Design] = None,
    unit: str = "mm",
    sheet_width: int = 100,
    sheet_height: int = 100,
    minifix_distance: int = 10,
) -> DesignSetting:
    return DesignSetting.objects.using(database).create(
        organization=oraganization,
        design=design,
        unit=unit,
        sheet_width=sheet_width,
        sheet_height=sheet_height,
        minifix_distance=minifix_distance,
    )


def new_company(
    database: str, name: str, material_type: str, organization: Organization
) -> Company:
    return Company.objects.using(database).create(
        name=name, material_type=material_type, organization=organization
    )


def new_material_for_material(
    database: str, name: str, organization: Organization, company: Company, type: str
) -> Material:
    return Material.objects.using(database).create(
        # name="Molding Copy",
        name=name,
        organization=organization,
        company=company,
        type=type,
        is_deleted=False,
    )


def new_design_version(
    database: str,
    design: Design,
) -> DesignVersion:
    return DesignVersion.objects.using(database).create(design=design)


def new_design_catalog(
    database: str,
    organization: Organization,
    version: DesignVersion,
    type: str,
    name: str,
    parent: Optional[DesignCatalog] = None,
    data: Optional[dict] = None,
) -> DesignCatalog:
    return DesignCatalog.objects.using(database).create(
        organization=organization,
        version=version,
        type=type,
        name=name,
        parent=parent,
        data=data or {},
    )
