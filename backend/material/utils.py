# local imports
# App imports
from design.models import Design

# Local imports
from .models import Catalog, CatalogRuleParts, CatalogRules, Material


def get_copy_name(model: type, base_name: str, filter_kwargs: dict = None) -> None:
    filter_kwargs = filter_kwargs or {}
    existing_names = model.objects.filter(**filter_kwargs).value_list("name", flat=True)
    count = 1
    new_name = f"{base_name} Copy {count}"
    while new_name in existing_names:
        count += 1
        new_name = f"{base_name} Copy {count}"
    return new_name


def create_duplicate_catalog(design_id: str, catalog_id: str) -> None:

    design = Design.objects.get(id=design_id)
    catalog = Catalog.objects.get(id=catalog_id)
    # duplicate_catlog_name = get_copy_name(Catalog, catalog.name)
    duplicate_catalog = Catalog.objects.create(
        organization=catalog.organization,
        name=f"{catalog.name} copy",
        type=catalog.type,
        description=catalog.description,
        design=design,
    )
    catalog_rule = CatalogRules.objects.filter(catalog=catalog)
    if catalog_rule is not None:
        for rule in catalog_rule:
            duplicate_catalog_rule = CatalogRules.objects.create(
                catalog=duplicate_catalog, name=f"{rule.name} copy"
            )

            catalog_rule_parts = CatalogRuleParts.objects.filter(catalog_rule=rule)
            for part in catalog_rule_parts:
                get_material_obj = part.material
                if get_material_obj is not None:
                    material_id = get_material_obj.id
                    material = Material.objects.get(id=material_id)
                    duplicate_material = Material.objects.create(
                        name=f"{material.name} copy"
                    )
                    duplicate_catalog_rule_parts = CatalogRuleParts.objects.create(
                        name=f"{part.name}",
                        catalog_rule=duplicate_catalog_rule,
                        material=duplicate_material,
                    )
                    duplicate_catalog_rule_parts.save()
                else:
                    duplicate_catalog_rule_parts = CatalogRuleParts.objects.create(
                        name=f"{part.name}",
                        catalog_rule=duplicate_catalog_rule,
                        material=None,
                    )
                    duplicate_catalog_rule_parts.save()

    return duplicate_catalog
