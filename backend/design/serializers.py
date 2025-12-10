# Python imports
from typing import Any, Dict

# External imports
from rest_framework import serializers

# App imports
from design.models import Design, DesignSetting
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


class DimensionsSerializer(serializers.Serializer):
    width = serializers.FloatField()
    height = serializers.FloatField()
    depth = serializers.FloatField()


class PositionSerializer(serializers.Serializer):
    x = serializers.FloatField()
    y = serializers.FloatField()
    z = serializers.FloatField()


class RotationSerializer(serializers.Serializer):
    x = serializers.FloatField()
    y = serializers.FloatField()
    z = serializers.FloatField()


class MaterialSerializer(serializers.Serializer):
    type = serializers.CharField()
    value = serializers.CharField()
    repeatX = serializers.FloatField()  # noqa: N815
    repeatY = serializers.FloatField()  # noqa: N815


class NestingItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    type = serializers.CharField()
    geometryType = serializers.CharField()  # noqa: N815
    isMain = serializers.BooleanField(default=False)  # noqa: N815
    parent = serializers.CharField(required=False)
    dimensions = DimensionsSerializer()
    position = PositionSerializer()
    rotation = RotationSerializer()
