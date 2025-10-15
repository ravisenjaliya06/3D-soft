# local imports
# App imports

# Local imports
from .models import (
    Material,
    MaterialFinish,
    MaterialFinishType,
    MaterialTexture,
    MountHoles,
    MountPlateHoles,
    Properties,
)


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
