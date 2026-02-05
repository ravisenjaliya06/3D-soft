# Python imports
import json
import os
import tempfile
from unittest.mock import MagicMock, patch

# Django imports
from django.http import HttpResponse

# External imports
import pandas as pd
import pytest
from rest_framework import status

# App imports
from design.nest import (
    NestingService,
    nest,
    KEY_NAME,
    KEY_ID,
    KEY_DIMENSIONS
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

    def setUp(self):
        super().setUp()
        self.files_basic = {
            "1": {"type": "rectangle", "width": 100, "height": 50, "name": "Part 1"},
            "2": {"type": "rectangle", "width": 80, "height": 60, "name": "Part 2"},
        }

    def test_calculate_efficiency(self: "NestModuleTestCase") -> None:
        """Test the calculate_efficiency static method"""
        # rectangles: (bin_id, x, y, w, h, ...)
        # Using simplified tuple structure for test matching the logic: sum(w*h) / (W*H)
        # Note: logical tuple structure used in calculation is just needing index 3 and 4 for w and h
        rectangles = [
            (0, 0, 0, 100, 200, "rect1"), 
            (0, 0, 0, 300, 150, "rect2")
        ]
        width = 500
        height = 300
        used_area = 100 * 200 + 300 * 150
        total_area = width * height
        expected_efficiency = (used_area / total_area) * 100

        actual_efficiency = NestingService.calculate_efficiency(rectangles, width, height)

        self.assertEqual(actual_efficiency, expected_efficiency)

    def test_calculate_efficiency_empty(self: "NestModuleTestCase") -> None:
        """Test calculate_efficiency with empty rectangles"""
        rectangles = []
        width = 500
        height = 300
        expected_efficiency = 0.0

        actual_efficiency = NestingService.calculate_efficiency(rectangles, width, height)
        self.assertEqual(actual_efficiency, expected_efficiency)

    def test_nesting_service_optimize(self: "NestModuleTestCase") -> None:
        """Test NestingService optimization logic"""
        service = NestingService(width=1000, height=1000)
        packed_items = service.optimize(self.files_basic)
        
        self.assertEqual(len(packed_items), 2)
        
        # Verify keys in result
        first_item = packed_items[0]
        self.assertIn(KEY_NAME, first_item)
        self.assertIn(KEY_ID, first_item)
        self.assertIn(KEY_DIMENSIONS, first_item)

    @patch("pandas.DataFrame.to_excel")
    def test_nesting_service_generate_excel(self: "NestModuleTestCase", mock_to_excel: MagicMock) -> None:
        """Test Excel generation logic (mocking file write)"""
        output_file = "test_output.json"
        
        packed_items = [
            {KEY_NAME: "P1", KEY_ID: "1", KEY_DIMENSIONS: "10x10"},
            {KEY_NAME: "P2", KEY_ID: "2", KEY_DIMENSIONS: "20x20"}
        ]
        
        service = NestingService(width=1000, height=1000)
        excel_path = service.generate_excel(packed_items, output_file)
        
        self.assertTrue(excel_path.endswith(".xlsx"))
        
        # Verify to_excel was called
        mock_to_excel.assert_called_once()
        args, kwargs = mock_to_excel.call_args
        self.assertTrue(args[0].endswith(".xlsx"))
        self.assertEqual(kwargs['index'], False)

    @patch("pandas.DataFrame.to_excel")
    def test_nest_wrapper_function(self: "NestModuleTestCase", mock_to_excel: MagicMock) -> None:
        """Test the module level nest() wrapper function"""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_file = os.path.join(tmpdir, "output.json")
            
            # Call nest function
            response = nest(output_file, self.files_basic, 1000, 1000)
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            
            response_data = json.loads(response.content)
            self.assertIn("output_file", response_data)
            self.assertIn("message", response_data)
            self.assertIn("total_parts", response_data)
            self.assertEqual(response_data["total_parts"], 2)
            
            # Check file path in response logic (not actual existence since we mocked write)
            excel_path = response_data["output_file"]
            self.assertTrue(excel_path.endswith(".xlsx"))
            mock_to_excel.assert_called()

    def test_nest_with_circles(self: "NestModuleTestCase") -> None:
        """Test nesting with circle types"""
        files = {
            "c1": {"type": "circle", "radius": 50, "name": "Circle 1"}
        }
        
        service = NestingService(width=1000, height=1000)
        packed = service.optimize(files)
        
        self.assertEqual(len(packed), 1)
        self.assertEqual(packed[0][KEY_NAME], "Circle 1")

    def test_nest_fail_gracefully(self: "NestModuleTestCase") -> None:
        """Test that nest() handles exceptions (e.g. invalid file path)"""
        # Passing an invalid path that might cause file write error is tricky with tempfile
        # Instead we can patch NestingService.optimize to raise an exception
        
        with patch.object(NestingService, 'optimize', side_effect=Exception("Optimization error")):
            response = nest("dummy.json", self.files_basic, 100, 100)
            
            self.assertEqual(response.status_code, 500)
            data = json.loads(response.content)
            self.assertIn("error", data)
            self.assertEqual(data["error"], "Optimization error")
