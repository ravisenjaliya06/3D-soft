# Python imports
import uuid

# Django imports
from django.urls import reverse

# External imports
import pytest
from rest_framework import status

# App imports
from material.models import Company
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
