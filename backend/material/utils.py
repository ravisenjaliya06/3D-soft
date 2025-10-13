# local imports
# App imports
from design.models import Design

# Local imports
from .models import (
    Catalog,
    CatalogRuleParts,
    CatalogRules,
    Material,
    MaterialFinish,
    MaterialFinishType,
    MaterialTexture,
    MountHoles,
    MountPlateHoles,
    Properties,
)

# def create_duplicate_catalog(design_id: str, catalog_id: str) -> None:
#     design = Design.objects.get(id=design_id)
#     catalog = Catalog.objects.get(id=catalog_id)
#     duplicate_catalog = Catalog.objects.create(
#         organization=catalog.organization,
#         name=f"{catalog.name} copy",
#         type=catalog.type,
#         description=catalog.description,
#         design=design,
#     )
#     catalog_rule = CatalogRules.objects.filter(catalog=catalog)
#     if catalog_rule is not None:
#         for rule in catalog_rule:
#             duplicate_catalog_rule = CatalogRules.objects.create(
#                 catalog=duplicate_catalog, name=f"{rule.name} copy"
#             )

#             catalog_rule_parts = CatalogRuleParts.objects.filter(catalog_rule=rule)
#             for part in catalog_rule_parts:
#                 get_material_obj = part.material
#                 if get_material_obj is not None:
#                     material_id = get_material_obj.id
#                     material = Material.objects.get(id=material_id)
#                     duplicate_material = Material.objects.create(
#                         name=f"{material.name} copy"
#                     )
#                     duplicate_catalog_rule_parts = CatalogRuleParts.objects.create(
#                         name=f"{part.name}",
#                         catalog_rule=duplicate_catalog_rule,
#                         material=duplicate_material,
#                     )
#                     duplicate_catalog_rule_parts.save()
#                 else:
#                     duplicate_catalog_rule_parts = CatalogRuleParts.objects.create(
#                         name=f"{part.name}",
#                         catalog_rule=duplicate_catalog_rule,
#                         material=None,
#                     )
#                     duplicate_catalog_rule_parts.save()


#     return duplicate_catalog
def create_duplicate_catalog(
    design_id: str, catalog_id: str, extra_data: dict = None
) -> Catalog:
    design = Design.objects.get(id=design_id)
    catalog = Catalog.objects.get(id=catalog_id)

    catalog_data = {
        "organization": catalog.organization,
        "name": f"{catalog.name} Copy",
        "type": catalog.type,
        "description": catalog.description,
        "design": design,
        "height": extra_data.height,
        "width": extra_data.width,
        "length": extra_data.length,
        "depth": extra_data.depth,
        "position": extra_data.position,
    }

    duplicate_catalog = Catalog.objects.create(**catalog_data)

    for rule in catalog.catalog_rule.all():
        duplicate_rule = CatalogRules.objects.create(
            catalog=duplicate_catalog, name=f"{rule.name} Copy"
        )

        for part in rule.catalog_rule_parts.all():
            new_material = None
            if part.material:
                new_material = duplicate_material(part.material)

            CatalogRuleParts.objects.create(
                catalog_rule=duplicate_rule,
                name=f"{part.name} Copy",
                material=new_material,
                height=part.height,
                width=part.width,
                length=part.length,
                depth=part.depth,
                position=part.position,
                handle_position=part.handle_position,
            )

    return duplicate_catalog


def duplicate_material(material: Material) -> Material:
    """Deep copy material + properties + finishes + textures"""
    material_copy = Material.objects.create(
        name=f"{material.name} Copy",
        type=material.type,
        organization=material.organization,
        company=material.company,
        description=material.description,
        is_deleted=material.is_deleted,
    )

    for prop in material.properties.all():
        duplicate_properties(prop, material_copy)

    for finish in material.finishes.all():
        MaterialFinish.objects.create(
            name=f"{finish.name} Copy",
            material=material_copy,
            finish=finish.finish,
        )

    for finish_type in material.finish_types.all():
        MaterialFinishType.objects.create(
            name=f"{finish_type.name} Copy",
            material=material_copy,
            finish_type=finish_type.finish_type,
        )

    for texture in material.textures.all():
        MaterialTexture.objects.create(
            name=f"{texture.name} Copy",
            material=material_copy,
            texture=texture.texture,
        )

    return material_copy


def duplicate_properties(prop: Properties, material_copy: Material) -> Properties:
    """Duplicate Properties object with mount holes + plate holes"""

    # First duplicate related mount holes (if exist)
    def clone_hole(hole: MountHoles) -> MountHoles | None:
        if hole:
            return MountHoles.objects.create(
                top_reference=hole.top_reference,
                horizontal_offset=hole.horizontal_offset,
                vertical_offset=hole.vertical_offset,
                diameter=hole.diameter,
                depth=hole.depth,
                spacing=hole.spacing,
                quantity=hole.quantity,
            )
        return None

    def clone_plate_hole(hole: MountPlateHoles) -> MountPlateHoles | None:
        if hole:
            return MountPlateHoles.objects.create(
                horizontal_offset=hole.horizontal_offset,
                vertical_offset=hole.vertical_offset,
                diameter=hole.diameter,
                depth=hole.depth,
            )
        return None

    return Properties.objects.create(
        **{
            field.name: getattr(prop, field.name)
            for field in Properties._meta.fields
            if field.name
            not in (
                "id",
                "material",
                "front_mount_holes",
                "back_mount_holes",
                "bottom_mount_holes",
                "mount_plate_hole_one",
                "mount_plate_hole_two",
                "mount_plate_hole_third",
                "mount_plate_hole_forth",
                "mount_plate_hole_fifth",
            )
        },
        material=material_copy,
        front_mount_holes=clone_hole(prop.front_mount_holes),
        back_mount_holes=clone_hole(prop.back_mount_holes),
        bottom_mount_holes=clone_hole(prop.bottom_mount_holes),
        mount_plate_hole_one=clone_plate_hole(prop.mount_plate_hole_one),
        mount_plate_hole_two=clone_plate_hole(prop.mount_plate_hole_two),
        mount_plate_hole_third=clone_plate_hole(prop.mount_plate_hole_third),
        mount_plate_hole_forth=clone_plate_hole(prop.mount_plate_hole_forth),
        mount_plate_hole_fifth=clone_plate_hole(prop.mount_plate_hole_fifth),
    )
