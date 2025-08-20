# Django imports
from django.urls import path

# App imports
from design.views import (
    CatalogItemViewset,
    DesignCatalogViewset,
    DesignNestingViewset,
    DesignSettingViewset,
    DesignViewset,
    MESViewset,
    OrganizationDesignSettingViewSet,
)

urlpatterns = [
    # Catalog endpoints
    path(
        "catalog/",
        CatalogItemViewset.as_view({"get": "list"}),
        name="catalog_item",
    ),
    path(
        "catalog/default/",
        CatalogItemViewset.as_view({"get": "default_catalog_and_items"}),
        name="default_catalog",
    ),
    path(
        "catalog/<str:catalog_id>/",
        CatalogItemViewset.as_view({"get": "get_catalog_items"}),
        name="catalog_item_get",
    ),
    path(
        "<str:design_id>/object/",
        DesignCatalogViewset.as_view(
            {"get": "list", "delete": "delete_all", "post": "create", "put": "update"}
        ),
        name="design_objects",
    ),
    path(
        "<str:design_id>/object/<str:object_id>/",
        DesignCatalogViewset.as_view({"put": "update"}),
        name="design_objects",
    ),
    path(
        "<str:design_id>/catalog/<str:catalog_id>/item/",
        DesignCatalogViewset.as_view({"post": "catalog_item_create"}),
        name="design_objects_create",
    ),
    path(
        "<str:design_id>/catalog/item/<str:item_id>/",
        DesignCatalogViewset.as_view({"get": "get_catalog_item"}),
        name="design_objects_create",
    ),
    path(
        "setting/",
        OrganizationDesignSettingViewSet.as_view(
            {"post": "create", "get": "get", "put": "update"}
        ),
        name="organization_design_settings",
    ),
    # Design endpoints
    path(
        "",
        DesignViewset.as_view({"post": "create", "get": "list"}),
        name="design",
    ),
    path(
        "<str:design_id>/",
        DesignViewset.as_view(
            {"get": "retrieve", "put": "update", "delete": "destroy"}
        ),
        name="get_put_and_delete_design",
    ),
    path(
        "<str:design_id>/settings/",
        DesignSettingViewset.as_view({"get": "retrieve", "put": "update"}),
        name="design_settings",
    ),
    # design nesting
    path(
        "<str:design_id>/nesting/",
        DesignNestingViewset.as_view({"get": "nesting"}),
        name="design_nesting",
    ),
    path(
        "<str:design_id>/nesting/download/",
        DesignNestingViewset.as_view({"put": "download_nesting_file"}),
        name="design_nesting_download",
    ),
    path(
        "<str:design_id>/mes/",
        MESViewset.as_view({"get": "list"}),
        name="mes",
    ),
]
