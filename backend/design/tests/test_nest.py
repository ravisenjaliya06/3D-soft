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
