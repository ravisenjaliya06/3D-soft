# Python imports
import json
import os
import tempfile
from unittest.mock import MagicMock, mock_open, patch

# Django imports
from django.http import HttpResponse

# External imports
import pytest
from rectpack import SORT_AREA, SORT_PERI
from rest_framework import status

# App imports
from design.models import DesignSetting, NestingFile, NestingSheet
from design.nest import (
    calculate_efficiency,
    cleanup_output_folder,
    convert_svgs_to_pdf,
    draw_sheet_to_svg,
    generate_dwg_file,
    generate_gcode,
    generate_xml_file,
    nest,
    try_packing,
)
from tests.testing import DEFAULT_DATABASE, APIBaseTestCase


# Create a mock JsonResponse for tests
class MockJsonResponse(HttpResponse):
    def __init__(self: "MockJsonResponse", data: dict, status: int = 200) -> None:
        content = json.dumps(data)
        super().__init__(content, content_type="application/json", status=status)
        self.status_code = status
        self.data = data


@pytest.mark.django_db
class NestModuleTestCase(APIBaseTestCase):
    databases = {DEFAULT_DATABASE}

    def test_calculate_efficiency(self: "NestModuleTestCase") -> None:
        """Test the calculate_efficiency function for proper area calculation"""
        rectangles = [(0, 0, 0, 100, 200, "rect1"), (0, 0, 0, 300, 150, "rect2")]
        width = 500
        height = 300
        used_area = 100 * 200 + 300 * 150
        total_area = width * height
        expected_efficiency = (used_area / total_area) * 100

        actual_efficiency = calculate_efficiency(rectangles, width, height)

        self.assertEqual(actual_efficiency, expected_efficiency)

    def test_calculate_efficiency_with_rotation(self: "NestModuleTestCase") -> None:
        """Test calculate_efficiency with rotated rectangles (7-element tuples)"""
        rectangles = [
            (0, 0, 0, 100, 200, "rect1", False),
            (0, 0, 0, 300, 150, "rect2", True),
        ]
        width = 500
        height = 300
        used_area = 100 * 200 + 300 * 150
        total_area = width * height
        expected_efficiency = (used_area / total_area) * 100

        actual_efficiency = calculate_efficiency(rectangles, width, height)
        self.assertEqual(actual_efficiency, expected_efficiency)

    def test_calculate_efficiency_empty(self: "NestModuleTestCase") -> None:
        """Test calculate_efficiency with empty rectangles"""
        rectangles = []
        width = 500
        height = 300
        expected_efficiency = 0.0

        actual_efficiency = calculate_efficiency(rectangles, width, height)
        self.assertEqual(actual_efficiency, expected_efficiency)

    @patch("builtins.open", new_callable=mock_open)
    def test_generate_gcode_rectangle(
        self: "NestModuleTestCase", mock_file: MagicMock
    ) -> None:
        """Test generate_gcode for rectangle"""
        rectangles = [(0, 10, 20, 100, 50, "rect1")]

        files = {
            "rect1": {"type": "rectangle"},
        }

        generate_gcode(rectangles, "test_output.gcode", files)

        mock_file.assert_called_once_with("test_output.gcode", "w", encoding="utf-8")
        written_gcode = "".join(call[0][0] for call in mock_file().write.call_args_list)
        self.assertIn("G21", written_gcode)
        self.assertIn("G90", written_gcode)
        self.assertIn("G0 X10.000", written_gcode)

    @patch("builtins.open", new_callable=mock_open)
    def test_generate_gcode_circle(
        self: "NestModuleTestCase", mock_file: MagicMock
    ) -> None:
        """Test generate_gcode for circle"""
        rectangles = [(0, 150, 30, 80, 60, "circle1")]

        files = {
            "circle1": {"type": "circle", "radius": 40},
        }

        generate_gcode(rectangles, "test_output.gcode", files)

        written_gcode = "".join(call[0][0] for call in mock_file().write.call_args_list)
        self.assertIn("G2 I", written_gcode)

    @patch("builtins.open", new_callable=mock_open)
    def test_generate_gcode_with_grooves(
        self: "NestModuleTestCase", mock_file: MagicMock
    ) -> None:
        """Test generate_gcode with grooves"""
        rectangles = [(0, 10, 20, 100, 50, "rect1")]

        files = {
            "rect1": {
                "type": "rectangle",
                "grooves": [
                    {
                        "groove_dig": 2.0,
                        "orientation": "horizontal",
                        "x": 0,
                        "y": 0,
                    }
                ],
            },
        }

        generate_gcode(rectangles, "test_output.gcode", files)

        written_gcode = "".join(call[0][0] for call in mock_file().write.call_args_list)
        self.assertIn("groove", written_gcode.lower())

    @patch("builtins.open", new_callable=mock_open)
    def test_generate_gcode_with_minifix_holes(
        self: "NestModuleTestCase", mock_file: MagicMock
    ) -> None:
        """Test generate_gcode with minifix holes"""
        rectangles = [(0, 10, 20, 100, 50, "rect1")]

        files = {
            "rect1": {
                "type": "rectangle",
                "depth": 18.0,
                "minifix_holes": [
                    {
                        "type": "DOWEL",
                        "diameter": 8.0,
                        "length": 24.0,
                        "localPosition2D": {"x": 0, "y": 0},
                        "direction": {"x": -1, "y": 0, "z": 0},
                    }
                ],
            },
        }

        generate_gcode(rectangles, "test_output.gcode", files)

        written_gcode = "".join(call[0][0] for call in mock_file().write.call_args_list)
        self.assertIn("DOWEL", written_gcode)

    @patch("builtins.open", new_callable=mock_open)
    def test_generate_gcode_with_rotation(
        self: "NestModuleTestCase", mock_file: MagicMock
    ) -> None:
        """Test generate_gcode with rotated rectangle"""
        rectangles = [(0, 10, 20, 100, 50, "rect1", True)]

        files = {
            "rect1": {
                "type": "rectangle",
                "depth": 18.0,
                "minifix_holes": [
                    {
                        "type": "SCREW",
                        "diameter": 5.0,
                        "length": 25.0,
                        "localPosition2D": {"x": 10, "y": 5},
                        "direction": {"x": 0, "y": -1, "z": 0},
                    }
                ],
            },
        }

        generate_gcode(rectangles, "test_output.gcode", files)

        written_gcode = "".join(call[0][0] for call in mock_file().write.call_args_list)
        self.assertIn("SCREW", written_gcode)

    @patch("builtins.open", new_callable=mock_open)
    def test_generate_gcode_invalid_dimensions(
        self: "NestModuleTestCase", mock_file: MagicMock
    ) -> None:
        """Test generate_gcode handles invalid dimensions gracefully"""
        rectangles = [(0, 10, 20, "invalid", "invalid", "rect1")]

        files = {
            "rect1": {"type": "rectangle"},
        }

        generate_gcode(rectangles, "test_output.gcode", files)

        written_gcode = "".join(call[0][0] for call in mock_file().write.call_args_list)
        self.assertIn("G21", written_gcode)

    @patch("builtins.open", new_callable=mock_open)
    def test_generate_gcode_vertical_groove(
        self: "NestModuleTestCase", mock_file: MagicMock
    ) -> None:
        """Test generate_gcode with vertical groove"""
        rectangles = [(0, 10, 20, 100, 50, "rect1")]

        files = {
            "rect1": {
                "type": "rectangle",
                "grooves": [
                    {
                        "groove_dig": 2.0,
                        "orientation": "vertical",
                        "x": 0,
                        "y": 0,
                    }
                ],
            },
        }

        generate_gcode(rectangles, "test_output.gcode", files)

        written_gcode = "".join(call[0][0] for call in mock_file().write.call_args_list)
        self.assertIn("groove", written_gcode.lower())

    @patch("builtins.open", new_callable=mock_open)
    def test_generate_gcode_bolt_drill(
        self: "NestModuleTestCase", mock_file: MagicMock
    ) -> None:
        """Test generate_gcode with BOLT_DRILL hole"""
        rectangles = [(0, 10, 20, 100, 50, "rect1")]

        files = {
            "rect1": {
                "type": "rectangle",
                "depth": 18.0,
                "minifix_holes": [
                    {
                        "type": "BOLT_DRILL",
                        "diameter": 10.0,
                        "depth": 12.5,
                        "localPosition2D": {"x": 0, "y": 0},
                        "direction": {"x": 1, "y": 0, "z": 0},
                    }
                ],
            },
        }

        generate_gcode(rectangles, "test_output.gcode", files)

        written_gcode = "".join(call[0][0] for call in mock_file().write.call_args_list)
        self.assertIn("BOLT_DRILL", written_gcode)

    @patch("builtins.open", new_callable=mock_open)
    def test_generate_gcode_custom_parameters(
        self: "NestModuleTestCase", mock_file: MagicMock
    ) -> None:
        """Test generate_gcode with custom parameters"""
        rectangles = [(0, 10, 20, 100, 50, "rect1")]

        files = {
            "rect1": {"type": "rectangle"},
        }

        generate_gcode(
            rectangles,
            "test_output.gcode",
            files,
            feed_rate=2000,
            plunge_rate=200,
            cut_height=5,
            safe_height=10.0,
            material_thickness=20.0,
        )

        written_gcode = "".join(call[0][0] for call in mock_file().write.call_args_list)
        self.assertIn("F2000", written_gcode)
        self.assertIn("Z10.000", written_gcode)

    def test_try_packing(self: "NestModuleTestCase") -> None:
        """Test try_packing function"""
        files = {
            "rect1": {"type": "rectangle", "width": 100, "height": 50},
            "rect2": {"type": "rectangle", "width": 80, "height": 60},
        }

        rectangles, efficiency, unplaced = try_packing(
            500, 300, True, files, [SORT_AREA, SORT_PERI]
        )

        self.assertIsInstance(rectangles, list)
        self.assertIsInstance(efficiency, float)
        self.assertIsInstance(unplaced, dict)
        self.assertGreaterEqual(efficiency, 0.0)
        self.assertLessEqual(efficiency, 100.0)

    def test_try_packing_circle(self: "NestModuleTestCase") -> None:
        """Test try_packing with circle"""
        files = {
            "circle1": {"type": "circle", "radius": 25},
        }

        rectangles, efficiency, unplaced = try_packing(
            500, 300, True, files, [SORT_AREA, SORT_PERI]
        )

        self.assertIsInstance(rectangles, list)
        self.assertIsInstance(efficiency, float)

    def test_try_packing_no_rotation(self: "NestModuleTestCase") -> None:
        """Test try_packing without rotation"""
        files = {
            "rect1": {"type": "rectangle", "width": 100, "height": 50},
        }

        rectangles, efficiency, unplaced = try_packing(
            500, 300, False, files, [SORT_AREA]
        )

        self.assertIsInstance(rectangles, list)

    def test_try_packing_large_items(self: "NestModuleTestCase") -> None:
        """Test try_packing with items larger than bin"""
        files = {
            "rect1": {"type": "rectangle", "width": 1000, "height": 1000},
        }

        rectangles, efficiency, unplaced = try_packing(
            500, 300, True, files, [SORT_AREA]
        )

        self.assertIsInstance(unplaced, dict)
        self.assertIn("rect1", unplaced)

    @patch("design.nest.svg2rlg")
    @patch("design.nest.renderPDF")
    @patch("design.nest.canvas.Canvas")
    def test_convert_svgs_to_pdf(
        self: "NestModuleTestCase",
        mock_canvas: MagicMock,
        mock_render: MagicMock,
        mock_svg2rlg: MagicMock,
    ) -> None:
        """Test convert_svgs_to_pdf"""
        with tempfile.NamedTemporaryFile(suffix=".svg", delete=False) as tmp:
            tmp.write(b"<svg></svg>")
            tmp_path = tmp.name

        try:
            mock_drawing = MagicMock()
            mock_drawing.width = 100
            mock_drawing.height = 200
            mock_svg2rlg.return_value = mock_drawing

            convert_svgs_to_pdf([tmp_path], "output.pdf")

            mock_svg2rlg.assert_called_once()
            mock_canvas.assert_called_once()
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    def test_convert_svgs_to_pdf_empty(self: "NestModuleTestCase") -> None:
        """Test convert_svgs_to_pdf with empty list"""
        convert_svgs_to_pdf([], "output.pdf")
        # Should not raise error

    @patch("design.nest.EZDXF_AVAILABLE", False)
    def test_generate_dwg_file_not_available(self: "NestModuleTestCase") -> None:
        """Test generate_dwg_file when ezdxf not available"""
        rectangles = [(0, 10, 20, 100, 50, "rect1")]
        files = {"rect1": {"type": "rectangle"}}

        generate_dwg_file(rectangles, files, "output.dwg", (500, 300))
        # Should not raise error

    def test_generate_xml_file(self: "NestModuleTestCase") -> None:
        """Test generate_xml_file"""
        rectangles = [(0, 10, 20, 100, 50, "rect1")]

        files = {
            "rect1": {
                "type": "rectangle",
                "name": "Test Rectangle",
                "depth": 18.0,
                "grooves": [
                    {
                        "type": "groove",
                        "orientation": "horizontal",
                        "x": 0,
                        "y": 0,
                    }
                ],
                "minifix_holes": [
                    {
                        "type": "DOWEL",
                        "diameter": 8.0,
                        "depth": 24.0,
                        "localPosition2D": {"x": 0, "y": 0},
                    }
                ],
            },
        }

        with tempfile.NamedTemporaryFile(mode="w", suffix=".xml", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            generate_xml_file(rectangles, files, tmp_path, (500, 300), 1)

            self.assertTrue(os.path.exists(tmp_path))
            with open(tmp_path, "r", encoding="utf-8") as f:
                content = f.read()
                self.assertIn("nesting", content)
                self.assertIn("sheet_number", content)
                self.assertIn("Test Rectangle", content)
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    def test_generate_xml_file_with_rotation(self: "NestModuleTestCase") -> None:
        """Test generate_xml_file with rotated rectangle"""
        rectangles = [(0, 10, 20, 100, 50, "rect1", True)]

        files = {
            "rect1": {
                "type": "rectangle",
                "name": "Rotated Rectangle",
                "depth": 18.0,
            },
        }

        with tempfile.NamedTemporaryFile(mode="w", suffix=".xml", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            generate_xml_file(rectangles, files, tmp_path, (500, 300), 1)

            self.assertTrue(os.path.exists(tmp_path))
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    def test_cleanup_output_folder(self: "NestModuleTestCase") -> None:
        """Test cleanup_output_folder"""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create some test files
            test_file1 = os.path.join(tmpdir, "test1.txt")
            test_file2 = os.path.join(tmpdir, "test2.txt")
            with open(test_file1, "w") as f:
                f.write("test")
            with open(test_file2, "w") as f:
                f.write("test")

            cleanup_output_folder(tmpdir)

            self.assertEqual(len(os.listdir(tmpdir)), 0)

    def test_cleanup_output_folder_nonexistent(self: "NestModuleTestCase") -> None:
        """Test cleanup_output_folder with nonexistent folder"""
        cleanup_output_folder("/nonexistent/folder/path")
        # Should not raise error

    def test_nest_function_basic(self: "NestModuleTestCase") -> None:
        """Test nest function with basic data"""
        files = {
            "rect1": {
                "type": "rectangle",
                "width": 100,
                "height": 50,
                "grooves": [],
                "minifix_holes": [],
            }
        }

        with tempfile.TemporaryDirectory() as tmpdir:
            output_file = os.path.join(tmpdir, "nesting.svg")
            result = nest(output_file, files, 500, 300)

            self.assertEqual(result.status_code, status.HTTP_200_OK)
            # Python imports
            import json

            result_data = json.loads(result.content)
            self.assertIn("output_file", result_data)
            self.assertIn("sheets", result_data)

    def test_nest_function_with_design_setting(self: "NestModuleTestCase") -> None:
        """Test nest function with design_setting"""
        files = {
            "rect1": {
                "type": "rectangle",
                "width": 100,
                "height": 50,
                "grooves": [],
                "minifix_holes": [],
            }
        }

        design_setting = DesignSetting.objects.create(
            design=self.design,
            organization=self.organization,
            unit="mm",
            sheet_width=500,
            sheet_height=300,
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            output_file = os.path.join(tmpdir, "nesting.svg")
            result = nest(output_file, files, 500, 300, design_setting=design_setting)

            self.assertEqual(result.status_code, status.HTTP_200_OK)

            # Check that sheets were created
            sheets = NestingSheet.objects.filter(design=self.design)
            self.assertGreater(sheets.count(), 0)

            # Check that files were created
            files_count = NestingFile.objects.filter(design=self.design).count()
            self.assertGreater(files_count, 0)

    def test_nest_function_multiple_sheets(self: "NestModuleTestCase") -> None:
        """Test nest function that requires multiple sheets"""
        files = {
            f"rect{i}": {
                "type": "rectangle",
                "width": 200,
                "height": 150,
                "grooves": [],
                "minifix_holes": [],
            }
            for i in range(5)
        }

        with tempfile.TemporaryDirectory() as tmpdir:
            output_file = os.path.join(tmpdir, "nesting.svg")
            result = nest(output_file, files, 500, 300)

            self.assertEqual(result.status_code, status.HTTP_200_OK)
            # Python imports
            import json

            result_data = json.loads(result.content)
            self.assertGreaterEqual(result_data["sheets"], 1)

    def test_nest_function_with_grooves_and_holes(self: "NestModuleTestCase") -> None:
        """Test nest function with grooves and minifix holes"""
        files = {
            "rect1": {
                "type": "rectangle",
                "width": 100,
                "height": 50,
                "depth": 18.0,
                "grooves": [
                    {
                        "type": "groove",
                        "orientation": "horizontal",
                        "groove_gap": 2.0,
                        "groove_dig": 1.0,
                        "x": 0,
                        "y": 0,
                    }
                ],
                "minifix_holes": [
                    {
                        "type": "DOWEL",
                        "diameter": 8.0,
                        "length": 24.0,
                        "localPosition2D": {"x": 0, "y": 0},
                        "direction": {"x": -1, "y": 0, "z": 0},
                    }
                ],
            }
        }

        with tempfile.TemporaryDirectory() as tmpdir:
            output_file = os.path.join(tmpdir, "nesting.svg")
            result = nest(output_file, files, 500, 300)

            self.assertEqual(result.status_code, status.HTTP_200_OK)

    def test_nest_function_enclosing_rectangle(self: "NestModuleTestCase") -> None:
        """Test nest function with enclosing_rectangle=True"""
        files = {
            "rect1": {
                "type": "rectangle",
                "width": 100,
                "height": 50,
                "grooves": [],
                "minifix_holes": [],
            }
        }

        with tempfile.TemporaryDirectory() as tmpdir:
            output_file = os.path.join(tmpdir, "nesting.svg")
            result = nest(output_file, files, 500, 300, enclosing_rectangle=True)

            self.assertEqual(result.status_code, status.HTTP_200_OK)

    def test_nest_function_target_efficiency(self: "NestModuleTestCase") -> None:
        """Test nest function with target_efficiency"""
        files = {
            "rect1": {
                "type": "rectangle",
                "width": 100,
                "height": 50,
                "grooves": [],
                "minifix_holes": [],
            }
        }

        with tempfile.TemporaryDirectory() as tmpdir:
            output_file = os.path.join(tmpdir, "nesting.svg")
            result = nest(output_file, files, 500, 300, target_efficiency=80.0)

            self.assertEqual(result.status_code, status.HTTP_200_OK)

    def test_nest_function_no_rotation(self: "NestModuleTestCase") -> None:
        """Test nest function with allow_rotation=False"""
        files = {
            "rect1": {
                "type": "rectangle",
                "width": 100,
                "height": 50,
                "grooves": [],
                "minifix_holes": [],
            }
        }

        with tempfile.TemporaryDirectory() as tmpdir:
            output_file = os.path.join(tmpdir, "nesting.svg")
            result = nest(output_file, files, 500, 300, allow_rotation=False)

            self.assertEqual(result.status_code, status.HTTP_200_OK)

    def test_draw_sheet_to_svg_basic(self: "NestModuleTestCase") -> None:
        """Test draw_sheet_to_svg function"""
        rectangles = [(0, 10, 20, 100, 50, "rect1")]

        files = {
            "rect1": {
                "type": "rectangle",
                "name": "Test Rectangle",
            }
        }

        with tempfile.NamedTemporaryFile(suffix=".svg", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            draw_sheet_to_svg(
                tmp_path,
                rectangles,
                files,
                (500, 300),
                (500, 300),
                best_efficiency=85.5,
            )

            self.assertTrue(os.path.exists(tmp_path))
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    def test_draw_sheet_to_svg_with_grooves(self: "NestModuleTestCase") -> None:
        """Test draw_sheet_to_svg with grooves"""
        rectangles = [(0, 10, 20, 100, 50, "rect1")]

        files = {
            "rect1": {
                "type": "rectangle",
                "grooves": [
                    {
                        "type": "groove",
                        "orientation": "horizontal",
                        "groove_gap": 2.0,
                        "groove_dig": 1.0,
                        "x": 0,
                        "y": 0,
                    }
                ],
            }
        }

        with tempfile.NamedTemporaryFile(suffix=".svg", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            draw_sheet_to_svg(
                tmp_path,
                rectangles,
                files,
                (500, 300),
                (500, 300),
            )

            self.assertTrue(os.path.exists(tmp_path))
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    def test_draw_sheet_to_svg_with_holes(self: "NestModuleTestCase") -> None:
        """Test draw_sheet_to_svg with minifix holes"""
        rectangles = [(0, 10, 20, 100, 50, "rect1")]

        files = {
            "rect1": {
                "type": "rectangle",
                "minifix_holes": [
                    {
                        "type": "DOWEL",
                        "diameter": 8.0,
                        "localPosition2D": {"x": 0, "y": 0},
                        "direction": {"x": -1, "y": 0, "z": 0},
                    }
                ],
            }
        }

        with tempfile.NamedTemporaryFile(suffix=".svg", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            draw_sheet_to_svg(
                tmp_path,
                rectangles,
                files,
                (500, 300),
                (500, 300),
            )

            self.assertTrue(os.path.exists(tmp_path))
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    def test_draw_sheet_to_svg_with_rotation(self: "NestModuleTestCase") -> None:
        """Test draw_sheet_to_svg with rotated rectangle"""
        rectangles = [(0, 10, 20, 100, 50, "rect1", True)]

        files = {
            "rect1": {
                "type": "rectangle",
                "minifix_holes": [
                    {
                        "type": "SCREW",
                        "diameter": 5.0,
                        "localPosition2D": {"x": 10, "y": 5},
                        "direction": {"x": 0, "y": -1, "z": 0},
                    }
                ],
            }
        }

        with tempfile.NamedTemporaryFile(suffix=".svg", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            draw_sheet_to_svg(
                tmp_path,
                rectangles,
                files,
                (500, 300),
                (500, 300),
            )

            self.assertTrue(os.path.exists(tmp_path))
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    def test_draw_sheet_to_svg_circle(self: "NestModuleTestCase") -> None:
        """Test draw_sheet_to_svg with circle"""
        rectangles = [(0, 10, 20, 80, 80, "circle1")]

        files = {
            "circle1": {
                "type": "circle",
                "radius": 40,
            }
        }

        with tempfile.NamedTemporaryFile(suffix=".svg", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            draw_sheet_to_svg(
                tmp_path,
                rectangles,
                files,
                (500, 300),
                (500, 300),
            )

            self.assertTrue(os.path.exists(tmp_path))
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    def test_draw_sheet_to_svg_fitment_groove(self: "NestModuleTestCase") -> None:
        """Test draw_sheet_to_svg with fitment type groove"""
        rectangles = [(0, 10, 20, 100, 50, "rect1")]

        files = {
            "rect1": {
                "type": "rectangle",
                "grooves": [
                    {
                        "type": "fitment",
                        "orientation": "vertical",
                        "groove_gap": 2.0,
                        "groove_dig": 1.0,
                        "x": 0,
                        "y": 0,
                    }
                ],
            }
        }

        with tempfile.NamedTemporaryFile(suffix=".svg", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            draw_sheet_to_svg(
                tmp_path,
                rectangles,
                files,
                (500, 300),
                (500, 300),
            )

            self.assertTrue(os.path.exists(tmp_path))
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
