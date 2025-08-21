# Python imports
import uuid
from unittest import mock
from unittest.mock import patch

# Django imports
from django.http import JsonResponse
from django.urls import reverse

# External imports
import pytest
from rest_framework import status

# App imports
from design.models import Catalog, CatalogItem, DesignSetting
from design.tests.test_paylaod_data import create_design_data, design_serialized_data
from design.utils import parse_design_data
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

    def test_get_catalog_items(self: "DesignAPIViewTestCase") -> None:
        response = self.client.get(
            reverse("catalog_item"), format="json", headers=self.get_headers
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["name"], "TOP_PLANK")

    def test_get_catalog_default_items(self: "DesignAPIViewTestCase") -> None:
        self.new_catalog.is_default = True
        self.new_catalog.save()
        response = self.client.get(
            reverse("default_catalog"),
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_catalog_item_by_id(self: "DesignAPIViewTestCase") -> None:
        response = self.client.get(
            reverse("catalog_item_get", kwargs={"catalog_id": self.new_catalog.id}),
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["name"], "TOP_PLANK")
        self.assertEqual(response.data[0]["catalog"], self.new_catalog.id)

    def test_get_design_catalog(self: "DesignAPIViewTestCase") -> None:
        response = self.client.get(
            reverse("design_objects", kwargs={"design_id": self.design.id}),
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["design"], self.design.id)

    def test_get_design_catalog_with_invalid_design_id(
        self: "DesignAPIViewTestCase",
    ) -> None:
        response = self.client.get(
            reverse("design_objects", kwargs={"design_id": str(uuid.uuid4())}),
            format="json",
            headers=self.get_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "Design Not Found")

    def test_delete_design_catalog(self: "DesignAPIViewTestCase") -> None:
        """Test deleting a catalog and its items"""
        response = self.client.delete(
            reverse("design_objects", kwargs={"design_id": self.design.id}),
            format="json",
            data={"ids": str(self.new_catalog.id)},
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "catalog deleted successfully.")

    def test_delete_design_catalog_item(self: "DesignAPIViewTestCase") -> None:
        """Test deleting a catalog and its items"""
        response = self.client.delete(
            reverse("design_objects", kwargs={"design_id": self.design.id}),
            format="json",
            data={"ids": str(self.new_catalog_item.id)},
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "catalog deleted successfully.")

    def test_delete_with_empty_id(self: "DesignAPIViewTestCase") -> None:
        """Test deleting with a non-existent ID"""
        url = reverse("design_objects", kwargs={"design_id": self.design.id})
        response = self.client.delete(
            url, data={"ids": ""}, format="json", headers=self.get_headers
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "No catalog ids provided")

    def test_delete_with_nonexistent_id(self: "DesignAPIViewTestCase") -> None:
        """Test deleting with a non-existent ID"""
        non_existent_id = str(uuid.uuid4())
        data = {"ids": non_existent_id}

        url = reverse("design_objects", kwargs={"design_id": self.design.id})
        response = self.client.delete(
            url, data=data, format="json", headers=self.get_headers
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "No catalogs or items found")

    def test_delete_with_invalid_design_id(self: "DesignAPIViewTestCase") -> None:
        """Test deleting with an invalid design ID"""
        invalid_design_id = str(uuid.uuid4())
        url = (
            reverse("design_objects", kwargs={"design_id": invalid_design_id})
            + "?is_custom=True"
        )
        response = self.client.delete(url, format="json", headers=self.get_headers)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "Design Not Found")

    def test_delete_with_all_data(self: "DesignAPIViewTestCase") -> None:
        """Test deleting with a non-existent ID"""

        url = (
            reverse("design_objects", kwargs={"design_id": self.design.id})
            + "?is_custom=False"
        )
        response = self.client.delete(url, format="json", headers=self.get_headers)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["message"], "All design catalogs deleted successfully."
        )

    def test_create_catalog_with_invalid_design_id(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test creating a catalog with an invalid design ID"""
        data = {
            "data": {
                "catalog": {"name": "Test Catalog", "data": {"type": "wall"}},
                "items": [],
            }
        }

        invalid_design_id = str(uuid.uuid4())
        url = reverse("design_objects", kwargs={"design_id": invalid_design_id})
        response = self.client.post(
            url, data=data, format="json", headers=self.get_headers
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "Design Not Found")

    def test_create_catalog_with_nested_structure(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test creating a catalog with nested child catalogs"""
        url = reverse("design_objects", kwargs={"design_id": self.design.id})
        response = self.client.post(
            url, data=create_design_data, format="json", headers=self.get_headers
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data), 2)

        parent_catalog = response.data[0]
        self.assertEqual(parent_catalog["name"], "Parent Catalog")
        self.assertEqual(len(parent_catalog["design_catalog_items"]), 1)

        child_catalog = response.data[1]
        self.assertEqual(child_catalog["name"], "Child Catalog 1")
        self.assertEqual(len(child_catalog["design_catalog_items"]), 1)
        self.assertEqual(str(child_catalog["parent"]), parent_catalog["id"])

    def test_create_catalog_with_catalog_ids(self: "DesignAPIViewTestCase") -> None:
        """Test creating a catalog with nested child catalogs"""
        data = {
            "catalog_id": str(self.new_catalog.id),
        }

        url = reverse("design_objects", kwargs={"design_id": self.design.id})
        response = self.client.post(
            url, data=data, format="json", headers=self.get_headers
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data[0]["name"], "Main Cabinet")

    def test_create_catalog_with_invalid_catalog_ids(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test creating a catalog with nested child catalogs"""
        data = {
            "catalog_id": str(uuid.uuid4()),
        }

        url = reverse("design_objects", kwargs={"design_id": self.design.id})
        response = self.client.post(
            url, data=data, format="json", headers=self.get_headers
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_catalog_with_invalid_data_structure(
        self: "DesignAPIViewTestCase",
    ) -> None:
        data = {"data": {"items": [{"name": "Test Item", "data": {"width": 100}}]}}

        url = reverse("design_objects", kwargs={"design_id": self.design.id})
        response = self.client.post(
            url, data=data, format="json", headers=self.get_headers
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("catalog", response.data["data"])
        self.assertEqual(response.data["data"]["catalog"], "This field is required.")

    def test_update_design_catalog(self: "DesignAPIViewTestCase") -> None:
        """Test updating an existing catalog and its items"""
        data = {
            "data": {
                "catalog": {
                    "id": str(self.new_catalog.id),
                    "name": "Updated Cabinet",
                    "data": {"width": 150, "height": 250, "depth": 60},
                },
                "items": [
                    {
                        "id": str(self.new_catalog_item.id),
                        "name": "UPDATED_PLANK",
                        "data": {"width": 150, "height": 25, "depth": 60},
                        "material": str(self.new_material.id),
                    }
                ],
            }
        }
        response = self.client.put(
            reverse("design_objects", kwargs={"design_id": self.design.id}),
            format="json",
            data=data,
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["name"], "Updated Cabinet")

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

    def test_get_design_mes_data(self: "DesignAPIViewTestCase") -> None:
        response = self.client.get(
            reverse("mes", kwargs={"design_id": self.design.id}),
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_design_mes_data_with_invalid_designid(
        self: "DesignAPIViewTestCase",
    ) -> None:
        response = self.client.get(
            reverse("mes", kwargs={"design_id": str(uuid.uuid4())}),
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "Design data not found.")

    def test_get_design_mes_data_with_catalog_item_not_found(
        self: "DesignAPIViewTestCase",
    ) -> None:
        catalogs = Catalog.objects.filter(design=self.design)
        for catalog in catalogs:
            CatalogItem.objects.filter(catalog=catalog).delete()
        response = self.client.get(
            reverse("mes", kwargs={"design_id": self.design.id}),
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch("design.views.nest")
    @patch("pandas.DataFrame.to_excel")
    @patch("os.makedirs")
    def test_nesting_success(
        self: "DesignAPIViewTestCase",
        mock_makedirs: mock,
        mock_to_excel: mock,
        mock_nest: mock,
    ) -> None:
        """Test successful nesting operation"""

        mock_response = JsonResponse(
            {"output_file": f"media/output/{self.design.id}/nesting.pdf"}
        )
        mock_nest.return_value = mock_response

        mock_to_excel.return_value = None

        mock_makedirs.return_value = None

        url = reverse("design_nesting", kwargs={"design_id": self.design.id})
        response = self.client.get(url, format="json", headers=self.get_headers)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Nesting completed.")
        self.assertTrue("svg_file" in response.data)
        self.assertTrue("excel_file" in response.data)

        mock_nest.assert_called_once()
        args, kwargs = mock_nest.call_args
        self.assertEqual(kwargs["enclosing_rectangle"], True)

    def test_nesting_invalid_design_id(self: "DesignAPIViewTestCase") -> None:
        """Test nesting with invalid design ID"""
        invalid_design_id = str(uuid.uuid4())
        url = reverse("design_nesting", kwargs={"design_id": invalid_design_id})
        response = self.client.get(url, format="json", headers=self.get_headers)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "Design Catalog data not found.")

    @patch("os.path.exists")
    def test_download_nesting_pdf(
        self: "DesignAPIViewTestCase", mock_exists: mock
    ) -> None:
        """Test downloading nesting PDF file"""
        mock_exists.return_value = True

        data = {"format": "pdf"}

        url = reverse("design_nesting_download", kwargs={"design_id": self.design.id})
        response = self.client.put(
            url, data=data, format="json", headers=self.get_headers
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["file"], f"media/output/{self.design.id}/nesting.pdf"
        )

    @patch("os.path.exists")
    def test_download_nesting_excel(
        self: "DesignAPIViewTestCase", mock_exists: mock
    ) -> None:
        """Test downloading nesting Excel file"""
        mock_exists.return_value = True

        data = {"format": "xlsx"}

        url = reverse("design_nesting_download", kwargs={"design_id": self.design.id})
        response = self.client.put(
            url, data=data, format="json", headers=self.get_headers
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["file"], f"media/output/{self.design.id}/nesting.xlsx"
        )

    def test_parse_design_data(self: "DesignAPIViewTestCase") -> None:
        """Test parse_design_data utility function"""

        result = parse_design_data(design_serialized_data)
        self.assertEqual(len(result), 4)

        for plank_id, plank_data in result.items():
            self.assertTrue(isinstance(plank_id, str))

            if plank_data["name"] == "LEFT_PLANK":
                self.assertEqual(plank_data["width"], 20 * 10)
                self.assertEqual(plank_data["height"], 100 * 10)
                self.assertEqual(plank_data["depth"], 50 * 10)

            if plank_data["name"] == "TOP_PLANK":
                self.assertEqual(plank_data["width"], 100 * 10)
                self.assertEqual(plank_data["height"], 20 * 10)
                self.assertEqual(plank_data["depth"], 50 * 10)

            if plank_data["name"] == "BACK_PLANK":
                self.assertEqual(plank_data["width"], 100 * 10)
                self.assertEqual(plank_data["height"], 100 * 10)

    def test_parse_design_data_for_nesting(self: "DesignAPIViewTestCase") -> None:
        """Test parse_design_data utility function for nesting operation"""
        serialized_data = [
            {
                "id": str(uuid.uuid4()),
                "name": "LEFT_PLANK",
                "data": {"name": "LEFT_PLANK", "width": 50, "height": 100, "depth": 20},
            }
        ]
        result = parse_design_data(serialized_data)
        self.assertEqual(len(result), 1)
        plank_id = list(result.keys())[0]
        self.assertTrue(isinstance(plank_id, str))
        self.assertEqual(result[plank_id]["name"], "LEFT_PLANK")

    def test_nesting_no_catalog_items(self: "DesignAPIViewTestCase") -> None:
        """Test nesting with catalogs but no items"""

        design_catalog = Catalog.objects.using(DEFAULT_DATABASE).filter(
            design=self.design
        )
        for item in design_catalog:
            data = (
                CatalogItem.objects.using(DEFAULT_DATABASE).filter(catalog=item).first()
            )
            data.delete()

        url = reverse("design_nesting", kwargs={"design_id": self.design.id})
        response = self.client.get(url, format="json", headers=self.get_headers)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "No design catalog items found.")

    def test_catalog_item_create(self: "DesignAPIViewTestCase") -> None:
        """Test creating a catalog item"""
        data = {
            "name": "New Catalog Item",
            "data": {"width": 200, "height": 150, "depth": 30},
            "material": str(self.new_material.id),
        }

        url = reverse(
            "design_objects_create",
            kwargs={"design_id": self.design.id, "catalog_id": self.new_catalog.id},
        )
        response = self.client.post(
            url, data=data, format="json", headers=self.get_headers
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "New Catalog Item")

    def test_catalog_item_create_with_invalid_catalog_id(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test creating a catalog item with invalid catalog ID"""
        data = {"name": "New Catalog Item", "data": {"width": 200, "height": 150}}
        url = reverse(
            "design_objects_create",
            kwargs={"design_id": self.design.id, "catalog_id": str(uuid.uuid4())},
        )
        response = self.client.post(
            url, data=data, format="json", headers=self.get_headers
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "Catalog not found.")

    def test_catalog_item_create_with_invalid_data(
        self: "DesignAPIViewTestCase",
    ) -> None:
        """Test creating a catalog item with invalid data"""
        data = {"data": {"width": 200, "height": 150}}

        url = reverse(
            "design_objects_create",
            kwargs={"design_id": self.design.id, "catalog_id": self.new_catalog.id},
        )
        response = self.client.post(
            url, data=data, format="json", headers=self.get_headers
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
