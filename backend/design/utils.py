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

    # Build a lookup of id → name so we can resolve parent cabinet names
    id_to_name: Dict[str, str] = {}
    for item in data:
        item_id = str(item.get("id", ""))
        item_name = item.get("name", "") or item.get("type", "") or item_id
        id_to_name[item_id] = item_name

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
                    "local_position2_d": hole.get("localPosition2D", {"x": 0, "y": 0}),
                    "position": hole.get("position", {"x": 0, "y": 0, "z": 0}),
                    "direction": hole.get("direction", {"x": 0, "y": 0, "z": 0}),
                    "drill_type": hole.get("drillType", "1"),
                    "face": hole.get("face", "1"),
                }
                processed_holes.append(processed_hole)
            plank_data["minifix_holes"] = processed_holes

        # Extract edgeband data
        edgebands_raw = item.get("edgeband", [])
        # Handle both object format {left: true, top: false, ...} and array format ["LEFT", ...]
        if isinstance(edgebands_raw, dict):
            edge_key_map = {
                "left": "LEFT",
                "right": "RIGHT",
                "top": "TOP",
                "bottom": "BOTTOM",
                "front": "LEFT",
                "back": "RIGHT",  # front/back are alternative names for left/right
            }
            edgebands = [v for k, v in edge_key_map.items() if edgebands_raw.get(k)]
            edgebands = list(set(edgebands))  # deduplicate
        else:
            edgebands = edgebands_raw
        if edgebands:
            plank_data["edgebands"] = edgebands

        # Store parent cabinet name for BOM Cabinet/Assembly column
        parent_id = str(item.get("parent", ""))
        plank_data["parent_name"] = id_to_name.get(parent_id, "") if parent_id else ""

        # Extract position and rotation
        plank_data["position"] = item.get("position", {"x": 0, "y": 0, "z": 0})
        plank_data["rotation"] = item.get("rotation", {"x": 0, "y": 0, "z": 0})

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

        # Extract materials
        material_name = "-"
        banding_material_name = "-"
        banding_material_thickness = None

        # 1. Try DB first
        for material in catalog.materials.all():
            m_type = material.type
            if m_type in ["Panel Stock", "Board Stock", "Laminate"]:
                material_name = material.name
            elif m_type == "Banding":
                banding_material_name = material.name
                first_prop = material.properties.first()
                if first_prop:
                    banding_material_thickness = first_prop.thickness

        # 2. Try raw catalog data if missing
        raw_materials = catalog_data.get("material", [])
        if not isinstance(raw_materials, list):
            raw_materials = [raw_materials] if raw_materials else []

        for material_dict in raw_materials:
            m_type = material_dict.get("type", "")
            m_name = material_dict.get("name", "")
            if (
                m_type in ["Panel Stock", "Board Stock", "Laminate"]
                and material_name == "-"
            ):
                material_name = m_name
            elif m_type == "Banding" and banding_material_name == "-":
                banding_material_name = m_name
                props = material_dict.get("properties")
                if isinstance(props, dict):
                    banding_material_thickness = props.get("thickness")

        # 3. Ultimate fallback: Pick ANY non-banding material as the panel stock
        if material_name == "-":
            for material in catalog.materials.all():
                if material.type != "Banding":
                    material_name = material.name
                    break

            if material_name == "-":
                for material_dict in raw_materials:
                    if material_dict.get("type", "") != "Banding":
                        material_name = material_dict.get("name", "-")
                        break

        plank_data = {
            "type": "rectangle",
            "object": "PLANK",
            "name": name,
            "unit": "mm",
            "width": width,
            "height": height,
            "depth": depth,
            "material_name": material_name,
            "banding_material_name": banding_material_name,
            "grooves": [],
            "minifix_holes": [],
            "catalog_id": catalog_id,
            "parent_name": catalog.parent.name if catalog.parent else "",
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
                processed_grooves.append(groove)
            plank_data["grooves"] = processed_grooves

        # Extract minifix holes
        minifix_holes = catalog_data.get(
            "minifix_holes", catalog_data.get("minifixHoles", [])
        )
        if minifix_holes:
            processed_holes = []
            for hole in minifix_holes:
                processed_hole = {
                    "type": hole.get("type", ""),
                    "diameter": float(hole.get("diameter", 0)),
                    "depth": float(hole.get("depth", 0)),
                    "length": float(hole.get("length", 0)),  # For dowels
                    "local_position2_d": hole.get(
                        "local_position2_d", {"x": 0, "y": 0}
                    ),
                    "position": hole.get("position", {"x": 0, "y": 0, "z": 0}),
                    "direction": hole.get("direction", {"x": 0, "y": 0, "z": 0}),
                    "drill_type": hole.get("drill_type", "1"),
                    "face": hole.get("face", "1"),
                }
                processed_holes.append(processed_hole)
            plank_data["minifix_holes"] = processed_holes

        # Extract position and rotation
        plank_data["position"] = catalog_data.get("position", {"x": 0, "y": 0, "z": 0})
        plank_data["rotation"] = catalog_data.get("rotation", {"x": 0, "y": 0, "z": 0})

        # Extract edgeband data (handle multiple possible keys)
        edgebands_raw = catalog_data.get("edgeband")
        if edgebands_raw is None:
            edgebands_raw = catalog_data.get("edge_banding")
        if edgebands_raw is None:
            edgebands_raw = catalog_data.get("edgeBanding")
        if edgebands_raw is None:
            edgebands_raw = []

        # Handle both object format {left: true, top: false, ...} and array format ["LEFT", ...]
        edge_val = banding_material_name
        if banding_material_thickness is not None:
            edge_val = {
                "name": banding_material_name,
                "thickness": banding_material_thickness
            }
            
        if isinstance(edgebands_raw, dict):
            edge_key_map = {
                "left": "LEFT",
                "right": "RIGHT",
                "top": "TOP",
                "bottom": "BOTTOM",
                "front": "FRONT",
                "back": "BACK",
            }
            edgebands_dict = {
                k: (edge_val if v else "")
                for k, v in edgebands_raw.items()
                if k in edge_key_map and v
            }

            # Re-map front->right and back->left as requested by user
            if "front" in edgebands_dict and edgebands_dict["front"]:
                if "right" not in edgebands_dict or not edgebands_dict["right"]:
                    edgebands_dict["right"] = edgebands_dict["front"]
                del edgebands_dict["front"]

            if "back" in edgebands_dict and edgebands_dict["back"]:
                if "left" not in edgebands_dict or not edgebands_dict["left"]:
                    edgebands_dict["left"] = edgebands_dict["back"]
                del edgebands_dict["back"]

            edgebands = edgebands_dict
        else:
            # If it's a list like ["LEFT", "RIGHT"], we don't know the material from the list itself,
            # so we use banding_material_name for all.
            edge_map_inv = {
                "LEFT": "left",
                "RIGHT": "right",
                "TOP": "top",
                "BOTTOM": "bottom",
                "FRONT": "front",
                "BACK": "back",
            }
            edgebands_list = [
                edge_map_inv.get(e.upper(), e.lower()) for e in edgebands_raw
            ]

            edgebands = {}
            for e in edgebands_list:
                if e == "front" and "right" not in edgebands_list:
                    edgebands["right"] = edge_val
                elif e == "back" and "left" not in edgebands_list:
                    edgebands["left"] = edge_val
                elif e in ["top", "bottom", "left", "right"]:
                    edgebands[e] = edge_val

        # Always ensure edge_banding is in plank_data, even if empty
        plank_data["edge_banding"] = edgebands or {}

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
