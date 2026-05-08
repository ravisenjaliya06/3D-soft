# Python imports
import base64
import json
import re
from typing import Any, Dict
from urllib.request import Request
from uuid import uuid4

# Django imports
from django.conf import settings
from django.core.files.base import ContentFile
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
    RenderImage,
)
from design.utils import create_design_settings
from material.models import FinishesLibrary, Material
from material.serializers import MaterialSerializer
from umaboy.models import Organization
from user.constant import PUT


class DesignVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DesignVersion
        fields = ["id", "design", "name"]


class DesignSerializer(serializers.ModelSerializer):
    versions = serializers.SerializerMethodField()

    class Meta:
        model = Design
        fields = [
            "id",
            "design_name",
            "status",
            "is_custom",
            "custom_design_picture",
            "rendering_project_id",
            "customer_name",
            "customer_company",
            "customer_address",
            "customer_gstin",
            "customer_contact",
            "customer_email",
            "order_number",
            "project_type",
            "project_code",
            "created_at",
            "updated_at",
            "organization",
            "created_by",
            "versions",
        ]
        read_only_fields = [
            "id",
            "organization",
            "created_by",
            "project_code",
            "versions",
        ]

    def get_versions(self: "DesignSerializer", obj: Design) -> list:
        versions = obj.designversion_set.all().order_by("-created_at")
        return DesignVersionSerializer(versions, many=True).data

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


class SceneGetSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    data = serializers.DictField(required=False)

    def _serialize_materials_without_cnc(
        self: "SceneGetSerializer", materials: list[Material]
    ) -> list:
        """
        Serialize materials manually to avoid DRF overhead (10x faster).
        """
        results = []
        for material in materials:
            # 1. Basic Fields
            m_data = {
                "id": str(material.id),
                "name": material.name,
                "type": material.type,
            }

            # Textures
            m_data["textures"] = [
                {
                    "id": str(t.id),
                    "name": t.name,
                    "texture": str(t.texture_id),
                    "texture_detail": (
                        self._serialize_finish_library(t.texture) if t.texture else None
                    ),
                }
                for t in material.textures.all()
            ]

            # 2. Properties (Dynamic)
            m_data["properties"] = self._serialize_properties(material)

            results.append(m_data)
        return results

    def _serialize_finish_library(
        self: "SceneGetSerializer", instance: FinishesLibrary
    ) -> dict:
        """Manual serialization of FinishesLibrary to avoid Factory overhead."""
        base = {
            "id": str(instance.id),
            "name": instance.name,
            "organization": (
                str(instance.organization_id) if instance.organization_id else None
            ),
            "type": instance.type,
            "image": (
                f"{settings.MEDIA_URL}{instance.image.name}" if instance.image else None
            ),
        }
        # Add type-specific fields
        if instance.type == "Finish":
            base["color"] = instance.color
        elif instance.type == "Finish Type":
            base.update(
                {
                    "shader": instance.shader,
                    "ambient": instance.ambient,
                    "diffuse": instance.diffuse,
                    "specular": instance.specular,
                    "shininess": instance.shininess,
                    "transparency": instance.transparency,
                    "brightness": instance.brightness,
                    "light": instance.light,
                    "parent_finish": (
                        str(instance.parent_finish_id)
                        if instance.parent_finish_id
                        else None
                    ),
                    "parent_texture": (
                        str(instance.parent_texture_id)
                        if instance.parent_texture_id
                        else None
                    ),
                }
            )
        elif instance.type == "Texture":
            base.update(
                {
                    "url": instance.url,
                    "width": instance.width,
                    "height": instance.height,
                    "decal": instance.decal,
                    "tile": instance.tile,
                }
            )
        return base

    def _serialize_properties(self: "SceneGetSerializer", material: Material) -> dict:
        """
        Manually serialize properties based on type.
        Uses the optimized access strategy from MaterialSerializer.
        """
        # Optimized lookup (copying logic from MaterialSerializer._get_property_obj)
        obj = getattr(material, "properties", None)
        prop_obj = None

        if obj is not None:
            if hasattr(obj, "all"):
                all_objs = obj.all()
                if len(all_objs) > 0:
                    prop_obj = all_objs[0]
            else:
                prop_obj = obj
        else:
            mgr = getattr(material, "properties_set", None)
            if mgr is not None and hasattr(mgr, "all"):
                all_objs = mgr.all()
                if len(all_objs) > 0:
                    prop_obj = all_objs[0]

        if not prop_obj:
            return {}

        # For properties, we can use model_to_dict or just the serializer
        # Using the serializer here is safer for field filtering but we can optimize instantiation
        # App imports
        from material.serializers import MaterialFactorySerializer

        serializer_class = MaterialFactorySerializer.get_material_serializer(
            material.type
        )
        return serializer_class(prop_obj).data

    def to_representation(self: "SceneGetSerializer", catalog: DesignCatalog) -> dict:
        """
        Serialize a single DesignCatalog into a scene item.
        DRF will iterate when many=True.
        """
        catalog.data.pop("minifix_connections", None)
        data = catalog.data or {}

        # Handle legacy keys and ensure "edge_banding" is provided
        edge_data = data.get("edge_banding")
        if edge_data is None:
            edge_data = data.get("edgeband")
        if edge_data is None:
            edge_data = data.get("edgeBanding")
        if edge_data is None:
            edge_data = data.get("edgebands")

        if edge_data is not None:
            data["edge_banding"] = edge_data

        model_url = None
        if catalog.model_file:
            model_url = f"{settings.MEDIA_URL}{catalog.model_file.name}"
        else:
            # Fallback for old models stored in materials
            for material in catalog.materials.all():
                props = self._serialize_properties(material)
                if props and props.get("model_file"):
                    model_url = props.get("model_file")
                    break

        return {
            **data,
            "id": str(catalog.id),
            "name": catalog.name,
            "type": catalog.type,
            "image": (
                f"{settings.MEDIA_URL}{catalog.image.name}" if catalog.image else None
            ),
            "model_file": model_url,
            "path": model_url,
            "parent": str(catalog.parent_id) if catalog.parent_id else None,
            "material": self._serialize_materials_without_cnc(catalog.materials.all()),
        }


class ScenePayloadSerializer(serializers.Serializer):
    design_id = serializers.UUIDField()
    items = serializers.ListField(required=False)
    ROOT_ITEM_FIELDS = {
        "name",
        "type",
        "is_main",
        "dimensions",
        "position",
        "rotation",
        "scale",
        "data",
        "material",
        "image",
        "model_file",
        "parent",
    }

    def _is_already_structured_items(self: "ScenePayloadSerializer", data: dict) -> bool:
        return "items" in data and isinstance(data["items"], list)

    def _ensure_mutable_payload(self: "ScenePayloadSerializer", data: dict) -> dict:
        """
        Return a mutable payload copy when the incoming structure supports mutation copy.
        """
        if hasattr(data, "copy"):
            return data.copy()
        return data

    def _extract_root_item_from_metadata(self: "ScenePayloadSerializer", data: dict) -> dict:
        """
        Parse metadata payload as root item when possible.
        """
        try:
            raw_metadata = data["metadata"]
            parsed_metadata = (
                json.loads(raw_metadata) if isinstance(raw_metadata, str) else raw_metadata
            )
            if isinstance(parsed_metadata, dict):
                return parsed_metadata
        except (KeyError, ValueError, TypeError):
            pass
        return {}

    def _parse_indexed_item_key(
        self: "ScenePayloadSerializer", key: str
    ) -> tuple[int | None, str | None]:
        """
        Parse flattened indexed key formats like `items[0]name` or `items[0].name`.
        """
        match = re.match(r"items\[(\d+)\]\.?(.*)", key)
        if not match:
            return None, None

        index = int(match.group(1))
        field_name = match.group(2).strip("[]")
        if not field_name:
            return index, None
        return index, field_name

    def _collect_indexed_item(
        self: "ScenePayloadSerializer",
        indexed_items: dict[int, dict],
        item_index: int,
        field_name: str,
        value: object,
    ) -> None:
        if item_index not in indexed_items:
            indexed_items[item_index] = {}
        indexed_items[item_index][field_name] = self._maybe_json(value)

    def _collect_root_item_field(
        self: "ScenePayloadSerializer",
        root_item: dict,
        key: str,
        value: object,
        has_root_context: bool,
    ) -> None:
        if has_root_context and key in self.ROOT_ITEM_FIELDS:
            root_item[key] = self._maybe_json(value)

    def _build_items_list(
        self: "ScenePayloadSerializer",
        indexed_items: dict[int, dict],
        root_item: dict,
    ) -> list[dict]:
        items = [indexed_items[idx] for idx in sorted(indexed_items.keys())]
        if root_item:
            items.append(root_item)
        return items

    def _inject_items_into_payload(
        self: "ScenePayloadSerializer", data: dict, items: list[dict]
    ) -> dict:
        if not items:
            return data

        if hasattr(data, "setlist"):
            data.setlist("items", items)
        else:
            data["items"] = items
        return data

    def to_internal_value(self: "ScenePayloadSerializer", data: dict) -> dict:
        """
        Optimized single-pass parsing for structured/flattened multipart data.
        Supports:
        - metadata (JSON string) + top-level files
        - items[0]name, items[0]dimensions
        - root level name, type, etc.
        """
        if self._is_already_structured_items(data):
            return super().to_internal_value(data)

        indexed_items: dict[int, dict] = {}
        has_root_metadata = "metadata" in data
        has_root_item = "name" in data and "type" in data
        has_root_context = has_root_metadata or has_root_item

        data = self._ensure_mutable_payload(data)
        root_item = (
            self._extract_root_item_from_metadata(data) if has_root_metadata else {}
        )

        for key, value in list(data.items()):
            item_index, field_name = self._parse_indexed_item_key(key)
            if item_index is not None:
                if field_name:
                    self._collect_indexed_item(
                        indexed_items=indexed_items,
                        item_index=item_index,
                        field_name=field_name,
                        value=value,
                    )
                continue

            self._collect_root_item_field(
                root_item=root_item,
                key=key,
                value=value,
                has_root_context=has_root_context,
            )

        items = self._build_items_list(indexed_items, root_item)
        data = self._inject_items_into_payload(data, items)

        return super().to_internal_value(data)

    def _maybe_json(self: "ScenePayloadSerializer", value: object) -> object:
        """Helper to parse JSON strings if applicable."""
        if isinstance(value, str) and value.strip().startswith(("{", "[")):
            try:
                return json.loads(value)
            except (ValueError, TypeError):
                return value
        return value

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
        Attach material using MaterialSerializer.
        Supports structured and flattened multipart field naming.
        """
        material_data = item.get("material") or []

        if not material_data:
            return

        for material_payload in material_data:
            material = self._get_or_create_material(material_payload, request)
            if material:
                catalog.materials.add(material)

    def _clean_data(self: "ScenePayloadSerializer", data: object) -> object:
        """
        Recursively remove File objects from dictionary/list so they can be JSON-saved.
        """
        if isinstance(data, dict):
            return {
                k: self._clean_data(v)
                for k, v in data.items()
                if not hasattr(v, "read")
            }
        if isinstance(data, list):
            return [self._clean_data(v) for v in data if not hasattr(v, "read")]
        return data

    def validate(self: "ScenePayloadSerializer", data: dict) -> dict:
        request = self.context["request"]
        is_library = request.query_params.get("is_library", "false").lower() == "true"
        if not is_library:
            return data

        items = data.get("items")
        if not items:
            return data

        organization = request.user.selected_organization
        for item in items:
            if isinstance(item, list) and len(item) > 0:
                item = item[0]

            if not isinstance(item, dict):
                continue

            is_main = item.get("is_main", item.get("isMain", False))
            if isinstance(is_main, str):
                is_main = is_main.lower() == "true"
            else:
                is_main = bool(is_main)

            parent = item.get("parent")
            if parent in ["null", "None"]:
                parent = None

            if not is_main or parent:
                continue

            name = item.get("name")
            if not name:
                continue

            if DesignCatalog.objects.filter(
                name=name, organization=organization
            ).exists():
                raise serializers.ValidationError(
                    "This name is already present, please choose another name."
                )

        return data

    def create(self: "ScenePayloadSerializer", validated_data: Dict[str, Any]) -> dict:
        request = self.context["request"]
        organization = request.user.selected_organization
        items = validated_data.get("items")
        is_library = request.query_params.get("is_library", "false").lower() == "true"

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

                image_data = item.get("image")
                image_file = None
                if (
                    image_data
                    and isinstance(image_data, str)
                    and "base64," in image_data
                ):
                    format_str, imgstr = image_data.split(";base64,")
                    ext = format_str.split("/")[-1]
                    image_file = ContentFile(
                        base64.b64decode(imgstr), name=f"{uuid4()}.{ext}"
                    )
                    item.pop("image", None)
                elif image_data and not isinstance(image_data, str):
                    # Handle binary file upload (from multipart/form-data)
                    image_file = image_data
                    item.pop("image", None)

                model_file_data = item.get("model_file")
                model_file = None
                if model_file_data and not isinstance(model_file_data, str):
                    model_file = model_file_data
                    item.pop("model_file", None)

                catalog = DesignCatalog.objects.create(
                    organization=organization,
                    version=version,
                    type=item.get("type"),
                    name=item.get("name"),
                    parent=None,
                    is_library=is_library,
                    image=image_file,
                    model_file=model_file,
                    data=self._clean_data(item.copy()),
                )

                catalog.data["id"] = str(catalog.id)
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


class RenderImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = RenderImage
        fields = ["id", "design", "image", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
