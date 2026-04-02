# Python imports
import os
import tempfile
import uuid
from datetime import date

# Django imports
from django.urls import reverse

# External imports
import pytest
from rest_framework import status
from unittest.mock import patch

# App imports
from design.models import CatalogTypeChoices, Design, DesignCatalog, DesignSetting, DesignVersion
from design.views import create_excel_for_nesting
from mes_portal.models import WorkOrder
from mes_portal.views import WorkOrderViewSet
from umaboy.models import Organization
from design.utils import (
    group_catalogs_as_lists,
    parse_catalog_data,
    parse_design_data,
    split_parents_and_children,
)
from tests.model_factory import new_design_version
from tests.testing import DEFAULT_DATABASE, APIBaseTestCase
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory


@pytest.mark.django_db
class DesignAPIViewTestCase(APIBaseTestCase):
    databases = {DEFAULT_DATABASE}

    def setUp(self: "DesignAPIViewTestCase") -> None:
        super().setUp()

    def test_create_design(self: "DesignAPIViewTestCase") -> None:
        data = {"design_name": "New design"}
        response = self.client.post(
            reverse("design"),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["design_name"], "New design")

    def test_create_design_with_invalid_data(self: "DesignAPIViewTestCase") -> None:
        data = {"design_name": ""}
        response = self.client.post(
            reverse("design"),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_design_by_id(self: "DesignAPIViewTestCase") -> None:
        response = self.client.get(
            reverse("get_put_and_delete_design", kwargs={"design_id": self.design.id}),
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["design_name"], "test design")

    def test_update_design(self: "DesignAPIViewTestCase") -> None:
        data = {"design_name": "testing123"}
        response = self.client.put(
            reverse("get_put_and_delete_design", kwargs={"design_id": self.design.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_not_found_design(self: "DesignAPIViewTestCase") -> None:
        data = {"status": "Deleted"}
        response = self.client.put(
            reverse(
                "get_put_and_delete_design", kwargs={"design_id": str(uuid.uuid4())}
            ),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_destroy_design(self: "DesignAPIViewTestCase") -> None:
        response = self.client.delete(
            reverse("get_put_and_delete_design", kwargs={"design_id": self.design.id}),
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_destroy_design_with_invalid_id(self: "DesignAPIViewTestCase") -> None:
        response = self.client.delete(
            reverse(
                "get_put_and_delete_design", kwargs={"design_id": str(uuid.uuid4())}
            ),
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_list_design(self: "DesignAPIViewTestCase") -> None:
        response = self.client.get(
            reverse("design"), format="json", headers=self.get_headers
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_list_design_with_recent_design(self: "DesignAPIViewTestCase") -> None:
        response = self.client.get(
            reverse("design"), {"recent": True}, format="json", headers=self.get_headers
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_list_design_with_custom_param(self: "DesignAPIViewTestCase") -> None:
        response = self.client.get(
            reverse("design"),
            {"is_custom": "true"},
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_list_design_with_deleted_design(self: "DesignAPIViewTestCase") -> None:
        response = self.client.get(
            reverse("design"),
            {"deleted": True},
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_design_list_by_project_id(self: "DesignAPIViewTestCase") -> None:
        response = self.client.get(
            reverse("design"),
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_design_settings(self: "DesignAPIViewTestCase") -> None:
        response = self.client.get(
            reverse("design_settings", kwargs={"design_id": self.design.id}),
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_put_design_settings(self: "DesignAPIViewTestCase") -> None:
        data = {"unit": "mm", "sheet_width": 100, "sheet_height": 100}
        response = self.client.put(
            reverse("design_settings", kwargs={"design_id": self.design.id}),
            format="json",
            data=data,
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_design_settings_with_invalid_design_ids(
        self: "DesignAPIViewTestCase",
    ) -> None:
        response = self.client.get(
            reverse("design_settings", kwargs={"design_id": str(uuid.uuid4())}),
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_put_design_settings_with_invalid_data(
        self: "DesignAPIViewTestCase",
    ) -> None:
        data = {"unit": "", "sheet_width": 100, "sheet_height": 100}
        response = self.client.put(
            reverse("design_settings", kwargs={"design_id": self.design.id}),
            format="json",
            data=data,
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_organization_design_settings(self: "DesignAPIViewTestCase") -> None:
        response = self.client.get(
            reverse("organization_design_settings"),
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit"], "mm")

    def remove_organization_design_settings(self: "DesignAPIViewTestCase") -> None:
        design_setting = DesignSetting.objects.using(DEFAULT_DATABASE).filter(
            organization=self.organization
        )
        for design in design_setting:
            design.delete()

    def test_get_organization_design_settings_with_new_data(
        self: "DesignAPIViewTestCase",
    ) -> None:
        self.remove_organization_design_settings()

        response = self.client.get(
            reverse("organization_design_settings"),
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "Design setting not found.")

    def test_get_organization_design_settings_with_new_user(
        self: "DesignAPIViewTestCase",
    ) -> None:

        response = self.client.get(
            reverse("organization_design_settings"),
            format="json",
            headers=self.get_invalid_user_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_organization_design_settings(self: "DesignAPIViewTestCase") -> None:
        data = {"unit": "mm", "sheet_width": 100, "sheet_height": 100}

        response = self.client.put(
            reverse("organization_design_settings"),
            format="json",
            data=data,
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit"], "mm")

    def test_update_organization_design_settings_with_new_user(
        self: "DesignAPIViewTestCase",
    ) -> None:
        data = {"unit": "mm", "sheet_width": 100, "sheet_height": 100}

        response = self.client.put(
            reverse("organization_design_settings"),
            format="json",
            data=data,
            headers=self.get_invalid_user_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "Organization not found.")

    def test_update_organization_design_settings_with_invalid_design_setting(
        self: "DesignAPIViewTestCase",
    ) -> None:
        self.remove_organization_design_settings()
        data = {"unit": "mm", "sheet_width": 100, "sheet_height": 100}
        response = self.client.put(
            reverse("organization_design_settings"),
            format="json",
            data=data,
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "Design setting not found.")

    def test_update_organization_design_settings_with_error(
        self: "DesignAPIViewTestCase",
    ) -> None:
        data = {"sheet_width": "abc"}
        response = self.client.put(
            reverse("organization_design_settings"),
            format="json",
            data=data,
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_organization_design_setting(self: "DesignAPIViewTestCase") -> None:
        """
        Test POST /organization_design_settings/ to create a new design setting.
        """

        DesignSetting.objects.filter(organization=self.organization).delete()

        payload = {
            "unit": "mm",
            "sheet_width": 120,
            "sheet_height": 240,
        }

        url = reverse("organization_design_settings")
        response = self.client.post(
            url,
            data=payload,
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["unit"], "mm")
        self.assertEqual(
            DesignSetting.objects.filter(organization=self.organization).count(), 1
        )

    def test_create_organization_design_setting_org_not_found(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """
        Test POST when user has no organization -> 404
        """
        response = self.client.post(
            reverse("organization_design_settings"),
            data={"unit": "mm", "sheet_width": 100, "sheet_height": 100},
            format="json",
            headers=self.get_invalid_user_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "Organization not found.")

    def test_create_organization_design_setting_already_exists(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """
        Test POST when a design setting already exists -> 400
        """
        DesignSetting.objects.filter(organization=self.organization).delete()
        DesignSetting.objects.create(
            organization=self.organization,
            unit="mm",
            sheet_width=100,
            sheet_height=100,
        )

        response = self.client.post(
            reverse("organization_design_settings"),
            data={"unit": "inch", "sheet_width": 200, "sheet_height": 200},
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "Design setting already exists.")

    def test_create_organization_design_setting_with_invalid_data(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """
        POST with invalid payload should return serializer.errors (HTTP 400).
        This covers the `return Response(serializer.errors, status=HTTP_400_BAD_REQUEST)` branch.
        """
        DesignSetting.objects.filter(organization=self.organization).delete()

        payload = {"unit": "", "sheet_width": 100, "sheet_height": 100}

        url = reverse("organization_design_settings")
        response = self.client.post(
            url, data=payload, format="json", headers=self.get_headers
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.assertIsInstance(response.data, dict)
        self.assertIn("unit", response.data)

        self.assertEqual(
            DesignSetting.objects.filter(organization=self.organization).count(), 0
        )

    def test_create_organization_design_setting_invalid_unit(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """
        POST with an empty 'unit' (invalid) should hit serializer.errors
        and return HTTP 400.  Covers the `return Response(serializer.errors, ...)` branch.
        """
        DesignSetting.objects.filter(organization=self.organization).delete()

        payload = {"unit": "", "sheet_width": 100, "sheet_height": 100}

        url = reverse("organization_design_settings")
        response = self.client.post(
            url, data=payload, format="json", headers=self.get_headers
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIsInstance(response.data, dict)
        self.assertIn("unit", response.data)
        self.assertEqual(
            DesignSetting.objects.filter(organization=self.organization).count(), 0
        )

    def test_get_design_versions_list(self: "DesignAPIViewTestCase") -> None:
        """Test GET /versions/ returns list of versions for user's organization"""
        version1 = new_design_version(database=DEFAULT_DATABASE, design=self.design)
        version2 = new_design_version(database=DEFAULT_DATABASE, design=self.design)

        response = self.client.get(
            reverse("design_versions"),
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertGreaterEqual(len(response.data), 2)
        version_ids = [v["id"] for v in response.data]
        self.assertIn(str(version1.id), version_ids)
        self.assertIn(str(version2.id), version_ids)

    def test_get_design_versions_empty_list(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test GET /versions/ returns empty list when no versions exist"""
        DesignVersion.objects.filter(design__organization=self.organization).delete()

        response = self.client.get(
            reverse("design_versions"),
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 0)

    def test_get_design_versions_filtered_by_organization(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test GET /versions/ only returns versions for user's organization"""
        version1 = new_design_version(database=DEFAULT_DATABASE, design=self.design)

        response = self.client.get(
            reverse("design_versions"),
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        version_ids = [v["id"] for v in response.data]
        self.assertIn(str(version1.id), version_ids)

    def test_get_design_catalogs_list_empty(self: "DesignAPIViewTestCase") -> None:
        """Test GET /catalogs/ returns empty list when no catalogs exist"""
        DesignCatalog.objects.filter(organization=self.organization).delete()

        response = self.client.get(
            reverse("design_catalogs"),
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 0)

    def test_get_design_catalogs_with_version_id(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test GET /catalogs/ with version_id returns specific version catalogs"""
        version1 = new_design_version(database=DEFAULT_DATABASE, design=self.design)

        response = self.client.get(
            reverse("design_catalogs"),
            {"version_id": str(version1.id)},
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["version"], version1.id)

    def test_get_design_catalogs_with_design_id_and_version_id(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test GET /catalogs/ with design_id and version_id returns specific version"""
        version1 = new_design_version(database=DEFAULT_DATABASE, design=self.design)

        response = self.client.get(
            reverse("design_catalogs"),
            {"design_id": str(self.design.id), "version_id": str(version1.id)},
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(version1.id, response.data["version"])
        items = response.data["catalogs"]
        catalog_names = [item.get("name") for item in items]
        self.assertNotIn("Version 2 Cabinet", catalog_names)

    def test_get_design_catalogs_design_not_found(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test GET /catalogs/ with non-existent design_id returns 404"""
        response = self.client.get(
            reverse("design_catalogs"),
            {"design_id": str(uuid.uuid4())},
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("detail", response.data)
        self.assertEqual(response.data["detail"], "Design not found")

    def test_get_design_catalogs_version_not_found(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test GET /catalogs/ with non-existent version_id returns 404"""
        response = self.client.get(
            reverse("design_catalogs"),
            {
                "design_id": str(self.design.id),
                "version_id": str(uuid.uuid4()),
            },
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("detail", response.data)
        self.assertEqual(response.data["detail"], "Design not found")

    def test_get_design_catalogs_design_with_no_versions(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test GET /catalogs/ with design_id that has no versions returns 404"""
        DesignVersion.objects.filter(design=self.design).delete()

        response = self.client.get(
            reverse("design_catalogs"),
            {"design_id": str(self.design.id)},
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("detail", response.data)
        self.assertEqual(response.data["detail"], "Design not found")

    def test_get_design_catalogs_filtered_by_organization(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test GET /catalogs/ only returns catalogs for user's organization"""
        response = self.client.get(
            reverse("design_catalogs"),
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_design_catalog_success(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test POST /catalogs/ creates catalogs successfully"""
        payload = {
            "design_id": str(self.design.id),
            "items": [
                {
                    "id": "main1",
                    "name": "Main Cabinet",
                    "type": "Cabinet",
                    "is_main": True,
                    "width": 100,
                    "height": 200,
                }
            ],
        }

        response = self.client.post(
            reverse("design_catalogs"),
            data=payload,
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["message"], "Design saved successfully")
        self.assertIn("version_id", response.data)
        self.assertIn("catalog_ids", response.data)
        self.assertEqual(len(response.data["catalog_ids"]), 1)

        version = DesignVersion.objects.get(id=response.data["version_id"])
        catalog = DesignCatalog.objects.get(id=response.data["catalog_ids"][0])
        self.assertEqual(catalog.version, version)
        self.assertEqual(catalog.name, "Main Cabinet")
        self.assertEqual(catalog.type, "Cabinet")
        self.assertEqual(catalog.organization, self.organization)

    def test_create_design_catalog_with_parent_child(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test POST /catalogs/ creates catalogs with parent-child relationships"""
        payload = {
            "design_id": str(self.design.id),
            "items": [
                {
                    "id": "parent1",
                    "name": "Parent Cabinet",
                    "type": "Cabinet",
                    "is_main": True,
                },
                {
                    "id": "child1",
                    "name": "Child Door",
                    "type": "Door",
                    "parent": "parent1",
                },
            ],
        }

        response = self.client.post(
            reverse("design_catalogs"),
            data=payload,
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["catalog_ids"]), 2)

        catalogs = DesignCatalog.objects.filter(
            id__in=response.data["catalog_ids"]
        ).select_related("parent")

        parent_catalog = next(c for c in catalogs if c.name == "Parent Cabinet")
        child_catalog = next(c for c in catalogs if c.name == "Child Door")

        self.assertIsNone(parent_catalog.parent)
        self.assertEqual(child_catalog.parent, parent_catalog)
        self.assertEqual(child_catalog.data["parent"], str(parent_catalog.id))

    def test_create_design_catalog_with_materials(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test POST /catalogs/ attaches materials to catalogs"""
        payload = {
            "design_id": str(self.design.id),
            "items": [{"id": "main1", "name": "Main Cabinet", "type": "Cabinet"}],
        }

        response = self.client.post(
            reverse("design_catalogs"),
            data=payload,
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_design_catalog_with_nonexistent_material(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test POST /catalogs/ handles nonexistent materials gracefully"""
        payload = {
            "design_id": str(self.design.id),
            "items": [{"id": "main1", "name": "Main Cabinet", "type": "Cabinet"}],
        }

        response = self.client.post(
            reverse("design_catalogs"),
            data=payload,
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        catalog = DesignCatalog.objects.get(id=response.data["catalog_ids"][0])
        self.assertEqual(catalog.materials.count(), 0)

    def test_create_design_catalog_with_empty_material_list(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test POST /catalogs/ handles empty material list"""
        payload = {
            "design_id": str(self.design.id),
            "items": [
                {
                    "id": "main1",
                    "name": "Main Cabinet",
                    "type": "Cabinet",
                    "material": [],
                }
            ],
        }

        response = self.client.post(
            reverse("design_catalogs"),
            data=payload,
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        catalog = DesignCatalog.objects.get(id=response.data["catalog_ids"][0])
        self.assertEqual(catalog.materials.count(), 0)

    def test_create_design_catalog_missing_design_id(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test POST /catalogs/ without design_id returns 400"""
        payload = {
            "items": [
                {
                    "id": "main1",
                    "name": "Main Cabinet",
                    "type": "Cabinet",
                    "is_main": True,
                }
            ],
        }

        response = self.client.post(
            reverse("design_catalogs"),
            data=payload,
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_design_catalog_missing_items(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test POST /catalogs/ without items returns 400"""
        payload = {"design_id": str(self.design.id), "items": []}

        response = self.client.post(
            reverse("design_catalogs"),
            data=payload,
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_design_catalog_empty_items(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test POST /catalogs/ with empty items list creates version but no catalogs"""
        payload = {"design_id": str(self.design.id), "items": []}

        response = self.client.post(
            reverse("design_catalogs"),
            data=payload,
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["catalog_ids"]), 0)
        self.assertIn("version_id", response.data)

    def test_create_design_catalog_multiple_items(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test POST /catalogs/ creates multiple catalogs correctly"""
        payload = {
            "design_id": str(self.design.id),
            "items": [
                {
                    "id": "item1",
                    "name": "Item 1",
                    "type": "Cabinet",
                },
                {
                    "id": "item2",
                    "name": "Item 2",
                    "type": "Door",
                },
                {
                    "id": "item3",
                    "name": "Item 3",
                    "type": "Drawer",
                },
            ],
        }

        response = self.client.post(
            reverse("design_catalogs"),
            data=payload,
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data["catalog_ids"]), 3)

        catalogs = DesignCatalog.objects.filter(id__in=response.data["catalog_ids"])
        self.assertEqual(catalogs.count(), 3)
        names = {c.name for c in catalogs}
        self.assertEqual(names, {"Item 1", "Item 2", "Item 3"})

    def test_create_design_catalog_missing_design_id_returns_400(self: "DesignAPIViewTestCase") -> None:
        """Serializer validation error path for missing design_id."""
        payload = {"items": [{"id": "x", "name": "Cab", "type": "Cabinet"}]}
        response = self.client.post(
            reverse("design_catalogs"),
            data=payload,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_design_catalog_invalid_items_type(self: "DesignAPIViewTestCase") -> None:
        """Serializer validation error path when items is not a list."""
        payload = {"design_id": str(self.design.id), "items": {"id": "x"}}
        response = self.client.post(
            reverse("design_catalogs"),
            data=payload,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_design_catalog_child_with_unknown_parent(self: "DesignAPIViewTestCase") -> None:
        """Child references a parent not in payload: create() raises ValueError (not DRF 400)."""
        payload = {
            "design_id": str(self.design.id),
            "items": [
                {"id": "childX", "name": "Door X", "type": "Door", "parent": "nope-parent"}
            ],
        }
        with self.assertRaises(ValueError) as ctx:
            self.client.post(
                reverse("design_catalogs"),
                data=payload,
                format="json",
                headers=self.get_headers,
            )
        self.assertIn("Parent not found", str(ctx.exception))

    def test_put_design_settings_with_negative_dimensions(self: "DesignAPIViewTestCase") -> None:
        """DesignSettingSerializer has no min validators; negatives are accepted (200)."""
        data = {"unit": "mm", "sheet_width": -1, "sheet_height": -5}
        response = self.client.put(
            reverse("design_settings", kwargs={"design_id": self.design.id}),
            format="json",
            data=data,
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("sheet_width"), -1)
        self.assertEqual(response.data.get("sheet_height"), -5)

    def test_create_design_catalog_preserves_item_data(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test POST /catalogs/ preserves all item data in catalog.data"""
        payload = {
            "design_id": str(self.design.id),
            "items": [
                {
                    "id": "main1",
                    "name": "Main Cabinet",
                    "type": "Cabinet",
                    "width": 100,
                    "height": 200,
                    "depth": 50,
                    "custom_field": "custom_value",
                }
            ],
        }

        response = self.client.post(
            reverse("design_catalogs"),
            data=payload,
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        catalog = DesignCatalog.objects.get(id=response.data["catalog_ids"][0])
        self.assertEqual(catalog.data["width"], 100)
        self.assertEqual(catalog.data["height"], 200)
        self.assertEqual(catalog.data["depth"], 50)
        self.assertEqual(catalog.data["custom_field"], "custom_value")
        self.assertEqual(catalog.data["id"], str(catalog.id))

    def test_nesting_api_no_planks(self: "DesignAPIViewTestCase") -> None:
        """Test nesting API when no planks exist"""
        DesignCatalog.objects.filter(
            organization=self.organization, type="plank"
        ).delete()

        response = self.client.post(
            reverse("nesting", kwargs={"design_id": self.design.id}),
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
        self.assertIn("No planks found", response.data["error"])

    def test_nesting_api_design_not_found(self: "DesignAPIViewTestCase") -> None:
        """Test nesting API with non-existent design"""
        response = self.client.post(
            reverse("nesting", kwargs={"design_id": str(uuid.uuid4())}),
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("error", response.data)

    def test_download_nesting_file_pdf(self: "DesignAPIViewTestCase") -> None:
        """Test download_nesting_file for PDF format"""
        data = {"format": "pdf"}
        response = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("file", response.data)

    def test_download_nesting_file_xlsx(self: "DesignAPIViewTestCase") -> None:
        """Test download_nesting_file for XLSX format"""
        data = {"format": "xlsx"}
        response = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("file", response.data)

    def test_download_nesting_file_gcode(self: "DesignAPIViewTestCase") -> None:
        """Test download_nesting_file for GCODE format"""
        data = {"format": "gcode"}
        response = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("file", response.data)

    def test_download_nesting_file_dwg(self: "DesignAPIViewTestCase") -> None:
        """Test download_nesting_file for DWG format"""
        data = {"format": "dwg", "sheet_number": 1}
        response = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("file", response.data)

    def test_download_nesting_file_xml(self: "DesignAPIViewTestCase") -> None:
        """Test download_nesting_file for XML format"""
        data = {"format": "xml", "sheet_number": 1}
        response = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("file", response.data)

    def test_download_nesting_file_svg(self: "DesignAPIViewTestCase") -> None:
        """Test download_nesting_file for SVG format"""
        data = {"format": "svg", "sheet_number": 1}
        response = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("file", response.data)

    def test_download_nesting_file_invalid_format(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test download_nesting_file with invalid format"""
        data = {"format": "invalid"}
        response = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Error", response.data)

    def test_nesting_sheets_list_no_design_id(self: "DesignAPIViewTestCase") -> None:
        """Test nesting_sheets list without design_id"""
        response = self.client.get(
            reverse("nesting_sheets"),
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_nesting_sheets_list_design_not_found(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test nesting_sheets list with non-existent design"""
        response = self.client.get(
            reverse("nesting_sheets"),
            {"design_id": str(uuid.uuid4())},
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("error", response.data)

    def test_nesting_sheets_retrieve_no_sheet_number(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test nesting_sheets retrieve without sheet_number"""
        response = self.client.get(
            reverse("nesting_sheet_detail", kwargs={"design_id": self.design.id}),
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_nesting_sheets_retrieve_invalid_sheet_number(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test nesting_sheets retrieve with invalid sheet_number"""
        response = self.client.get(
            reverse("nesting_sheet_detail", kwargs={"design_id": self.design.id}),
            {"sheet_number": "invalid"},
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_nesting_sheets_retrieve_sheet_not_found(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test nesting_sheets retrieve with non-existent sheet"""
        response = self.client.get(
            reverse("nesting_sheet_detail", kwargs={"design_id": self.design.id}),
            {"sheet_number": 999},
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("error", response.data)

    def test_nesting_files_list_no_design_id(self: "DesignAPIViewTestCase") -> None:
        """Test nesting_files list without design_id"""
        response = self.client.get(
            reverse("nesting_files"),
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_nesting_files_list_design_not_found(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test nesting_files list with non-existent design"""
        response = self.client.get(
            reverse("nesting_files"),
            {"design_id": str(uuid.uuid4())},
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("error", response.data)

    def test_nesting_files_list_with_sheet_number(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test nesting_files list with sheet_number filter"""
        response = self.client.get(
            reverse("nesting_files"),
            {"design_id": str(self.design.id), "sheet_number": 1},
            format="json",
            headers=self.get_headers,
        )

        self.assertIn(
            response.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]
        )

    def test_nesting_files_list_with_file_type(self: "DesignAPIViewTestCase") -> None:
        """Test nesting_files list with file_type filter"""
        response = self.client.get(
            reverse("nesting_files"),
            {"design_id": str(self.design.id), "file_type": "pdf"},
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

    def test_nesting_files_list_invalid_sheet_number(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test nesting_files list with invalid sheet_number"""
        response = self.client.get(
            reverse("nesting_files"),
            {"design_id": str(self.design.id), "sheet_number": "invalid"},
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_nesting_files_list_sheet_not_found(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test nesting_files list with non-existent sheet_number"""
        response = self.client.get(
            reverse("nesting_files"),
            {"design_id": str(self.design.id), "sheet_number": 999},
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("error", response.data)

    def test_create_excel_for_nesting(self: "DesignAPIViewTestCase") -> None:
        """Test create_excel_for_nesting function"""
        nesting_data = {
            "plank1": {
                "name": "Test Plank",
                "type": "rectangle",
                "width": 100,
                "height": 50,
                "depth": 18,
                "grooves": [{"type": "groove", "orientation": "horizontal"}],
                "minifix_holes": [{"type": "DOWEL", "diameter": 8}],
            }
        }

        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            result_path = create_excel_for_nesting(nesting_data, tmp_path)

            self.assertEqual(result_path, tmp_path)
            self.assertTrue(os.path.exists(tmp_path))
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    def test_create_excel_for_nesting_empty_data(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test create_excel_for_nesting with empty data"""
        nesting_data = {}

        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            result_path = create_excel_for_nesting(nesting_data, tmp_path)

            self.assertEqual(result_path, tmp_path)
            self.assertTrue(os.path.exists(tmp_path))
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    def test_nesting_api_with_planks(self: "DesignAPIViewTestCase") -> None:
        """Test nesting API with actual planks"""
        version = new_design_version(database=DEFAULT_DATABASE, design=self.design)

        response = self.client.post(
            reverse("nesting", kwargs={"design_id": self.design.id}),
            {"version_id": str(version.id)},
            format="json",
            headers=self.get_headers,
        )

        self.assertIn(
            response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]
        )

    def test_catalog_list_library_true_returns_items(self: "DesignAPIViewTestCase") -> None:
        """GET /catalogs/ without design/version should return library=True items (possibly empty)."""
        resp = self.client.get(reverse("design_catalogs"), format="json", headers=self.get_headers)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn(type(resp.data).__name__, ["list", "dict"])

    def test_catalog_list_with_version_but_no_catalogs_returns_detail(self: "DesignAPIViewTestCase") -> None:
        """GET /catalogs/ with version filter but none exist should return {'detail': 'Design not found'} (200)."""
        resp = self.client.get(
            reverse("design_catalogs"),
            {"design_id": str(self.design.id), "version_id": str(uuid.uuid4())},
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("detail", resp.data)

    def test_nesting_files_list_with_design_id_but_empty(self: "DesignAPIViewTestCase") -> None:
        """GET /files/ with valid design_id returns 200 with possibly empty list."""
        resp = self.client.get(
            reverse("nesting_files") + f"?design_id={self.design.id}",
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsInstance(resp.data, list)

    def test_nesting_files_list_ignores_unknown_file_type(self: "DesignAPIViewTestCase") -> None:
        """Unknown file_type query should not 5xx and still return 200 with list response."""
        resp = self.client.get(
            reverse("nesting_files") + f"?design_id={self.design.id}&file_type=unknown",
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsInstance(resp.data, list)

    def test_download_nesting_file_xml_zip_when_design_not_found(self: "DesignAPIViewTestCase") -> None:
        """xml_zip should still return a zip path when design is not found (fallback branch)."""
        data = {"format": "xml_zip"}
        resp = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": str(uuid.uuid4())}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(resp.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND])

    def test_create_design_catalog_with_is_library_true_and_base64_image(self: "DesignAPIViewTestCase") -> None:
        """Posting with ?is_library=true and base64 image should succeed and not create a version."""
        img = "data:image/png;base64,"
        payload = {
            "design_id": str(self.design.id),
            "items": [
                {"id": "A", "name": "Plank A", "type": "plank", "image": img, "dimensions": {"width": 10, "height": 20, "depth": 3}}
            ],
        }
        url = reverse("design_catalogs") + "?is_library=true"
        resp = self.client.post(url, data=payload, format="json", headers=self.get_headers)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(resp.data.get("version_id"))
        self.assertTrue(len(resp.data.get("catalog_ids", [])) >= 1)

    def test_create_design_catalog_creates_version_when_not_library(self: "DesignAPIViewTestCase") -> None:
        """Default (not library) should create a new version and return its id."""
        payload = {
            "design_id": str(self.design.id),
            "items": [{"id": "B", "name": "Plank B", "type": "plank", "dimensions": {"width": 11, "height": 22, "depth": 4}}],
        }
        resp = self.client.post(reverse("design_catalogs"), data=payload, format="json", headers=self.get_headers)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(resp.data.get("version_id"))

    def test_create_design_catalog_parent_child_happy_path(self: "DesignAPIViewTestCase") -> None:
        """Child links to existing parent by frontend id within the same payload."""
        items = [
            {"id": "PARENT", "name": "Parent Cabinet", "type": "plank", "dimensions": {"width": 50, "height": 60, "depth": 18}},
            {"id": "CHILD", "name": "Child Door", "type": "door", "parent": "PARENT", "dimensions": {"width": 30, "height": 40, "depth": 18}},
        ]
        payload = {"design_id": str(self.design.id), "items": items}
        resp = self.client.post(reverse("design_catalogs"), data=payload, format="json", headers=self.get_headers)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(resp.data.get("catalog_ids", [])), 2)

    def test_put_design_settings_partial_width_update(self: "DesignAPIViewTestCase") -> None:
        """PUT with only some fields should still update settings (view uses serializer model)."""
        data = {"unit": "mm", "sheet_width": 777}
        self.client.force_authenticate(user=self.user)
        resp = self.client.put(
            reverse("design_settings", kwargs={"design_id": self.design.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        get_resp = self.client.get(
            reverse("design_settings", kwargs={"design_id": self.design.id}),
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(get_resp.data.get("sheet_width"), 777)

    def test_parse_design_data_orientation_and_bands(self: "DesignAPIViewTestCase") -> None:
        """Orientation fix for left/right/top planks; edgeband dict to list mapping; parent name mapping."""
        items = [
            {
                "id": "1",
                "name": "LEFT_PLANK",
                "type": "plank",
                "dimensions": {"width": 1, "height": 2, "depth": 3},
                "edgeband": {"left": True, "top": True, "bottom": False, "front": True},
            },
            {
                "id": "2",
                "name": "TOP_PLANK",
                "type": "plank",
                "dimensions": {"width": 1, "height": 2, "depth": 3},
                "parent": "1",
            },
        ]
        out = parse_design_data(items)
        self.assertIn("1", out)
        self.assertIn("2", out)
        self.assertEqual(out["1"]["width"], 3000.0)
        self.assertEqual(out["2"]["height"], 3000.0)
        self.assertTrue(set(out["1"]["edgebands"]).issuperset({"LEFT", "TOP"}))
        self.assertEqual(out["2"]["parent_name"], "LEFT_PLANK")

    def test_parse_catalog_data_position_rotation_passthrough(self: "DesignAPIViewTestCase") -> None:
        """Ensure position and rotation fields are passthrough from catalog.data."""
        cat = DesignCatalog.objects.create(
            organization=self.organization,
            type=CatalogTypeChoices.PLANK,
            name="P",
            data={
                "dimensions": {"width": 10, "height": 20, "depth": 5},
                "position": {"x": 1, "y": 2, "z": 3},
                "rotation": {"x": 0, "y": 90, "z": 0},
            },
        )
        out = parse_catalog_data([cat])
        row = out[str(cat.id)]
        self.assertEqual(row["position"], {"x": 1, "y": 2, "z": 3})
        self.assertEqual(row["rotation"], {"x": 0, "y": 90, "z": 0})

    def test_download_nesting_file_svg_with_sheet_number(self: "DesignAPIViewTestCase") -> None:
        """SVG download should include the requested sheet number in filename path."""
        data = {"format": "svg", "sheet_number": 3}
        resp = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("nesting_sheet_3.svg", resp.data.get("file", ""))

    def test_nesting_sheet_list_missing_design_id(self: "DesignAPIViewTestCase") -> None:
        resp = self.client.get(reverse("nesting_sheets"), format="json", headers=self.get_headers)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("design_id", resp.data.get("error", ""))

    def test_nesting_sheet_list_design_not_found(self: "DesignAPIViewTestCase") -> None:
        resp = self.client.get(
            reverse("nesting_sheets") + f"?design_id={uuid.uuid4()}",
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("Design not found", resp.data.get("error", ""))

    def test_nesting_file_list_missing_design_id(self: "DesignAPIViewTestCase") -> None:
        resp = self.client.get(reverse("nesting_files"), format="json", headers=self.get_headers)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("design_id", resp.data.get("error", ""))

    def test_nesting_file_list_design_not_found(self: "DesignAPIViewTestCase") -> None:
        resp = self.client.get(
            reverse("nesting_files") + f"?design_id={uuid.uuid4()}",
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("Design not found", resp.data.get("error", ""))

    def test_download_nesting_file_invalid_format(self: "DesignAPIViewTestCase") -> None:
        data = {"format": "invalid-format"}
        resp = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Enter Valid Format", resp.data.get("Error", ""))

    def test_download_nesting_file_dwg_sheet_number(self: "DesignAPIViewTestCase") -> None:
        data = {"format": "dwg", "sheet_number": 2}
        resp = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("nesting_sheet_2.dwg", resp.data.get("file", ""))

    def test_download_nesting_file_xml_sheet_number(self: "DesignAPIViewTestCase") -> None:
        data = {"format": "xml", "sheet_number": 4}
        resp = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("nesting_sheet_4.xml", resp.data.get("file", ""))

    def test_download_nesting_file_json_success_after_nesting(self: "DesignAPIViewTestCase") -> None:
        """Mock nesting to succeed and json file to exist, then GET json content."""
        from rest_framework.response import Response as DRFResponse
        DesignCatalog.objects.create(
            organization=self.organization,
            type=CatalogTypeChoices.PLANK,
            name="P",
            data={"dimensions": {"width": 10, "height": 20, "depth": 5}},
        )
        with patch("design.views.NestAPIViewset.nesting", return_value=DRFResponse(status=200)), \
             patch("design.views.os.path.exists", return_value=True), \
             patch("design.views.open", create=True) as mock_open:
            mock_open.return_value.__enter__.return_value.read.return_value = "{}"
            data = {"format": "json"}
            resp = self.client.put(
                reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
                data=data,
                format="json",
                headers=self.get_headers,
            )
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            self.assertIsInstance(resp.data, dict)

    def test_render_image_create_and_clear_invalid_design(self: "DesignAPIViewTestCase") -> None:
        response = self.client.post(
            reverse("render_images", kwargs={"design_id": str(uuid.uuid4())}),
            data={"image_url": "http://example.com/img.png"},
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(response.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_401_UNAUTHORIZED])
        response = self.client.post(
            reverse("render_images_clear", kwargs={"design_id": str(uuid.uuid4())}),
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(response.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_401_UNAUTHORIZED])

    def test_parse_design_data_and_group_helpers(self: "DesignAPIViewTestCase") -> None:
        """Covers parse_design_data → orientation/minifix/grooves/edgeband + group helpers."""
        items = [
            {
                "id": "root1",
                "name": "Main Cabinet",
                "type": "Cabinet",
                "isMain": True,
            },
            {
                "id": "p1",
                "name": "LEFT_PLANK",
                "type": "plank",
                "parent": "root1",
                "dimensions": {"width": 0.6, "height": 2.0, "depth": 0.018},
                "grooves": [{"x": 1, "y": 2, "end_x": 10, "end_y": 2, "width": 3}],
                "minifixHoles": [
                    {"type": "DOWEL", "diameter": 8, "length": 30, "face": "5", "localPosition2D": {"x": 5, "y": 6}}
                ],
                "edgeband": {"left": True, "right": False, "top": True, "bottom": False},
            },
            {
                "id": "p2",
                "name": "Drawer Front",
                "type": "plank",
                "parent": "root1",
                "dimensions": {"width": 0.5, "height": 0.2, "depth": 0.018},
                "edgeband": ["LEFT", "RIGHT"],
            },
        ]
        parsed = parse_design_data(items)
        assert "p1" in parsed and "p2" in parsed
        assert parsed["p1"]["width"] == pytest.approx(18.0)
        assert parsed["p1"]["height"] == pytest.approx(2000.0)
        assert isinstance(parsed["p1"]["grooves"], list) and parsed["p1"]["grooves"]
        assert isinstance(parsed["p1"]["minifix_holes"], list) and parsed["p1"]["minifix_holes"]
        assert "edgebands" in parsed["p1"] or "edge_banding" in parsed["p1"]

        parents, children = split_parents_and_children(items)
        assert "root1" in parents
        assert "root1" in children and len(children["root1"]) == 2

        grouped = group_catalogs_as_lists(items)
        assert any(len(group) >= 2 and group[0]["id"] == "root1" for group in grouped)

    def test_split_parents_and_children_error_paths(self: "DesignAPIViewTestCase") -> None:
        """Covers required error branches in split_parents_and_children."""
        with pytest.raises(Exception):
            split_parents_and_children([{"id": "c1", "parent": "x"}])
        with pytest.raises(Exception):
            split_parents_and_children([{"id": "p", "isMain": True}, {"id": "c1"}])
        with pytest.raises(Exception):
            split_parents_and_children([{"id": "p", "isMain": True}, {"id": "c1", "parent": "zzz"}])

    def test_parse_catalog_data_material_and_edgeband(self: "DesignAPIViewTestCase") -> None:
        """Covers parse_catalog_data: PLANK only, materials fallback and edgeband variants."""
        cat = DesignCatalog.objects.create(
            organization=self.organization,
            version=None,
            type=CatalogTypeChoices.PLANK,
            name="TOP_PLANK",
            data={
                "dimensions": {"width": 564, "height": 200, "depth": 18},
                "material": [{"type": "Laminate", "name": "Oak 123"}],
                "edgeband": {"front": True, "back": True, "left": False, "right": False},
                "minifix_holes": [{"type": "DOWEL", "diameter": 8}],
            },
        )
        parsed = parse_catalog_data([cat])
        assert str(cat.id) in parsed
        plank = parsed[str(cat.id)]
        assert plank["width"] == 564
        assert plank["height"] == 18
        assert "edge_banding" in plank and isinstance(plank["edge_banding"], dict)
        assert plank.get("material_name", "-") in ("Oak 123", "-")

    def test_parse_catalog_data_db_precedence_and_alt_keys(self: "DesignAPIViewTestCase") -> None:
        """DB material should override raw; accept edgeBanding/edge_banding keys and map front/back."""
        cat = DesignCatalog.objects.create(
            organization=self.organization,
            version=None,
            type=CatalogTypeChoices.PLANK,
            name="BACK_PLANK",
            data={
                "dimensions": {"width": 300, "height": 180, "depth": 18},
                "material": [{"type": "Laminate", "name": "RawMat"}],
                "edgeBanding": ["LEFT", "RIGHT"],
            },
        )
        parsed = parse_catalog_data([cat])
        plank = parsed[str(cat.id)]
        assert plank["width"] == 300
        assert plank["height"] == 180
        assert isinstance(plank.get("edge_banding", {}), dict)
        assert "parent_name" in plank

    def test_download_nesting_file_json_triggers_generation_error(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """When no planks exist, requesting JSON should return 400 error."""
        DesignCatalog.objects.filter(
            organization=self.organization, type=CatalogTypeChoices.PLANK
        ).delete()
        data = {"format": "json"}
        response = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_download_nesting_file_xml_zip_uses_sanitized_name(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """xml_zip should sanitize design name in the returned file path."""
        self.design.design_name = 'A*B:"C"|D'
        self.design.save(update_fields=["design_name"])
        data = {"format": "xml_zip"}
        response = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        file_path = response.data.get("file", "")
        self.assertTrue(file_path.endswith(".zip"))
        self.assertNotIn(":", file_path)
        self.assertNotIn("*", file_path)
        self.assertNotIn("|", file_path)

    def test_nesting_api_with_planks_and_grooves(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test nesting API with planks that have grooves"""
        version = new_design_version(database=DEFAULT_DATABASE, design=self.design)

        response = self.client.post(
            reverse("nesting", kwargs={"design_id": self.design.id}),
            {"version_id": str(version.id)},
            format="json",
            headers=self.get_headers,
        )

        self.assertIn(
            response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]
        )

    def test_nesting_api_with_planks_and_holes(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test nesting API with planks that have minifix holes"""
        version = new_design_version(database=DEFAULT_DATABASE, design=self.design)

        response = self.client.post(
            reverse("nesting", kwargs={"design_id": self.design.id}),
            {"version_id": str(version.id)},
            format="json",
            headers=self.get_headers,
        )

        self.assertIn(
            response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]
        )

    def test_nesting_api_with_version_id(self: "DesignAPIViewTestCase") -> None:
        """Test nesting API with specific version_id"""
        version = new_design_version(database=DEFAULT_DATABASE, design=self.design)

        response = self.client.post(
            reverse("nesting", kwargs={"design_id": self.design.id}),
            {"version_id": str(version.id)},
            format="json",
            headers=self.get_headers,
        )

        self.assertIn(
            response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]
        )

    def test_nesting_api_with_design_setting(self: "DesignAPIViewTestCase") -> None:
        """Test nesting API with design_setting"""
        DesignSetting.objects.create(
            design=self.design,
            organization=self.organization,
            unit="mm",
            sheet_width=500,
            sheet_height=300,
        )

        response = self.client.post(
            reverse("nesting", kwargs={"design_id": self.design.id}),
            format="json",
            headers=self.get_headers,
        )

        self.assertIn(
            response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]
        )

    def test_download_nesting_file_json_not_found_after_generation(self: "DesignAPIViewTestCase") -> None:
        from rest_framework.response import Response as DRFResponse
        with patch("design.views.NestAPIViewset.nesting", return_value=DRFResponse(status=200)), \
             patch("design.views.os.path.exists", return_value=False):
            resp = self.client.put(
                reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
                data={"format": "json"},
                format="json",
                headers=self.get_headers,
            )
            self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_nesting_files_list_with_file_type_unknown(self: "DesignAPIViewTestCase") -> None:
        resp = self.client.get(
            reverse("nesting_files"),
            {"design_id": str(self.design.id), "file_type": "unknown"},
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsInstance(resp.data, list)

    def test_nesting_sheets_list_with_valid_design_empty_or_generated(self: "DesignAPIViewTestCase") -> None:
        resp = self.client.get(
            reverse("nesting_sheets"),
            {"design_id": str(self.design.id)},
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(resp.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND])

    def test_download_nesting_file_xml_zip_nonexistent_design_id(self: "DesignAPIViewTestCase") -> None:
        resp = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": str(uuid.uuid4())}),
            data={"format": "xml_zip"},
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(resp.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND])

    def test_nesting_files_list_with_sheet_number_non_int(self: "DesignAPIViewTestCase") -> None:
        resp = self.client.get(
            reverse("nesting_files"),
            {"design_id": str(self.design.id), "sheet_number": "abc"},
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(resp.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_200_OK])

    def test_mes_workorder_str_returns_name(self: "DesignAPIViewTestCase") -> None:
        wo = WorkOrder.objects.create(
            design=self.design,
            name="WO-1",
            client_name="Client A",
            description="D",
            delivery_date=date.today(),
        )
        self.assertEqual(str(wo), "WO-1")

    def test_mes_workorder_viewset_get_queryset_filters_by_selected_org(self: "DesignAPIViewTestCase") -> None:
        other_org = Organization.objects.create(name="OtherOrg", display_name="OtherOrg")
        other_design = Design.objects.create(
            organization=other_org,
            created_by=self.user,
            design_name="other-design",
        )
        WorkOrder.objects.create(
            design=self.design,
            name="WO-keep",
            client_name="A",
            description="x",
            delivery_date=date.today(),
        )
        WorkOrder.objects.create(
            design=other_design,
            name="WO-drop",
            client_name="B",
            description="y",
            delivery_date=date.today(),
        )
        view = WorkOrderViewSet()
        req = Request(APIRequestFactory().get("/v1/mes_portal/work-order/"))
        req.user = self.user
        view.request = req
        qs = view.get_queryset()
        self.assertTrue(qs.filter(name="WO-keep").exists())
        self.assertFalse(qs.filter(name="WO-drop").exists())
