# Django imports
from django.urls import path

# External imports
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

# App imports
from user.views import AddUserInOrganizationViewset, UserAuthViewset

urlpatterns = [
    path("register/", UserAuthViewset.as_view({"post": "register"}), name="register"),
    path("otp/", UserAuthViewset.as_view({"post": "send_otp"}), name="send_otp"),
    path("otp/validate/", UserAuthViewset.as_view({"post": "verify_user"}), name="otp"),
    path("login/", UserAuthViewset.as_view({"post": "login"}), name="login"),
    path(
        "forgot_password/",
        UserAuthViewset.as_view({"post": "send_forgot_password_mail"}),
        name="request_otp",
    ),
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path(
        "set_password/<str:token>/",
        UserAuthViewset.as_view({"get": "set_password", "post": "set_password"}),
        name="set_password",
    ),
    path(
        "organization/add_user/",
        AddUserInOrganizationViewset.as_view({"post": "add_organization_user"}),
        name="add_organization_user",
    ),
    path(
        "organization/edit_user/<str:user_id>/",
        AddUserInOrganizationViewset.as_view(
            {"put": "edit_organization_user_permission"}
        ),
        name="edit_organization_user_permission",
    ),
    path(
        "organization/remove_user/<str:user_id>/",
        AddUserInOrganizationViewset.as_view(
            {"delete": "remove_user_from_organization"}
        ),
        name="remove_user_from_organization",
    ),
    path(
        "organization/users/",
        AddUserInOrganizationViewset.as_view({"get": "show_organization_users"}),
        name="show_organization_users",
    ),
    path(
        "organization/invited_users/",
        AddUserInOrganizationViewset.as_view({"get": "invited_organization_users"}),
        name="invited_organization_users",
    ),
    path(
        "organization/update/",
        AddUserInOrganizationViewset.as_view({"put": "update_organization_details"}),
        name="update_organization_details",
    ),
    path(
        "organization/details/",
        AddUserInOrganizationViewset.as_view({"get": "get_organization_details"}),
        name="get_organization_details",
    ),
    path(
        "organization/all/",
        AddUserInOrganizationViewset.as_view({"get": "all_organizations"}),
        name="all_organizations",
    ),
    path(
        "ghost-permission/",
        UserAuthViewset.as_view({"put": "edit_ghost_permission"}),
        name="ghost_permission",
    ),
    path(
        "",
        UserAuthViewset.as_view({"get": "profile", "put": "edit_profile"}),
        name="profile",
    ),
]
