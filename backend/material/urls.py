# Django imports
from django.urls import path

# Local imports
from .views import (
    CatalogRulePartsListView,
    CatalogRulePartsViewSet,
    CatalogViewSet,
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
        FinishesLibraryListAPIView.as_view({"get": "list"}),
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
        "catalog/",
        CatalogViewSet.as_view({"get": "list"}),
        name="catalog-list",
    ),
    path(
        "catalog/<uuid:id>/",
        CatalogViewSet.as_view({"put": "update"}),
        name="catalog-list",
    ),
    path(
        "catalog/part/<uuid:id>/",
        CatalogRulePartsViewSet.as_view({"put": "update"}),
        name="catalog-parts",
    ),
    path(
        "catalog_rules/<uuid:rule_id>/parts/",
        CatalogRulePartsListView.as_view(),
        name="catalog-rule-parts",
    ),
    path(
        "catalog/<uuid:catalog_id>/design/",
        CatalogViewSet.as_view({"post": "create"}),
        name="catalog-design-list",
    ),
]
