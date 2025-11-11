# Python imports
import uuid

# Django imports
from django.urls import reverse

# External imports
import pytest
from rest_framework import status

# App imports
from design.models import DesignSetting
from design.tests.test_paylaod_data import design_serialized_data
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
