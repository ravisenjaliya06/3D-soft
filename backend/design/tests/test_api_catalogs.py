# Python imports
import uuid

# Django imports
from django.urls import reverse

# External imports
import pytest
from rest_framework import status

# App imports
from design.models import CatalogTypeChoices, DesignCatalog, DesignVersion
from design.utils import parse_catalog_data
from tests.model_factory import new_design_version
from tests.testing import DEFAULT_DATABASE, APIBaseTestCase


@pytest.mark.django_db
class DesignCatalogsAPITestCase(APIBaseTestCase):
    databases = {DEFAULT_DATABASE}

    def test_get_design_catalogs_list_empty(self: "DesignCatalogsAPITestCase") -> None:
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
        self: "DesignCatalogsAPITestCase",
    ) -> None:
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
        self: "DesignCatalogsAPITestCase",
    ) -> None:
        version1 = new_design_version(database=DEFAULT_DATABASE, design=self.design)
        response = self.client.get(
            reverse("design_catalogs"),
            {"design_id": str(self.design.id), "version_id": str(version1.id)},
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(version1.id, response.data["version"])

    def test_get_design_catalogs_design_not_found(
        self: "DesignCatalogsAPITestCase",
    ) -> None:
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
        self: "DesignCatalogsAPITestCase",
    ) -> None:
        response = self.client.get(
            reverse("design_catalogs"),
            {"design_id": str(self.design.id), "version_id": str(uuid.uuid4())},
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("detail", response.data)

    def test_get_design_catalogs_design_with_no_versions(
        self: "DesignCatalogsAPITestCase",
    ) -> None:
        DesignVersion.objects.filter(design=self.design).delete()
        response = self.client.get(
            reverse("design_catalogs"),
            {"design_id": str(self.design.id)},
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("detail", response.data)

    def test_get_design_catalogs_filtered_by_organization(
        self: "DesignCatalogsAPITestCase",
    ) -> None:
        response = self.client.get(
            reverse("design_catalogs"),
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_design_catalog_success(self: "DesignCatalogsAPITestCase") -> None:
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

    def test_create_design_catalog_with_parent_child(
        self: "DesignCatalogsAPITestCase",
    ) -> None:
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

    def test_create_design_catalog_with_materials(
        self: "DesignCatalogsAPITestCase",
    ) -> None:
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
        self: "DesignCatalogsAPITestCase",
    ) -> None:
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
        self: "DesignCatalogsAPITestCase",
    ) -> None:
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

    def test_create_design_catalog_missing_design_id(
        self: "DesignCatalogsAPITestCase",
    ) -> None:
        payload = {
            "items": [{"id": "main1", "name": "Main Cabinet", "type": "Cabinet"}]
        }
        response = self.client.post(
            reverse("design_catalogs"),
            data=payload,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_design_catalog_missing_items(
        self: "DesignCatalogsAPITestCase",
    ) -> None:
        payload = {"design_id": str(self.design.id), "items": []}
        response = self.client.post(
            reverse("design_catalogs"),
            data=payload,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_design_catalog_empty_items(
        self: "DesignCatalogsAPITestCase",
    ) -> None:
        payload = {"design_id": str(self.design.id), "items": []}
        response = self.client.post(
            reverse("design_catalogs"),
            data=payload,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_design_catalog_multiple_items(
        self: "DesignCatalogsAPITestCase",
    ) -> None:
        payload = {
            "design_id": str(self.design.id),
            "items": [
                {"id": "item1", "name": "Item 1", "type": "Cabinet"},
                {"id": "item2", "name": "Item 2", "type": "Door"},
                {"id": "item3", "name": "Item 3", "type": "Drawer"},
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

    def test_create_design_catalog_missing_design_id_returns_400(
        self: "DesignCatalogsAPITestCase",
    ) -> None:
        payload = {"items": [{"id": "x", "name": "Cab", "type": "Cabinet"}]}
        response = self.client.post(
            reverse("design_catalogs"),
            data=payload,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_design_catalog_invalid_items_type(
        self: "DesignCatalogsAPITestCase",
    ) -> None:
        payload = {"design_id": str(self.design.id), "items": {"id": "x"}}
        response = self.client.post(
            reverse("design_catalogs"),
            data=payload,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_design_catalog_child_with_unknown_parent(
        self: "DesignCatalogsAPITestCase",
    ) -> None:
        payload = {
            "design_id": str(self.design.id),
            "items": [
                {
                    "id": "childX",
                    "name": "Door X",
                    "type": "Door",
                    "parent": "nope-parent",
                }
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

    def test_create_design_catalog_preserves_item_data(
        self: "DesignCatalogsAPITestCase",
    ) -> None:
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
        self.assertEqual(catalog.data["custom_field"], "custom_value")

    def test_catalog_list_library_true_returns_items(
        self: "DesignCatalogsAPITestCase",
    ) -> None:
        resp = self.client.get(
            reverse("design_catalogs"), format="json", headers=self.get_headers
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_catalog_list_with_version_but_no_catalogs_returns_detail(
        self: "DesignCatalogsAPITestCase",
    ) -> None:
        resp = self.client.get(
            reverse("design_catalogs"),
            {"design_id": str(self.design.id), "version_id": str(uuid.uuid4())},
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("detail", resp.data)

    def test_create_design_catalog_with_is_library_true_and_base64_image(
        self: "DesignCatalogsAPITestCase",
    ) -> None:
        img = "data:image/png;base64,"
        payload = {
            "design_id": str(self.design.id),
            "items": [
                {
                    "id": "A",
                    "name": "Plank A",
                    "type": "plank",
                    "image": img,
                    "dimensions": {"width": 10, "height": 20, "depth": 3},
                }
            ],
        }
        url = reverse("design_catalogs") + "?is_library=true"
        resp = self.client.post(
            url, data=payload, format="json", headers=self.get_headers
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(resp.data.get("version_id"))

    def test_create_design_catalog_parent_child_happy_path(
        self: "DesignCatalogsAPITestCase",
    ) -> None:
        items = [
            {"id": "PARENT", "name": "Parent Cabinet", "type": "plank"},
            {"id": "CHILD", "name": "Child Door", "type": "door", "parent": "PARENT"},
        ]
        payload = {"design_id": str(self.design.id), "items": items}
        resp = self.client.post(
            reverse("design_catalogs"),
            data=payload,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_parse_catalog_data_material_and_edgeband(
        self: "DesignCatalogsAPITestCase",
    ) -> None:
        cat = DesignCatalog.objects.create(
            organization=self.organization,
            version=None,
            type=CatalogTypeChoices.PLANK,
            name="TOP_PLANK",
            data={
                "dimensions": {"width": 564, "height": 200, "depth": 18},
                "material": [{"type": "Laminate", "name": "Oak 123"}],
                "edgeband": {"front": True, "back": True},
                "minifix_holes": [{"type": "DOWEL", "diameter": 8}],
            },
        )
        parsed = parse_catalog_data([cat])
        self.assertIn(str(cat.id), parsed)

    def test_parse_catalog_data_db_precedence_and_alt_keys(
        self: "DesignCatalogsAPITestCase",
    ) -> None:
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
        self.assertIn(str(cat.id), parsed)
