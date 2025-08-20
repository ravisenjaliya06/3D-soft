# Django imports
from django.urls import path

# App imports
from mes_portal.views import WorkOrderViewSet

urlpatterns = [
    path(
        "work_order/",
        WorkOrderViewSet.as_view({"get": "list", "post": "create"}),
        name="workorder-create",
    ),
    path(
        "work_order/<uuid:pk>/",
        WorkOrderViewSet.as_view({"put": "update", "delete": "destroy"}),
        name="workorder-detail",
    ),
]
