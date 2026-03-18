# Django imports
from django.urls import path

# App imports
from user.views import AdminView, ApproveUserView

urlpatterns = [
    path(
        "login/",
        AdminView.as_view({"get": "login_get", "post": "login_post"}),
        name="admin_login",
    ),
    path(
        "logout/",
        AdminView.as_view({"get": "logout"}),
        name="admin_logout",
    ),
    path(
        "users/",
        AdminView.as_view({"get": "users"}),
        name="admin_users",
    ),
    path(
        "approve/<str:user_id>/",
        ApproveUserView.as_view(),
        name="approve_user",
    ),
    path(
        "ghost-users/",
        AdminView.as_view({"get": "ghost_users", "post": "toggle_ghost_status"}),
        name="admin_ghost_users",
    ),
    path(
        "",
        AdminView.as_view({"get": "dashboard"}),
        name="admin_dashboard",
    ),
]
