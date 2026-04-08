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
class NestExportersTestCase(APIBaseTestCase):
    databases = {DEFAULT_DATABASE}

    def setUp(self: "NestExportersTestCase") -> None:
        super().setUp()
        self.files_basic = {
            "1": {
                "type": "rectangle",
                "width": 100,
                "depth": 50,
                "height": 18,
                "name": "Part 1",
            },
        }

    @patch("pandas.DataFrame.to_excel")
    def test_nesting_service_generate_excel(
        self: "NestExportersTestCase", mock_to_excel: MagicMock
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
    def test_generate_svg(
        self: "NestExportersTestCase", mock_drawing: MagicMock
    ) -> None:
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

    @patch("reportlab.pdfgen.canvas.Canvas")
    @patch("reportlab.graphics.shapes.Drawing")
    @patch("reportlab.graphics.renderPDF.draw")
    @patch("reportlab.graphics.barcode.qr.QrCodeWidget")
    def test_generate_labels(
        self: "NestExportersTestCase",
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
        self: "NestExportersTestCase", mock_canvas: MagicMock
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
        self: "NestExportersTestCase",
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

    @patch("design.nest.renderPDF.draw")
    @patch("design.nest.svg2rlg")
    @patch("reportlab.pdfgen.canvas.Canvas")
    def test_generate_layout_pdf(
        self: "NestExportersTestCase",
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

    @patch("design.nest.renderPDF.draw")
    @patch("design.nest.svg2rlg")
    @patch("reportlab.pdfgen.canvas.Canvas")
    def test_generate_layout_pdf_skips_none_drawings(
        self: "NestExportersTestCase",
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

    @patch("svgwrite.Drawing")
    def test_generate_svg_faces_and_rotation(
        self: "NestExportersTestCase", mock_drawing: MagicMock
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
