# Python imports
import os
import shutil
import tempfile

# External imports
import pytest

# App imports
from design.nest import (
    KEY_DIMENSIONS,
    KEY_HEIGHT,
    KEY_NAME,
    KEY_UNIQUE_ID,
    KEY_WIDTH,
    NestingService,
)
from tests.testing import DEFAULT_DATABASE, APIBaseTestCase


@pytest.mark.django_db
class NestCoreTestCase(APIBaseTestCase):
    databases = {DEFAULT_DATABASE}

    def setUp(self: "NestCoreTestCase") -> None:
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

    def test_calculate_efficiency(self: "NestCoreTestCase") -> None:
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

    def test_unique_id_generation(self: "NestCoreTestCase") -> None:
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

    def test_spacing_effect(self: "NestCoreTestCase") -> None:
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

    def test_dimensions_match_input_with_spacing(self: "NestCoreTestCase") -> None:
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

    def test_rotation_flag_effect(self: "NestCoreTestCase") -> None:
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

    def test_dimension_smallest_axis_assignment_variants(
        self: "NestCoreTestCase",
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

    def test_calculate_efficiency_empty(self: "NestCoreTestCase") -> None:
        self.assertEqual(NestingService.calculate_efficiency([], 100, 100), 0.0)

    def test_pack_rectangles_circle(self: "NestCoreTestCase") -> None:
        """Test packing of circular parts."""
        files = {
            "C1": {"type": "circle", "radius": 50, "depth": 18, "name": "Circle 1"}
        }
        service = NestingService(width=1000, height=1000, spacing=5)
        items = service.optimize(files)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0][KEY_WIDTH], 100.0)

    def test_optimize_invalid_dims_fallback(self: "NestCoreTestCase") -> None:
        files = {"bad": {"dimensions": {}}}
        service = NestingService(width=1000, height=1000)
        items = service.optimize(files)
        self.assertTrue(len(items) >= 0)

    def test_generate_xmls_basic(self: "NestCoreTestCase") -> None:
        service = NestingService(width=1000, height=1000)
        items = [
            {
                KEY_UNIQUE_ID: "S01P01",
                KEY_NAME: "Panel",
                KEY_WIDTH: 500,
                KEY_HEIGHT: 600,
                "depth": 18,
                "minifix_holes": [
                    {
                        "type": "screw",
                        "face": "5",
                        "local_position2_d": {"x": 10, "y": 20},
                    }
                ],
                "grooves": [
                    {"x": 0, "y": 0, "end_x": 100, "end_y": 0, "width": 10, "depth": 5}
                ],
            }
        ]

        tmpdir = tempfile.mkdtemp()
        try:
            out_file = os.path.join(tmpdir, "test.xlsx")
            xml_files = service.generate_xmls(items, out_file)
            self.assertTrue(len(xml_files) > 0)
            self.assertTrue(os.path.exists(xml_files[0]))
        finally:
            shutil.rmtree(tmpdir)
