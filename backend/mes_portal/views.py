# Django imports
from django.db.models import QuerySet

# External imports
from rest_framework import filters, viewsets

# App imports
from mes_portal.filters import WorkOrderFilter
from mes_portal.models import WorkOrder
from mes_portal.serializers import WorkOrderSerializer
from umaboy.constant import DELETE, GET, POST, PUT
from user.permissions import MesEditor


class WorkOrderViewSet(viewsets.ModelViewSet):
    def get_queryset(self: "WorkOrderViewSet") -> QuerySet[WorkOrder]:
        return WorkOrder.objects.filter(
            design__organization=self.request.user.selected_organization
        ).distinct()

    permission_classes = [MesEditor]
    serializer_class = WorkOrderSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "client_name", "code"]
    http_method_names = [GET, POST, PUT, DELETE]
    filterset_class = WorkOrderFilter
