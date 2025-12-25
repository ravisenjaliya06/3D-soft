# Django imports
import django.contrib.admin as admin

# Local imports
from .models import (
    Company,
    FinishesLibrary,
    Material,
    MaterialFinish,
    MaterialFinishType,
    MaterialTexture,
    Properties,
)


class FinishesLibraryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "type", "organization")


class CompanyAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "material_type", "organization")


class CatalogAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "type", "organization")


class CatalogRulesAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "catalog")


class CatalogRulesPartsAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "catalog_rule")


admin.site.register(Material)
admin.site.register(Properties)
admin.site.register(MaterialFinish)
admin.site.register(MaterialFinishType)
admin.site.register(MaterialTexture)
admin.site.register(Company, CompanyAdmin)
admin.site.register(FinishesLibrary, FinishesLibraryAdmin)
