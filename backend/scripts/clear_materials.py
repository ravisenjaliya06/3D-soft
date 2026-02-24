# Python imports
import sys
from os.path import abspath, dirname

# Django imports
import django
from django.db.models import QuerySet

# External imports
from textures import TEXTURE

DJANGO_ROOT = dirname(dirname(abspath(__file__)))
sys.path.append(DJANGO_ROOT)
django.setup()

# App imports
from design.models import DesignCatalog
from material.models import (
    Material,
)
from umaboy.models import Organization


def get_registered_organization() -> QuerySet[Organization]:
    return Organization.objects.all()


def clear_materials():
    organizations = get_registered_organization()
    for org in organizations:
        catalogs = DesignCatalog.objects.filter(
            organization=org, is_library=True, is_script=True
        )

        for catalog in catalogs:
            for material in catalog.materials.all():
                Material.objects.filter(id=material.id).delete()

        catalog.materials.clear()

if __name__ == "__main__":
    clear_materials()
