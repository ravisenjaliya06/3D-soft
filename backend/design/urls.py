# Django imports
from django.urls import path

# App imports
from design.views import (
    DesignSettingViewset,
    DesignViewset,
    NestAPIViewset,
    OrganizationDesignSettingViewSet,
)

urlpatterns = [
    path(
        "setting/",
        OrganizationDesignSettingViewSet.as_view(
            {"post": "create", "get": "get", "put": "update"}
        ),
        name="organization_design_settings",
    ),
    # Nesting endpoints
    path(
        "nesting/",
        NestAPIViewset.as_view({"get": "nesting"}),
        name="nesting",
    ),
    path(
        "<str:design_id>/nesting/download/",
        NestAPIViewset.as_view({"put": "download_nesting_file"}),
        name="download_nesting_file",
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
]
