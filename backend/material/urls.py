# Django imports
from django.urls import path

# Local imports
from .views import CompanyViewSet

urlpatterns = [
    path(
        "company/",
        CompanyViewSet.as_view({"get": "list", "post": "create"}),
        name="company-list",
    ),
    path(
        "company/<uuid:pk>/",
        CompanyViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "delete": "destroy",
            }
        ),
        name="company-detail",
    ),
]
