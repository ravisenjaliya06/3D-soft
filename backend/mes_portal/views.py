# Django imports

# External imports
from rest_framework import filters, viewsets

# App imports
from mes_portal.filters import WorkOrderFilter
from mes_portal.models import WorkOrder
from mes_portal.serializers import WorkOrderSerializer
from umaboy.constant import DELETE, GET, POST, PUT
from user.permissions import MesEditor


class WorkOrderViewSet(viewsets.ModelViewSet):
    queryset = WorkOrder.objects.all()
    permission_classes = [MesEditor]
    serializer_class = WorkOrderSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "client_name", "code"]
    http_method_names = [GET, POST, PUT, DELETE]
    filterset_class = WorkOrderFilter
