# Python imports
import json
import os
from unittest.mock import MagicMock, patch

# External imports
import pytest

# App imports
from design import test_nesting as tn
from design.nest import NestingService
from tests.testing import DEFAULT_DATABASE, APIBaseTestCase


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
