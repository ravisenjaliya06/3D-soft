# Python imports
from typing import Dict, List

# App imports
from design.models import Design, DesignSetting
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
        }

        if name in ["LEFT_PLANK", "RIGHT_PLANK", "VERTICAL_PLANK"]:
            plank_data.update({
                "width": depth, 
                "height": height,
                "depth": width
            })

        elif name in ["TOP_PLANK", "BOTTOM_PLANK", "HORIZONTAL_PLANK"]:
            plank_data.update({
                "width": width,
                "height": depth,
                "depth": height
            })

        elif name == "BACK_PLANK":
            plank_data.update({
                "width": width - 250,
                "height": height,
                "depth": depth
            })

        elif object_type == "DOOR":
            plank_data.update({
                "width": width,
                "height": height,
                "depth": depth
            })

        elif object_type == "DRAWER":
            plank_data.update({
                "width": width,
                "height": height,
                "depth": depth
            })

        result[part_id] = plank_data

    return result
