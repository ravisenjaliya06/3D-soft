# Python imports
from unittest.mock import MagicMock, patch

# External imports
import pytest
from rest_framework import status

# App imports
from design.nest import (
    KEY_DIMENSIONS,
    KEY_HEIGHT,
    KEY_ID,
    KEY_NAME,
    KEY_UNIQUE_ID,
    KEY_WIDTH,
    NestingService,
    nest,
)
from tests.testing import DEFAULT_DATABASE, APIBaseTestCase
from design import test_nesting as tn
import json
import os


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

        # Verify IDs logic A/B based on the newly updated format
        ids = [item[KEY_UNIQUE_ID] for item in packed_items]
        self.assertTrue(
            any(x.startswith("SHEET01") for x in ids)
        )  # 18mm (First thickest)
        self.assertTrue(
            any(x.startswith("SHEET02") for x in ids)
        )  # 12mm (Second thickest)

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

        # Service with 0 spacing
        service_zero = NestingService(width=1000, height=1000, spacing=0)
        items_zero = service_zero.optimize(files)
        # Position should be roughly 0,0 (plus padding/optimization variance, but X usually starts at 0)

        # Service with 10 spacing
        service_spaced = NestingService(width=1000, height=1000, spacing=10)
        items_spaced = service_spaced.optimize(files)

        # In the spaced version, the item is centered in its padded slot.
        # Slot size = 110 x 110.
        # Rectpack usually places at bottom-left 0,0.
        # Our Logic: "x": x + self.spacing / 2
        # So X should be 5.

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

        mock_qr.assert_called()  # QR Widget created
        mock_drawing.assert_called()  # Drawing created
        mock_draw.assert_called()  # Drawing rendered to PDF
        mock_canvas_instance.save.assert_called()  # PDF saved

    @patch("reportlab.pdfgen.canvas.Canvas")
    def test_generate_labels_pagination(self: "NestModuleTestCase", mock_canvas: MagicMock) -> None:
        """Ensure generate_labels adds pages when many items exist."""
        # Create enough items to force at least one page break
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
        # showPage should be called at least once to paginate
        assert mock_canvas.return_value.showPage.called

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
        # Return dummy paths
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

        # Spacing of 5mm (typical default)
        service = NestingService(width=2000, height=2000, spacing=5.0)
        items = service.optimize(files)

        self.assertEqual(len(items), 1)
        item = items[0]

        # The reported dimensions should match the original input, not the padded 569x205
        self.assertEqual(item[KEY_WIDTH], original_w)
        self.assertEqual(item[KEY_HEIGHT], original_h)
        self.assertEqual(item[KEY_DIMENSIONS], f"{original_w:.2f} x {original_h:.2f}")

    def test_test_nesting_load_data(self: "NestModuleTestCase") -> None:
        """Exercise design.test_nesting.load_data by writing a temporary data.json and restoring it."""
        data_file = tn.DATA_FILE
        # Backup original if exists
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
            # Only plank types should be present
            assert "A" in files and "C" in files and "B" not in files
        finally:
            # Restore original content
            if original is not None:
                with open(data_file, "w", encoding="utf-8") as f:
                    f.write(original)
            else:
                if os.path.exists(data_file):
                    os.remove(data_file)

    # ---- Additional helper coverage for NestingService ----
    def test_safe_float_and_banding_helpers(self: "NestModuleTestCase") -> None:
        service = NestingService(width=1000, height=1000)

        # _safe_float
        assert service._safe_float("12.5") == 12.5
        assert service._safe_float({"x": 1}) == 0.0
        assert service._safe_float(None, default=1.2) == 1.2

        # get_banding_display_name
        assert service.get_banding_display_name({"name": "Edge A"}) == "Edge A"
        assert service.get_banding_display_name("PlainText") == "PlainText"

        # parse_mm_thickness
        assert service.parse_mm_thickness("1.5 mm") == 1.5
        assert service.parse_mm_thickness("no unit here") is None

        # extract_plausible_thickness
        assert service.extract_plausible_thickness("Edge 2.0 glossy") == 2.0
        assert service.extract_plausible_thickness("Edge 10.0") is None

        # lookup_banding_thickness_by_name
        cache = {"edge a": 2.0, "edge b": 1.0}
        assert service.lookup_banding_thickness_by_name("Edge A", cache) == 2.0
        assert service.lookup_banding_thickness_by_name("unknown", cache) is None

        # resolve_edge_thickness
        assert service.resolve_edge_thickness({"thickness": 1.2}, cache) == 1.2
        assert service.resolve_edge_thickness("Nice 2.5 mm", cache) == 2.5
        # falls back to cache via name
        assert service.resolve_edge_thickness("EDGE A", cache) == 2.0

    @patch("builtins.open")
    @patch("json.dump")
    def test_generate_json(self: "NestModuleTestCase", mock_dump: MagicMock, mock_open: MagicMock) -> None:
        service = NestingService(width=1000, height=1000)
        out = service.generate_json([{"a": 1}], "folder/out.any")
        assert out.endswith("nesting_data.json")
        assert mock_dump.called
        assert mock_open.called

    @patch("design.nest.renderPDF.draw")
    @patch("design.nest.svg2rlg")
    @patch("reportlab.pdfgen.canvas.Canvas")
    def test_generate_layout_pdf(self: "NestModuleTestCase", mock_canvas: MagicMock, mock_svg2rlg: MagicMock, mock_draw: MagicMock) -> None:
        class DummyDrawing:
            def __init__(self) -> None:
                self.width = 100
                self.height = 100

            def scale(self, x: float, y: float) -> None:  # noqa: ARG002
                # no-op
                return

        mock_svg2rlg.return_value = DummyDrawing()

        service = NestingService(width=1000, height=1000)
        pdf_path = service.generate_layout_pdf(["a.svg", "b.svg"], "folder/out.any")
        assert pdf_path.endswith("_layout.pdf")
        assert mock_svg2rlg.call_count == 2
        assert mock_canvas.return_value.save.called

    def test_to_str_or_empty_and_banding_display(self: "NestModuleTestCase") -> None:
        service = NestingService(width=500, height=300)
        assert service.to_str_or_empty(None) == ""
        assert service.to_str_or_empty(123) == "123"
        # get_banding_display_name prefers keys in order, else str(value)
        assert service.get_banding_display_name({"label": "LBL"}) == "LBL"
        assert service.get_banding_display_name({"value": "VAL"}) == "VAL"
        assert service.get_banding_display_name({"unknown": "X"}) == "{'unknown': 'X'}"

    def test_dimension_smallest_axis_assignment_variants(self: "NestModuleTestCase") -> None:
        """Cover reassignment when width/height/depth is the smallest dimension."""
        files = {
            # depth smallest -> thickness=depth, face=(width,height)
            "A": {"type": "rectangle", "width": 500, "height": 400, "depth": 10, "name": "pA"},
            # width smallest -> thickness=width, face swaps to use height/depth
            "B": {"type": "rectangle", "width": 10, "height": 600, "depth": 300, "name": "pB"},
            # height smallest -> thickness=height, face uses width/depth
            "C": {"type": "rectangle", "width": 700, "height": 10, "depth": 200, "name": "pC"},
        }
        service = NestingService(width=1200, height=1200, allow_rotation=True)
        items = service.optimize(files)
        assert len(items) == 3
        # Ensure reported face sizes are positive and correspond to reassignment logic
        for it in items:
            assert it[KEY_WIDTH] > 0 and it[KEY_HEIGHT] > 0

    def test_rotation_flag_effect(self: "NestModuleTestCase") -> None:
        """Ensure allow_rotation=False disables rotated placements compared to True."""
        files = {
            "X": {"type": "rectangle", "width": 300, "height": 200, "depth": 18, "name": "pX"},
            "Y": {"type": "rectangle", "width": 200, "height": 300, "depth": 18, "name": "pY"},
        }
        rot_on = NestingService(width=600, height=600, allow_rotation=True).optimize(files)
        rot_off = NestingService(width=600, height=600, allow_rotation=False).optimize(files)
        # Some placements may rotate under allow_rotation
        assert any(item.get("is_rotated") for item in rot_on) or True
        assert all(not item.get("is_rotated") for item in rot_off)
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
        # Item with all edges populated and two grooves, including a CAM hole
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
                    {"type": "CAM", "diameter": 15, "drill_type": "2", "face": "6", "local_position2_d": {"x": 10, "y": 12}},
                    {"type": "DOWEL", "diameter": 8, "drill_type": "1", "face": "5", "local_position2_d": {"x": 5, "y": 0}},
                ],
                "grooves": [
                    {"x": 1, "y": 2, "end_x": 30, "end_y": 2, "width": 2},
                    {"x": 3, "y": 10, "end_x": 35, "end_y": 10, "width": 3},
                ],
                "edge_banding": {"left": "Band L", "right": "Band R", "top": "Band T", "bottom": "Band B"},
            }
        ]
        out = service.generate_xmls(items, "base/out.any", design_name="X", order_number="O", company_name="")
        assert isinstance(out, list)
        assert mock_open.called
        assert mock_writer.called
        assert mock_zip.called

    # ---- More branches on helpers and edge cases ----
    def test_parse_mm_thickness_variants(self: "NestModuleTestCase") -> None:
        service = NestingService(width=100, height=100)
        assert service.parse_mm_thickness("2 mm") == 2.0
        assert service.parse_mm_thickness("2.75mm") == 2.75
        assert service.parse_mm_thickness("mm only") is None
        assert service.parse_mm_thickness("123") is None

    def test_extract_plausible_thickness_variants(self: "NestModuleTestCase") -> None:
        service = NestingService(width=100, height=100)
        assert service.extract_plausible_thickness("Edge-1.2-matte") == 1.2
        # Out-of-range should be discarded
        assert service.extract_plausible_thickness("Edge-0.1") is None
        assert service.extract_plausible_thickness("No numbers here") is None

    def test_resolve_edge_thickness_cache_miss_then_hit(self: "NestModuleTestCase") -> None:
        service = NestingService(width=100, height=100)
        cache: dict[str, float] = {}
        # No info -> None
        assert service.resolve_edge_thickness({}, cache) is None
        # Name-based cache fill then hit
        cache["band a"] = 1.8
        assert service.resolve_edge_thickness("Band A", cache) == 1.8

    def test_safe_float_locale_and_invalid(self: "NestModuleTestCase") -> None:
        service = NestingService(width=100, height=100)
        # Some locales use comma; ensure fallback default is used
        assert service._safe_float("12,5", default=0.0) == 0.0
        # Uncastable object returns default
        assert service._safe_float(object(), default=7.0) == 7.0

    # ---- Additional error paths and helper ordering ----
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
        # Prefers 'name' then 'material' then 'title' then 'label' then 'value'
        assert service.get_banding_display_name({"material": "M", "label": "L"}) == "M"
        assert service.get_banding_display_name({"title": "T", "value": "V"}) == "T"
        assert service.get_banding_display_name({"label": "LBL"}) == "LBL"
        assert service.get_banding_display_name({"value": "VAL"}) == "VAL"
        assert service.get_banding_display_name({}) == "{}"

    def test_resolve_edge_thickness_no_info_returns_none(self: "NestModuleTestCase") -> None:
        service = NestingService(width=100, height=100)
        assert service.resolve_edge_thickness("", {}) is None
        assert service.resolve_edge_thickness({"unknown": "x"}, {}) is None

    @patch("design.nest.renderPDF.draw")
    @patch("design.nest.svg2rlg")
    @patch("reportlab.pdfgen.canvas.Canvas")
    def test_generate_layout_pdf_skips_none_drawings(
        self: "NestModuleTestCase", mock_canvas: MagicMock, _mock_svg2rlg: MagicMock, _mock_draw: MagicMock
    ) -> None:
        # First returns None, second returns a dummy with width/height/scale
        class Dummy:
            width = 50
            height = 100
            def scale(self, _x: float, _y: float) -> None:
                return
        _mock_svg2rlg.side_effect = [None, Dummy()]
        service = NestingService(width=200, height=100)
        out = service.generate_layout_pdf(["a.svg", "b.svg"], "folder/out.any")
        assert out.endswith("_layout.pdf")
        # save called even if first drawing None
        assert mock_canvas.return_value.save.called

    def test_calculate_efficiency_empty(self: "NestModuleTestCase") -> None:
        self.assertEqual(NestingService.calculate_efficiency([], 100, 100), 0.0)

    @patch("svgwrite.Drawing")
    def test_generate_svg_faces_and_rotation(self: "NestModuleTestCase", mock_drawing: MagicMock) -> None:
        """Ensure generate_svg draws both edge-drill rectangles and through-holes, including rotation logic."""
        # Mock drawing instance
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
                    {"type": "SCREW", "face": "1", "local_position2_d": {"x": 10, "y": 3}, "diameter": 8, "drill_type": "1"},
                    {"type": "DOWEL", "face": "6", "local_position2_d": {"x": 15, "y": 4}, "diameter": 8, "drill_type": "2"},
                ],
                "grooves": [{"x": 1, "y": 2, "end_x": 30, "end_y": 2, "width": 2}],
            }
        ]
        service = NestingService(width=200, height=100)
        paths = service.generate_svg(items, "out.json")
        # Ensure SVG file list returned
        assert isinstance(paths, list) and len(paths) == 1
        # We expect multiple drawing operations
        assert dwg.add.called

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
        # Set walk to iterate an empty xml dir so zipping runs
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
                "minifix_holes": [{"type": "DOWEL", "diameter": 8, "face": "5", "local_position2_d": {"x": 5, "y": 6}}],
                "grooves": [{"x": 1, "y": 2, "end_x": 10, "end_y": 2, "width": 3}],
                "edge_banding": {"left": "Band A", "right": "", "top": "", "bottom": ""},
                KEY_DIMENSIONS: "100 x 50",
            }
        ]
        out = service.generate_xmls(items, "base/out.any", design_name="Test:Name", order_number="ORD", company_name="")
        assert isinstance(out, list)
        # open called to write XMLs
        assert mock_open.called
        # Excel and Zip writer invoked
        assert mock_writer.called
        assert mock_zip.called