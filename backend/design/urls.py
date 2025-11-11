# Django imports
from django.urls import path

# App imports
from design.views import (
    DesignSettingViewset,
    DesignViewset,
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
