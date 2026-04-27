from unittest.mock import patch

import pytest

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


def test_generate_excel_handles_empty_input():
    service = NestingService(width=1000, height=1000)
    out = service.generate_excel([], "out.json")
    assert out.endswith(".xlsx")


def test_generate_excel_raises_when_dataframe_write_fails():
    service = NestingService(width=1000, height=1000)
    with patch("pandas.DataFrame.to_excel", side_effect=OSError("write failed")):
        with pytest.raises(OSError):
            service.generate_excel(
                [
                    {
                        KEY_NAME: "A",
                        KEY_ID: "1",
                        KEY_UNIQUE_ID: "SHEET0101",
                        KEY_DIMENSIONS: "100 x 50",
                    }
                ],
                "out.json",
            )


def test_generate_json_raises_when_open_fails():
    service = NestingService(width=1000, height=1000)
    with patch("builtins.open", side_effect=OSError("no write")):
        with pytest.raises(OSError):
            service.generate_json([], "out.json")


def test_helper_branches_for_edge_lookup_and_resolution():
    service = NestingService(width=1000, height=1000)

    assert service.to_str_or_empty(None) == ""
    assert NestingService.parse_mm_thickness("edge 2.0 mm") == 2.0
    assert NestingService.parse_mm_thickness("edge + mm") is None
    assert NestingService.map_texture_grain("Horizontal") == 2
    assert NestingService.lookup_banding_thickness_by_name("Edge ABS", {"abs": 1.0}) == 1.0
    assert NestingService.lookup_banding_thickness_by_name("A", {"abc": 2.0}) == 2.0
    assert (
        service.get_banding_display_name({"label": "Edge Label", "thickness": 1.2})
        == "Edge Label"
    )
    assert service.resolve_edge_thickness({"thickness": "1.8"}, {}) == 1.8


def test_generate_svg_hits_left_top_bottom_paths():
    service = NestingService(width=500, height=500)
    packed_items = [
        {
            KEY_UNIQUE_ID: "SHEET0101",
            KEY_WIDTH: 100,
            KEY_HEIGHT: 60,
            "x": 10,
            "y": 10,
            "sheet_num": "SHEET01",
            KEY_NAME: "panel-a",
            "is_rotated": False,
            "minifix_holes": [
                {
                    "type": "SCREW",
                    "face": "5",
                    "drill_type": "1",
                    "diameter": 8,
                    "length": 10,
                    "local_position2_d": {"x": 2, "y": 3},
                },
                {
                    "type": "SCREW",
                    "face": "1",
                    "drill_type": "1",
                    "diameter": 8,
                    "length": 10,
                    "local_position2_d": {"x": 6, "y": 7},
                },
                {
                    "type": "SCREW",
                    "face": "6",
                    "drill_type": "1",
                    "diameter": 8,
                    "length": 10,
                    "local_position2_d": {"x": 9, "y": 4},
                },
                {
                    "type": "CAM",
                    "face": "2",
                    "drill_type": "2",
                    "diameter": 10,
                    "local_position2_d": {"x": 20, "y": 8},
                },
            ],
        }
    ]
    outputs = service.generate_svg(packed_items, "out.json")
    assert len(outputs) == 1


def test_nest_wrapper_error_response():
    with patch("design.nest.NestingService.optimize", side_effect=RuntimeError("boom")):
        response = nest(
            "out.json",
            {"1": {"type": "rectangle", "width": 10, "height": 10, "depth": 2}},
            100,
            100,
        )
    assert response.status_code == 500
