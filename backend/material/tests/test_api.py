# Python imports
import uuid

# Django imports
from django.urls import reverse

# External imports
import pytest
from rest_framework import status

# App imports
from material.models import Catalog, Company
from tests.testing import DEFAULT_DATABASE, APIBaseTestCase


@pytest.mark.django_db
class MaterialAPIViewTestCase(APIBaseTestCase):
    databases = {DEFAULT_DATABASE}

    def setUp(self: "MaterialAPIViewTestCase") -> None:
        super().setUp()

    def test_create_company(self: "MaterialAPIViewTestCase") -> None:
        data = {"name": "Blum13", "material_type": "Banding"}
        response = self.client.post(
            reverse("company-list"),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Blum13")
        self.assertEqual(response.data["material_type"], "Banding")

    def test_get_company(self: "MaterialAPIViewTestCase") -> None:
        response = self.client.get(
            reverse("company-list"),
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_company_by_id(self: "MaterialAPIViewTestCase") -> None:
        response = self.client.get(
            reverse("company-detail", kwargs={"uuid": self.company.id}),
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "test")
        self.assertEqual(response.data["material_type"], "Banding")

    def test_get_company_by_id_with_invalid_id(self: "MaterialAPIViewTestCase") -> None:
        response = self.client.get(
            reverse("company-detail", kwargs={"uuid": str(uuid.uuid4())}),
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_company(self: "MaterialAPIViewTestCase") -> None:
        data = {"name": "test123", "material_type": "Banding"}
        response = self.client.put(
            reverse("company-detail", kwargs={"uuid": self.company.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "test123")
        self.assertEqual(response.data["material_type"], "Banding")

    def test_update_company_with_invalid_id(self: "MaterialAPIViewTestCase") -> None:
        data = {"name": "test123", "material_type": "Banding"}
        response = self.client.put(
            reverse("company-detail", kwargs={"uuid": str(uuid.uuid4())}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_company(self: "MaterialAPIViewTestCase") -> None:
        response = self.client.delete(
            reverse("company-detail", kwargs={"uuid": self.company.id}),
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Company.objects.using(DEFAULT_DATABASE).count(), 0)

    def test_delete_company_with_invalid_id(self: "MaterialAPIViewTestCase") -> None:
        response = self.client.delete(
            reverse("company-detail", kwargs={"uuid": str(uuid.uuid4())}),
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(Company.objects.using(DEFAULT_DATABASE).count(), 1)

    def test_create_catalog(self: "MaterialAPIViewTestCase") -> None:
        data = {
            "type": "Door",
            "name": "Default Door",
            "description": "Default Door",
            "design": str(self.design.id),
            "catalog_rule": [],
            "height": 10,
            "width": 20,
            "length": 30,
            "depth": 40,
            "position": "{'x': 10, 'y': 20, 'z': 30}",
        }
        response = self.client.post(
            reverse("catalog-design-list", kwargs={"catalog_id": self.catalog.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Default Door")
        self.assertEqual(response.data["type"], "Door")
        self.assertEqual(response.data["height"], 10)

    def test_create_material(self: "MaterialAPIViewTestCase") -> None:
        data = {
            "name": "Test material",
            "type": "Laminate",
            "company": self.company.id,
            "description": "This is a test material",
        }
        response = self.client.post(
            reverse("material-list", kwargs={"company_id": self.company.id}),
            data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Test material")
        self.assertEqual(response.data["type"], "Laminate")

    def test_validate_material(self: "MaterialAPIViewTestCase") -> None:
        data = {
            "name": "",
            "type": "Laminate",
            "company": self.company.id,
            "description": "This is a test material",
        }
        response = self.client.post(
            reverse("material-list", kwargs={"company_id": self.company.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["name"][0], "This field may not be blank.")

    def test_duplicate_material_name_is_duplicate(
        self: "MaterialAPIViewTestCase",
    ) -> None:
        headers = self.get_headers
        data1 = {
            "name": "Duplicate Material",
            "type": "Laminate",
            "company": self.company.id,
            "description": "Test duplicate name",
        }
        createduplicate = self.client.post(
            reverse("material-list", kwargs={"company_id": self.company.id}),
            data=data1,
            format="json",
            headers=headers,
        )
        self.assertEqual(createduplicate.status_code, status.HTTP_201_CREATED)
        data_dup = {
            "name": "Duplicate Material",
            "type": "Laminate",
            "company": self.company.id,
            "description": "Test duplicate name",
        }
        response = self.client.post(
            reverse("material-list", kwargs={"company_id": self.company.id}),
            data=data_dup,
            format="json",
            headers=headers,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["name"][0], "A material with this name already exists."
        )

    def test_get_material(self: "MaterialAPIViewTestCase") -> None:
        response = self.client.get(
            reverse("material-list", kwargs={"company_id": self.company.id}),
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_material_by_company_id(self: "MaterialAPIViewTestCase") -> None:
        response = self.client.get(
            reverse("material-list", kwargs={"company_id": self.company.id}),
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_material_by_invalid_company_id(
        self: "MaterialAPIViewTestCase",
    ) -> None:
        response = self.client.get(
            reverse("material-list", kwargs={"company_id": str(uuid.uuid4())}),
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_get_material_by_material_type(self: "MaterialAPIViewTestCase") -> None:
        response = self.client.get(
            reverse("material-list", kwargs={"company_id": self.company.id})
            + "?type=Laminate",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_get_catalog_list(self: "MaterialAPIViewTestCase") -> None:
        response = self.client.get(
            reverse("catalog-list"),
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_catalog_rule_parts(self: "MaterialAPIViewTestCase") -> None:
        response = self.client.get(
            reverse("catalog-rule-parts", kwargs={"rule_id": self.catalog_rules.id}),
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Door Molding")

    def test_create_catalog_rule_part(self: "MaterialAPIViewTestCase") -> None:
        data = {
            "name": "New Door",
            "type": "Door",
            "height": 8,
            "width": 8,
            "material": str(self.material.id),
            "design": str(self.design.id),
        }
        response = self.client.post(
            reverse("catalog-design-list", kwargs={"catalog_id": self.catalog.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "New Door")
        self.assertEqual(response.data["type"], "Door")
        self.assertEqual(response.data["height"], 8)

    def test_create_catalog_rule_part_with_invalid_data(
        self: "MaterialAPIViewTestCase",
    ) -> None:
        data = {
            "name": "New Door",
            "height": 8,
            "width": 8,
            "material": str(self.material.id),
            "design": str(self.design.id),
        }
        response = self.client.post(
            reverse("catalog-design-list", kwargs={"catalog_id": self.catalog.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["type"][0], "This field is required.")

    def test_create_catalog_rule_part_with_nonexistent_material(
        self: "MaterialAPIViewTestCase",
    ) -> None:
        data = {
            "name": "New Not Existing Door",
            "type": "Door",
            "height": 8,
            "width": 8,
            "material": str(uuid.uuid4()),
            "design": str(self.design.id),
        }
        response = self.client.post(
            reverse("catalog-design-list"),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "New Not Existing Door")

    def test_delete_catalog_with_design_id(
        self: "MaterialAPIViewTestCase",
    ) -> None:
        data = {}
        response = self.client.delete(
            reverse("catalog-design-delete", kwargs={"id": self.design.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(
            response.data["detail"],
            "Matching Catalog With Given Design Deleted Successfully",
        )

    def test_delete_catalog_with_design_id_catalog_ids(
        self: "MaterialAPIViewTestCase",
    ) -> None:
        catalog1 = Catalog.objects.create(
            organization=self.user.selected_organization,
            design=self.design,
            name="Catalog 1",
        )
        catalog2 = Catalog.objects.create(
            organization=self.user.selected_organization,
            design=self.design,
            name="Catalog 2",
        )
        data = {
            "catalog_ids": [str(catalog1.id), str(catalog2.id)],
        }
        response = self.client.delete(
            reverse("catalog-design-delete", kwargs={"id": self.design.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(
            response.data["detail"], "Matching Catalog Deleted Successfully"
        )
