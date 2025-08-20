# Python imports
import sys
from os.path import abspath, dirname

# Django imports
import django

DJANGO_ROOT = dirname(dirname(abspath(__file__)))
sys.path.append(DJANGO_ROOT)
django.setup()

# Django imports
from django.contrib.auth.models import Group, Permission, User
from django.contrib.contenttypes.models import ContentType

PERMISSIONS = {
    "Can view user": "view_user",
    "Can manage user": "manage_user",
    "Can view design": "view_design",
    "Can manage design": "manage_design",
    "Can view catalog": "view_catalog",
    "Can manage catalog": "manage_catalog",
    "Can view MES": "view_mes",
    "Can manage MES": "manage_mes",
}

GROUPS = {
    "Account Manager": ["view_user", "manage_user"],
    "Designer": ["view_design", "manage_design"],
    "Catalog Manager": ["view_catalog", "manage_catalog"],
    "Mes Editor": ["view_mes", "manage_mes"],
}


def clear_group_and_permissions() -> None:
    Permission.objects.all().delete()
    Group.objects.all().delete()


def create_permissions() -> None:
    """
    Creates permissions based on the provided list.

    Args:
        PERMISSIONS: A dictionary where keys are permission names
                         and values are their corresponding codenames.
    """
    for name, codename in PERMISSIONS.items():
        Permission.objects.update_or_create(
            name=name,
            codename=codename,
            content_type=ContentType.objects.get_for_model(User),
        )


def create_groups_with_permissions() -> None:
    """
    Creates groups and assigns permissions to them.

    Args:
        GROUPS: A dictionary where keys are group names
                   and values are lists of permission codenames.
    """
    for name, permissions in GROUPS.items():
        group, created = Group.objects.get_or_create(name=name)
        group.permissions.clear()
        for permission_name in permissions:
            permission = Permission.objects.get(codename=permission_name)
            group.permissions.add(permission)


if __name__ == "__main__":
    clear_group_and_permissions()  # Run this only on new database to avoid conflict on user permissions
    create_permissions()
    create_groups_with_permissions()
