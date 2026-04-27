import os
import tempfile
import xml.etree.ElementTree as ET
from unittest.mock import patch

from design.nest import KEY_HEIGHT, KEY_UNIQUE_ID, KEY_WIDTH, NestingService


class _DummyBandingQuerySet(list):
    def prefetch_related(self, *_args, **_kwargs):
        return self

    def filter(self, *_args, **_kwargs):
        return self


def _empty_banding_queryset(*_args, **_kwargs):
    return _DummyBandingQuerySet()


def test_generate_xmls_covers_panel_design_corner_and_hole_paths():
    service = NestingService(width=2400, height=1200)
    item = {
        KEY_UNIQUE_ID: "SHEET0101",
        KEY_WIDTH: 800.0,
        KEY_HEIGHT: 500.0,
        "depth": 18.0,
        "panel_design": {
            "outline": [
                {"x": -400.0, "y": -250.0},
                {"x": 400.0, "y": -250.0},
                {"x": 400.0, "y": 250.0},
                {"x": -400.0, "y": 250.0},
            ],
            "corner_types": ["round", "chamfer", "round", ""],
            "corner_radius": [30.0, 20.0, 15.0, 0.0],
            "holes": [
                {
                    "type": "square",
                    "points": [
                        {"x": -150.0, "y": -100.0},
                        {"x": -100.0, "y": -100.0},
                        {"x": -100.0, "y": -50.0},
                        {"x": -150.0, "y": -50.0},
                    ],
                    "corner_types": ["round", "chamfer", "", ""],
                    "corner_radius": [5.0, 5.0, 0.0, 0.0],
                },
                {
                    "type": "slotting",
                    "depth": 7.5,
                    "width": 60.0,
                    "height": 20.0,
                    "x_top_right": 600.0,
                    "y_top_right": 200.0,
                    "points": [],
                },
                {
                    "type": "circle",
                    "radius": 12.0,
                    "x_top_right": 500.0,
                    "y_top_right": 100.0,
                },
                {
                    "type": "circle",
                    "radius": 20.0,
                    "x": 10_000.0,
                    "y": 10_000.0,
                },
                {
                    "type": "polygon",
                    "points": [
                        {"x": 40.0, "y": 40.0},
                        {"x": 80.0, "y": 40.0},
                        {"x": 90.0, "y": 70.0},
                        {"x": 45.0, "y": 90.0},
                    ],
                },
                None,
            ],
        },
        "minifix_holes": [
            {
                "type": "DOWEL",
                "face": "5",
                "drill_type": "1",
                "diameter": 8.0,
                "depth": 10.0,
                "x": 35.0,
                "y": 45.0,
            }
        ],
        "grooves": [],
        "edge_banding": {"left": "Band L", "top": "Band T"},
    }

    with tempfile.TemporaryDirectory() as temp_dir, patch(
        "design.nest.Material.objects.filter", side_effect=_empty_banding_queryset
    ):
        output_path = os.path.join(temp_dir, "nesting.out")
        xml_paths = service.generate_xmls([item], output_path, design_name="panel")
        assert len(xml_paths) == 1
        assert os.path.exists(xml_paths[0])

        tree = ET.parse(xml_paths[0])
        root = tree.getroot()
        machining_nodes = root.findall(".//Machining")
        assert machining_nodes

        profile_nodes = [n for n in machining_nodes if n.attrib.get("Type") == "3"]
        assert profile_nodes

        line_nodes = root.findall(".//Line")
        assert len(line_nodes) > 8


def test_generate_xmls_handles_non_list_corner_metadata():
    service = NestingService(width=2000, height=1000)
    item = {
        KEY_UNIQUE_ID: "SHEET0201",
        KEY_WIDTH: 500.0,
        KEY_HEIGHT: 300.0,
        "depth": 18.0,
        "panel_design": {
            "corner_types": "round",
            "corner_radius": {"r": 10},
            "holes": "invalid",
        },
    }

    with tempfile.TemporaryDirectory() as temp_dir, patch(
        "design.nest.Material.objects.filter", side_effect=_empty_banding_queryset
    ):
        output_path = os.path.join(temp_dir, "nesting.out")
        xml_paths = service.generate_xmls([item], output_path, design_name="panel")
        assert len(xml_paths) == 1
