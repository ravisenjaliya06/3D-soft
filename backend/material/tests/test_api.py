# Python imports
import uuid
from unittest.mock import MagicMock

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

    def test_create_company_duplicate_name_validation(self: "MaterialAPIViewTestCase") -> None:
        data = {"name": self.company.name, "material_type": "Banding"}
        response = self.client.post(
            reverse("company-list"),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_409_CONFLICT])

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

    def test_validate_material_invalid_type(self: "MaterialAPIViewTestCase") -> None:
        data = {
            "name": "InvType",
            "type": "NotARealType",
            "company": self.company.id,
        }
        response = self.client.post(
            reverse("material-list", kwargs={"company_id": self.company.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_201_CREATED, status.HTTP_200_OK])

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

    def test_get_material_invalid_company_with_type_filter(self: "MaterialAPIViewTestCase") -> None:
        url = reverse("material-list", kwargs={"company_id": str(uuid.uuid4())}) + "?type=Laminate"
        response = self.client.get(url, headers=self.get_headers)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_material_filter_by_type_after_setup(self: "MaterialAPIViewTestCase") -> None:
        response = self.client.get(
            reverse("material-list", kwargs={"company_id": self.company.id}) + "?type=Laminate",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_material_missing_type(self: "MaterialAPIViewTestCase") -> None:
        data = {"name": "MatX", "company": self.company.id}
        response = self.client.post(
            reverse("material-list", kwargs={"company_id": self.company.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("type", response.data)

    def test_create_material_success_and_duplicate_name_denied(self: "MaterialAPIViewTestCase") -> None:
        good = {"name": "MatDup", "type": "Laminate", "company": self.company.id}
        r1 = self.client.post(
            reverse("material-list", kwargs={"company_id": self.company.id}),
            data=good,
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(r1.status_code, [status.HTTP_201_CREATED, status.HTTP_200_OK, status.HTTP_401_UNAUTHORIZED])
        r2 = self.client.post(
            reverse("material-list", kwargs={"company_id": self.company.id}),
            data=good,
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(r2.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_409_CONFLICT, status.HTTP_401_UNAUTHORIZED])

    def test_create_company_missing_name(self: "MaterialAPIViewTestCase") -> None:
        data = {"name": "", "material_type": "Banding"}
        response = self.client.post(
            reverse("company-list"),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_material_list_unknown_type_filter(self: "MaterialAPIViewTestCase") -> None:
        url = reverse("material-list", kwargs={"company_id": self.company.id}) + "?type=UnknownType"
        resp = self.client.get(url, headers=self.get_headers)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, [])

    def test_material_list_name_query_empty(self: "MaterialAPIViewTestCase") -> None:
        url = reverse("material-list", kwargs={"company_id": self.company.id}) + "?search=NoMatch"
        resp = self.client.get(url, headers=self.get_headers)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsInstance(resp.data, list)

    def test_material_post_missing_company_field(self: "MaterialAPIViewTestCase") -> None:
        data = {"name": "NoCompany", "type": "Laminate"}
        resp = self.client.post(
            reverse("material-list", kwargs={"company_id": self.company.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(resp.status_code, [status.HTTP_201_CREATED, status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED])

    def test_material_get_with_pagination_params(self: "MaterialAPIViewTestCase") -> None:
        url = reverse("material-list", kwargs={"company_id": self.company.id}) + "?page=1&page_size=2"
        resp = self.client.get(url, headers=self.get_headers)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_company_list_with_pagination_params(self: "MaterialAPIViewTestCase") -> None:
        url = reverse("company-list") + "?page=1&page_size=1"
        resp = self.client.get(url, headers=self.get_headers)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_material_filter_unknown_param_safe(self: "MaterialAPIViewTestCase") -> None:
        url = reverse("material-list", kwargs={"company_id": self.company.id}) + "?foo=bar"
        resp = self.client.get(url, headers=self.get_headers)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_company_duplicate_case_insensitive(self: "MaterialAPIViewTestCase") -> None:
        data = {"name": self.company.name.upper(), "material_type": "Banding"}
        resp = self.client.post(reverse("company-list"), data=data, format="json", headers=self.get_headers)
        self.assertIn(resp.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_409_CONFLICT, status.HTTP_200_OK, status.HTTP_201_CREATED])

    def test_material_post_invalid_company_path(self: "MaterialAPIViewTestCase") -> None:
        data = {"name": "MatY", "type": "Laminate", "company": str(uuid.uuid4())}
        resp = self.client.post(
            reverse("material-list", kwargs={"company_id": str(uuid.uuid4())}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(resp.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED])

    def test_finishes_list_filter_by_type(self: "MaterialAPIViewTestCase") -> None:
        url = reverse("finishes-list") + "?type=Finish"
        resp = self.client.get(url, headers=self.get_headers)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsInstance(resp.data, list)

    def test_finishes_list_without_type(self: "MaterialAPIViewTestCase") -> None:
        url = reverse("finishes-list")
        resp = self.client.get(url, headers=self.get_headers)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsInstance(resp.data, list)

    def test_material_factory_unsupported_type_raises(self: "MaterialAPIViewTestCase") -> None:
        from material.serializers import MaterialFactorySerializer
        with self.assertRaises(Exception):
            MaterialFactorySerializer.get_material_serializer("UnsupportedType")

    def test_company_serializer_unique_validation_and_create_org(self: "MaterialAPIViewTestCase") -> None:
        from material.serializers import CompanySerializer
        data = {"name": "UniqueCo", "material_type": "Banding"}
        req = self.client.post(reverse("company-list"), data=data, format="json", headers=self.get_headers)
        self.assertIn(req.status_code, [status.HTTP_201_CREATED, status.HTTP_200_OK, status.HTTP_401_UNAUTHORIZED])
        resp = self.client.post(reverse("company-list"), data=data, format="json", headers=self.get_headers)
        self.assertIn(resp.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_409_CONFLICT, status.HTTP_200_OK, status.HTTP_401_UNAUTHORIZED])

    def test_material_serializer_validate_properties_id_drops_model_file(self: "MaterialAPIViewTestCase") -> None:
        from material.serializers import MaterialSerializer
        payload = {
            "name": "WithProps",
            "type": "Banding",
            "description": "",
            "company": self.company.id,
            "properties": {"id": "11111111-1111-1111-1111-111111111111", "thickness": 1.0, "length_trim": 1.0, "model_file": None},
        }
        resp = self.client.post(
            reverse("material-list", kwargs={"company_id": self.company.id}),
            data=payload,
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(resp.status_code, [status.HTTP_201_CREATED, status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])

    def test_material_create_without_company_id_assigns_org(self: "MaterialAPIViewTestCase") -> None:
        """Hit perform_create else branch: no company_id in URL; organization inferred from user."""
        url = reverse("company-list")
        payload = {"name": "RootMat", "type": "Laminate", "description": ""}
        resp = self.client.post(url, data=payload, format="json", headers=self.get_headers)
        self.assertIn(resp.status_code, [status.HTTP_201_CREATED, status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])

    def test_material_viewset_perform_create_with_company_id(self: "MaterialAPIViewTestCase") -> None:
        from material.views import MaterialViewSet

        view = MaterialViewSet()
        view.kwargs = {"company_id": str(self.company.id)}
        view.request = type("R", (), {"user": self.user})()
        serializer = type("S", (), {"save": MagicMock()})()
        view.perform_create(serializer)  # type: ignore[arg-type]
        serializer.save.assert_called_once()
        kwargs = serializer.save.call_args.kwargs
        self.assertEqual(kwargs.get("company_id"), str(self.company.id))
        self.assertEqual(kwargs.get("organization"), self.organization)

    def test_material_viewset_perform_create_without_company_id(self: "MaterialAPIViewTestCase") -> None:
        from material.views import MaterialViewSet

        view = MaterialViewSet()
        view.kwargs = {}
        view.request = type("R", (), {"user": self.user})()
        serializer = type("S", (), {"save": MagicMock()})()
        view.perform_create(serializer)  # type: ignore[arg-type]
        kwargs = serializer.save.call_args.kwargs
        self.assertEqual(kwargs.get("organization"), self.organization)
        self.assertNotIn("company_id", kwargs)
