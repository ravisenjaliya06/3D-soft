# Python imports
import uuid

# Django imports
from django.db import models

# App imports
from design.models import Design


class PhaseChoices(models.TextChoices):
    """
    Panel Cutting: Indicates the status of the panel cutting stage.
    Engineering: Indicates the status of the engineering phase.
    CNC: Indicates the status of the CNC machining phase.
    Packaging: Indicates the status of the packaging phase.
    Shipment: Indicates the status of the shipment phase.
    """

    PANEL_CUTTING = "Panel Cutting"
    ENGINEERING = "Engineering"
    CNC = "CNC"
    PACKAGING = "Packaging"
    SHIPMENT = "Shipment"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"


class WorkOrder(models.Model):
    """
    Work Order is a blueprint that tracks and manages task.
    id (uuid): The unique id of the workorder.
    Design (Foreign key): The design file associated with the work order.
    code: Code is unique identifier for work order.
    Name: Edit the name of the work order.
    Client Name: Update the name of the client associated with the work order.
    Description: Modify the description of the work order to provide more details or specific requirements.
    Delivery Date: Use the calendar picker to choose a new delivery date for the work order.
    Phase: Represent key stages in the lifecycle of a manufacturing or production work order.
    Status: Represent the overall progress of a work order
    """

    id = models.UUIDField(
        default=uuid.uuid4, editable=False, primary_key=True, unique=True
    )
    design = models.ForeignKey(Design, on_delete=models.CASCADE, null=True)
    name = models.CharField(max_length=100)
    client_name = models.CharField(max_length=100)
    description = models.TextField(max_length=255)
    delivery_date = models.DateField()
    phase = models.CharField(
        max_length=20, choices=PhaseChoices.choices, default=PhaseChoices.IN_PROGRESS
    )
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self: "WorkOrder") -> str:
        return f"{self.name}"
