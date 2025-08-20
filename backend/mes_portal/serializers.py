# Python imports

# External imports
from rest_framework import serializers

# App imports
from mes_portal.models import WorkOrder


class WorkOrderSerializer(serializers.ModelSerializer):
    design_name = serializers.CharField(source="design.design_name", read_only=True)

    class Meta:
        model = WorkOrder
        fields = [
            "id",
            "name",
            "design",
            "design_name",
            "description",
            "client_name",
            "delivery_date",
            "phase",
            "created_at",
            "is_archived",
        ]
