# Python imports
from typing import Any, Dict

# Django imports
from django.db import transaction

# External imports
from rest_framework import serializers

# App imports
from design.models import (
    CatalogRuleParts,
    CatalogRules,
    Design,
    DesignCatalog,
    DesignSetting,
    DesignVersion,
)
from design.utils import create_design_settings, split_parents_and_children
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
    geometryType = serializers.CharField()  # noqa: N815
    isMain = serializers.BooleanField(default=False)  # noqa: N815
    parent = serializers.CharField(required=False)


class DesignVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DesignVersion
        fields = ["id", "design"]


class SceneGetSerializer(serializers.Serializer):
    design_id = serializers.UUIDField()
    items = serializers.ListField()

    def to_representation(self: "SceneGetSerializer", version: DesignVersion) -> dict:
        catalogs = DesignCatalog.objects.filter(version=version).prefetch_related(
            "catalog_rule__catalog_rule_parts",
        )

        items = []

        for catalog in catalogs:
            items.append(
                {
                    "id": str(catalog.id),
                    **(catalog.data or {}),
                }
            )

            for rule in catalog.catalog_rule.all():
                for part in rule.catalog_rule_parts.all():
                    items.append(
                        {
                            "id": part.id,
                            **part.data,
                        }
                    )

        return {
            "version_id": str(version.id),
            "items": items,
        }


class SceneItemSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    type = serializers.CharField()
    parent = serializers.CharField(required=False, allow_null=True)
    is_main = serializers.BooleanField(required=False, source="isMain")
    geometry_type = serializers.CharField(required=False, source="geometryType")
    dimensions = serializers.JSONField(required=False)
    position = serializers.JSONField(required=False)
    rotation = serializers.JSONField(required=False)
    material = serializers.JSONField(required=False)
    catalog_rule = serializers.CharField(required=False)


class ScenePayloadSerializer(serializers.Serializer):
    design_id = serializers.UUIDField()
    items = SceneItemSerializer(many=True)

    def _get_design(
        self: "ScenePayloadSerializer", design_id: str, organization: Organization
    ) -> Design:
        return Design.objects.get(
            id=design_id,
            organization=organization,
        )

    def _create_catalogs(
        self: "ScenePayloadSerializer",
        parents: dict,
        organization: Organization,
        version: DesignVersion,
    ) -> dict:
        """
        Create all catalogs first.
        Do NOT set parent FK yet.
        """
        catalog_map = {}

        for frontend_id, data in parents.items():
            catalog = DesignCatalog.objects.create(
                organization=organization,
                version=version,
                type=data.get("type"),
                name=data.get("name"),
                parent=None,
                data=data,
            )

            catalog.data["id"] = str(catalog.id)
            catalog.save(update_fields=["data"])

            catalog_map[frontend_id] = catalog

        return catalog_map

    def _link_parent_catalogs(
        self: "ScenePayloadSerializer", parents: dict, catalog_map: dict
    ) -> None:
        """
        Update parent FK for catalogs that have a parent
        """
        for frontend_id, data in parents.items():
            parent_frontend_id = data.get("parent")

            if not parent_frontend_id:
                continue

            child_catalog = catalog_map[frontend_id]
            parent_catalog = catalog_map.get(parent_frontend_id)

            if not parent_catalog:
                raise ValueError(
                    f"Parent catalog not found for frontend id: {parent_frontend_id}"
                )

            child_catalog.parent = parent_catalog
            child_catalog.data["parent"] = str(parent_catalog.id)
            child_catalog.save(update_fields=["parent", "data"])

    def _create_child_rules_and_parts(
        self: "ScenePayloadSerializer", catalog_map: dict, children_map: dict
    ) -> None:
        for parent_id, children in children_map.items():
            catalog = catalog_map[parent_id]
            rule_cache = {}

            for child in children:
                rule = self._get_or_create_rule(
                    catalog=catalog,
                    rule_cache=rule_cache,
                    rule_name=child.get("catalog_rule", "DEFAULT"),
                )

                child_data = {
                    **child,
                    "parent": str(catalog.id),
                }

                CatalogRuleParts.objects.create(
                    catalog_rule=rule,
                    name=child["name"],
                    data=child_data,
                )

    def _get_or_create_rule(
        self: "ScenePayloadSerializer",
        catalog: DesignCatalog,
        rule_cache: dict,
        rule_name: str,
    ) -> CatalogRules:
        if rule_name not in rule_cache:
            rule_cache[rule_name], _ = CatalogRules.objects.get_or_create(
                catalog=catalog,
                name=rule_name,
            )
        return rule_cache[rule_name]

    def create(self: "ScenePayloadSerializer", validated_data: dict) -> dict:
        request = self.context["request"]
        organization = request.user.selected_organization

        parents, children_map = split_parents_and_children(validated_data["items"])

        with transaction.atomic():
            design = self._get_design(validated_data["design_id"], organization)
            version = DesignVersion.objects.create(design=design)

            catalog_map = self._create_catalogs(
                parents=parents,
                organization=organization,
                version=version,
            )

            self._link_parent_catalogs(
                parents=parents,
                catalog_map=catalog_map,
            )

            self._create_child_rules_and_parts(
                catalog_map=catalog_map,
                children_map=children_map,
            )

        return {
            "message": "Design saved successfully",
            "version_id": version.id,
            "catalog_ids": [catalog.id for catalog in catalog_map.values()],
        }
