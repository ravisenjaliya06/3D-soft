# Python imports
from collections import defaultdict
from typing import Dict, List

# External imports
from rest_framework.exceptions import ValidationError

# App imports
from design.constant import IS_MAIN
from design.models import CatalogTypeChoices, Design, DesignCatalog, DesignSetting
from umaboy.models import Organization


def create_design_settings(design: Design, organization: Organization) -> None:
    default_setting = DesignSetting.objects.filter(
        design=None, organization=organization
    ).first()

    if not default_setting:
        raise ValueError("Default design setting for organization not found.")

    setting_data = {
        field.name: getattr(default_setting, field.name)
        for field in DesignSetting._meta.fields
        if field.name not in ["id", "design", "created_at", "updated_at"]
    }
    setting_data["design"] = design

    DesignSetting.objects.create(**setting_data)


def parse_design_data(data: List[Dict]) -> Dict:
    """
    Convert design parts (PLANK, DOOR, DRAWER) into nesting-ready data.
    Skips main cabinet.
    Converts meters → millimeters.
    Fixes orientation based on object type.
    Extracts grooves and minifix holes.
    """

    result = {}

    for item in data:
        if item.get("isMain"):
            continue

        part_id = str(item["id"])
        name = item.get("name", "")
        raw_type = item.get("type", "").lower()

        dims = item.get("dimensions", {})
        width = float(dims.get("width", 0)) * 1000
        height = float(dims.get("height", 0)) * 1000
        depth = float(dims.get("depth", 0)) * 1000

        if "door" in name.lower():
            object_type = "DOOR"
        elif "drawer" in name.lower():
            object_type = "DRAWER"
        elif "plank" in name.lower():
            object_type = "PLANK"
        else:
            object_type = raw_type.upper() or "PART"

        plank_data = {
            "type": "rectangle",
            "object": object_type,
            "name": name,
            "unit": "mm",
            "width": width,
            "height": height,
            "depth": depth,
            "grooves": [],
            "minifix_holes": [],
        }

        if name in ["LEFT_PLANK", "RIGHT_PLANK", "VERTICAL_PLANK"]:
            plank_data.update({"width": depth, "height": height, "depth": width})

        elif name in ["TOP_PLANK", "BOTTOM_PLANK", "HORIZONTAL_PLANK"]:
            plank_data.update({"width": width, "height": depth, "depth": height})

        elif name == "BACK_PLANK":
            plank_data.update({"width": width - 250, "height": height, "depth": depth})

        elif object_type == "DOOR" or object_type == "DRAWER":
            plank_data.update({"width": width, "height": height, "depth": depth})

        # Extract grooves
        grooves = item.get("grooves", [])
        if grooves:
            plank_data["grooves"] = grooves

        # Extract minifix holes
        minifix_holes = item.get("minifixHoles", [])
        if minifix_holes:
            processed_holes = []
            for hole in minifix_holes:
                processed_hole = {
                    "type": hole.get("type", ""),
                    "diameter": float(hole.get("diameter", 0)),
                    "depth": float(hole.get("depth", 0)),
                    "length": float(hole.get("length", 0)),  # For dowels
                    "localPosition2D": hole.get("localPosition2D", {"x": 0, "y": 0}),
                    "direction": hole.get("direction", {"x": 0, "y": 0, "z": 0}),
                }
                processed_holes.append(processed_hole)
            plank_data["minifix_holes"] = processed_holes

        result[part_id] = plank_data

    return result


def parse_catalog_data(catalogs: List[DesignCatalog]) -> Dict:
    """
    Convert DesignCatalog objects (planks) into nesting-ready data.
    Extracts dimensions, grooves, and minifix holes from catalog data.
    """

    result = {}

    for catalog in catalogs:
        if catalog.type != CatalogTypeChoices.PLANK:
            continue

        catalog_id = str(catalog.id)
        catalog_data = catalog.data or {}
        name = catalog.name or catalog_data.get("name", "")

        dims = catalog_data.get("dimensions", {})
        width = float(dims.get("width", 0))
        height = float(dims.get("height", 0))
        depth = float(dims.get("depth", 0))

        plank_data = {
            "type": "rectangle",
            "object": "PLANK",
            "name": name,
            "unit": "mm",
            "width": width,
            "height": height,
            "depth": depth,
            "grooves": [],
            "minifix_holes": [],
            "catalog_id": catalog_id,
        }

        # Handle orientation based on plank name
        if name in ["LEFT_PLANK", "RIGHT_PLANK", "VERTICAL_PLANK"]:
            plank_data.update({"width": depth, "height": height, "depth": width})
        elif name in ["TOP_PLANK", "BOTTOM_PLANK", "HORIZONTAL_PLANK"]:
            plank_data.update({"width": width, "height": depth, "depth": height})
        elif name == "BACK_PLANK":
            plank_data.update({"width": width, "height": height, "depth": depth})

        # Extract grooves
        grooves = catalog_data.get("grooves", [])
        if grooves:
            processed_grooves = []
            for groove in grooves:
                processed_groove = {
                    "type": groove.get("type", "groove"),
                    "orientation": groove.get("orientation", "horizontal"),
                    "groove_gap": float(groove.get("groove_gap", 2)),
                    "groove_dig": float(groove.get("groove_dig", 1)),
                    "x": float(groove.get("x", 0)),
                    "y": float(groove.get("y", 0)),
                }
                processed_grooves.append(processed_groove)
            plank_data["grooves"] = processed_grooves

        # Extract minifix holes
        minifix_holes = catalog_data.get("minifixHoles", [])
        if minifix_holes:
            processed_holes = []
            for hole in minifix_holes:
                processed_hole = {
                    "type": hole.get("type", ""),
                    "diameter": float(hole.get("diameter", 0)),
                    "depth": float(hole.get("depth", 0)),
                    "length": float(hole.get("length", 0)),  # For dowels
                    "localPosition2D": hole.get("localPosition2D", {"x": 0, "y": 0}),
                    "direction": hole.get("direction", {"x": 0, "y": 0, "z": 0}),
                }
                processed_holes.append(processed_hole)
            plank_data["minifix_holes"] = processed_holes

        result[catalog_id] = plank_data

    return result


def split_parents_and_children(items: List[Dict]) -> tuple:
    """
    Splits flat scene items into parents and children.

    Returns:
        parents: dict[str, dict]
            frontend_id -> parent item

        children_map: dict[str, list[dict]]
            parent_frontend_id -> list of child items
    """
    parents = {}
    children_map = defaultdict(list)

    for item in items:
        if item.get(IS_MAIN):
            parents[item.get("id")] = item

    if not parents:
        raise ValidationError("At least one item with isMain=true is required")

    for item in items:
        if item.get(IS_MAIN):
            continue

        parent_id = item.get("parent")
        if not parent_id:
            raise ValidationError(f"Child item {item.get('id')} missing parent")

        if parent_id not in parents:
            raise ValidationError(
                f"Parent '{parent_id}' not found for child '{item.get('id')}'"
            )

        children_map[parent_id].append(item)

    return parents, children_map


def group_catalogs_as_lists(items: list[dict]) -> list[list[dict]]:
    by_id = {item["id"]: item for item in items}
    groups = {}
    roots = []

    for item in items:
        if not item.get("parent"):
            roots.append(item)
            groups[item["id"]] = [item]

    for item in items:
        parent_id = item.get("parent")
        if not parent_id:
            continue

        current = item
        while current.get("parent") and current["parent"] in by_id:
            current = by_id[current["parent"]]

        root_id = current["id"]
        groups.setdefault(root_id, []).append(item)

    return list(groups.values())
