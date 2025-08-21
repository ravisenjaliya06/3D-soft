# Python imports
import json
from unittest.mock import MagicMock, mock_open, patch

# Django imports
from django.http import HttpResponse

# External imports
import pytest
from rest_framework import status

# App imports
from design.nest import calculate_efficiency, generate_gcode, nest
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

    @patch("builtins.open", new_callable=mock_open)
    def test_generate_gcode(self: "NestModuleTestCase", mock_file: MagicMock) -> None:
        """Test the generate_gcode function for proper G-code generation"""
        rectangles = [(0, 10, 20, 100, 50, "rect1"), (0, 150, 30, 80, 60, "circle1")]

        files = {
            "rect1": {"type": "rectangle"},
            "circle1": {"type": "circle", "radius": 40},
        }
        generate_gcode(rectangles, "test_output.gcode", files)
        mock_file.assert_called_once_with("test_output.gcode", "w")
        written_gcode = mock_file().write.call_args[0][0]
        self.assertIn("G21", written_gcode)
        self.assertIn("G90", written_gcode)
        self.assertIn("G28", written_gcode)
        self.assertIn("G0 X10 Y20", written_gcode)

    def test_nest_function_minimal(self: "NestModuleTestCase") -> None:
        """Minimal test for nest function that only checks it runs without errors"""

        files = {"rect1": {"type": "rectangle", "width": 100, "height": 50, "grooves": [], "minifix_holes": []}}

        result = nest("output.svg", files, 500, 300)
        self.assertTrue(True)
        self.assertEqual(result.status_code, status.HTTP_200_OK)
