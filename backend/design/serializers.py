# Python imports
from typing import Any, Dict, Optional

# External imports
from rest_framework import serializers

# App imports
from design.models import Catalog, CatalogItem, Design, DesignSetting, Material, Texture
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


class TextureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Texture
        fields = ["id", "name"]


class MaterialSerializer(serializers.ModelSerializer):
    texture = TextureSerializer()

    class Meta:
        model = Material
        fields = ["id", "name", "texture"]


class CatalogRequestSerializer(serializers.Serializer):
    id = serializers.UUIDField(required=False, allow_null=True)
    name = serializers.CharField(max_length=100)
    data = serializers.JSONField(default=dict)
    is_default = serializers.BooleanField(default=False)
    is_custom = serializers.BooleanField(default=False)

    class Meta:
        fields = ["id", "name", "data"]


class CatalogItemSerializer(serializers.ModelSerializer):
    name = serializers.CharField()
    data = serializers.JSONField()
    parent_catalog = serializers.SerializerMethodField()
    catalog_image = serializers.SerializerMethodField()
    material = serializers.PrimaryKeyRelatedField(
        queryset=Material.objects.all(),
        required=False,
        allow_null=True,
        allow_empty=True,
    )

    class Meta:
        model = CatalogItem
        fields = [
            "id",
            "name",
            "data",
            "material",
            "catalog",
            "parent_catalog",
            "catalog_image",
        ]

    def validate_material(self: "CatalogItemSerializer", value: str) -> Optional[str]:
        if value == "":
            return None
        return value

    def get_parent_catalog(self: "CatalogItemSerializer", obj: CatalogItem) -> None:
        """
        Custom method to fetch the parent catalog details.
        """
        if obj.catalog and obj.catalog.parent:
            return {"id": obj.catalog.parent.id, "name": obj.catalog.parent.name}
        return None

    def get_catalog_image(self: "CatalogItemSerializer", obj: CatalogItem) -> str:
        """
        Custom method to fetch the catalog image URL.
        """
        if obj.catalog and obj.catalog.image:
            return obj.catalog.image.url
        return None


class CatalogSerializer(serializers.ModelSerializer):
    parent_name = serializers.SerializerMethodField()
    design_catalog_items = CatalogItemSerializer(many=True, source="catalogitem_set")

    class Meta:
        model = Catalog
        fields = [
            "id",
            "name",
            "organization",
            "design",
            "data",
            "image",
            "is_default",
            "is_custom",
            "parent",
            "parent_name",
            "design_catalog_items",
        ]

    def get_parent_name(self: "CatalogSerializer", obj: Catalog) -> Optional[str]:
        return obj.parent.name if obj.parent else None


class CatalogPayloadSerializer(serializers.Serializer):
    data = serializers.DictField()

    def validate_data(
        self: "CatalogPayloadSerializer", value: Dict[str, Any]
    ) -> Dict[str, Any]:
        if "catalog" not in value:
            """
            Validate that the catalog field is present.
            """
            raise serializers.ValidationError({"catalog": "This field is required."})

        catalog_serializer = CatalogRequestSerializer(data=value["catalog"])
        catalog_serializer.is_valid(raise_exception=True)

        if "items" in value:
            items_serializer = CatalogItemSerializer(data=value["items"], many=True)
            items_serializer.is_valid(raise_exception=True)

        if "child_catalogs" in value:
            for child in value["child_catalogs"]:
                child_serializer = CatalogRequestSerializer(
                    data=child.get("catalog", {})
                )
                child_serializer.is_valid(raise_exception=True)
                if "items" in child:
                    items_serializer = CatalogItemSerializer(
                        data=child["items"], many=True
                    )
                    items_serializer.is_valid(raise_exception=True)

        return value

    def to_internal_value(
        self: "CatalogPayloadSerializer", data: Dict[str, Any]
    ) -> Dict[str, Any]:
        validated_data = super().to_internal_value(data)
        internal_data = validated_data.get("data", {})
        return {
            "catalog": internal_data.get("catalog", {}),
            "items": internal_data.get("items", []),
            "child_catalogs": internal_data.get("child_catalogs", []),
        }


class DesignCatalogItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CatalogItem
        fields = ["id", "name", "data", "material"]


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
