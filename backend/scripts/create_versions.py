# Python imports
import sys
from os.path import abspath, dirname

# Django setup
import django

DJANGO_ROOT = dirname(dirname(abspath(__file__)))
sys.path.append(DJANGO_ROOT)
django.setup()

# Django imports
from django.db.models import Count
from design.models import Design, DesignVersion


def create_missing_design_versions() -> None:
    """
    Create a default DesignVersion for all designs that have zero versions.
    """

    designs_without_versions = Design.objects.annotate(
        version_count=Count("designversion")
    ).filter(version_count=0)

    total = designs_without_versions.count()

    if total == 0:
        print("✅ All designs already have versions")
        return

    print(f"🔍 Found {total} designs without versions")

    versions_to_create = []

    for design in designs_without_versions.iterator():
        versions_to_create.append(
            DesignVersion(
                design=design,
                name=design.design_name or "Untitled Version",
            )
        )

    # Bulk create for performance
    DesignVersion.objects.bulk_create(versions_to_create)

    print(f"✅ Created {len(versions_to_create)} missing versions")


if __name__ == "__main__":
    create_missing_design_versions()
