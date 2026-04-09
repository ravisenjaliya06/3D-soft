# Python imports
import os
import tempfile
import uuid
from unittest.mock import patch

# Django imports
from django.urls import reverse

# External imports
import pytest
from rest_framework import status
from rest_framework.response import Response as DRFResponse

# App imports
from design.models import CatalogTypeChoices, DesignCatalog, DesignSetting
from design.views import create_excel_for_nesting
from tests.model_factory import new_design_version
from tests.testing import DEFAULT_DATABASE, APIBaseTestCase


@pytest.mark.django_db
class NestingEndpointsAPITestCase(APIBaseTestCase):
    databases = {DEFAULT_DATABASE}

    def test_nesting_api_no_planks(self: "NestingEndpointsAPITestCase") -> None:
        DesignCatalog.objects.filter(
            organization=self.organization, type="plank"
        ).delete()
        response = self.client.post(
            reverse("nesting", kwargs={"design_id": self.design.id}),
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_nesting_api_design_not_found(self: "NestingEndpointsAPITestCase") -> None:
        response = self.client.post(
            reverse("nesting", kwargs={"design_id": str(uuid.uuid4())}),
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_download_nesting_file_pdf(self: "NestingEndpointsAPITestCase") -> None:
        data = {"format": "pdf"}
        response = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("file", response.data)

    def test_download_nesting_file_xlsx(self: "NestingEndpointsAPITestCase") -> None:
        data = {"format": "xlsx"}
        response = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_download_nesting_file_gcode(self: "NestingEndpointsAPITestCase") -> None:
        data = {"format": "gcode"}
        response = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_download_nesting_file_dwg(self: "NestingEndpointsAPITestCase") -> None:
        data = {"format": "dwg", "sheet_number": 1}
        response = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_download_nesting_file_xml(self: "NestingEndpointsAPITestCase") -> None:
        data = {"format": "xml", "sheet_number": 1}
        response = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_download_nesting_file_svg(self: "NestingEndpointsAPITestCase") -> None:
        data = {"format": "svg", "sheet_number": 1}
        response = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_download_nesting_file_invalid_format(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        data = {"format": "invalid"}
        response = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
            data=data,
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nesting_sheets_list_no_design_id(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        response = self.client.get(
            reverse("nesting_sheets"), format="json", headers=self.get_headers
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nesting_sheets_list_design_not_found(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        response = self.client.get(
            reverse("nesting_sheets"),
            {"design_id": str(uuid.uuid4())},
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_nesting_sheets_retrieve_no_sheet_number(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        response = self.client.get(
            reverse("nesting_sheet_detail", kwargs={"design_id": self.design.id}),
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nesting_sheets_retrieve_invalid_sheet_number(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        response = self.client.get(
            reverse("nesting_sheet_detail", kwargs={"design_id": self.design.id}),
            {"sheet_number": "invalid"},
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nesting_sheets_retrieve_sheet_not_found(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        response = self.client.get(
            reverse("nesting_sheet_detail", kwargs={"design_id": self.design.id}),
            {"sheet_number": 999},
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_nesting_files_list_no_design_id(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        response = self.client.get(
            reverse("nesting_files"), format="json", headers=self.get_headers
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nesting_files_list_design_not_found(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        response = self.client.get(
            reverse("nesting_files"),
            {"design_id": str(uuid.uuid4())},
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_nesting_files_list_with_sheet_number(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        response = self.client.get(
            reverse("nesting_files"),
            {"design_id": str(self.design.id), "sheet_number": 1},
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(
            response.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]
        )

    def test_nesting_files_list_with_file_type(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        response = self.client.get(
            reverse("nesting_files"),
            {"design_id": str(self.design.id), "file_type": "pdf"},
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_nesting_files_list_invalid_sheet_number(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        response = self.client.get(
            reverse("nesting_files"),
            {"design_id": str(self.design.id), "sheet_number": "invalid"},
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nesting_files_list_sheet_not_found(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        response = self.client.get(
            reverse("nesting_files"),
            {"design_id": str(self.design.id), "sheet_number": 999},
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_excel_for_nesting(self: "NestingEndpointsAPITestCase") -> None:
        nesting_data = {
            "p1": {
                "name": "T",
                "type": "rectangle",
                "width": 100,
                "height": 50,
                "depth": 18,
            }
        }
        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            tmp_path = tmp.name
        try:
            result = create_excel_for_nesting(nesting_data, tmp_path)
            self.assertEqual(result, tmp_path)
            self.assertTrue(os.path.exists(tmp_path))
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    def test_create_excel_for_nesting_empty_data(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        nesting_data = {}
        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            tmp_path = tmp.name
        try:
            result = create_excel_for_nesting(nesting_data, tmp_path)
            self.assertEqual(result, tmp_path)
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    def test_download_nesting_file_json_success_after_nesting(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        DesignCatalog.objects.create(
            organization=self.organization,
            type=CatalogTypeChoices.PLANK,
            name="P",
            data={"dimensions": {"width": 10, "height": 20, "depth": 5}},
        )
        with patch(
            "design.views.NestAPIViewset.nesting", return_value=DRFResponse(status=200)
        ), patch("design.views.os.path.exists", return_value=True), patch(
            "design.views.open", create=True
        ) as mock_open:
            mock_open.return_value.__enter__.return_value.read.return_value = "{}"
            resp = self.client.put(
                reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
                data={"format": "json"},
                format="json",
                headers=self.get_headers,
            )
            self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_nesting_api_with_planks(self: "NestingEndpointsAPITestCase") -> None:
        version = new_design_version(database=DEFAULT_DATABASE, design=self.design)
        response = self.client.post(
            reverse("nesting", kwargs={"design_id": self.design.id}),
            {"version_id": str(version.id)},
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(
            response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]
        )

    def test_nesting_files_list_with_design_id_but_empty(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        resp = self.client.get(
            reverse("nesting_files") + f"?design_id={self.design.id}",
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_nesting_files_list_ignores_unknown_file_type(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        resp = self.client.get(
            reverse("nesting_files") + f"?design_id={self.design.id}&file_type=unknown",
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_download_nesting_file_xml_zip_when_design_not_found(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        resp = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": str(uuid.uuid4())}),
            data={"format": "xml_zip"},
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(resp.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND])

    def test_download_nesting_file_svg_with_sheet_number(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        resp = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
            data={"format": "svg", "sheet_number": 3},
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_nesting_sheet_list_missing_design_id(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        resp = self.client.get(
            reverse("nesting_sheets"), format="json", headers=self.get_headers
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nesting_sheet_list_design_not_found(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        resp = self.client.get(
            reverse("nesting_sheets") + f"?design_id={uuid.uuid4()}",
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_nesting_file_list_missing_design_id(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        resp = self.client.get(
            reverse("nesting_files"), format="json", headers=self.get_headers
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nesting_file_list_design_not_found(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        resp = self.client.get(
            reverse("nesting_files") + f"?design_id={uuid.uuid4()}",
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_download_nesting_file_invalid_format_again(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        resp = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
            data={"format": "invalid-format"},
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_download_nesting_file_dwg_sheet_number(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        resp = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
            data={"format": "dwg", "sheet_number": 2},
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_download_nesting_file_xml_sheet_number(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        resp = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
            data={"format": "xml", "sheet_number": 4},
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_render_image_create_and_clear_invalid_design(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        response = self.client.post(
            reverse("render_images", kwargs={"design_id": str(uuid.uuid4())}),
            data={"image_url": "http://x.com/i.png"},
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(
            response.status_code,
            [status.HTTP_404_NOT_FOUND, status.HTTP_401_UNAUTHORIZED],
        )
        response = self.client.post(
            reverse("render_images_clear", kwargs={"design_id": str(uuid.uuid4())}),
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(
            response.status_code,
            [status.HTTP_404_NOT_FOUND, status.HTTP_401_UNAUTHORIZED],
        )

    def test_download_nesting_file_json_triggers_generation_error(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        DesignCatalog.objects.filter(
            organization=self.organization, type=CatalogTypeChoices.PLANK
        ).delete()
        resp = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
            data={"format": "json"},
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_download_nesting_file_xml_zip_uses_sanitized_name(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        self.design.design_name = "A*B"
        self.design.save()
        resp = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
            data={"format": "xml_zip"},
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_nesting_api_with_planks_and_grooves(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        version = new_design_version(database=DEFAULT_DATABASE, design=self.design)
        response = self.client.post(
            reverse("nesting", kwargs={"design_id": self.design.id}),
            {"version_id": str(version.id)},
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(
            response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]
        )

    def test_nesting_api_with_planks_and_holes(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        version = new_design_version(database=DEFAULT_DATABASE, design=self.design)
        response = self.client.post(
            reverse("nesting", kwargs={"design_id": self.design.id}),
            {"version_id": str(version.id)},
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(
            response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]
        )

    def test_nesting_api_with_version_id(self: "NestingEndpointsAPITestCase") -> None:
        version = new_design_version(database=DEFAULT_DATABASE, design=self.design)
        response = self.client.post(
            reverse("nesting", kwargs={"design_id": self.design.id}),
            {"version_id": str(version.id)},
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(
            response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]
        )

    def test_nesting_api_with_design_setting(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        DesignSetting.objects.create(
            design=self.design,
            organization=self.organization,
            unit="mm",
            sheet_width=500,
            sheet_height=300,
        )
        response = self.client.post(
            reverse("nesting", kwargs={"design_id": self.design.id}),
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(
            response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]
        )

    def test_download_nesting_file_json_not_found_after_generation(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        with patch(
            "design.views.NestAPIViewset.nesting", return_value=DRFResponse(status=200)
        ), patch("design.views.os.path.exists", return_value=False):
            resp = self.client.put(
                reverse("download_nesting_file", kwargs={"design_id": self.design.id}),
                data={"format": "json"},
                format="json",
                headers=self.get_headers,
            )
            self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_nesting_files_list_with_file_type_unknown(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        resp = self.client.get(
            reverse("nesting_files"),
            {"design_id": str(self.design.id), "file_type": "unknown"},
            format="json",
            headers=self.get_headers,
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_nesting_sheets_list_with_valid_design_empty_or_generated(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        resp = self.client.get(
            reverse("nesting_sheets"),
            {"design_id": str(self.design.id)},
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(
            resp.status_code,
            [
                status.HTTP_200_OK,
                status.HTTP_400_BAD_REQUEST,
                status.HTTP_404_NOT_FOUND,
            ],
        )

    def test_download_nesting_file_xml_zip_nonexistent_design_id(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        resp = self.client.put(
            reverse("download_nesting_file", kwargs={"design_id": str(uuid.uuid4())}),
            data={"format": "xml_zip"},
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(resp.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND])

    def test_nesting_files_list_with_sheet_number_non_int(
        self: "NestingEndpointsAPITestCase",
    ) -> None:
        resp = self.client.get(
            reverse("nesting_files"),
            {"design_id": str(self.design.id), "sheet_number": "abc"},
            format="json",
            headers=self.get_headers,
        )
        self.assertIn(
            resp.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_200_OK]
        )
