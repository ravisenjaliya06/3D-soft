# Python imports
from typing import Any, Dict

# External imports
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

# Local imports
from .models import (
    Catalog,
    CatalogRuleParts,
    CatalogRules,
    Company,
    FinishesChoices,
    FinishesLibrary,
    Material,
    MaterialFinish,
    MaterialFinishType,
    MaterialTexture,
    MaterialTypes,
    MountHoles,
    MountPlateHoles,
    Properties,
)

import logging

class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ["id", "name", "material_type", "organization"]
        read_only_fields = ["organization"]

    def validate(self: "CompanySerializer", attrs: Dict[str, str]) -> Dict[str, str]:
        request = self.context.get("request")
        organization = getattr(request.user, "selected_organization", None)

        name = attrs.get("name")
        material_type = getattr(
            self.instance, "material_type", attrs.get("material_type")
        )

        existing_company = Company.objects.filter(
            name=name, material_type=material_type, organization=organization
        )
        if self.instance:
            existing_company = existing_company.exclude(pk=self.instance.pk)

        if name and existing_company.exists():
            raise serializers.ValidationError({"name": "Name must be unique."})
        return attrs

    def create(self: "CompanySerializer", validated_data: Dict[str, str]) -> Company:
        request = self.context.get("request")
        validated_data["organization"] = request.user.selected_organization
        return super().create(validated_data)


class MountHolesSerializer(serializers.ModelSerializer):
    class Meta:
        model = MountHoles
        fields = "__all__"


class MountPlateHolesSerializer(serializers.ModelSerializer):
    class Meta:
        model = MountPlateHoles
        fields = "__all__"


class BasePropertiesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Properties
        fields = [
            "id",
            "unit_of_issue",
            "default_cost",
            "sell_price",
            "default_markup",
            "sales_tax",
            "default_tax_rate",
            "waste",
            "eslimate",
        ]
        read_only_fields = ["id", "material"]


class BandingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Properties
        fields = BasePropertiesSerializer.Meta.fields + ["length_trim", "thickness"]


class BoardStockSerializer(serializers.ModelSerializer):
    class Meta:
        model = Properties
        fields = BasePropertiesSerializer.Meta.fields + [
            "thickness",
            "rough_thickness",
            "cnc_optimize",
            "cnc_grain_dependent",
            "cnc_drop_width",
            "cnc_drop_length",
            "cnc_feed_rate_percent",
            "cnc_spindle_speed_percent",
            "cnc_minimize_face_chip",
            "cnc_minimize_back_chip",
            "cnc_climb_cut",
            "cnc_maximum_depth_per_pass",
        ]


class CasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Properties
        fields = BasePropertiesSerializer.Meta.fields + ["height"]


class ConnectorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Properties
        fields = BasePropertiesSerializer.Meta.fields + [
            "connector_type",
            "connector_slot_type",
        ]


class DrawerGuideSerializer(serializers.ModelSerializer):
    front_mount_holes = MountHolesSerializer(many=True, read_only=False)
    back_mount_holes = MountHolesSerializer(many=True, read_only=False)
    bottom_mount_holes = MountHolesSerializer(many=True, read_only=False)

    class Meta:
        model = Properties
        fields = BasePropertiesSerializer.Meta.fields + [
            "side_clearance",
            "top_clearance",
            "bottom_clearance",
            "minimum_below_box",
            "minimum_above_box",
            "guide_type",
            "height",
            "length",
            "extension",
            "screw_center_reference_to_top",
            "screw_center_to_box_reference",
            "back_notch_length",
            "back_notch_height",
            "back_notch_offset",
            "mount_holes_diameter",
            "mount_holes_depth",
            "mount_holes_top_reference",
            "mount_holes_screw_center_to_reference",
            "mount_holes_position_1",
            "mount_holes_position_2",
            "mount_holes_position_3",
            "mount_holes_position_4",
            "mount_holes_position_5",
            "mount_holes_position_6",
            "front_mount_holes",
            "back_mount_holes",
            "bottom_mount_holes",
            "back_mount_notches_length",
            "back_mount_notches_height",
            "back_mount_notches_horizontal_offset",
            "bottom_mount_holes_first_position",
            "bottom_mount_grooves_horizontal_offset",
            "bottom_mount_grooves_width",
            "bottom_mount_grooves_depth",
        ]


class HingeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Properties
        fields = BasePropertiesSerializer.Meta.fields + [
            "hinge_type",
            "horizontal_overlay",
            "vertical_overlay",
            "door_end_to_hinge",
            "inset",
            "maximum_spacing",
            "opening_angle",
            "door_edge_to_reference_point",
            "roll_out_clearance",
            "cup_diameter",
            "cup_depth",
            "anchor_holes_cup_to_anchor",
            "anchor_holes_diameter",
            "anchor_holes_depth",
            "anchor_holes_spacing",
        ]


class HingePlateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Properties
        fields = BasePropertiesSerializer.Meta.fields + [
            "hinge_plate_type",
            "hole_offset",
            "hinge_diameter",
            "depth",
            "spacing",
        ]


class LaminateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Properties
        fields = BasePropertiesSerializer.Meta.fields + [
            "oversize",
            "cnc_optimize",
            "cnc_grain_dependent",
            "cnc_drop_width",
            "cnc_drop_length",
            "cnc_feed_rate_percent",
            "cnc_spindle_speed_percent",
            "cnc_minimize_face_chip",
            "cnc_minimize_back_chip",
            "cnc_climb_cut",
            "cnc_maximum_depth_per_pass",
        ]


class LegSerializer(serializers.ModelSerializer):
    class Meta:
        model = Properties
        fields = BasePropertiesSerializer.Meta.fields + ["leg_type", "height"]


class LegLevelerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Properties
        fields = BasePropertiesSerializer.Meta.fields + ["height"]


class MiscellaneousSerializer(serializers.ModelSerializer):
    class Meta:
        model = Properties
        fields = BasePropertiesSerializer.Meta.fields + ["model"]


class MoldingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Properties
        fields = BasePropertiesSerializer.Meta.fields + ["molding_type", "length"]


class PanelStockSerializer(serializers.ModelSerializer):
    class Meta:
        model = Properties
        fields = BasePropertiesSerializer.Meta.fields + [
            "cnc_optimize",
            "cnc_grain_dependent",
            "cnc_drop_width",
            "cnc_drop_length",
            "cnc_feed_rate_percent",
            "cnc_spindle_speed_percent",
            "cnc_minimize_face_chip",
            "cnc_minimize_back_chip",
            "cnc_climb_cut",
            "cnc_maximum_depth_per_pass",
            "width",
            "length",
            "thickness",
        ]


class PullSerializer(serializers.ModelSerializer):
    class Meta:
        model = Properties
        fields = BasePropertiesSerializer.Meta.fields + [
            "pull_type",
            "center_to_center",
            "width",
            "depth",
            "horizontal_inset",
            "vertical_inset",
            "mounting_holes_holes_diameter",
        ]


class RodSerializer(serializers.ModelSerializer):
    class Meta:
        model = Properties
        fields = BasePropertiesSerializer.Meta.fields + [
            "width",
            "length",
            "height",
            "rod_type",
            "boring_pattern",
            "boring_diameter",
            "boring_spacing",
            "boring_quantity",
            "boring_depth",
        ]


class SlidingDoorRailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Properties
        fields = BasePropertiesSerializer.Meta.fields + [
            "length",
            "sliding_door_rail_type",
            "boring_first_position",
            "rail_boring_diameter",
            "boring_depth",
            "boring_spacing",
        ]


class SlidingDoorRollerSerializer(serializers.ModelSerializer):
    mount_plate_hole_one = MountPlateHolesSerializer(many=True, read_only=False)
    mount_plate_hole_two = MountPlateHolesSerializer(many=True, read_only=False)
    mount_plate_hole_third = MountPlateHolesSerializer(many=True, read_only=False)
    mount_plate_hole_forth = MountPlateHolesSerializer(many=True, read_only=False)
    mount_plate_hole_fifth = MountPlateHolesSerializer(many=True, read_only=False)

    class Meta:
        model = Properties
        fields = BasePropertiesSerializer.Meta.fields + [
            "sliding_door_roller_type",
            "mount_on_back",
            "horizontal_offset",
            "vertical_offset",
            "door_edge_inset",
            "door_end_inset",
            "dado_reference",
            "dado_offset",
            "mount_plate_hole_one",
            "mount_plate_hole_two",
            "mount_plate_hole_third",
            "mount_plate_hole_forth",
            "mount_plate_hole_fifth",
        ]


class WireBasketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Properties
        fields = BasePropertiesSerializer.Meta.fields + [
            "wire_basket_type",
            "basket_diameter",
            "screw_center_to_reference",
            "depth",
            "width",
            "height",
            "mount_holes_diameter",
            "mount_holes_depth",
            "mount_holes_screw_center_to_reference",
        ]


class MaterialFactorySerializer:
    @staticmethod
    def get_material_serializer(
        material_type: str,
    ) -> type[serializers.ModelSerializer]:
        serializer_mapping = {
            MaterialTypes.BANDING.value: BandingSerializer,
            MaterialTypes.BOARD_STOCK.value: BoardStockSerializer,
            MaterialTypes.CASTER.value: CasterSerializer,
            MaterialTypes.CONNECTOR.value: ConnectorSerializer,
            MaterialTypes.DRAWER_GUIDE.value: DrawerGuideSerializer,
            MaterialTypes.HINGE.value: HingeSerializer,
            MaterialTypes.HINGE_PLATE.value: HingePlateSerializer,
            MaterialTypes.LAMINATE.value: LaminateSerializer,
            MaterialTypes.LEG.value: LegSerializer,
            MaterialTypes.LEG_LEVELER.value: LegLevelerSerializer,
            MaterialTypes.MISCELLANEOUS.value: MiscellaneousSerializer,
            MaterialTypes.MOLDING.value: MoldingSerializer,
            MaterialTypes.PANEL_STOCK.value: PanelStockSerializer,
            MaterialTypes.PULL.value: PullSerializer,
            MaterialTypes.ROD.value: RodSerializer,
            MaterialTypes.SLIDING_DOOR_RAIL.value: SlidingDoorRailSerializer,
            MaterialTypes.SLIDING_DOOR_ROLLER.value: SlidingDoorRollerSerializer,
            MaterialTypes.WIRE_BASKET.value: WireBasketSerializer,
        }

        if material_type not in serializer_mapping:
            raise ValidationError(f"Unsupported material type: {material_type}")

        return serializer_mapping[material_type]


class PropertiesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Properties

    def to_representation(self: "PropertiesSerializer", instance: Properties) -> dict:
        material_type = self.context.get("material_type")
        serializer_class = MaterialFactorySerializer.get_material_serializer(
            material_type
        )
        return serializer_class(instance).data


class FinishSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinishesLibrary
        fields = ["color"]


class FinishTypeSerializer(serializers.ModelSerializer):
    parent_finish = serializers.PrimaryKeyRelatedField(read_only=True)
    parent_texture = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = FinishesLibrary
        fields = [
            "shader",
            "ambient",
            "diffuse",
            "specular",
            "shininess",
            "transparency",
            "brightness",
            "parent_finish",
            "parent_texture",
            "light",
        ]


class TextureSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinishesLibrary
        fields = ["url", "image", "width", "height", "decal", "tile"]


class FinishesLibrarySerializerFactory:
    @staticmethod
    def get_serializer(instance: FinishesLibrary) -> type[serializers.ModelSerializer]:
        if instance.type == FinishesChoices.FINISH.value:
            return FinishSerializer
        if instance.type == FinishesChoices.FINISH_TYPE.value:
            return FinishTypeSerializer
        if instance.type == FinishesChoices.TEXTURE.value:
            return TextureSerializer
        return FinishesLibrarySerializer


class FinishesLibrarySerializer(serializers.ModelSerializer):
    class Meta:
        model = FinishesLibrary
        fields = ["id", "name", "organization", "type"]

    def to_representation(
        self: "FinishesLibrarySerializer", instance: FinishesLibrary
    ) -> dict:
        base_data = super().to_representation(instance)
        serializer_class = FinishesLibrarySerializerFactory.get_serializer(instance)
        type_data = serializer_class(instance).data
        return {**base_data, **type_data}


class MaterialFinishSerializer(serializers.ModelSerializer):
    finish = serializers.PrimaryKeyRelatedField(queryset=FinishesLibrary.objects.all())
    finish_detail = FinishesLibrarySerializer(source="finish", read_only=True)

    class Meta:
        model = MaterialFinish
        fields = ["id", "name", "finish", "finish_detail"]
        extra_kwargs = {
            "id": {"required": True},
            'name': {'required': False}
        }


class MaterialFinishTypeSerializer(serializers.ModelSerializer):
    finish_type = serializers.PrimaryKeyRelatedField(
        queryset=FinishesLibrary.objects.all()
    )
    finish_type_detail = FinishesLibrarySerializer(source="finish_type", read_only=True)

    class Meta:
        model = MaterialFinishType
        fields = ["id", "name", "finish_type", "finish_type_detail"]
        extra_kwargs = {
            "id": {"required": True},
            'name': {'required': False}
        }


class MaterialTextureSerializer(serializers.ModelSerializer):
    texture = serializers.PrimaryKeyRelatedField(queryset=FinishesLibrary.objects.all())
    texture_detail = FinishesLibrarySerializer(source="texture", read_only=True)

    class Meta:
        model = MaterialTexture
        fields = ["id", "name", "texture", "texture_detail"]
        extra_kwargs = {
            "id": {"required": True},
            'name': {'required': False}
        }


class MaterialPropertySerializer(serializers.ModelSerializer):
    class Meta:
        model = Properties
        exclude = ["material"]


class MaterialSerializer(serializers.ModelSerializer):
    properties = serializers.DictField(write_only=True, required=False)
    finishes = MaterialFinishSerializer(many=True, required=False, read_only=False)
    finish_types = MaterialFinishTypeSerializer(
        many=True, required=False, read_only=False
    )
    textures = MaterialTextureSerializer(many=True, required=False, read_only=False)

    class Meta:
        model = Material
        fields = [
            "id",
            "name",
            "type",
            "company",
            "description",
            "is_deleted",
            "properties",
            "finishes",
            "finish_types",
            "textures",
        ]

    def validate(self: "MaterialSerializer", attrs: Dict[str, str]) -> Dict[str, str]:
        properties_data = attrs.get("properties")
        material_type = attrs.get("type")

        if properties_data:
            serializer_class = MaterialFactorySerializer.get_material_serializer(
                material_type
            )
            serializer = serializer_class(data=properties_data)
            serializer.is_valid(raise_exception=True)
            attrs["properties"] = serializer.validated_data

        # finishes_ids = attrs.get("finishes", [])
        # if not finishes_ids:
        #     raise serializers.ValidationError(
        #         {"finishes": "At least one finish is required."}
        #     )

        # finishes_types_ids = attrs.get("finish_types", [])
        # if not finishes_types_ids:
        #     raise serializers.ValidationError(
        #         {"finishes": "At least one finish type is required."}
        #     )

        # textures_ids = attrs.get("textures", [])
        # if not textures_ids:
        #     raise serializers.ValidationError(
        #         {"finishes": "At least one texture is required."}
        #     )
        return attrs

    def to_representation(self: "MaterialSerializer", instance: Material) -> dict:
        data = super().to_representation(instance)
        data.pop("properties", None)

        prop_obj = self._get_property_obj(instance)
        if prop_obj:
            serializer_class = MaterialFactorySerializer.get_material_serializer(
                instance.type
            )

            data["properties"] = serializer_class(prop_obj).data
        else:
            data["properties"] = {}

        return data

    def _get_property_obj(self: "MaterialSerializer", instance: Material) -> Properties:
        """
        Supports:
        - OneToOneField (reverse: material.properties -> object)
        - ForeignKey with related_name="properties" (reverse: material.properties -> manager)
        - ForeignKey with default reverse name (material.properties_set -> manager)
        """
        obj = getattr(instance, "properties", None)
        if obj is not None and not hasattr(obj, "all") and not hasattr(obj, "first"):
            return obj

        if hasattr(obj, "first"):
            return obj.first()
        mgr = getattr(instance, "properties_set", None)
        if hasattr(mgr, "first"):
            return mgr.first()

        return None

    def create(self: "MaterialSerializer", validated_data: Dict[str, str]) -> Material:
        properties_data = validated_data.pop("properties", None)
        finishes_data = validated_data.pop("finishes", [])
        finish_types_data = validated_data.pop("finish_types", [])
        textures_data = validated_data.pop("textures", [])

        material = Material.objects.create(**validated_data)

        if properties_data:
            Properties.objects.create(material=material, **properties_data)

        for f in finishes_data:
            finish = f.pop("finish")
            MaterialFinish.objects.create(
                material=material, name=f.get("name", ""), finish=finish
            )

        for ft in finish_types_data:
            finish_type = ft.pop("finish_type")
            MaterialFinishType.objects.create(
                material=material, name=ft.get("name", ""), finish_type=finish_type
            )

        for t in textures_data:
            texture = t.pop("texture")
            MaterialTexture.objects.create(
                material=material, name=t.get("name", ""), texture=texture
            )

        material.refresh_from_db()
        return material

    def update(
        self: "MaterialSerializer", instance: Material, validated_data: dict
    ) -> Material:
        # Pop nested data
        properties_data = validated_data.pop("properties", None)
        finishes_data = validated_data.pop("finishes", [])
        finish_types_data = validated_data.pop("finish_types", [])
        textures_data = validated_data.pop("textures", [])

        # Update main Material fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Update properties if properties exist
        if properties_data and hasattr(instance, "properties"):
                properties_data.unit_of_issue = properties_data.get(
                    "unit_of_issue", finishes_obj.unit_of_issue
                )
                properties_data.default_cost = properties_data.get(
                    "default_cost", properties_data.default_cost
                )
                properties_data.sell_price = properties_data.get(
                    "sell_price", properties_data.sell_price
                )
                properties_data.length = properties_data.get(
                    "length", properties_data.length
                )
                properties_data.width = properties_data.get(
                    "width", properties_data.width
                )
                properties_data.thickness = properties_data.get(
                    "thickness", properties_data.thickness
                )
                properties_data.save()  

        # Update finishes
        if finishes_data:
            finishes_data = self.initial_data["finishes"]
            for finish in finishes_data: 
                finish_id_obj = finish.get("id")
                # Filter only finishes for this material with this name
                finishes_obj = MaterialFinish.objects.filter(id=finish_id_obj)
                if finishes_obj:
                    finishes_obj.finish = finish.get("finish")
                    finishes_obj.update(finish=finishes_obj.finish)
            
        # Update finish_types
        if finish_types_data:
            finish_types_data = self.initial_data["finish_types"]
            logging.info(f"finish type_data {finish_types_data}")
            for finish_type in finish_types_data:
                logging.info(f"finish_type {finish_type}")
                finish_type_id = finish_type.get("id")
                logging.info(f"finish_type_id {finish_type_id}")
                # Filter only finishe_type for this material with this name
                finishes_type_obj = MaterialFinishType.objects.filter(id=finish_type_id)
                if finishes_type_obj:
                    finishes_type_obj.finish_type = finish_type.get("finish_type")
                    logging.info(f"finishes_type_obj.finish_type {finishes_type_obj.finish_type}")
                    finishes_type_obj.update(finish_type=finishes_type_obj.finish_type)

        # Update textures
        if textures_data:
            textures_data = self.initial_data["textures"]
            for texture in textures_data:
                texture_id = texture.get("id")
                # Filter only finishes for this material with this name
                textures_obj = MaterialTexture.objects.filter(id=texture_id)
                if textures_obj: 
                    textures_obj.texture = texture.get("texture")
                    textures_obj.update(texture= textures_obj.texture)

        instance.save()
        return instance


class CatalogRulePartSerializer(serializers.ModelSerializer):
    material = serializers.SerializerMethodField()

    class Meta:
        model = CatalogRuleParts
        fields = ["id", "name", "material"]

    def get_material(self: "CatalogRulePartSerializer", obj: CatalogRuleParts) -> dict:
        if obj.material:
            return {"id": str(obj.material.id), "name": obj.material.name}
        return None


class CatalogRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CatalogRules
        fields = ["id", "name"]


class CatalogSerializer(serializers.ModelSerializer):
    catalog_rule = CatalogRuleSerializer(many=True, read_only=True)

    class Meta:
        model = Catalog
        fields = ["id", "type", "name", "description", "catalog_rule"]

    def create(self: "CatalogSerializer", validated_data: Dict[str, str]) -> Catalog:
        new_catalog = Catalog.objects.create(**validated_data)

        template_catalog = Catalog.objects.filter(
            organization__isnull=True, type=new_catalog.type
        ).first()

        if template_catalog:
            for rule in template_catalog.catalog_rule.all():
                new_rule = CatalogRules.objects.create(
                    catalog=new_catalog,
                    name=rule.name,
                )
                for part in rule.catalog_rule_parts.all():
                    CatalogRuleParts.objects.create(
                        catalog_rule=new_rule,
                        name=part.name,
                        material=part.material,
                    )

        return new_catalog


class CatalogRulePartUpdateSerializer(serializers.ModelSerializer):
    material_id = serializers.UUIDField(
        write_only=True, required=False, allow_null=True
    )

    class Meta:
        model = CatalogRuleParts
        fields = ["id", "name", "material_id"]
        read_only_fields = ["id", "name"]

    def update(
        self: "CatalogRulePartUpdateSerializer",
        instance: CatalogRuleParts,
        validated_data: Dict[str, Any],
    ) -> CatalogRuleParts:
        request = self.context.get("request")
        material_id = validated_data.get("material_id")

        if material_id is None:
            instance.material = None
        else:
            material = Material.objects.filter(
                id=material_id, organization=request.user.selected_organization
            ).first()

            if not material:
                raise serializers.ValidationError(
                    "Material not found for this organization."
                )

            instance.material = material

        instance.save()
        return instance
