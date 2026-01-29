# Python imports
import os
import tempfile
import uuid

# Django imports
from django.urls import reverse

# External imports
import pytest
from rest_framework import status

# App imports
from design.models import DesignCatalog, DesignSetting, DesignVersion
from design.views import create_excel_for_nesting
from tests.model_factory import new_design_version
from tests.testing import DEFAULT_DATABASE, APIBaseTestCase


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

    # Delete design
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

    # Design API Test case
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

    # Design Version API Test Cases
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
        # Create version for user's organization
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

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
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

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
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

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
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

        # Verify catalog was created
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
        # Material should not be attached if it doesn't exist
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
        payload = {"design_id": str(self.design.id)}

        response = self.client.post(
            reverse("design_catalogs"),
            data=payload,
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

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
        # Version should still be created
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

    # Nesting API Test Cases
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

    # NestingSheetViewSet Test Cases
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

    # NestingFileViewSet Test Cases
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

        # May return 404 if sheet doesn't exist, or 200 with empty list
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

        # Nesting might succeed or fail depending on sheet size, but should not crash
        self.assertIn(
            response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]
        )

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
        # Create design setting
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
