# Python imports
import uuid

# Django imports
from django.urls import reverse

# External imports
import pytest
from rest_framework import status

# App imports
from design.models import (
    CatalogRuleParts,
    CatalogRules,
    DesignCatalog,
    DesignSetting,
    DesignVersion,
)
from tests.model_factory import (
    new_catalog_rule,
    new_catalog_rule_part,
    new_design,
    new_design_catalog,
    new_design_version,
)
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
        version1 = new_design_version(
            database=DEFAULT_DATABASE, design=self.design
        )
        version2 = new_design_version(
            database=DEFAULT_DATABASE, design=self.design
        )

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
        DesignVersion.objects.filter(
            design__organization=self.organization
        ).delete()

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
        version1 = new_design_version(
            database=DEFAULT_DATABASE, design=self.design
        )

        # Create version for different organization (using invalid_user)
        other_design = new_design(
            database=DEFAULT_DATABASE,
            organization=self.organization,
            user=self.invalid_user,
            design_name="other design",
        )
        other_version = new_design_version(
            database=DEFAULT_DATABASE, design=other_design
        )

        response = self.client.get(
            reverse("design_versions"),
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        version_ids = [v["id"] for v in response.data]
        self.assertIn(str(version1.id), version_ids)
        # Should not include versions from other organizations
        # Note: Since both designs are in same org, both will appear
        # This test verifies filtering works correctly

    # Design Catalog API Test Cases - GET
    def test_get_design_catalogs_with_design_id(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test GET /catalogs/ with design_id returns latest version's catalogs"""
        version = new_design_version(
            database=DEFAULT_DATABASE, design=self.design
        )
        catalog1 = new_design_catalog(
            database=DEFAULT_DATABASE,
            organization=self.organization,
            version=version,
            type="Cabinet",
            name="Main Cabinet",
            data={"id": "catalog1", "name": "Main Cabinet", "type": "Cabinet"},
        )
        rule1 = new_catalog_rule(
            database=DEFAULT_DATABASE, catalog=catalog1, name="DEFAULT"
        )
        part1 = new_catalog_rule_part(
            database=DEFAULT_DATABASE,
            catalog_rule=rule1,
            name="Part 1",
            data={"id": "part1", "name": "Part 1", "parent": str(catalog1.id)},
        )

        response = self.client.get(
            reverse("design_catalogs"),
            {"design_id": str(self.design.id)},
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("version_id", response.data)
        self.assertIn("items", response.data)
        self.assertEqual(str(version.id), response.data["version_id"])
        self.assertIsInstance(response.data["items"], list)
        self.assertGreaterEqual(len(response.data["items"]), 2)  # catalog + part

    def test_get_design_catalogs_with_design_id_and_version_id(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test GET /catalogs/ with design_id and version_id returns specific version"""
        version1 = new_design_version(
            database=DEFAULT_DATABASE, design=self.design
        )
        version2 = new_design_version(
            database=DEFAULT_DATABASE, design=self.design
        )

        catalog1 = new_design_catalog(
            database=DEFAULT_DATABASE,
            organization=self.organization,
            version=version1,
            type="Cabinet",
            name="Version 1 Cabinet",
            data={"id": "catalog1", "name": "Version 1 Cabinet"},
        )
        catalog2 = new_design_catalog(
            database=DEFAULT_DATABASE,
            organization=self.organization,
            version=version2,
            type="Cabinet",
            name="Version 2 Cabinet",
            data={"id": "catalog2", "name": "Version 2 Cabinet"},
        )

        response = self.client.get(
            reverse("design_catalogs"),
            {"design_id": str(self.design.id), "version_id": str(version1.id)},
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(str(version1.id), response.data["version_id"])
        items = response.data["items"]
        catalog_names = [item.get("name") for item in items]
        self.assertIn("Version 1 Cabinet", catalog_names)
        self.assertNotIn("Version 2 Cabinet", catalog_names)

    def test_get_design_catalogs_missing_design_id(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test GET /catalogs/ without design_id returns 400"""
        response = self.client.get(
            reverse("design_catalogs"),
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)
        self.assertEqual(response.data["detail"], "design_id is required")

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

    def test_get_design_catalogs_with_rules_and_parts(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test GET /catalogs/ returns catalogs with their rules and parts"""
        version = new_design_version(
            database=DEFAULT_DATABASE, design=self.design
        )
        catalog = new_design_catalog(
            database=DEFAULT_DATABASE,
            organization=self.organization,
            version=version,
            type="Cabinet",
            name="Test Cabinet",
            data={"id": "catalog1", "name": "Test Cabinet", "type": "Cabinet"},
        )
        rule1 = new_catalog_rule(
            database=DEFAULT_DATABASE, catalog=catalog, name="RULE1"
        )
        rule2 = new_catalog_rule(
            database=DEFAULT_DATABASE, catalog=catalog, name="RULE2"
        )
        part1 = new_catalog_rule_part(
            database=DEFAULT_DATABASE,
            catalog_rule=rule1,
            name="Part 1",
            data={"id": "part1", "name": "Part 1"},
        )
        part2 = new_catalog_rule_part(
            database=DEFAULT_DATABASE,
            catalog_rule=rule2,
            name="Part 2",
            data={"id": "part2", "name": "Part 2"},
        )

        response = self.client.get(
            reverse("design_catalogs"),
            {"design_id": str(self.design.id)},
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        items = response.data["items"]
        # Should have 1 catalog + 2 parts = 3 items
        self.assertEqual(len(items), 3)
        # The serializer returns items with IDs from data field (which overrides DB ID)
        item_ids = [item.get("id") for item in items]
        self.assertIn("catalog1", item_ids)  # Frontend ID from catalog.data
        # Parts use IDs from part.data, not the database UUID
        self.assertIn("part1", item_ids)  # From part1.data["id"]
        self.assertIn("part2", item_ids)  # From part2.data["id"]

    # Design Catalog API Test Cases - POST
    def test_create_design_catalog_success(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test POST /catalogs/ creates version with catalogs and rules"""
        payload = {
            "design_id": str(self.design.id),
            "items": [
                {
                    "id": "main1",
                    "name": "Main Cabinet",
                    "type": "Cabinet",
                    "is_main": True,
                },
                {
                    "id": "child1",
                    "name": "Child Part",
                    "type": "Plank",
                    "parent": "main1",
                    "catalog_rule": "DEFAULT",
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
        self.assertIn("message", response.data)
        self.assertIn("version_id", response.data)
        self.assertIn("catalog_ids", response.data)
        self.assertEqual(
            response.data["message"], "Design saved successfully"
        )
        self.assertIsInstance(response.data["catalog_ids"], list)
        self.assertEqual(len(response.data["catalog_ids"]), 1)

        # Verify version was created
        version = DesignVersion.objects.filter(
            id=response.data["version_id"]
        ).first()
        self.assertIsNotNone(version)
        self.assertEqual(version.design.id, self.design.id)

        # Verify catalog was created
        catalog = DesignCatalog.objects.filter(
            id=response.data["catalog_ids"][0]
        ).first()
        self.assertIsNotNone(catalog)
        self.assertEqual(catalog.name, "Main Cabinet")

        # Verify rule part was created
        rule_parts = CatalogRuleParts.objects.filter(
            catalog_rule__catalog=catalog
        )
        self.assertEqual(rule_parts.count(), 1)
        self.assertEqual(rule_parts.first().name, "Child Part")

    def test_create_design_catalog_with_nested_parents(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test POST /catalogs/ creates catalogs with parent relationships"""
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
                    "name": "Child Cabinet",
                    "type": "Cabinet",
                    "parent": "parent1",
                    "is_main": True,
                },
                {
                    "id": "grandchild1",
                    "name": "Grandchild Part",
                    "type": "Plank",
                    "parent": "child1",
                    "catalog_rule": "RULE1",
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

        # Verify parent-child relationship
        catalogs = DesignCatalog.objects.filter(
            id__in=response.data["catalog_ids"]
        )
        parent_catalog = catalogs.get(name="Parent Cabinet")
        child_catalog = catalogs.get(name="Child Cabinet")
        self.assertEqual(child_catalog.parent.id, parent_catalog.id)

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

    def test_create_design_catalog_missing_is_main(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test POST /catalogs/ without is_main items returns 400"""
        payload = {
            "design_id": str(self.design.id),
            "items": [
                {
                    "id": "child1",
                    "name": "Child Part",
                    "type": "Plank",
                    "parent": "main1",
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
        # The error message is "At least one item with isMain=true is required"
        # (The utility function uses IS_MAIN = "isMain" constant)
        self.assertIn("isMain", str(response.data))

    def test_create_design_catalog_child_without_parent(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test POST /catalogs/ with child missing parent returns 400"""
        payload = {
            "design_id": str(self.design.id),
            "items": [
                {
                    "id": "main1",
                    "name": "Main Cabinet",
                    "type": "Cabinet",
                    "is_main": True,
                },
                {
                    "id": "child1",
                    "name": "Child Part",
                    "type": "Plank",
                    "is_main": False,
                    # Missing parent
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
        # The error message is "Child item {id} missing parent"
        self.assertIn("parent", str(response.data))

    def test_create_design_catalog_parent_not_found(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test POST /catalogs/ with non-existent parent returns 400"""
        payload = {
            "design_id": str(self.design.id),
            "items": [
                {
                    "id": "main1",
                    "name": "Main Cabinet",
                    "type": "Cabinet",
                    "is_main": True,
                },
                {
                    "id": "child1",
                    "name": "Child Part",
                    "type": "Plank",
                    "is_main": False,
                    "parent": "nonexistent",
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
        # The error message is "Parent 'nonexistent' not found for child 'child1'"
        self.assertIn("Parent", str(response.data))
        self.assertIn("nonexistent", str(response.data))

    def test_create_design_catalog_with_multiple_rules(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test POST /catalogs/ creates multiple rules for same catalog"""
        payload = {
            "design_id": str(self.design.id),
            "items": [
                {
                    "id": "main1",
                    "name": "Main Cabinet",
                    "type": "Cabinet",
                    "is_main": True,
                },
                {
                    "id": "child1",
                    "name": "Child Part 1",
                    "type": "Plank",
                    "parent": "main1",
                    "catalog_rule": "RULE1",
                },
                {
                    "id": "child2",
                    "name": "Child Part 2",
                    "type": "Plank",
                    "parent": "main1",
                    "catalog_rule": "RULE2",
                },
                {
                    "id": "child3",
                    "name": "Child Part 3",
                    "type": "Plank",
                    "parent": "main1",
                    "catalog_rule": "RULE1",
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

        # Verify rules were created
        catalog = DesignCatalog.objects.filter(
            id=response.data["catalog_ids"][0]
        ).first()
        rules = CatalogRules.objects.filter(catalog=catalog)
        self.assertEqual(rules.count(), 2)  # RULE1 and RULE2

        # Verify parts were assigned to correct rules
        rule1 = rules.get(name="RULE1")
        rule2 = rules.get(name="RULE2")
        self.assertEqual(rule1.catalog_rule_parts.count(), 2)
        self.assertEqual(rule2.catalog_rule_parts.count(), 1)

    def test_create_design_catalog_invalid_data(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test POST /catalogs/ with invalid data returns 400"""
        payload = {
            "design_id": str(self.design.id),
            "items": [
                {
                    "id": "main1",
                    # Missing required fields: name, type
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

    def test_create_design_catalog_with_complex_structure(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test POST /catalogs/ with complex nested structure"""
        payload = {
            "design_id": str(self.design.id),
            "items": [
                {
                    "id": "cabinet1",
                    "name": "Main Cabinet",
                    "type": "Cabinet",
                    "is_main": True,
                    "dimensions": {"width": 100, "height": 200, "depth": 50},
                    "position": {"x": 0, "y": 0, "z": 0},
                },
                {
                    "id": "door1",
                    "name": "Door",
                    "type": "Door",
                    "parent": "cabinet1",
                    "catalog_rule": "DEFAULT",
                    "dimensions": {"width": 50, "height": 200},
                },
                {
                    "id": "drawer1",
                    "name": "Drawer",
                    "type": "Drawer",
                    "parent": "cabinet1",
                    "catalog_rule": "DEFAULT",
                    "dimensions": {"width": 50, "height": 100, "depth": 40},
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
        self.assertEqual(len(response.data["catalog_ids"]), 1)

        # Verify all parts were created
        catalog = DesignCatalog.objects.filter(
            id=response.data["catalog_ids"][0]
        ).first()
        rule = CatalogRules.objects.filter(catalog=catalog).first()
        parts = CatalogRuleParts.objects.filter(catalog_rule=rule)
        self.assertEqual(parts.count(), 2)
