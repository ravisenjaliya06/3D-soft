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
    Parse DesignCatalogItem data into a format suitable for nesting.
    Args:
        data: List of serialized DesignCatalogItem objects.
    Returns:
        Dictionary mapping unique IDs to plank details.
    """
    result = {}

    for item in data:
        item_data = item["data"]
        plank_name = item_data.get("name")
        if not plank_name:
            continue
        plank_id = item["id"]

        object_type = "CABINET"
        if "DOOR" in plank_name:
            object_type = "DOOR"
        elif "PLANK" in plank_name:
            object_type = "PLANK"
        elif "DRAWER" in plank_name:
            object_type = "DRAWER"

        # Base plank data
        plank_data = {
            "type": "rectangle",
            "object": object_type,
            "name": plank_name,
            "unit": "mm",
            "width": item_data.get("width", 0) * 10,  # Convert to mm if needed
            "height": item_data.get("height", 0) * 10,
            "depth": item_data.get("depth", 0) * 10,
            "grooves": item_data.get("grooves", []),
            "minifix_holes": item_data.get("minifixHoles", []),
        }

        if (
            "DRAWER_LEFT" in plank_name
            or "DRAWER_RIGHT" in plank_name
            or plank_name in ["LEFT_PLANK", "RIGHT_PLANK"]
        ) or "VERTICAL" in plank_name:
            plank_data.update(
                {
                    "width": item_data.get("depth", 0) * 10,
                    "height": item_data.get("height", 0) * 10,
                    "depth": item_data.get("width", 0) * 10,
                }
            )
        elif "HORIZONTAL" in plank_name or (
            "DRAWER_BOTTOM" in plank_name
            or plank_name
            in [
                "TOP_PLANK",
                "BOTTOM_PLANK",
            ]
        ):
            plank_data.update(
                {
                    "width": item_data.get("width", 0) * 10,
                    "height": item_data.get("depth", 0) * 10,
                    "depth": item_data.get("height", 0) * 10,
                }
            )
        elif (
            "DRAWER_BACK" in plank_name
            or "DRAWER_FRONT" in plank_name
            or plank_name == "BACK_PLANK"
        ):
            plank_data.update(
                {
                    "width": item_data.get("width", 0) * 10,
                    "height": item_data.get("height", 0) * 10,
                    "depth": item_data.get("depth", 0) * 10,
                }
            )

        result[plank_id] = plank_data

    return result
