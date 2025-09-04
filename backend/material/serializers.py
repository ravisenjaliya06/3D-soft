# Python imports
from typing import Dict

# External imports
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

# Local imports
from .models import (
    Company,
    Material,
    MaterialTypes,
    MountHoles,
    MountPlateHoles,
    Properties,
)


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
            "material",
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


class MaterialSerializer(serializers.ModelSerializer):
    properties = serializers.SerializerMethodField()

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
        ]

    def get_properties(self: "MaterialSerializer", obj: Material) -> dict:
        material_type = obj.type
        serializer_class = MaterialFactorySerializer.get_material_serializer(
            material_type
        )

        props = obj.properties.first()
        if not props:
            return {}

        return serializer_class(props).data
