# Django imports
from django.contrib import admin

# App imports
from design.models import (
    CatalogRuleParts,
    CatalogRules,
    Design,
    DesignCatalog,
    DesignScreenshot,
    DesignSetting,
    DesignVersion,
)


class DesignAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "organization",
        "created_by",
        "design_name",
        "status",
        "created_at",
        "updated_at",
    )


class DesignCatalogObjectAdmin(admin.ModelAdmin):
    list_display = ("id", "design", "catalog")


class CatalogItemAdmin(admin.ModelAdmin):
    list_display = ("name", "id", "catalog", "material")


class TexturesAdmin(admin.ModelAdmin):
    list_display = ("name",)


class MaterialAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "texture")


class DesignObjectAdmin(admin.ModelAdmin):
    list_display = ("id",)


class DesignSettingsAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "design",
        "organization",
    )


class CatalogAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "parent", "is_default", "is_custom")


class DesignVersionAdmin(admin.ModelAdmin):
    list_display = ("id", "design")


admin.site.register(Design, DesignAdmin)
admin.site.register(DesignSetting, DesignSettingsAdmin)
admin.site.register(DesignScreenshot)
admin.site.register(DesignVersion, DesignVersionAdmin)
admin.site.register(DesignCatalog)
admin.site.register(CatalogRules)
admin.site.register(CatalogRuleParts)
