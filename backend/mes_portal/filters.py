# External imports
import django_filters

# App imports
from mes_portal.models import WorkOrder


class WorkOrderFilter(django_filters.FilterSet):
    design = django_filters.UUIDFilter(field_name="design", lookup_expr="exact")

    class Meta:
        model = WorkOrder
        fields = ["design"]
