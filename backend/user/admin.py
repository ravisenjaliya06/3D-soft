# Django imports
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType

# App imports
from umaboy.models import Organization, User, UserOrganizationPermission


class CustomUserAdmin(UserAdmin):
    list_display = [
        "id",
        "username",
        "name",
        "email",
        "otp",
        "otp_expiration_time",
        "is_verified",
        "selected_organization",
    ]

    fieldsets = (
        (None, {"fields": ("username", "password")}),
        (
            "Personal Info",
            {
                "fields": (
                    "first_name",
                    "last_name",
                    "email",
                    "phone",
                    "profile_picture",
                    "is_verified",
                )
            },
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )


class OrganizationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "display_name",
    )


class UserOrganizationPermissionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "organization",
    )


admin.site.register(User, CustomUserAdmin)

admin.site.register(Organization, OrganizationAdmin)

admin.site.register(Permission)
admin.site.register(ContentType)
admin.site.register(UserOrganizationPermission, UserOrganizationPermissionAdmin)
