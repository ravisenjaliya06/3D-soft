# Python imports
import uuid

# Django imports
from django.urls import reverse

# External imports
import pytest
from rest_framework import status

# App imports
from design.models import DesignSetting
from tests.testing import DEFAULT_DATABASE, APIBaseTestCase


@pytest.mark.django_db
class DesignSettingsAPITestCase(APIBaseTestCase):
    databases = {DEFAULT_DATABASE}

    def test_get_design_settings(self: "DesignSettingsAPITestCase") -> None:
        response = self.client.get(
            reverse("design_settings", kwargs={"design_id": self.design.id}),
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_put_design_settings(self: "DesignSettingsAPITestCase") -> None:
        data = {"unit": "mm", "sheet_width": 100, "sheet_height": 100}
        response = self.client.put(
            reverse("design_settings", kwargs={"design_id": self.design.id}),
            format="json",
            data=data,
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_design_settings_with_invalid_design_ids(
        self: "DesignSettingsAPITestCase",
    ) -> None:
        response = self.client.get(
            reverse("design_settings", kwargs={"design_id": str(uuid.uuid4())}),
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_put_design_settings_with_invalid_data(
        self: "DesignSettingsAPITestCase",
    ) -> None:
        data = {"unit": "", "sheet_width": 100, "sheet_height": 100}
        response = self.client.put(
            reverse("design_settings", kwargs={"design_id": self.design.id}),
            format="json",
            data=data,
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_organization_design_settings(
        self: "DesignSettingsAPITestCase",
    ) -> None:
        response = self.client.get(
            reverse("organization_design_settings"),
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unit"], "mm")

    def remove_organization_design_settings(self: "DesignSettingsAPITestCase") -> None:
        design_setting = DesignSetting.objects.using(DEFAULT_DATABASE).filter(
            organization=self.organization
        )
        for design in design_setting:
            design.delete()

    def test_get_organization_design_settings_with_new_data(
        self: "DesignSettingsAPITestCase",
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
        self: "DesignSettingsAPITestCase",
    ) -> None:

        response = self.client.get(
            reverse("organization_design_settings"),
            format="json",
            headers=self.get_invalid_user_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_organization_design_settings(
        self: "DesignSettingsAPITestCase",
    ) -> None:
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
        self: "DesignSettingsAPITestCase",
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
        self: "DesignSettingsAPITestCase",
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
        self: "DesignSettingsAPITestCase",
    ) -> None:
        data = {"sheet_width": "abc"}
        response = self.client.put(
            reverse("organization_design_settings"),
            format="json",
            data=data,
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_organization_design_setting(
        self: "DesignSettingsAPITestCase",
    ) -> None:
        DesignSetting.objects.filter(organization=self.organization).delete()
        payload = {"unit": "mm", "sheet_width": 120, "sheet_height": 240}
        response = self.client.post(
            reverse("organization_design_settings"),
            data=payload,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["unit"], "mm")

    def test_create_organization_design_setting_org_not_found(
        self: "DesignSettingsAPITestCase",
    ) -> None:
        response = self.client.post(
            reverse("organization_design_settings"),
            data={"unit": "mm", "sheet_width": 100, "sheet_height": 100},
            format="json",
            headers=self.get_invalid_user_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_organization_design_setting_already_exists(
        self: "DesignSettingsAPITestCase",
    ) -> None:
        DesignSetting.objects.filter(organization=self.organization).delete()
        DesignSetting.objects.create(
            organization=self.organization, unit="mm", sheet_width=100, sheet_height=100
        )
        response = self.client.post(
            reverse("organization_design_settings"),
            data={"unit": "inch", "sheet_width": 200, "sheet_height": 200},
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_organization_design_setting_with_invalid_data(
        self: "DesignSettingsAPITestCase",
    ) -> None:
        DesignSetting.objects.filter(organization=self.organization).delete()
        payload = {"unit": "", "sheet_width": 100, "sheet_height": 100}
        response = self.client.post(
            reverse("organization_design_settings"),
            data=payload,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_put_design_settings_with_negative_dimensions(
        self: "DesignSettingsAPITestCase",
    ) -> None:
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

    def test_put_design_settings_partial_width_update(
        self: "DesignSettingsAPITestCase",
    ) -> None:
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
