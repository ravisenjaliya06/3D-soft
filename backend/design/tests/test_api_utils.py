# External imports
import pytest

# App imports
from design.models import CatalogTypeChoices, DesignCatalog
from design.utils import (
    group_catalogs_as_lists,
    parse_catalog_data,
    parse_design_data,
    split_parents_and_children,
)
from tests.testing import DEFAULT_DATABASE, APIBaseTestCase


@pytest.mark.django_db
class DesignUtilsAPITestCase(APIBaseTestCase):
    databases = {DEFAULT_DATABASE}

    def test_parse_design_data_orientation_and_bands(
        self: "DesignUtilsAPITestCase",
    ) -> None:
        items = [
            {
                "id": "1",
                "name": "LEFT_PLANK",
                "type": "plank",
                "dimensions": {"width": 1, "height": 2, "depth": 3},
                "edgeband": {"left": True, "top": True, "bottom": False, "front": True},
            },
            {
                "id": "2",
                "name": "TOP_PLANK",
                "type": "plank",
                "dimensions": {"width": 1, "height": 2, "depth": 3},
                "parent": "1",
            },
        ]
        out = parse_design_data(items)
        self.assertIn("1", out)
        self.assertEqual(out["1"]["width"], 3000.0)
        self.assertEqual(out["2"]["parent_name"], "LEFT_PLANK")

    def test_parse_catalog_data_position_rotation_passthrough(
        self: "DesignUtilsAPITestCase",
    ) -> None:
        cat = DesignCatalog.objects.create(
            organization=self.organization,
            type=CatalogTypeChoices.PLANK,
            name="P",
            data={
                "dimensions": {"width": 10, "height": 20, "depth": 5},
                "position": {"x": 1, "y": 2, "z": 3},
                "rotation": {"x": 0, "y": 90, "z": 0},
            },
        )
        out = parse_catalog_data([cat])
        row = out[str(cat.id)]
        self.assertEqual(row["position"], {"x": 1, "y": 2, "z": 3})

    def test_parse_design_data_and_group_helpers(
        self: "DesignUtilsAPITestCase",
    ) -> None:
        items = [
            {"id": "root1", "name": "Main Cabinet", "type": "Cabinet", "isMain": True},
            {
                "id": "p1",
                "name": "LEFT_PLANK",
                "type": "plank",
                "parent": "root1",
                "dimensions": {"width": 0.6, "height": 2.0, "depth": 0.018},
                "grooves": [{"x": 1, "y": 2, "end_x": 10, "end_y": 2, "width": 3}],
                "edgeband": {"left": True, "top": True},
            },
        ]
        out = parse_design_data(items)
        self.assertIn("p1", out)
        self.assertEqual(out["p1"]["parent_name"], "Main Cabinet")
        parents, children = split_parents_and_children(items)
        self.assertIn("root1", parents)
        grouped = group_catalogs_as_lists(items)
        self.assertTrue(any(len(group) >= 2 for group in grouped))

    def test_split_parents_and_children_error_paths(
        self: "DesignUtilsAPITestCase",
    ) -> None:
        with pytest.raises(Exception):
            split_parents_and_children([{"id": "c1", "parent": "x"}])
        with pytest.raises(Exception):
            split_parents_and_children([{"id": "p", "isMain": True}, {"id": "c1"}])
        with pytest.raises(Exception):
            split_parents_and_children(
                [{"id": "p", "isMain": True}, {"id": "c1", "parent": "zzz"}]
            )
