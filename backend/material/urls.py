# Django imports
from django.urls import path

# Local imports
from .views import CompanyViewSet, MaterialViewSet

urlpatterns = [
    path(
        "",
        MaterialViewSet.as_view({"get": "list"}),
        name="company-list",
    ),
    path(
        "company/",
        CompanyViewSet.as_view({"get": "list", "post": "create"}),
        name="company-list",
    ),
    path(
        "company/<uuid:uuid>/",
        CompanyViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "delete": "destroy",
            }
        ),
        name="company-detail",
    ),
    path(
        "company/<uuid:pk>/material/",
        MaterialViewSet.as_view(
            {
                "get": "list",
            }
        ),
        name="company-detail",
    ),
]
