# Python imports
import json
import os
from unittest.mock import MagicMock, patch

# External imports
import pytest

# App imports
from design import test_nesting as tn
from design.constant import KEY_UNIQUE_ID, KEY_WIDTH
from design.nest import NestingService
from tests.testing import DEFAULT_DATABASE, APIBaseTestCase
from design.nest import nest

@pytest.mark.django_db
class NestUtilsTestCase(APIBaseTestCase):
    databases = {DEFAULT_DATABASE}

    def test_test_nesting_load_data(self: "NestUtilsTestCase") -> None:
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

    def test_safe_float_and_banding_helpers(self: "NestUtilsTestCase") -> None:
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

    def test_parse_mm_thickness_variants(self: "NestUtilsTestCase") -> None:
        service = NestingService(width=100, height=100)
        self.assertEqual(service.parse_mm_thickness("2 mm"), 2.0)
        self.assertEqual(service.parse_mm_thickness("2.75mm"), 2.75)
        self.assertIsNone(service.parse_mm_thickness("mm only"))
        self.assertIsNone(service.parse_mm_thickness("123"))

    def test_extract_plausible_thickness_variants(self: "NestUtilsTestCase") -> None:
        service = NestingService(width=100, height=100)
        self.assertEqual(service.extract_plausible_thickness("Edge-1.2-matte"), 1.2)
        self.assertIsNone(service.extract_plausible_thickness("Edge-0.1"))
        self.assertIsNone(service.extract_plausible_thickness("No numbers here"))

    def test_resolve_edge_thickness_cache_miss_then_hit(
        self: "NestUtilsTestCase",
    ) -> None:
        service = NestingService(width=100, height=100)
        cache: dict[str, float] = {}
        self.assertIsNone(service.resolve_edge_thickness({}, cache))
        cache["band a"] = 1.8
        self.assertEqual(service.resolve_edge_thickness("Band A", cache), 1.8)

    def test_safe_float_locale_and_invalid(self: "NestUtilsTestCase") -> None:
        service = NestingService(width=100, height=100)
        self.assertEqual(service._safe_float("12,5", default=0.0), 0.0)
        self.assertEqual(service._safe_float(object(), default=7.0), 7.0)

    @patch("json.dump", side_effect=Exception("io error"))
    @patch("builtins.open")
    def test_generate_json_raises_on_write_error(
        self: "NestUtilsTestCase", mock_open: MagicMock, _mock_dump: MagicMock
    ) -> None:
        service = NestingService(width=100, height=100)
        with self.assertRaises(Exception):
            service.generate_json([{"a": 1}], "out/any.json")

    def test_get_banding_display_name_order(self: "NestUtilsTestCase") -> None:
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
        self: "NestUtilsTestCase",
    ) -> None:
        service = NestingService(width=100, height=100)
        self.assertIsNone(service.resolve_edge_thickness("", {}))
        self.assertIsNone(service.resolve_edge_thickness({"unknown": "x"}, {}))

    def test_to_str_or_empty_and_banding_display(self: "NestUtilsTestCase") -> None:
        service = NestingService(width=500, height=300)
        self.assertEqual(service.to_str_or_empty(None), "")
        self.assertEqual(service.to_str_or_empty(123), "123")
        self.assertEqual(service.get_banding_display_name({"label": "LBL"}), "LBL")
        self.assertEqual(service.get_banding_display_name({"value": "VAL"}), "VAL")
        self.assertEqual(
            service.get_banding_display_name({"unknown": "X"}), "{'unknown': 'X'}"
        )

    @patch("builtins.open")
    @patch("json.dump")
    def test_generate_json(
        self: "NestUtilsTestCase", mock_dump: MagicMock, mock_open: MagicMock
    ) -> None:
        service = NestingService(width=1000, height=1000)
        out = service.generate_json([{"a": 1}], "folder/out.any")
        self.assertTrue(out.endswith("nesting_data.json"))
        self.assertTrue(mock_dump.called)
        self.assertTrue(mock_open.called)

    def test_map_texture_grain(self: "NestUtilsTestCase") -> None:
        service = NestingService(width=1000, height=1000)
        self.assertEqual(service.map_texture_grain(1), 1)
        self.assertEqual(service.map_texture_grain("Vertical"), 1)
        self.assertEqual(service.map_texture_grain("horizontal"), 2)
        self.assertEqual(service.map_texture_grain("None"), 0)
        self.assertEqual(service.map_texture_grain(5), 0)
        self.assertEqual(service.map_texture_grain(None), 0)
        self.assertEqual(service.map_texture_grain("invalid"), 0)

    def test_extract_texture_value(self: "NestUtilsTestCase") -> None:
        service = NestingService(width=1000, height=1000)
        self.assertEqual(service._extract_texture_value({"textureGrain": 1}), 1)
        self.assertEqual(
            service._extract_texture_value({"attributes": {"texture_grain": 2}}), 2
        )
        self.assertEqual(
            service._extract_texture_value({"options": {"texture": "Wood"}}), "Wood"
        )
        self.assertEqual(service._extract_texture_value({}), "")

    def test_lookup_banding_thickness_fuzzy(self: "NestUtilsTestCase") -> None:
        service = NestingService(width=100, height=100)
        cache = {"thicker": 2.0}
        self.assertEqual(
            service.lookup_banding_thickness_by_name("thicker edge", cache), 2.0
        )
        self.assertEqual(service.lookup_banding_thickness_by_name("thick", cache), 2.0)

    def test_nest_wrapper_exception(self: "NestUtilsTestCase") -> None:
        with patch(
            "design.nest.NestingService.optimize", side_effect=Exception("Nest error")
        ):
            response = nest("out", {}, 1000, 1000)
            self.assertEqual(response.status_code, 500)
            data = json.loads(response.content)
            self.assertEqual(data["error"], "Nest error")

    def test_generate_svg_coordinate_and_visual_logic(
        self: "NestUtilsTestCase",
    ) -> None:
        """Cover coordinate logic and visual mapping in generate_svg (lines 1127-1128, 1162-1165, 1171-1181)."""
        service = NestingService(width=1000, height=1000)
        items = [
            {
                KEY_UNIQUE_ID: "P1",
                KEY_WIDTH: 100,
                "height": 200,
                "depth": 18,
                "x": 0,
                "y": 0,
                "sheet_num": "S1",
                "is_rotated": False,
                "minifix_holes": [
                    {
                        "type": "CAM",
                        "face": "5",
                        "local_position2_d": {"x": 10, "y": 20},
                        "drill_type": "1",
                    },
                    {
                        "type": "DOWEL",
                        "face": "5",
                        "local_position2_d": {"x": 10, "y": 20},
                        "drill_type": "1",
                    },
                    {
                        "type": "DOWEL",
                        "face": "3",
                        "local_position2_d": {"x": 10, "y": 20},
                        "drill_type": "1",
                    },
                    {
                        "type": "DOWEL",
                        "face": "4",
                        "local_position2_d": {"x": 10, "y": 20},
                        "drill_type": "1",
                    },
                    {
                        "type": "DOWEL",
                        "face": "2",
                        "local_position2_d": {"x": 10, "y": 20},
                        "drill_type": "1",
                    },
                ],
                "grooves": [],
            }
        ]
        with patch("svgwrite.Drawing.save"):
            service.generate_svg(items, "out.py")
