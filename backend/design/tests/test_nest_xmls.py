# Python imports
from unittest.mock import MagicMock, patch

# External imports
import pytest
from material.models import FinishesLibrary, Material, Properties
from umaboy.models import Organization
from material.models import Company

# App imports
from design.nest import KEY_ID, KEY_NAME, KEY_UNIQUE_ID, KEY_WIDTH, NestingService
from tests.testing import DEFAULT_DATABASE, APIBaseTestCase


@pytest.mark.django_db
class NestXmlsTestCase(APIBaseTestCase):
    databases = {DEFAULT_DATABASE}

    @patch("pandas.ExcelWriter")
    def test_texture_grain_numeric_2_writes_two(
        self: "NestXmlsTestCase", mock_writer: MagicMock
    ) -> None:
        captured_df = {}

        def capture_to_excel(
            self_df: object,
            writer: object,
            sheet_name: str | None = None,
            *args: object,
            **kwargs: object,
        ) -> None:
            if sheet_name == "Cutting List":
                captured_df["df1"] = self_df.copy()

        with patch.object(
            __import__("pandas").DataFrame, "to_excel", new=capture_to_excel
        ):
            svc = NestingService(width=2000, height=2000)
            packed = [
                {
                    KEY_UNIQUE_ID: "SHEET0101",
                    KEY_WIDTH: 100,
                    "height": 50,
                    "x": 0,
                    "y": 0,
                    "sheet_num": "SHEET01",
                    KEY_NAME: "Part A",
                    KEY_ID: "A",
                    "texture_grain_code": 2,
                }
            ]
            svc.generate_xmls(packed, "out.json")

        df1 = captured_df["df1"]
        self.assertIn("texture", df1.columns)
        self.assertEqual(df1["texture"].iloc[0], 2)

    @patch("pandas.ExcelWriter")
    def test_texture_grain_string_horizontal_writes_two(
        self: "NestXmlsTestCase", mock_writer: MagicMock
    ) -> None:
        captured_df = {}

        def capture_to_excel(
            self_df: object,
            writer: object,
            sheet_name: str | None = None,
            *args: object,
            **kwargs: object,
        ) -> None:
            if sheet_name == "Cutting List":
                captured_df["df1"] = self_df.copy()

        with patch.object(
            __import__("pandas").DataFrame, "to_excel", new=capture_to_excel
        ):
            svc = NestingService(width=2000, height=2000)
            packed = [
                {
                    KEY_UNIQUE_ID: "SHEET0101",
                    KEY_WIDTH: 100,
                    "height": 50,
                    "x": 0,
                    "y": 0,
                    "sheet_num": "SHEET01",
                    KEY_NAME: "Part A",
                    KEY_ID: "A",
                    "texture": "Horizontal",
                }
            ]
            svc.generate_xmls(packed, "out.json")

        df1 = captured_df["df1"]
        self.assertEqual(df1["texture"].iloc[0], 2)

    @patch("pandas.ExcelWriter")
    def test_texture_grain_missing_defaults_zero(
        self: "NestXmlsTestCase", mock_writer: MagicMock
    ) -> None:
        captured_df = {}

        def capture_to_excel(
            self_df: object,
            writer: object,
            sheet_name: str | None = None,
            *args: object,
            **kwargs: object,
        ) -> None:
            if sheet_name == "Cutting List":
                captured_df["df1"] = self_df.copy()

        with patch.object(
            __import__("pandas").DataFrame, "to_excel", new=capture_to_excel
        ):
            svc = NestingService(width=2000, height=2000)
            packed = [
                {
                    KEY_UNIQUE_ID: "SHEET0101",
                    KEY_WIDTH: 100,
                    "height": 50,
                    "x": 0,
                    "y": 0,
                    "sheet_num": "SHEET01",
                    KEY_NAME: "Part A",
                    KEY_ID: "A",
                }
            ]
            svc.generate_xmls(packed, "out.json")

        df1 = captured_df["df1"]
        self.assertEqual(df1["texture"].iloc[0], 0)

    @patch("pandas.ExcelWriter")
    def test_texture_grain_prefers_numeric_over_string(
        self: "NestXmlsTestCase", mock_writer: MagicMock
    ) -> None:
        captured_df = {}

        def capture_to_excel(
            self_df: object,
            writer: object,
            sheet_name: str | None = None,
            *args: object,
            **kwargs: object,
        ) -> None:
            if sheet_name == "Cutting List":
                captured_df["df1"] = self_df.copy()

        with patch.object(
            __import__("pandas").DataFrame, "to_excel", new=capture_to_excel
        ):
            svc = NestingService(width=2000, height=2000)
            packed = [
                {
                    KEY_UNIQUE_ID: "SHEET0101",
                    KEY_WIDTH: 100,
                    "height": 50,
                    "x": 0,
                    "y": 0,
                    "sheet_num": "SHEET01",
                    KEY_NAME: "Part A",
                    KEY_ID: "A",
                    "texture_grain_code": 1,
                    "texture": "Horizontal",
                }
            ]
            svc.generate_xmls(packed, "out.json")

        df1 = captured_df["df1"]
        self.assertEqual(df1["texture"].iloc[0], 1)

    @patch("zipfile.ZipFile")
    @patch("pandas.ExcelWriter")
    @patch("pandas.DataFrame.to_excel")
    @patch("os.walk")
    @patch("builtins.open")
    def test_generate_xmls_multiple_edges_and_grooves(
        self: "NestXmlsTestCase",
        mock_open: MagicMock,
        mock_walk: MagicMock,
        mock_to_excel: MagicMock,
        mock_writer: MagicMock,
        mock_zip: MagicMock,
    ) -> None:
        mock_walk.return_value = [("base/xml", [], [])]
        service = NestingService(width=400, height=200)
        items = [
            {
                KEY_NAME: "PartTwo",
                KEY_ID: "2",
                KEY_UNIQUE_ID: "SHEET0102",
                "Dimensions": "120 x 60",
                KEY_WIDTH: 120.0,
                "height": 60.0,
                "depth": 17.0,
                "minifix_holes": [
                    {
                        "type": "CAM",
                        "diameter": 15,
                        "drill_type": "2",
                        "face": "6",
                        "local_position2_d": {"x": 10, "y": 12},
                    },
                    {
                        "type": "DOWEL",
                        "diameter": 8,
                        "drill_type": "1",
                        "face": "5",
                        "local_position2_d": {"x": 5, "y": 0},
                    },
                ],
                "grooves": [
                    {"x": 1, "y": 2, "end_x": 30, "end_y": 2, "width": 2},
                    {"x": 3, "y": 10, "end_x": 35, "end_y": 10, "width": 3},
                ],
                "edge_banding": {
                    "left": "Band L",
                    "right": "Band R",
                    "top": "Band T",
                    "bottom": "Band B",
                },
            }
        ]
        out = service.generate_xmls(
            items, "base/out.any", design_name="X", order_number="O", company_name=""
        )
        self.assertIsInstance(out, list)
        self.assertTrue(mock_open.called)
        self.assertTrue(mock_writer.called)
        self.assertTrue(mock_zip.called)

    @patch("zipfile.ZipFile")
    @patch("pandas.ExcelWriter")
    @patch("pandas.DataFrame.to_excel")
    @patch("os.walk")
    @patch("builtins.open")
    def test_generate_xmls_minimal(
        self: "NestXmlsTestCase",
        mock_open: MagicMock,
        mock_walk: MagicMock,
        mock_to_excel: MagicMock,
        mock_writer: MagicMock,
        mock_zip: MagicMock,
    ) -> None:
        mock_walk.return_value = [("base/xml", [], [])]
        service = NestingService(width=500, height=300)
        items = [
            {
                KEY_NAME: "PartOne",
                KEY_ID: "1",
                KEY_UNIQUE_ID: "SHEET0101",
                "Dimensions": "100 x 50",
                KEY_WIDTH: 100.0,
                "height": 50.0,
                "depth": 18.0,
                "minifix_holes": [
                    {
                        "type": "DOWEL",
                        "diameter": 8,
                        "drill_type": "1",
                        "face": "5",
                        "local_position2_d": {"x": 5, "y": 0},
                    }
                ],
            }
        ]
        out = service.generate_xmls(
            items, "base/out.any", design_name="X", order_number="O", company_name=""
        )
        self.assertIsInstance(out, list)
        self.assertTrue(mock_open.called)
        self.assertTrue(mock_writer.called)
        self.assertTrue(mock_zip.called)

    def test_generate_xmls_company_filter(self: "NestXmlsTestCase") -> None:
        org = Organization.objects.create(name="Test Org")
        comp = Company.objects.create(organization=org, name="Special Company")
        Material.objects.create(
            organization=org, name="Material 1", type="Banding", company=comp
        )

        service = NestingService(width=1000, height=1000)
        with patch("pandas.ExcelWriter"), patch("pandas.DataFrame.to_excel"), patch(
            "builtins.open"
        ), patch("zipfile.ZipFile"):
            service.generate_xmls([], "out.any", company_name="Special Company")

    def test_generate_xmls_material_cache(self: "NestXmlsTestCase") -> None:
        """Cover material thickness cache population (lines 613-632)."""
        from umaboy.models import Organization
        from material.models import Properties
        org = Organization.objects.create(name="Test Org 2")
        mat = Material.objects.create(organization=org, name="Edge 1", type="Banding")
        Properties.objects.create(material=mat, thickness=2.5)

        service = NestingService(width=1000, height=1000)
        with patch("pandas.ExcelWriter"), patch("pandas.DataFrame.to_excel"), patch(
            "builtins.open"
        ), patch("zipfile.ZipFile"):
            service.generate_xmls([], "out.any")

    def test_generate_xmls_coordinate_logic_edge_cases(
        self: "NestXmlsTestCase",
    ) -> None:
        """Cover various face IDs and hole types (lines 791-792, 797-814)."""
        service = NestingService(width=1000, height=1000)
        items = [
            {
                KEY_UNIQUE_ID: "P1",
                KEY_WIDTH: 100,
                "height": 200,
                "depth": 18,
                "minifix_holes": [
                    {
                        "type": "CAM",
                        "face": "3",
                        "local_position2_d": {"x": 10, "y": 20},
                        "drill_type": "2",
                    },
                    {
                        "type": "CAM",
                        "face": "4",
                        "local_position2_d": {"x": 10, "y": 20},
                        "drill_type": "2",
                    },
                    {
                        "type": "CAM",
                        "face": "2",
                        "local_position2_d": {"x": 10, "y": 20},
                        "drill_type": "2",
                    },
                    {
                        "type": "CAM",
                        "face": "1",
                        "local_position2_d": {"x": 10, "y": 20},
                        "drill_type": "2",
                    },
                    {
                        "type": "DOWEL",
                        "face": "6",
                        "local_position2_d": {"x": 10, "y": 20},
                        "drill_type": "2",
                    },
                    {
                        "type": "DOWEL",
                        "face": "1",
                        "local_position2_d": {"x": 10, "y": 20},
                        "drill_type": "2",
                    },
                ],
            }
        ]
        with patch("pandas.ExcelWriter"), patch("pandas.DataFrame.to_excel"), patch(
            "builtins.open"
        ), patch("zipfile.ZipFile"):
            service.generate_xmls(items, "out.any")

    def test_generate_xmls_processing_errors(self: "NestXmlsTestCase") -> None:
        """Cover exception handling for holes and grooves (lines 862-864, 889-891)."""
        service = NestingService(width=1000, height=1000)
        items = [
            {
                KEY_UNIQUE_ID: "P1",
                KEY_WIDTH: 100,
                "height": 200,
                "depth": 18,
                "minifix_holes": [None],
                "grooves": [None],
            }
        ]
        with self.assertLogs("design.nest", level="WARNING") as cm:
            with patch("pandas.ExcelWriter"), patch("pandas.DataFrame.to_excel"), patch(
                "builtins.open"
            ), patch("zipfile.ZipFile"):
                service.generate_xmls(items, "out.any")
                self.assertTrue(
                    any("Error processing hole" in out for out in cm.output)
                )
                self.assertTrue(
                    any("Error processing groove" in out for out in cm.output)
                )
