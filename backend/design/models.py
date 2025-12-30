# Python imports
import uuid

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


class CatalogTypeChoices(models.TextChoices):
    """
    Catalog Type
    """

    CARCASS = "carcass"
    PLANK = "plank"
    DOOR = "door"
    DRAWER = "drawer"
    CABINET = "cabinet"
    CUPBOARD = "cupboard"
    PLATFORM = "platform"
    INVISIBLE_COMPARTMENT = "invisiblecompartment"

    UNKNOWN = "unknown"


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

    def __str__(self: "Design") -> str:
        return self.design_name


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


class DesignVersion(models.Model):
    id = models.UUIDField(
        default=uuid.uuid4, editable=False, primary_key=True, unique=True
    )
    name = models.CharField(max_length=100, null=True, blank=True)
    design = models.ForeignKey(Design, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self: "DesignVersion", *args, **kwargs) -> None:
        if not self.name and self.design:
            self.name = self.design.design_name
        super().save(*args, **kwargs)


class DesignCatalog(models.Model):
    id = models.UUIDField(
        default=uuid.uuid4, editable=False, primary_key=True, unique=True
    )
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, null=True, blank=True
    )
    version = models.ForeignKey(
        DesignVersion, on_delete=models.CASCADE, null=True, blank=True
    )
    type = models.CharField(max_length=100, choices=CatalogTypeChoices.choices)
    name = models.CharField(max_length=100)
    parent = models.ForeignKey("self", on_delete=models.CASCADE, null=True, blank=True)
    data = models.JSONField(null=True, blank=True)
    materials = models.ManyToManyField(
        "material.Material", related_name="design_catalog_material"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
