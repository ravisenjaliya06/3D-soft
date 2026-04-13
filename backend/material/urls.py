# Django imports
from django.urls import path

# Local imports
from .views import (
    CatalogPartMaterialViewSet,
    CompanyViewSet,
    FinishesLibraryListAPIView,
    MaterialViewSet,
)

urlpatterns = [
    path(
        "",
        MaterialViewSet.as_view({"get": "list", "post": "create"}),
        name="company-list",
    ),
    path(
        "<uuid:id>/",
        MaterialViewSet.as_view(
            {"get": "retrieve", "put": "update", "delete": "destroy"}
        ),
        name="company-details",
    ),
    path(
        "finishes/",
        FinishesLibraryListAPIView.as_view({"get": "list", "post": "create"}),
        name="finishes-list",
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
        "company/<uuid:company_id>/material/",
        MaterialViewSet.as_view(
            {
                "get": "list",
                "post": "create",
            }
        ),
        name="material-list",
    ),
    path(
        "company/<uuid:company_id>/material/<uuid:id>/",
        MaterialViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "delete": "destroy",
            }
        ),
        name="material-details",
    ),
    path(
        "catalog/part/<uuid:part_id>/",
        CatalogPartMaterialViewSet.as_view({"put": "update"}),
        name="catalog-part-material-update",
    ),
]
