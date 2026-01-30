# Python imports
from typing import Any, Dict
from urllib.request import Request
from uuid import uuid4

# Django imports
from django.db import transaction

# External imports
from rest_framework import serializers

# App imports
from design.models import (
    Design,
    DesignCatalog,
    DesignSetting,
    DesignVersion,
    NestingFile,
    NestingSheet,
)
from design.utils import create_design_settings
from material.models import Material
from material.serializers import MaterialSerializer
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

    def _serialize_materials_without_cnc(
        self: "SceneGetSerializer", materials: Material
    ) -> list:
        """
        Serialize materials excluding CNC-related fields from properties.
        """

        material_data = MaterialSerializer(materials, many=True).data
        return material_data

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
            "material": self._serialize_materials_without_cnc(catalog.materials.all()),
        }


class ScenePayloadSerializer(serializers.Serializer):
    design_id = serializers.UUIDField()
    items = serializers.ListField(required=False)

    def _get_design(
        self: "ScenePayloadSerializer", design_id: str, organization: Organization
    ) -> Design:
        return Design.objects.get(id=design_id, organization=organization)

    def _get_or_create_material(
        self: "ScenePayloadSerializer",
        material_payload: dict,
        request: Request,
    ) -> Material:
        """
        Create material via MaterialSerializer if not exists,
        otherwise return existing one.
        """
        name = material_payload.get("name")
        if not name:
            return None

        serializer = MaterialSerializer(
            data=material_payload,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        return serializer.save()

    def _attach_material(
        self: "ScenePayloadSerializer",
        catalog: DesignCatalog,
        item: dict,
        request: Request,
    ) -> None:
        """
        Attach material using MaterialSerializer (create if missing).
        """
        material_data = item.get("material")
        if not material_data:
            return

        for material_payload in material_data:
            material = self._get_or_create_material(material_payload, request)
            if material:
                catalog.materials.add(material)

    def create(self: "ScenePayloadSerializer", validated_data: Dict[str, Any]) -> dict:
        request = self.context["request"]
        organization = request.user.selected_organization
        items = validated_data["items"]
        is_library = request.query_params.get("is_library", 'false').lower() == "true"

        design = self._get_design(validated_data["design_id"], organization)
        version = None
        if not is_library:
            version = DesignVersion.objects.create(design=design)

        if items is None:
            return {}

        with transaction.atomic():

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
                    is_library=is_library,
                    data=item.copy(),
                )

                catalog.data["id"] = str(catalog.id)
                print(catalog.data)
                catalog.save(update_fields=["data"])

                self._attach_material(catalog, item, request)

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
            "version_id": version.id if version else None,
            "catalog_ids": [c.id for c in temp_key_to_catalog.values()],
        }


class NestingFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = NestingFile
        fields = [
            "id",
            "file_type",
            "file_path",
            "file_name",
            "is_sheet_specific",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class NestingSheetSerializer(serializers.ModelSerializer):
    files = NestingFileSerializer(many=True, read_only=True)

    class Meta:
        model = NestingSheet
        fields = [
            "id",
            "sheet_number",
            "width",
            "height",
            "efficiency",
            "file_ids",
            "files",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
