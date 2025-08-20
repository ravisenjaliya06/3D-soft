# Python imports
from typing import Dict, List, Tuple

# App imports
from design.models import Catalog, CatalogItem, Design, DesignSetting
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


def clone_catalog_with_items(
    source_catalog_id: str, design: Design
) -> Tuple[Catalog, List[Catalog]]:
    """Clone a catalog with all its items and child catalogs"""
    source_catalog = Catalog.objects.filter(id=source_catalog_id).first()
    if not source_catalog:
        return None, []

    # Create parent catalog
    parent_catalog = Catalog.objects.create(
        name=source_catalog.name, design=design, parent=None, data=source_catalog.data
    )

    for item in CatalogItem.objects.filter(catalog=source_catalog_id):
        CatalogItem.objects.create(
            catalog=parent_catalog,
            data=item.data,
            name=item.name,
            material=item.material,
        )

    created_child_catalogs = []
    for child_catalog in get_all_child_catalogs(source_catalog_id):
        child_catalog_data = Catalog.objects.create(
            design=design,
            name=child_catalog.name,
            parent=parent_catalog,
            data=child_catalog.data,
        )
        created_child_catalogs.append(child_catalog_data)

        for item in CatalogItem.objects.filter(catalog=child_catalog):
            CatalogItem.objects.create(
                catalog=child_catalog_data,
                name=item.name,
                data=item.data,
                material=item.material,
            )
    return parent_catalog, created_child_catalogs


def get_all_child_catalogs(catalog_id: str) -> List[Catalog]:
    """Recursively fetch all child catalogs for a given catalog_id"""
    child_catalogs = Catalog.objects.filter(parent=catalog_id)
    all_child_catalogs = list(child_catalogs)

    for child_catalog in child_catalogs:
        nested_child_catalogs = get_all_child_catalogs(child_catalog.id)
        all_child_catalogs.extend(nested_child_catalogs)
    return all_child_catalogs
