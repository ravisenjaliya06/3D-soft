# Django imports
from django.urls import path

# App imports
from design.views import (
    DesignCatalogViewSet,
    DesignSettingViewset,
    DesignVersionViewSet,
    DesignViewset,
    NestAPIViewset,
    NestingFileViewSet,
    NestingSheetViewSet,
    OrganizationDesignSettingViewSet,
    RenderImageViewSet,
)

urlpatterns = [
    path(
        "setting/",
        OrganizationDesignSettingViewSet.as_view(
            {"post": "create", "get": "get", "put": "update"}
        ),
        name="organization_design_settings",
    ),
    # Nesting Sheets and Files endpoints (must come before <str:design_id>/ patterns)
    path(
        "sheets/",
        NestingSheetViewSet.as_view({"get": "list"}),
        name="nesting_sheets",
    ),
    path(
        "files/",
        NestingFileViewSet.as_view({"get": "list"}),
        name="nesting_files",
    ),
    # Design Version
    path(
        "versions/",
        DesignVersionViewSet.as_view({"get": "list"}),
        name="design_versions",
    ),
    # Catalogs
    path(
        "catalogs/",
        DesignCatalogViewSet.as_view({"get": "list", "post": "create"}),
        name="design_catalogs",
    ),
    # Nesting endpoints
    path(
        "<str:design_id>/nesting/",
        NestAPIViewset.as_view({"post": "nesting"}),
        name="nesting",
    ),
    path(
        "<str:design_id>/nesting/download/",
        NestAPIViewset.as_view({"put": "download_nesting_file"}),
        name="download_nesting_file",
    ),
    path(
        "<str:design_id>/sheets/",
        NestingSheetViewSet.as_view({"get": "retrieve"}),
        name="nesting_sheet_detail",
    ),
    # Design endpoints
    path(
        "",
        DesignViewset.as_view({"post": "create", "get": "list"}),
        name="design",
    ),
    path(
        "<str:design_id>/settings/",
        DesignSettingViewset.as_view({"get": "retrieve", "put": "update"}),
        name="design_settings",
    ),
    path(
        "<str:design_id>/",
        DesignViewset.as_view(
            {"get": "retrieve", "put": "update", "delete": "destroy"}
        ),
        name="get_put_and_delete_design",
    ),
    path(
        "<str:design_id>/render-images/",
        RenderImageViewSet.as_view({"get": "list", "post": "create"}),
        name="render_images",
    ),
    path(
        "<str:design_id>/render-images/clear/",
        RenderImageViewSet.as_view({"post": "clear"}),
        name="render_images_clear",
    ),
]
