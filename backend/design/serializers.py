# Python imports
from typing import Any, Dict
from uuid import uuid4

# Django imports
from django.db import transaction

# External imports
from rest_framework import serializers

# App imports
from design.models import Design, DesignCatalog, DesignSetting, DesignVersion
from design.utils import create_design_settings
from material.models import Material
from umaboy.models import Organization
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

    def to_representation(self: "SceneGetSerializer", catalog: DesignCatalog) -> dict:
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
            "material": [{"id": material.id, "name": material.name, "type": material.type} for material in catalog.materials.all()],
        }


class ScenePayloadSerializer(serializers.Serializer):
    design_id = serializers.UUIDField()
    items = serializers.ListField()

    def _get_design(
        self: "ScenePayloadSerializer", design_id: str, organization: Organization
    ) -> Design:
        return Design.objects.get(id=design_id, organization=organization)

    def _attach_material_by_name(
        self: "ScenePayloadSerializer", catalog: DesignCatalog, item: dict
    ) -> None:
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

    def create(self: "ScenePayloadSerializer", validated_data: Dict[str, Any]) -> dict:
        request = self.context["request"]
        organization = request.user.selected_organization
        items = validated_data["items"]

        with transaction.atomic():
            design = self._get_design(validated_data["design_id"], organization)
            version = DesignVersion.objects.create(design=design)

            temp_key_to_catalog: dict[str, DesignCatalog] = {}
            frontend_id_to_temp_keys: dict[str, list[str]] = {}

            for index, item in enumerate(items):
                temp_key = f"{index}_{uuid4()}"

                catalog = DesignCatalog.objects.create(
                    organization=organization,
                    version=version,
                    type=item.get("type"),
                    name=item.get("name"),
                    parent=None,
                    data=item.copy(),
                )

                catalog.data["id"] = str(catalog.id)
                catalog.save(update_fields=["data"])

                self._attach_material_by_name(catalog, item)

                temp_key_to_catalog[temp_key] = catalog

                frontend_id = item.get("id")
                if frontend_id:
                    frontend_id_to_temp_keys.setdefault(frontend_id, []).append(
                        temp_key
                    )

                item["_temp_key"] = temp_key

            for item in items:
                parent_frontend_id = item.get("parent")
                if not parent_frontend_id:
                    continue

                child_catalog = temp_key_to_catalog[item["_temp_key"]]

                possible_parents = frontend_id_to_temp_keys.get(parent_frontend_id)
                if not possible_parents:
                    raise ValueError(f"Parent not found: {parent_frontend_id}")

                parent_catalog = temp_key_to_catalog[possible_parents[0]]

                child_catalog.parent = parent_catalog
                child_catalog.data["parent"] = str(parent_catalog.id)
                child_catalog.save(update_fields=["parent", "data"])

        return {
            "message": "Design saved successfully",
            "version_id": version.id,
            "catalog_ids": [c.id for c in temp_key_to_catalog.values()],
        }
