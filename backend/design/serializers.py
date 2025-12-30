# Python imports
from typing import Any, Dict

# Django imports
from django.db import transaction

# External imports
from rest_framework import serializers

# App imports
from material.models import Material
from design.models import (
    Design,
    DesignCatalog,
    DesignSetting,
    DesignVersion,
)
from design.utils import create_design_settings
from user.constant import PUT


class DesignSerializer(serializers.ModelSerializer):

    class Meta:
        model = Design
        fields = [
            "id",
            "design_name",
            "status",
            "is_custom",
            "custom_design_picture",
            "is_custom",
            "created_at",
            "updated_at",
            "organization",
            "created_by",
        ]
        read_only_fields = ["id", "organization", "created_by"]

    def __init__(self: "DesignSerializer", *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        if self.context.get("request") and self.context["request"].method in [PUT]:
            for field_name, field in self.fields.items():
                if field_name not in self.Meta.read_only_fields:
                    field.required = False

    def create(self: "DesignSerializer", validated_data: Dict[str, Any]) -> Design:
        request = self.context.get("request")
        validated_data["organization"] = request.user.selected_organization
        validated_data["created_by"] = request.user
        design = Design.objects.create(**validated_data)
        create_design_settings(design, request.user.selected_organization)
        return design


class DesignSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = DesignSetting
        fields = [
            "id",
            "unit",
            "sheet_width",
            "sheet_height",
            "minifix_distance",
            "groove_gap",
            "groove_dig",
            "sheet_data",
        ]


class NestingItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    type = serializers.CharField()
    geometry_type = serializers.CharField()  # noqa: N815
    isMain = serializers.BooleanField(default=False)  # noqa: N815
    parent = serializers.CharField(required=False)


class DesignVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DesignVersion
        fields = ["id", "design", "name"]


class SceneGetSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    data = serializers.DictField(required=False)

    def to_representation(self, catalog: DesignCatalog) -> dict:
        """
        Serialize a single DesignCatalog into a scene item.
        DRF will iterate when many=True.
        """

        return {
            **(catalog.data or {}),
            "id": str(catalog.id),
            "name": catalog.name,
            "type": catalog.type,
            "parent": str(catalog.parent.id) if catalog.parent else None,
        }

class ScenePayloadSerializer(serializers.Serializer):
    design_id = serializers.UUIDField()
    items = serializers.ListField()

    def _get_design(self, design_id, organization):
        return Design.objects.get(id=design_id, organization=organization)

    def _attach_material_by_name(catalog: DesignCatalog, item: dict) -> None:
        """
        Attach material using material.name instead of file path.
        """
        material_data = item.get("material")
        if not material_data:
            return

        for material_name in material_data:
            if not material_name:
                continue
            material = Material.objects.filter(name=material_name).first()

            if not material:
                continue
            catalog.materials.add(material)

    def create(self, validated_data):
        request = self.context["request"]
        organization = request.user.selected_organization
        items = validated_data["items"]

        with transaction.atomic():
            design = self._get_design(validated_data["design_id"], organization)
            version = DesignVersion.objects.create(design=design)

            catalog_map = {}

            for item in items:
                catalog = DesignCatalog.objects.create(
                    organization=organization,
                    version=version,
                    type=item.get("type"),
                    name=item.get("name"),
                    parent=None,
                    data=item,
                )

                catalog.data["id"] = str(catalog.id)
                catalog.save(update_fields=["data"])

                self._attach_material(catalog, item)

                catalog_map[item["id"]] = catalog

            # 2️⃣ Link parents
            for item in items:
                parent_frontend_id = item.get("parent")
                if not parent_frontend_id:
                    continue

                child_catalog = catalog_map[item["id"]]
                parent_catalog = catalog_map.get(parent_frontend_id)

                if not parent_catalog:
                    raise ValueError(f"Parent not found: {parent_frontend_id}")

                child_catalog.parent = parent_catalog
                child_catalog.data["parent"] = str(parent_catalog.id)
                child_catalog.save(update_fields=["parent", "data"])

        return {
            "message": "Design saved successfully",
            "version_id": version.id,
            "catalog_ids": [c.id for c in catalog_map.values()],
        }
