# Python imports
import uuid
from typing import Any, Dict, List, Optional

# Django imports
from django.db import models

# App imports
from umaboy.models import Organization, User

# Local imports
from .constant import (
    GROOVE_DIG,
    GROOVE_GAP,
    MINIFIX_DISTANCE,
    NESTING_SHEET_HEIGHT,
    NESTING_SHEET_WIDTH,
)


class DesignStatus(models.TextChoices):
    """
    Design Status Choices
    """

    DRAFT = "Draft"
    DELETED = "Deleted"
    READY = "Ready"
    NESTING = "Nesting"
    COMPLETED = "Completed"


class Design(models.Model):
    """
    Design Model

    Args:
        id (uuid): The unique id of the design
        organization (ForeignKey): The organization associated with the design
        created_by (ForeignKey): The user who created the design
        design_name (str): The name of the design
        status (CharField): The status of the design
        custom_design_picture (ImageField): The image of the design
        is_custom(BooleanField): The is custom of the design

        created_at (DateTimeField): The date and time when the design was created
        updated_at (DateTimeField): The date and time when the design was updated

    """

    id = models.UUIDField(
        default=uuid.uuid4, editable=False, primary_key=True, unique=True
    )
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    design_name = models.CharField(max_length=100)
    status = models.CharField(
        max_length=100, choices=DesignStatus.choices, default=DesignStatus.DRAFT
    )
    custom_design_picture = models.ImageField(
        upload_to="project/custom_designs", null=True
    )
    is_custom = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Texture(models.Model):
    """
    Textures Model

    Args:
        id (uuid): The unique id of the texture
        name (str): The name of the texture
        image (ImageField): The image of the texture
    """

    id = models.UUIDField(
        default=uuid.uuid4, editable=False, primary_key=True, unique=True
    )
    name = models.CharField(max_length=100)
    image = models.ImageField(upload_to="project/textures")

    class Meta:
        verbose_name_plural = "textures"


class Material(models.Model):
    """
    Material Model

    Args:
        id (uuid): The unique id of the material
        name (str): The name of the material
        texture (ForeignKey): The texture associated with the material
    """

    id = models.UUIDField(
        default=uuid.uuid4, editable=False, primary_key=True, unique=True
    )
    name = models.CharField(max_length=100)
    texture = models.ForeignKey(
        Texture, on_delete=models.CASCADE, null=True, blank=True
    )


class Catalog(models.Model):
    """
    Catalog Model

    Args:
        id (uuid): The unique id of the catalog
        name (str): The name of the catalog
        design (ForeignKey): The design associated with the catalog
        organization (ForeignKey): The organization associated with the catalog
        image (ImageField): The image of the catalog
        parent (ForeignKey): The parent catalog
        data (JSONField): The data of the catalog
        is_custom (BooleanField): The is custom of the catalog
        is_default (BooleanField): The is default of the catalog
    """

    id = models.UUIDField(
        default=uuid.uuid4, editable=False, primary_key=True, unique=True
    )
    name = models.CharField(max_length=100)
    design = models.ForeignKey(Design, on_delete=models.CASCADE, null=True, blank=True)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, null=True, blank=True
    )
    image = models.ImageField(
        upload_to="project/catalogs", default=None, null=True, blank=True
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="parent_catalogs",
    )
    data = models.JSONField(null=True, blank=True)
    is_custom = models.BooleanField(default=False)
    is_default = models.BooleanField(default=False)

    def __str__(self: "Catalog") -> str:
        return self.name

    @staticmethod
    def create_or_update_catalog(
        catalog_data: Dict[str, Any],
        design: "Design",
        parent: Optional["Catalog"] = None,
    ) -> "Catalog":
        catalog_id = catalog_data.get("id")
        catalog, created = Catalog.objects.update_or_create(
            id=catalog_id,
            defaults={
                "design": design,
                "name": catalog_data.get("name", "New Catalog"),
                "data": catalog_data.get("data", {}),
                "parent": parent,
                "is_default": catalog_data.get("is_default", False),
                "is_custom": catalog_data.get("is_custom", False),
            },
        )
        return catalog

    @staticmethod
    def create_or_update_catalog_structure(
        catalog_data: Dict[str, Any],
        items_data: List[Dict[str, Any]],
        child_catalogs_data: List[Dict[str, Any]],
        design: "Design",
        parent: Optional["Catalog"] = None,
    ) -> "Catalog":
        catalog = Catalog.create_or_update_catalog(catalog_data, design, parent)
        for item_data in items_data:
            CatalogItem.create_or_update_catalog_item(item_data, catalog)
        for child_data in child_catalogs_data:
            Catalog.create_or_update_catalog_structure(
                catalog_data=child_data.get("catalog", {}),
                items_data=child_data.get("items", []),
                child_catalogs_data=child_data.get("child_catalogs", []),
                design=design,
                parent=catalog,
            )
        return catalog


class CatalogItem(models.Model):
    """
    Catalog Item Model

    Args:
        id (uuid): The unique id of the catalog item
        name (str): The name of the catalog item
        catalog (ForeignKey): The catalog associated with the catalog item
        data = The data of the catalog item
    """

    id = models.UUIDField(
        default=uuid.uuid4, editable=False, primary_key=True, unique=True
    )
    name = models.CharField(max_length=100)
    catalog = models.ForeignKey(
        Catalog, on_delete=models.CASCADE, null=True, blank=True
    )
    material = models.ForeignKey(
        Material, on_delete=models.SET_NULL, null=True, blank=True
    )
    data = models.JSONField()

    @staticmethod
    def create_or_update_catalog_item(
        item_data: Dict[str, Any], catalog: Catalog
    ) -> "CatalogItem":
        item_id = item_data.get("id")
        material_id = item_data.get("material")
        material = None
        if material_id:
            material = Material.objects.filter(id=material_id).first()

        item, created = CatalogItem.objects.update_or_create(
            id=item_id,
            defaults={
                "catalog": catalog,
                "name": item_data.get("name", "New Item"),
                "data": item_data.get("data", {}),
                "material": material,
            },
        )
        return item


class DesignUnits(models.TextChoices):
    """
    Design Unit Choices
    MM(Milimeter)
    CM(Centimeter)
    FEET(Feet)
    """

    MM = "mm"
    CM = "cm"
    FEET = "feet"


class DesignSetting(models.Model):
    """
    DesignSettings Model

    Args:
        design (ForeignKey): The design associated with the design settings
        organization (ForeignKey): The organization associated with the design settings
        unit (CharField): The unit of the design
        sheet_width (IntegerField): The width of the nesting sheet
        sheet_height (IntegerField): The height of the nesting sheet
    """

    id = models.UUIDField(
        default=uuid.uuid4, editable=False, primary_key=True, unique=True
    )
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, null=True, blank=True
    )
    design = models.ForeignKey(Design, on_delete=models.CASCADE, null=True, blank=True)
    unit = models.CharField(
        max_length=10, choices=DesignUnits.choices, default=DesignUnits.MM
    )

    sheet_width = models.IntegerField(default=NESTING_SHEET_WIDTH)
    sheet_height = models.IntegerField(default=NESTING_SHEET_HEIGHT)
    minifix_distance = models.IntegerField(default=MINIFIX_DISTANCE)
    groove_gap = models.IntegerField(default=GROOVE_GAP)
    groove_dig = models.IntegerField(default=GROOVE_DIG)
    sheet_data = models.JSONField(null=True, blank=True)


class DesignScreenshot(models.Model):
    id = models.UUIDField(
        default=uuid.uuid4, editable=False, primary_key=True, unique=True
    )
    design = models.ForeignKey(Design, on_delete=models.CASCADE, null=True, blank=True)
    screenshot = models.ImageField(
        upload_to="project/screenshot", default=None, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
