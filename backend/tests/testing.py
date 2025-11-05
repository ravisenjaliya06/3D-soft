# Python imports
from typing import Dict, Optional

# Django imports
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.urls import reverse

# External imports
from rest_framework.test import APITestCase

# App imports
from tests.model_factory import (
    new_catalog,
    new_catalog_for_material,
    new_catalog_item,
    new_catalog_rule_parts,
    new_catalog_rules,
    new_company,
    new_design,
    new_design_setting,
    new_material,
    new_material_for_material,
    new_organization,
    new_texture,
    new_user,
    new_user_organization_permission,
)
from umaboy.models import User
from user.logger import UserLogger as Logger

DEFAULT_DATABASE = "default"
PASSWORD = "umaboy@123"  # noqa: S105


class APIBaseTestCase(APITestCase):
    def setUp(self: "APIBaseTestCase") -> None:
        self.database: Optional[str] = None
        self.access_token: Optional[str] = None
        self.seed_database(DEFAULT_DATABASE)

    def seed_database(self: "APIBaseTestCase", db: str) -> None:
        if self.database is not None:
            raise Exception(
                f"This will overwrite the member variables for db={self.database}"
            )

        self.database = db
        self.seed_permissions(DEFAULT_DATABASE)
        self.seed_users(DEFAULT_DATABASE)
        self.seed_organization(DEFAULT_DATABASE)
        self.seed_invalid_user(DEFAULT_DATABASE)
        self.seed_new_design(DEFAULT_DATABASE)
        self.seed_new_texture(DEFAULT_DATABASE)
        self.seed_new_material(DEFAULT_DATABASE)
        self.seed_new_catalog_structure(DEFAULT_DATABASE)
        self.seed_new_design_setting(DEFAULT_DATABASE)
        self.seed_new_user_organization_permission(DEFAULT_DATABASE)
        self.seed_new_company(DEFAULT_DATABASE)
        self.seed_new_material_for_material(DEFAULT_DATABASE)
        self.seed_new_catalog_for_material(DEFAULT_DATABASE)
        self.seed_new_catalog_rules(DEFAULT_DATABASE)
        self.seed_new_catalog_rule_parts(DEFAULT_DATABASE)

    @property
    def get_headers(self: "APIBaseTestCase") -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if not self.access_token:
            response = self.client.post(
                reverse("login"),
                {"email": self.user.email, "password": PASSWORD},
                format="json",
            )
            self.access_token = response.data["payload"]["access"]
            headers["Authorization"] = f"Bearer {self.access_token}"
        return headers

    @property
    def get_invalid_user_headers(self: "APIBaseTestCase") -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if not self.access_token:
            response = self.client.post(
                reverse("login"),
                {"email": self.invalid_user.email, "password": PASSWORD},
                format="json",
            )
            self.access_token = response.data["payload"]["access"]
            headers["Authorization"] = f"Bearer {self.access_token}"
        return headers

    def seed_permissions(self: "APIBaseTestCase", db: str) -> None:
        permissions = [
            {"codename": "view_user", "name": "Can view user"},
            {"codename": "manage_user", "name": "Can manage user"},
            {"codename": "view_projects", "name": "Can view project"},
            {"codename": "manage_projects", "name": "Can manage project"},
            {"codename": "view_catalog", "name": "Can view catalog"},
            {"codename": "manage_catalog", "name": "Can manage catalog"},
            {"codename": "view_design", "name": "Can view design"},
            {"codename": "manage_design", "name": "Can manage design"},
            {"codename": "view_mes", "name": "Can view MES"},
            {"codename": "manage_mes", "name": "Can manage MES"},
        ]

        content_type = ContentType.objects.get_for_model(User)
        if not content_type:
            raise ValueError("ContentType for User model not found!")

        for perm in permissions:
            permission, created = Permission.objects.get_or_create(
                codename=perm["codename"], name=perm["name"], content_type=content_type
            )
        role_permissions = {
            "Account Manager": ["view_user", "manage_user"],
            "Catalog Manager": ["view_catalog", "manage_catalog"],
            "Designer": ["view_design", "manage_design"],
            "Mes Editor": ["view_mes", "manage_mes"],
        }

        created_groups = []
        for role, perms in role_permissions.items():
            group, created = Group.objects.using(db).get_or_create(name=role)
            permissions_to_add = Permission.objects.using(db).filter(
                codename__in=perms, content_type=content_type
            )
            if not permissions_to_add.exists():
                continue

            group.permissions.set(permissions_to_add)
            group.save()
        return created_groups

    def seed_users(self: "APIBaseTestCase", db: str) -> None:
        Logger.debug({"message": "populating test db with users"})
        self.user = new_user(
            database=db,
            email="bravento@gmail.com",
            name="bravento",
            username="bravento",
            password=PASSWORD,
            confirm_password=PASSWORD,
        )
        self.invited_user = new_user(
            database=db,
            email="invited.user@gmail.com",
            name="invited user",
            username="invited_user",
            password=PASSWORD,
            confirm_password=PASSWORD,
        )
        Logger.debug({"message": "Finished populating test database with users."})

    def seed_invalid_user(self: "APIBaseTestCase", db: str) -> None:
        Logger.debug({"message": "populating test db with users"})
        self.invalid_user = new_user(
            database=db,
            email="testing@gmail.com",
            name="testing",
            username="testing",
            password=PASSWORD,
            confirm_password=PASSWORD,
        )
        Logger.debug({"message": "Finished populating test database with users."})

    def seed_organization(self: "APIBaseTestCase", db: str) -> None:
        self.organization = new_organization(database=db, user=self.user)
        self.user.selected_organization = self.organization
        self.user.save()

        self.organization.user.add(self.invited_user)
        self.invited_user.selected_organization = self.organization
        self.invited_user.save()
        Logger.debug({"message": "Finished population test db with organizations"})

    def seed_new_user_organization_permission(self: "APIBaseTestCase", db: str) -> None:
        self.user_organization_permission = new_user_organization_permission(
            database=db,
            user=self.user,
            organization=self.organization,
        )
        self.invited_user_organization_permission = new_user_organization_permission(
            database=db,
            user=self.invited_user,
            organization=self.organization,
        )
        Logger.debug({"message": "Finished setting up user organization permissions."})

    def seed_new_design(self: "APIBaseTestCase", db: str) -> None:
        self.design = new_design(
            database=db,
            user=self.user,
            organization=self.organization,
            design_name="test design",
        )

    def seed_new_texture(self: "APIBaseTestCase", db: str) -> None:
        self.new_texture = new_texture(database=db, name="test", image="test")

    def seed_new_material(self: "APIBaseTestCase", db: str) -> None:
        self.new_material = new_material(
            database=db, name="test", texture=self.new_texture
        )

    def seed_new_catalog_structure(self: "APIBaseTestCase", db: str) -> None:
        # Create main catalog
        self.new_catalog = new_catalog(
            database=db,
            name="Main Cabinet",
            design=self.design,
            data={"width": 100, "height": 200, "depth": 50},
        )

        # Create catalog item for main catalog
        self.new_catalog_item = new_catalog_item(
            database=db,
            name="TOP_PLANK",
            catalog=self.new_catalog,
            data={"width": 100, "height": 20, "depth": 50},
            material=self.new_material,
        )

        # Create child catalog
        self.child_catalog = new_catalog(
            database=db,
            name="Drawer",
            design=self.design,
            parent=self.new_catalog,
            data={"position": {"x": 10, "y": 10, "z": 0}},
        )

        # Create catalog item for child catalog
        self.child_catalog_item = new_catalog_item(
            database=db,
            name="DRAWER_FRONT",
            catalog=self.child_catalog,
            data={"width": 60, "height": 15, "depth": 2},
            material=self.new_material,
        )

    def seed_new_design_setting(self: "APIBaseTestCase", db: str) -> None:
        self.organiozation_design_setting = new_design_setting(
            database=db,
            oraganization=self.organization,
            unit="mm",
            sheet_width=200,
            sheet_height=200,
            minifix_distance=10,
        )
        self.design_setting = new_design_setting(
            database=db,
            oraganization=self.organization,
            design=self.design,
            unit="mm",
            sheet_width=200,
            sheet_height=200,
            minifix_distance=10,
        )

    def seed_new_company(self: "APIBaseTestCase", db: str) -> None:
        self.company = new_company(
            database=db,
            name="test",
            material_type="Banding",
            organization=self.organization,
        )

    def seed_new_material_for_material(self: "APIBaseTestCase", db: str) -> None:
        self.material = new_material_for_material(
            database=db,
            name="Molding Copy",
            organization=self.organization,
            company=self.company,
            type="Laminate",
            # is_deleted=False,
        )

    def seed_new_catalog_for_material(self: "APIBaseTestCase", db: str) -> None:
        self.catalog = new_catalog_for_material(
            database=db,
            type="Door",
            name="new create t1",
            organization=self.organization,
            width=101,
            height=200,
            design=self.design,
        )

    def seed_new_catalog_rules(self: "APIBaseTestCase", db: str) -> None:
        self.catalog_rules = new_catalog_rules(
            database=db,
            name="Test Rule",
            catalog=self.catalog,
        )

    def seed_new_catalog_rule_parts(self: "APIBaseTestCase", db: str) -> None:
        self.catalog_rule_parts = new_catalog_rule_parts(
            database=db,
            catalog_rule=self.catalog_rules,
            name="Door Molding",
            height=50,
            width=500,
            material=self.material,
        )
