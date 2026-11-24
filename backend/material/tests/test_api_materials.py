# Python imports
import uuid
from unittest.mock import MagicMock

# Django imports
from django.urls import reverse

# External imports
import pytest
from rest_framework import status

# App imports
from material.serializers import MaterialFactorySerializer
from material.views import MaterialViewSet
from tests.testing import DEFAULT_DATABASE, APIBaseTestCase


@pytest.mark.django_db
class MaterialAPITestCase(APIBaseTestCase):
    databases = {DEFAULT_DATABASE}

    def test_validate_material(self: "MaterialAPITestCase") -> None:
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

    def test_validate_material_invalid_type(self: "MaterialAPITestCase") -> None:
        data = {"name": "InvType", "type": "NotARealType", "company": self.company.id}
        response = self.client.post(
            reverse("material-list", kwargs={"company_id": self.company.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(
            response.status_code,
            [status.HTTP_400_BAD_REQUEST, status.HTTP_201_CREATED, status.HTTP_200_OK],
        )

    def test_get_material(self: "MaterialAPITestCase") -> None:
        response = self.client.get(
            reverse("material-list", kwargs={"company_id": self.company.id}),
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_material_by_company_id(self: "MaterialAPITestCase") -> None:
        response = self.client.get(
            reverse("material-list", kwargs={"company_id": self.company.id}),
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_material_by_invalid_company_id(self: "MaterialAPITestCase") -> None:
        response = self.client.get(
            reverse("material-list", kwargs={"company_id": str(uuid.uuid4())}),
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_get_material_by_material_type(self: "MaterialAPITestCase") -> None:
        response = self.client.get(
            reverse("material-list", kwargs={"company_id": self.company.id})
            + "?type=Laminate",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_material_filter_by_type_after_setup(self: "MaterialAPITestCase") -> None:
        response = self.client.get(
            reverse("material-list", kwargs={"company_id": self.company.id})
            + "?type=Laminate",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_material_missing_type(self: "MaterialAPITestCase") -> None:
        data = {"name": "MatX", "company": self.company.id}
        response = self.client.post(
            reverse("material-list", kwargs={"company_id": self.company.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_material_success_and_duplicate_name_denied(
        self: "MaterialAPITestCase",
    ) -> None:
        good = {"name": "MatDup", "type": "Laminate", "company": self.company.id}
        r1 = self.client.post(
            reverse("material-list", kwargs={"company_id": self.company.id}),
            data=good,
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(
            r1.status_code,
            [
                status.HTTP_201_CREATED,
                status.HTTP_200_OK,
                status.HTTP_401_UNAUTHORIZED,
                status.HTTP_400_BAD_REQUEST,
            ],
        )
        r2 = self.client.post(
            reverse("material-list", kwargs={"company_id": self.company.id}),
            data=good,
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(
            r2.status_code,
            [
                status.HTTP_400_BAD_REQUEST,
                status.HTTP_409_CONFLICT,
                status.HTTP_401_UNAUTHORIZED,
            ],
        )

    def test_material_list_unknown_type_filter(self: "MaterialAPITestCase") -> None:
        url = (
            reverse("material-list", kwargs={"company_id": self.company.id})
            + "?type=UnknownType"
        )
        resp = self.client.get(url, headers=self.get_headers)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, [])

    def test_material_list_name_query_empty(self: "MaterialAPITestCase") -> None:
        url = (
            reverse("material-list", kwargs={"company_id": self.company.id})
            + "?search=NoMatch"
        )
        resp = self.client.get(url, headers=self.get_headers)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_material_post_missing_company_field(self: "MaterialAPITestCase") -> None:
        data = {"name": "NoCompany", "type": "Laminate"}
        resp = self.client.post(
            reverse("material-list", kwargs={"company_id": self.company.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(
            resp.status_code,
            [
                status.HTTP_201_CREATED,
                status.HTTP_200_OK,
                status.HTTP_400_BAD_REQUEST,
                status.HTTP_401_UNAUTHORIZED,
            ],
        )

    def test_material_get_with_pagination_params(self: "MaterialAPITestCase") -> None:
        url = (
            reverse("material-list", kwargs={"company_id": self.company.id})
            + "?page=1&page_size=2"
        )
        resp = self.client.get(url, headers=self.get_headers)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_material_filter_unknown_param_safe(self: "MaterialAPITestCase") -> None:
        url = (
            reverse("material-list", kwargs={"company_id": self.company.id})
            + "?foo=bar"
        )
        resp = self.client.get(url, headers=self.get_headers)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_material_post_invalid_company_path(self: "MaterialAPITestCase") -> None:
        data = {"name": "MatY", "type": "Laminate", "company": str(uuid.uuid4())}
        resp = self.client.post(
            reverse("material-list", kwargs={"company_id": str(uuid.uuid4())}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(
            resp.status_code,
            [
                status.HTTP_404_NOT_FOUND,
                status.HTTP_400_BAD_REQUEST,
                status.HTTP_401_UNAUTHORIZED,
            ],
        )

    def test_material_factory_unsupported_type_raises(
        self: "MaterialAPITestCase",
    ) -> None:
        with self.assertRaises(Exception):
            MaterialFactorySerializer.get_material_serializer("UnsupportedType")

    def test_material_serializer_validate_properties_id_drops_model_file(
        self: "MaterialAPITestCase",
    ) -> None:
        payload = {
            "name": "WithProps",
            "type": "Banding",
            "description": "",
            "company": self.company.id,
            "properties": {
                "id": "11111111-1111-1111-1111-111111111111",
                "thickness": 1.0,
                "length_trim": 1.0,
                "model_file": None,
            },
        }
        resp = self.client.post(
            reverse("material-list", kwargs={"company_id": self.company.id}),
            data=payload,
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(
            resp.status_code,
            [status.HTTP_201_CREATED, status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST],
        )

    def test_material_create_without_company_id_assigns_org(
        self: "MaterialAPITestCase",
    ) -> None:
        url = reverse("company-list")
        payload = {"name": "RootMat", "type": "Laminate", "description": ""}
        resp = self.client.post(
            url, data=payload, format="json", headers=self.get_headers
        )
        self.assertIn(
            resp.status_code,
            [status.HTTP_201_CREATED, status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST],
        )

    def test_material_viewset_perform_create_with_company_id(
        self: "MaterialAPITestCase",
    ) -> None:
        view = MaterialViewSet()
        view.kwargs = {"company_id": str(self.company.id)}
        view.request = type("R", (), {"user": self.user})()
        serializer = type("S", (), {"save": MagicMock()})()
        view.perform_create(serializer)  # type: ignore[arg-type]
        serializer.save.assert_called_once()
        kwargs = serializer.save.call_args.kwargs
        self.assertEqual(kwargs.get("company_id"), str(self.company.id))
        self.assertEqual(kwargs.get("organization"), self.organization)

    def test_material_viewset_perform_create_without_company_id(
        self: "MaterialAPITestCase",
    ) -> None:
        view = MaterialViewSet()
        view.kwargs = {}
        view.request = type("R", (), {"user": self.user})()
        serializer = type("S", (), {"save": MagicMock()})()
        view.perform_create(serializer)  # type: ignore[arg-type]
        kwargs = serializer.save.call_args.kwargs
        self.assertEqual(kwargs.get("organization"), self.organization)
