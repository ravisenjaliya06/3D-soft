# Python imports
import uuid

# Django imports
from django.db import IntegrityError, models
from django.db.models import Max
from django.utils import timezone

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
    WALL = "wall"
    MODEL = "model"

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
    rendering_project_id = models.CharField(max_length=255, null=True, blank=True)
    customer_name = models.CharField(max_length=255, null=True, blank=True)
    customer_company = models.CharField(max_length=255, null=True, blank=True)
    customer_address = models.TextField(null=True, blank=True)
    customer_gstin = models.CharField(max_length=50, null=True, blank=True)
    customer_contact = models.CharField(max_length=50, null=True, blank=True)
    customer_email = models.EmailField(max_length=255, null=True, blank=True)
    project_type = models.CharField(max_length=255, null=True, blank=True)
    project_code = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        unique=True,
        help_text="Auto-generated readable project ID, e.g. BRV-2026-0001",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self: "Design", *args, **kwargs) -> None:
        if self.project_code:
            return super().save(*args, **kwargs)

        year = timezone.now().year

        for _ in range(10):

            last_code = (
                Design.objects.filter(project_code__startswith=f"BRV-{year}-")
                .aggregate(max_code=Max("project_code"))
                .get("max_code")
            )

            next_number = 1
            if last_code:
                next_number = int(last_code.split("-")[-1]) + 1

            self.project_code = f"BRV-{year}-{next_number:04d}"

            try:
                return super().save(*args, **kwargs)
            except IntegrityError:
                continue

        raise IntegrityError("Could not generate unique project code")

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


class RenderImage(models.Model):
    id = models.UUIDField(
        default=uuid.uuid4, editable=False, primary_key=True, unique=True
    )
    design = models.ForeignKey(
        Design, on_delete=models.CASCADE, related_name="render_images"
    )
    image = models.ImageField(upload_to="project/render_images")
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
    description = models.TextField(null=True, blank=True)
    image = models.ImageField(upload_to="catalog_images", null=True, blank=True)
    parent = models.ForeignKey("self", on_delete=models.CASCADE, null=True, blank=True)
    is_library = models.BooleanField(default=False)
    script_parent = models.UUIDField(null=True, blank=True)
    is_script = models.BooleanField(default=False)
    data = models.JSONField(null=True, blank=True)
    materials = models.ManyToManyField(
        "material.Material", related_name="design_catalog_material"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class NestingSheet(models.Model):
    """
    Model to store nesting sheet information.
    """

    id = models.UUIDField(
        default=uuid.uuid4, editable=False, primary_key=True, unique=True
    )
    design = models.ForeignKey(
        Design, on_delete=models.CASCADE, related_name="nesting_sheets"
    )
    design_setting = models.ForeignKey(
        DesignSetting,
        on_delete=models.CASCADE,
        related_name="nesting_sheets",
        null=True,
        blank=True,
    )
    sheet_number = models.IntegerField()
    width = models.FloatField()
    height = models.FloatField()
    efficiency = models.FloatField(null=True, blank=True)
    file_ids = models.JSONField(
        default=list
    )  # List of catalog IDs (rids) on this sheet
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [["design", "sheet_number"]]
        ordering = ["sheet_number"]

    def __str__(self: "NestingSheet") -> str:
        return f"Sheet {self.sheet_number} - {self.design.design_name}"


class NestingFile(models.Model):
    """
    Model to store nesting output files (SVG, GCODE, DWG, XML, PDF, XLSX).
    """

    FILE_TYPE_CHOICES = [
        ("svg", "SVG"),
        ("gcode", "GCODE"),
        ("dwg", "DWG"),
        ("xml", "XML"),
        ("pdf", "PDF"),
        ("xlsx", "XLSX"),
        ("zip", "ZIP"),
    ]

    id = models.UUIDField(
        default=uuid.uuid4, editable=False, primary_key=True, unique=True
    )
    design = models.ForeignKey(
        Design, on_delete=models.CASCADE, related_name="nesting_files"
    )
    sheet = models.ForeignKey(
        NestingSheet,
        on_delete=models.CASCADE,
        related_name="files",
        null=True,
        blank=True,
    )
    file_type = models.CharField(max_length=10, choices=FILE_TYPE_CHOICES)
    file_path = models.CharField(max_length=500)
    file_name = models.CharField(max_length=255)
    is_sheet_specific = models.BooleanField(
        default=False,
        help_text="True if file is specific to a sheet, False if it's for all sheets",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self: "NestingFile") -> str:
        return f"{self.file_type} - {self.file_name}"
