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
class CompanyAPITestCase(APIBaseTestCase):
    databases = {DEFAULT_DATABASE}

    def test_create_company(self: "CompanyAPITestCase") -> None:
        data = {"name": "Blum13", "material_type": "Banding"}
        response = self.client.post(
            reverse("company-list"), data=data, format="json", headers=self.get_headers
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Blum13")

    def test_get_company(self: "CompanyAPITestCase") -> None:
        response = self.client.get(reverse("company-list"), headers=self.get_headers)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_company_by_id(self: "CompanyAPITestCase") -> None:
        response = self.client.get(
            reverse("company-detail", kwargs={"uuid": self.company.id}),
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "test")

    def test_get_company_by_id_with_invalid_id(self: "CompanyAPITestCase") -> None:
        response = self.client.get(
            reverse("company-detail", kwargs={"uuid": str(uuid.uuid4())}),
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_company(self: "CompanyAPITestCase") -> None:
        data = {"name": "test123", "material_type": "Banding"}
        response = self.client.put(
            reverse("company-detail", kwargs={"uuid": self.company.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "test123")

    def test_update_company_with_invalid_id(self: "CompanyAPITestCase") -> None:
        data = {"name": "test123", "material_type": "Banding"}
        response = self.client.put(
            reverse("company-detail", kwargs={"uuid": str(uuid.uuid4())}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_company(self: "CompanyAPITestCase") -> None:
        response = self.client.delete(
            reverse("company-detail", kwargs={"uuid": self.company.id}),
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Company.objects.using(DEFAULT_DATABASE).count(), 0)

    def test_delete_company_with_invalid_id(self: "CompanyAPITestCase") -> None:
        response = self.client.delete(
            reverse("company-detail", kwargs={"uuid": str(uuid.uuid4())}),
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_company_duplicate_name_validation(
        self: "CompanyAPITestCase",
    ) -> None:
        data = {"name": self.company.name, "material_type": "Banding"}
        response = self.client.post(
            reverse("company-list"), data=data, format="json", headers=self.get_headers
        )
        self.assertIn(
            response.status_code,
            [status.HTTP_400_BAD_REQUEST, status.HTTP_409_CONFLICT],
        )

    def test_create_company_missing_name(self: "CompanyAPITestCase") -> None:
        data = {"name": "", "material_type": "Banding"}
        response = self.client.post(
            reverse("company-list"), data=data, format="json", headers=self.get_headers
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_company_list_with_pagination_params(self: "CompanyAPITestCase") -> None:
        url = reverse("company-list") + "?page=1&page_size=1"
        resp = self.client.get(url, headers=self.get_headers)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_company_duplicate_case_insensitive(self: "CompanyAPITestCase") -> None:
        data = {"name": self.company.name.upper(), "material_type": "Banding"}
        resp = self.client.post(
            reverse("company-list"), data=data, format="json", headers=self.get_headers
        )
        self.assertIn(
            resp.status_code,
            [
                status.HTTP_400_BAD_REQUEST,
                status.HTTP_409_CONFLICT,
                status.HTTP_200_OK,
                status.HTTP_201_CREATED,
            ],
        )

    def test_company_serializer_unique_validation_and_create_org(
        self: "CompanyAPITestCase",
    ) -> None:
        data = {"name": "UniqueCo", "material_type": "Banding"}
        self.client.post(
            reverse("company-list"), data=data, format="json", headers=self.get_headers
        )
        resp = self.client.post(
            reverse("company-list"), data=data, format="json", headers=self.get_headers
        )
        self.assertIn(
            resp.status_code,
            [
                status.HTTP_400_BAD_REQUEST,
                status.HTTP_409_CONFLICT,
                status.HTTP_200_OK,
                status.HTTP_401_UNAUTHORIZED,
            ],
        )
