# Django imports
from django.urls import reverse

# External imports
import pytest
from rest_framework import status

# App imports
from design.models import DesignVersion
from tests.model_factory import new_design_version
from tests.testing import DEFAULT_DATABASE, APIBaseTestCase


@pytest.mark.django_db
class DesignVersionsAPITestCase(APIBaseTestCase):
    databases = {DEFAULT_DATABASE}

    def test_get_design_versions_list(self: "DesignVersionsAPITestCase") -> None:
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

    def test_get_design_versions_empty_list(self: "DesignVersionsAPITestCase") -> None:
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
        self: "DesignVersionsAPITestCase",
    ) -> None:
        version1 = new_design_version(database=DEFAULT_DATABASE, design=self.design)
        response = self.client.get(
            reverse("design_versions"),
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        version_ids = [v["id"] for v in response.data]
        self.assertIn(str(version1.id), version_ids)

    def test_create_design_catalog_creates_version_when_not_library(
        self: "DesignVersionsAPITestCase",
    ) -> None:
        payload = {
            "design_id": str(self.design.id),
            "items": [
                {
                    "id": "B",
                    "name": "Plank B",
                    "type": "plank",
                    "dimensions": {"width": 11, "height": 22, "depth": 4},
                }
            ],
        }
        resp = self.client.post(
            reverse("design_catalogs"),
            data=payload,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(resp.data.get("version_id"))
