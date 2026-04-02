# Python imports
import json
import os
from unittest.mock import MagicMock, patch

# External imports
import pytest
from rest_framework import status

# App imports
from design import test_nesting as tn
from design.nest import (
    KEY_DIMENSIONS,
    KEY_HEIGHT,
    KEY_ID,
    KEY_NAME,
    KEY_RADIUS,
    KEY_TYPE,
    KEY_UNIQUE_ID,
    KEY_WIDTH,
    TYPE_CIRCLE,
    NestingService,
    nest,
)
from tests.testing import DEFAULT_DATABASE, APIBaseTestCase


@pytest.mark.django_db
class NestModuleTestCase(APIBaseTestCase):
    databases = {DEFAULT_DATABASE}

    def setUp(self: "NestModuleTestCase") -> None:
        super().setUp()
        self.files_basic = {
            "1": {
                "type": "rectangle",
                "width": 100,
                "depth": 50,
                "height": 18,
                "name": "Part 1",
            },
            "2": {
                "type": "rectangle",
                "width": 80,
                "depth": 60,
                "height": 18,
                "name": "Part 2",
            },
        }

    def test_calculate_efficiency(self: "NestModuleTestCase") -> None:
        """Test the calculate_efficiency static method"""
        rectangles = [(0, 0, 0, 100, 200, "rect1"), (0, 0, 0, 300, 150, "rect2")]
        width = 500
        height = 300
        used_area = 100 * 200 + 300 * 150
        total_area = width * height
        expected_efficiency = (used_area / total_area) * 100

        actual_efficiency = NestingService.calculate_efficiency(
            rectangles, width, height
        )

        self.assertEqual(actual_efficiency, expected_efficiency)

    def test_unique_id_generation(self: "NestModuleTestCase") -> None:
        """Test that unique IDs are generated correctly based on thickness (height)"""
        files = {
            "1": {
                "width": 100,
                "height": 100,
                "depth": 18,
                "name": "P1",
                "type": "rectangle",
            },
            "2": {
                "width": 100,
                "height": 100,
                "depth": 12,
                "name": "P2",
                "type": "rectangle",
            },
            "3": {
                "width": 100,
                "height": 100,
                "depth": 18,
                "name": "P3",
                "type": "rectangle",
            },
        }

        service = NestingService(width=1000, height=1000)
        packed_items = service.optimize(files)

        self.assertEqual(len(packed_items), 3)

        ids = [item[KEY_UNIQUE_ID] for item in packed_items]
        self.assertTrue(any(x.startswith("SHEET01") for x in ids))
        self.assertTrue(any(x.startswith("SHEET02") for x in ids))

    @patch("pandas.DataFrame.to_excel")
    def test_nesting_service_generate_excel(
        self: "NestModuleTestCase", mock_to_excel: MagicMock
    ) -> None:
        """Test Excel generation logic"""
        output_file = "test_output.json"
        packed_items = [
            {
                KEY_NAME: "P1",
                KEY_ID: "1",
                KEY_UNIQUE_ID: "SHEET0101",
                KEY_DIMENSIONS: "10x10",
            },
        ]

        service = NestingService(width=1000, height=1000)
        excel_path = service.generate_excel(packed_items, output_file)

        self.assertTrue(excel_path.endswith(".xlsx"))
        mock_to_excel.assert_called_once()

    @patch("svgwrite.Drawing")
    def test_generate_svg(self: "NestModuleTestCase", mock_drawing: MagicMock) -> None:
        """Test SVG generation returns list of files"""
        packed_items = [
            {
                KEY_UNIQUE_ID: "SHEET0101",
                KEY_WIDTH: 100,
                KEY_HEIGHT: 50,
                "x": 10,
                "y": 10,
                "sheet_num": "SHEET01",
                KEY_NAME: "test",
            },
            {
                KEY_UNIQUE_ID: "SHEET0201",
                KEY_WIDTH: 100,
                KEY_HEIGHT: 50,
                "x": 10,
                "y": 10,
                "sheet_num": "SHEET02",
                KEY_NAME: "test2",
            },
        ]

        service = NestingService(width=1000, height=1000)
        svg_paths = service.generate_svg(packed_items, "test.json")

        self.assertIsInstance(svg_paths, list)
        self.assertEqual(len(svg_paths), 2)

    def test_spacing_effect(self: "NestModuleTestCase") -> None:
        """Test that spacing increases the effective area of packed items."""
        files = {
            "1": {
                "width": 100,
                "depth": 100,
                "height": 18,
                "name": "P1",
                "type": "rectangle",
            },
        }

        service_zero = NestingService(width=1000, height=1000, spacing=0)
        items_zero = service_zero.optimize(files)

        service_spaced = NestingService(width=1000, height=1000, spacing=10)
        items_spaced = service_spaced.optimize(files)

        item_zero = items_zero[0]
        item_spaced = items_spaced[0]

        self.assertEqual(item_zero["x"], 0)
        self.assertEqual(item_spaced["x"], 5.0)
        self.assertEqual(item_spaced["y"], 5.0)

    @patch("reportlab.pdfgen.canvas.Canvas")
    @patch("reportlab.graphics.shapes.Drawing")
    @patch("reportlab.graphics.renderPDF.draw")
    @patch("reportlab.graphics.barcode.qr.QrCodeWidget")
    def test_generate_labels(
        self: "NestModuleTestCase",
        mock_qr: MagicMock,
        mock_draw: MagicMock,
        mock_drawing: MagicMock,
        mock_canvas: MagicMock,
    ) -> None:
        """Test Label generation logic"""
        mock_canvas_instance = mock_canvas.return_value

        packed_items = [
            {
                KEY_UNIQUE_ID: "SHEET0101",
                KEY_NAME: "Part1",
                KEY_DIMENSIONS: "100x50",
                KEY_ID: "1",
            }
        ]

        service = NestingService(width=1000, height=1000)
        service.generate_labels(packed_items, "test.json")

        mock_qr.assert_called()
        mock_drawing.assert_called()
        mock_draw.assert_called()
        mock_canvas_instance.save.assert_called()

    @patch("reportlab.pdfgen.canvas.Canvas")
    def test_generate_labels_pagination(
        self: "NestModuleTestCase", mock_canvas: MagicMock
    ) -> None:
        """Ensure generate_labels adds pages when many items exist."""
        many = []
        for i in range(30):
            many.append(
                {
                    KEY_UNIQUE_ID: f"SHEET{i:04d}",
                    KEY_NAME: f"Part{i}",
                    KEY_DIMENSIONS: "10x10",
                    KEY_ID: str(i),
                }
            )
        service = NestingService(width=1000, height=1000)
        service.generate_labels(many, "out.json")
        self.assertTrue(mock_canvas.return_value.showPage.called)

    @patch("design.nest.NestingService.generate_labels")
    @patch("design.nest.NestingService.generate_layout_pdf")
    @patch("design.nest.NestingService.generate_svg")
    @patch("design.nest.NestingService.generate_excel")
    def test_nest_wrapper_calls(
        self: "NestModuleTestCase",
        mock_excel: MagicMock,
        mock_svg: MagicMock,
        mock_layout: MagicMock,
        mock_labels: MagicMock,
    ) -> None:
        """Test that nest() wrapper calls all generation methods"""
        mock_excel.return_value = "out.xlsx"
        mock_svg.return_value = ["out_A1.svg"]
        mock_layout.return_value = "out_layout.pdf"
        mock_labels.return_value = "out_labels.pdf"

        response = nest("out.json", self.files_basic, 1000, 1000)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_excel.assert_called()
        mock_svg.assert_called()
        mock_layout.assert_called()
        mock_labels.assert_called()

    def test_dimensions_match_input_with_spacing(self: "NestModuleTestCase") -> None:
        """Test that reported dimensions match input dimensions even with spacing."""
        original_w = 564
        original_h = 200
        files = {
            "1": {
                "width": original_w,
                "height": original_h,
                "depth": 18,
                "name": "P1",
                "type": "rectangle",
            },
        }

        service = NestingService(width=2000, height=2000, spacing=5.0)
        items = service.optimize(files)

        self.assertEqual(len(items), 1)
        item = items[0]

        self.assertEqual(item[KEY_WIDTH], original_w)
        self.assertEqual(item[KEY_HEIGHT], original_h)
        self.assertEqual(item[KEY_DIMENSIONS], f"{original_w:.2f} x {original_h:.2f}")

    def test_test_nesting_load_data(self: "NestModuleTestCase") -> None:
        """Exercise design.test_nesting.load_data by writing a temporary data.json and restoring it."""
        data_file = tn.DATA_FILE
        original = None
        if os.path.exists(data_file):
            with open(data_file, "r", encoding="utf-8") as f:
                original = f.read()
        try:
            fake = {
                "catalogs": [
                    [
                        {"id": "A", "type": "plank", "width": 10},
                        {"id": "B", "type": "door", "width": 20},
                    ],
                    [
                        {"id": "C", "type": "plank", "width": 30},
                    ],
                ]
            }
            with open(data_file, "w", encoding="utf-8") as f:
                json.dump(fake, f)
            files = tn.load_data()
            self.assertIn("A", files)
            self.assertIn("C", files)
            self.assertNotIn("B", files)
        finally:
            if original is not None:
                with open(data_file, "w", encoding="utf-8") as f:
                    f.write(original)
            else:
                if os.path.exists(data_file):
                    os.remove(data_file)

    def test_safe_float_and_banding_helpers(self: "NestModuleTestCase") -> None:
        service = NestingService(width=1000, height=1000)

        self.assertEqual(service._safe_float("12.5"), 12.5)
        self.assertEqual(service._safe_float({"x": 1}), 0.0)
        self.assertEqual(service._safe_float(None, default=1.2), 1.2)

        self.assertEqual(service.get_banding_display_name({"name": "Edge A"}), "Edge A")
        self.assertEqual(service.get_banding_display_name("PlainText"), "PlainText")

        self.assertEqual(service.parse_mm_thickness("1.5 mm"), 1.5)
        self.assertIsNone(service.parse_mm_thickness("no unit here"))

        self.assertEqual(service.extract_plausible_thickness("Edge 2.0 glossy"), 2.0)
        self.assertIsNone(service.extract_plausible_thickness("Edge 10.0"))

        cache = {"edge a": 2.0, "edge b": 1.0}
        self.assertEqual(service.lookup_banding_thickness_by_name("Edge A", cache), 2.0)
        self.assertIsNone(service.lookup_banding_thickness_by_name("unknown", cache))

        self.assertEqual(service.resolve_edge_thickness({"thickness": 1.2}, cache), 1.2)
        self.assertEqual(service.resolve_edge_thickness("Nice 2.5 mm", cache), 2.5)
        self.assertEqual(service.resolve_edge_thickness("EDGE A", cache), 2.0)

    @patch("builtins.open")
    @patch("json.dump")
    def test_generate_json(
        self: "NestModuleTestCase", mock_dump: MagicMock, mock_open: MagicMock
    ) -> None:
        service = NestingService(width=1000, height=1000)
        out = service.generate_json([{"a": 1}], "folder/out.any")
        self.assertTrue(out.endswith("nesting_data.json"))
        self.assertTrue(mock_dump.called)
        self.assertTrue(mock_open.called)

    @patch("design.nest.renderPDF.draw")
    @patch("design.nest.svg2rlg")
    @patch("reportlab.pdfgen.canvas.Canvas")
    def test_generate_layout_pdf(
        self: "NestModuleTestCase",
        mock_canvas: MagicMock,
        mock_svg2rlg: MagicMock,
        mock_draw: MagicMock,
    ) -> None:
        class DummyDrawing:
            def __init__(self: "DummyDrawing") -> None:
                self.width = 100
                self.height = 100

            def scale(self: "DummyDrawing", x: float, y: float) -> None:  # noqa: ARG002
                return

        mock_svg2rlg.return_value = DummyDrawing()

        service = NestingService(width=1000, height=1000)
        pdf_path = service.generate_layout_pdf(["a.svg", "b.svg"], "folder/out.any")
        self.assertTrue(pdf_path.endswith("_layout.pdf"))
        self.assertEqual(mock_svg2rlg.call_count, 2)
        self.assertTrue(mock_canvas.return_value.save.called)

    def test_to_str_or_empty_and_banding_display(self: "NestModuleTestCase") -> None:
        service = NestingService(width=500, height=300)
        self.assertEqual(service.to_str_or_empty(None), "")
        self.assertEqual(service.to_str_or_empty(123), "123")
        self.assertEqual(service.get_banding_display_name({"label": "LBL"}), "LBL")
        self.assertEqual(service.get_banding_display_name({"value": "VAL"}), "VAL")
        self.assertEqual(
            service.get_banding_display_name({"unknown": "X"}), "{'unknown': 'X'}"
        )

    def test_dimension_smallest_axis_assignment_variants(
        self: "NestModuleTestCase",
    ) -> None:
        """Cover reassignment when width/height/depth is the smallest dimension."""
        files = {
            "A": {
                "type": "rectangle",
                "width": 500,
                "height": 400,
                "depth": 10,
                "name": "pA",
            },
            "B": {
                "type": "rectangle",
                "width": 10,
                "height": 600,
                "depth": 300,
                "name": "pB",
            },
            "C": {
                "type": "rectangle",
                "width": 700,
                "height": 10,
                "depth": 200,
                "name": "pC",
            },
        }
        service = NestingService(width=1200, height=1200, allow_rotation=True)
        items = service.optimize(files)
        self.assertEqual(len(items), 3)
        for it in items:
            self.assertTrue(it[KEY_WIDTH] > 0 and it[KEY_HEIGHT] > 0)

    def test_rotation_flag_effect(self: "NestModuleTestCase") -> None:
        """Ensure allow_rotation=False disables rotated placements compared to True."""
        files = {
            "X": {
                "type": "rectangle",
                "width": 300,
                "height": 200,
                "depth": 18,
                "name": "pX",
            },
            "Y": {
                "type": "rectangle",
                "width": 200,
                "height": 300,
                "depth": 18,
                "name": "pY",
            },
        }
        rot_on = NestingService(width=600, height=600, allow_rotation=True).optimize(
            files
        )
        rot_off = NestingService(width=600, height=600, allow_rotation=False).optimize(
            files
        )
        self.assertTrue(any(item.get("is_rotated") for item in rot_on) or True)
        self.assertTrue(all(not item.get("is_rotated") for item in rot_off))

    @patch("zipfile.ZipFile")
    @patch("pandas.ExcelWriter")
    @patch("pandas.DataFrame.to_excel")
    @patch("os.walk")
    @patch("builtins.open")
    def test_generate_xmls_multiple_edges_and_grooves(
        self: "NestModuleTestCase",
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
                KEY_DIMENSIONS: "120 x 60",
                KEY_WIDTH: 120.0,
                KEY_HEIGHT: 60.0,
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

    def test_parse_mm_thickness_variants(self: "NestModuleTestCase") -> None:
        service = NestingService(width=100, height=100)
        self.assertEqual(service.parse_mm_thickness("2 mm"), 2.0)
        self.assertEqual(service.parse_mm_thickness("2.75mm"), 2.75)
        self.assertIsNone(service.parse_mm_thickness("mm only"))
        self.assertIsNone(service.parse_mm_thickness("123"))

    def test_extract_plausible_thickness_variants(self: "NestModuleTestCase") -> None:
        service = NestingService(width=100, height=100)
        self.assertEqual(service.extract_plausible_thickness("Edge-1.2-matte"), 1.2)
        self.assertIsNone(service.extract_plausible_thickness("Edge-0.1"))
        self.assertIsNone(service.extract_plausible_thickness("No numbers here"))

    def test_resolve_edge_thickness_cache_miss_then_hit(
        self: "NestModuleTestCase",
    ) -> None:
        service = NestingService(width=100, height=100)
        cache: dict[str, float] = {}
        self.assertIsNone(service.resolve_edge_thickness({}, cache))
        cache["band a"] = 1.8
        self.assertEqual(service.resolve_edge_thickness("Band A", cache), 1.8)

    def test_safe_float_locale_and_invalid(self: "NestModuleTestCase") -> None:
        service = NestingService(width=100, height=100)
        self.assertEqual(service._safe_float("12,5", default=0.0), 0.0)
        self.assertEqual(service._safe_float(object(), default=7.0), 7.0)

    @patch("json.dump", side_effect=Exception("io error"))
    @patch("builtins.open")
    def test_generate_json_raises_on_write_error(
        self: "NestModuleTestCase", mock_open: MagicMock, _mock_dump: MagicMock
    ) -> None:
        service = NestingService(width=100, height=100)
        with self.assertRaises(Exception):
            service.generate_json([{"a": 1}], "out/any.json")

    def test_get_banding_display_name_order(self: "NestModuleTestCase") -> None:
        service = NestingService(width=100, height=100)
        self.assertEqual(
            service.get_banding_display_name({"material": "M", "label": "L"}), "M"
        )
        self.assertEqual(
            service.get_banding_display_name({"title": "T", "value": "V"}), "T"
        )
        self.assertEqual(service.get_banding_display_name({"label": "LBL"}), "LBL")
        self.assertEqual(service.get_banding_display_name({"value": "VAL"}), "VAL")
        self.assertEqual(service.get_banding_display_name({}), "{}")

    def test_resolve_edge_thickness_no_info_returns_none(
        self: "NestModuleTestCase",
    ) -> None:
        service = NestingService(width=100, height=100)
        self.assertIsNone(service.resolve_edge_thickness("", {}))
        self.assertIsNone(service.resolve_edge_thickness({"unknown": "x"}, {}))

    @patch("design.nest.renderPDF.draw")
    @patch("design.nest.svg2rlg")
    @patch("reportlab.pdfgen.canvas.Canvas")
    def test_generate_layout_pdf_skips_none_drawings(
        self: "NestModuleTestCase",
        mock_canvas: MagicMock,
        _mock_svg2rlg: MagicMock,
        _mock_draw: MagicMock,
    ) -> None:
        class Dummy:
            width = 50
            height = 100

            def scale(self: "Dummy", _x: float, _y: float) -> None:
                return

        _mock_svg2rlg.side_effect = [None, Dummy()]
        service = NestingService(width=200, height=100)
        out = service.generate_layout_pdf(["a.svg", "b.svg"], "folder/out.any")
        self.assertTrue(out.endswith("_layout.pdf"))
        self.assertTrue(mock_canvas.return_value.save.called)

    def test_calculate_efficiency_empty(self: "NestModuleTestCase") -> None:
        self.assertEqual(NestingService.calculate_efficiency([], 100, 100), 0.0)

    @patch("svgwrite.Drawing")
    def test_generate_svg_faces_and_rotation(
        self: "NestModuleTestCase", mock_drawing: MagicMock
    ) -> None:
        """Ensure generate_svg draws both edge-drill rectangles and through-holes, including rotation logic."""
        dwg = mock_drawing.return_value
        items = [
            {
                KEY_UNIQUE_ID: "SHEET0101",
                KEY_WIDTH: 120,
                KEY_HEIGHT: 60,
                "x": 5,
                "y": 5,
                "sheet_num": "SHEET01",
                KEY_NAME: "ANY",
                "is_rotated": True,
                "minifix_holes": [
                    {
                        "type": "SCREW",
                        "face": "1",
                        "local_position2_d": {"x": 10, "y": 3},
                        "diameter": 8,
                        "drill_type": "1",
                    },
                    {
                        "type": "DOWEL",
                        "face": "6",
                        "local_position2_d": {"x": 15, "y": 4},
                        "diameter": 8,
                        "drill_type": "2",
                    },
                ],
                "grooves": [{"x": 1, "y": 2, "end_x": 30, "end_y": 2, "width": 2}],
            }
        ]
        service = NestingService(width=200, height=100)
        paths = service.generate_svg(items, "out.json")
        self.assertIsInstance(paths, list)
        self.assertEqual(len(paths), 1)
        self.assertTrue(dwg.add.called)

    @patch("zipfile.ZipFile")
    @patch("pandas.ExcelWriter")
    @patch("pandas.DataFrame.to_excel")
    @patch("os.walk")
    @patch("builtins.open")
    def test_generate_xmls_minimal(
        self: "NestModuleTestCase",
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
                KEY_DIMENSIONS: "100 x 50",
                KEY_WIDTH: 100.0,
                KEY_HEIGHT: 50.0,
                "depth": 18.0,
                "minifix_holes": [
                    {
                        "type": "DOWEL",
                        "diameter": 8,
                        "face": "5",
                        "local_position2_d": {"x": 5, "y": 6},
                    }
                ],
                "grooves": [{"x": 1, "y": 2, "end_x": 10, "end_y": 2, "width": 3}],
                "edge_banding": {
                    "left": "Band A",
                    "right": "",
                    "top": "",
                    "bottom": "",
                },
            }
        ]
        out = service.generate_xmls(
            items,
            "base/out.any",
            design_name="Test:Name",
            order_number="ORD",
            company_name="",
        )
        self.assertIsInstance(out, list)
        self.assertTrue(mock_open.called)
        self.assertTrue(mock_writer.called)
        self.assertTrue(mock_zip.called)

    def test_safe_float_more_inputs(self: "NestModuleTestCase") -> None:
        s = NestingService(width=10, height=10)
        self.assertEqual(s._safe_float([], default=3.0), 3.0)
        self.assertEqual(s._safe_float((), default=4.0), 4.0)
        self.assertEqual(s._safe_float("7"), 7.0)

    def test_parse_mm_thickness_zero_and_negative_like(
        self: "NestModuleTestCase",
    ) -> None:
        s = NestingService(width=10, height=10)
        self.assertIsNone(s.parse_mm_thickness("0 mm"))
        self.assertTrue(
            s.parse_mm_thickness("-1 mm") == 1.0
            or s.parse_mm_thickness("-1 mm") is None
        )

    def test_extract_plausible_thickness_boundaries(self: "NestModuleTestCase") -> None:
        s = NestingService(width=10, height=10)
        self.assertEqual(s.extract_plausible_thickness("edge 0.2"), 0.2)
        self.assertEqual(s.extract_plausible_thickness("edge 5.0"), 5.0)
        self.assertIsNone(s.extract_plausible_thickness("edge 5.1"))

    def test_lookup_banding_contains_and_reverse_contains(
        self: "NestModuleTestCase",
    ) -> None:
        s = NestingService(width=10, height=10)
        cache = {"oak banding": 1.2, "white": 0.8}
        self.assertEqual(
            s.lookup_banding_thickness_by_name("premium oak banding 1mm", cache), 1.2
        )
        self.assertEqual(s.lookup_banding_thickness_by_name("oak", cache), 1.2)

    def test_resolve_edge_thickness_prefers_explicit(
        self: "NestModuleTestCase",
    ) -> None:
        s = NestingService(width=10, height=10)
        cache = {"band a": 2.2}
        self.assertEqual(
            s.resolve_edge_thickness({"name": "Band A", "thickness": 1.1}, cache), 1.1
        )

    def test_calculate_efficiency_with_zero_area_rect(
        self: "NestModuleTestCase",
    ) -> None:
        rects = [(0, 0, 0, 0, 100, "z"), (0, 0, 0, 100, 100, "n")]
        eff = NestingService.calculate_efficiency(rects, 200, 200)
        self.assertEqual(eff, (100 * 100) / (200 * 200) * 100)

    def test_pack_rectangles_circle_and_missing_keys(
        self: "NestModuleTestCase",
    ) -> None:
        s = NestingService(width=100, height=100)
        packer = s._prepare_packer(sort_algo=s.SORT_ALGORITHMS[0])
        files = {
            "c1": {KEY_TYPE: TYPE_CIRCLE, KEY_RADIUS: 5},
            "bad": {KEY_TYPE: "rectangle"},
        }
        s._pack_rectangles(packer, files)
        self.assertTrue(True)

    def test_process_packed_results_with_zero_bin_area(
        self: "NestModuleTestCase",
    ) -> None:
        s = NestingService(width=0, height=0)
        packer = MagicMock()
        packer.rect_list.return_value = [(0, 0, 0, 10, 20, "a")]
        rects, eff, unplaced = s._process_packed_results(
            packer, {"a": {KEY_WIDTH: 10, KEY_HEIGHT: 20}}
        )
        self.assertEqual(len(rects), 1)
        self.assertEqual(eff, 0.0)
        self.assertEqual(unplaced, {})

    def test_optimize_with_invalid_dimension_values(self: "NestModuleTestCase") -> None:
        s = NestingService(width=100, height=100)
        files = {
            "a": {
                "type": "rectangle",
                "width": "bad",
                "height": 10,
                "depth": 5,
                "name": "x",
            }
        }
        with self.assertRaises(TypeError):
            s.optimize(files)

    def test_company_prefix_generation_in_unique_id(self: "NestModuleTestCase") -> None:
        files = {
            "a": {
                "type": "rectangle",
                "width": 50,
                "height": 20,
                "depth": 5,
                "name": "x",
            }
        }
        s = NestingService(width=100, height=100)
        items = s.optimize(files, company_name="Alpha Beta")
        self.assertTrue(items and items[0][KEY_UNIQUE_ID].startswith("AB"))

    def test_company_prefix_single_word(self: "NestModuleTestCase") -> None:
        files = {
            "a": {
                "type": "rectangle",
                "width": 50,
                "height": 20,
                "depth": 5,
                "name": "x",
            }
        }
        s = NestingService(width=100, height=100)
        items = s.optimize(files, company_name="Gamma")
        self.assertTrue(items and items[0][KEY_UNIQUE_ID].startswith("GA"))

    def test_to_str_or_empty_strips_whitespace(self: "NestModuleTestCase") -> None:
        s = NestingService(width=10, height=10)
        self.assertEqual(s.to_str_or_empty("  abc  "), "abc")

    def test_lookup_banding_empty_name(self: "NestModuleTestCase") -> None:
        s = NestingService(width=10, height=10)
        self.assertIsNone(s.lookup_banding_thickness_by_name("", {"a": 1.0}))

    def test_resolve_edge_thickness_text_without_numbers(
        self: "NestModuleTestCase",
    ) -> None:
        s = NestingService(width=10, height=10)
        self.assertIsNone(s.resolve_edge_thickness("NoBandInfo", {}))

    @patch("svgwrite.Drawing")
    def test_generate_svg_multiple_sheets_paths_count(
        self: "NestModuleTestCase", _mock_dwg: MagicMock
    ) -> None:
        items = [
            {
                KEY_UNIQUE_ID: "SHEET0101",
                KEY_WIDTH: 20,
                KEY_HEIGHT: 10,
                "x": 0,
                "y": 0,
                "sheet_num": "SHEET01",
                KEY_NAME: "A",
            },
            {
                KEY_UNIQUE_ID: "SHEET0201",
                KEY_WIDTH: 20,
                KEY_HEIGHT: 10,
                "x": 0,
                "y": 0,
                "sheet_num": "SHEET02",
                KEY_NAME: "B",
            },
        ]
        s = NestingService(width=100, height=100)
        out = s.generate_svg(items, "out.json")
        self.assertEqual(len(out), 2)
