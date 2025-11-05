# Python imports
from typing import cast

# External imports
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.request import Request
from rest_framework.viewsets import ModelViewSet

# App imports
from umaboy.models import User, UserOrganizationPermission

# Local imports
from .constant import (
    ACCOUNT_MANAGER,
    CAN_MANAGE_CATALOG,
    CAN_MANAGE_DESIGN,
    CAN_MANAGE_MES,
    CAN_MANAGE_USER,
    CAN_VIEW_CATALOG,
    CAN_VIEW_DESIGN,
    CAN_VIEW_MES,
    CAN_VIEW_USER,
    CATALOG_MANAGER,
    DELETE,
    DESIGNER,
    GET,
    MES_EDITOR,
    POST,
    PUT,
)


class AccountManager(IsAuthenticated):
    """
    Custom permission to allow access only to Account Managers for a specific organization.
    """

    def has_permission(
        self: "AccountManager", request: Request, view: ModelViewSet
    ) -> bool:
        user = cast(User, request.user)
        if not hasattr(user, "selected_organization") or not user.selected_organization:
            return False

        user_permission = UserOrganizationPermission.objects.get(
            user=request.user, organization=user.selected_organization
        )

        user_groups = user_permission.groups.all()
        group_check = user_groups.filter(name=ACCOUNT_MANAGER).first()
        if not group_check:
            return False
        permissions = group_check.permissions.all()
        allow_get_permission: list = [CAN_VIEW_USER]
        allow_permission: list = [CAN_MANAGE_USER]

        if request.method in [GET]:
            return permissions.filter(codename__in=allow_get_permission).exists()

        if request.method in [POST, PUT, DELETE]:
            return permissions.filter(codename__in=allow_permission).exists()

        return False


class CatalogManager(BasePermission):
    """
    Custom permission to allow access only to Catalog Managers.
    """

    def has_permission(
        self: "CatalogManager", request: Request, view: ModelViewSet
    ) -> bool:
        user = User.objects.filter(id=request.user.id).first()
        if not user.selected_organization:
            return False
        user_permission = UserOrganizationPermission.objects.get(
            user=request.user, organization__id=user.selected_organization.id
        )
        user_groups = user_permission.groups.all()
        group_check = user_groups.filter(name=CATALOG_MANAGER).first()
        if not group_check:
            return False
        permissions = group_check.permissions.all()

        allow_get_permission: list = [CAN_VIEW_CATALOG]
        allow_permission: list = [CAN_MANAGE_CATALOG]

        if request.method in [GET]:
            return permissions.filter(codename__in=allow_get_permission).exists()

        if request.method in [POST, PUT, DELETE]:
            return permissions.filter(codename__in=allow_permission).exists()

        return False


class Designer(BasePermission):
    """
    Custom permission to allow access only to Designers.
    """

    def has_permission(self: "Designer", request: Request, view: ModelViewSet) -> bool:
        user = User.objects.filter(id=request.user.id).first()
        if not user.selected_organization:
            return False
        user_permission = UserOrganizationPermission.objects.get(
            user=request.user, organization__id=user.selected_organization.id
        )
        user_groups = user_permission.groups.all()
        group_check = user_groups.filter(name=DESIGNER).first()
        if not group_check:
            return False
        permissions = group_check.permissions.all()

        allow_get_permission: list = [CAN_VIEW_DESIGN]
        allow_permission: list = [CAN_MANAGE_DESIGN]

        if request.method in [GET]:
            return permissions.filter(codename__in=allow_get_permission).exists()

        if request.method in [POST, PUT, DELETE]:
            return permissions.filter(codename__in=allow_permission).exists()

        return False


class MesEditor(BasePermission):
    """
    Custom permission to allow access only to MES Editors.
    """

    def has_permission(self: "MesEditor", request: Request, view: ModelViewSet) -> bool:
        user = User.objects.filter(id=request.user.id).first()
        if not user.selected_organization:
            return False
        user_permission = UserOrganizationPermission.objects.get(
            user=request.user, organization__id=user.selected_organization.id
        )
        user_groups = user_permission.groups.all()
        group_check = user_groups.filter(name=MES_EDITOR).first()
        if not group_check:
            return False
        permissions = group_check.permissions.all()

        allow_get_permission: list = [CAN_VIEW_MES]
        allow_permission: list = [CAN_MANAGE_MES]

        if request.method in [GET]:
            return permissions.filter(codename__in=allow_get_permission).exists()

        if request.method in [POST, PUT, DELETE]:
            return permissions.filter(codename__in=allow_permission).exists()

        return False
