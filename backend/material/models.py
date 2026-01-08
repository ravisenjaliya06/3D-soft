# Python imports
import uuid

# Django imports
from django.db import models

# App imports
from umaboy.models import Organization


class MaterialTypes(models.TextChoices):
    """
    Material Types
    """

    BANDING = "Banding"
    BOARD_STOCK = "Board Stock"
    CASTER = "Caster"
    CONNECTOR = "Connector"
    DRAWER_GUIDE = "Drawer Guide"
    HINGE = "Hinge"
    HINGE_PLATE = "Hinge Plate"
    LAMINATE = "Laminate"
    LEG = "Leg"
    LEG_LEVELER = "Leg Leveler"
    MISCELLANEOUS = "Miscellaneous"
    MOLDING = "Molding"
    PANEL_STOCK = "Panel Stock"
    PULL = "Pull"
    ROD = "Rod"
    SLIDING_DOOR_RAIL = "Sliding Door Rail"
    SLIDING_DOOR_ROLLER = "Sliding Door Roller"
    WIRE_BASKET = "Wire Basket"
    CONNECTION = "Connection"


class UnitOfIssueChoices(models.TextChoices):
    """
    Unit of Issue
    """

    BD_FT = "BD Ft"
    BD_M = "BD M"
    Cubic_FT = "Cubic Ft"
    Cubic_M = "Cubic M"
    EACH = "Each"
    PAIR = "Pair"
    Per_FT = "Per Ft"
    Per_M = "Per M"
    SQ_FT = "SQ Ft"
    SQ_M = "SQ M"
    SHEET = "Sheet"


class ConnecterTypeChoices(models.TextChoices):
    """
    Connecter Types
    """

    CABINEO_12 = "Cabineo 12"
    CABINEO_8 = "Cabineo 8"
    CLAMEX_P_MEDIUS_14_10 = "Clamex P Medius 14 10"
    CLANEX_P_10 = "Clanex P 10"
    CLANEX_P_14 = "Clanex P 14"
    CONNECTER = "Connecter"
    DIVARIO_P_18 = "Divario P 18"
    FASTENLINK = "Fastenlink"
    LOCKDOWEL = "Lockdowel"
    PEANUT_1 = "Peanut 1"
    PEANUT_2 = "Peanut 2"
    RAFIX = "Rafix"
    TENSO_P_10 = "Tenso P 10"
    TENSO_P_14 = "Tenso P 14"


class DrawerGuideTypesChoices(models.TextChoices):
    """
    Drawer Guide Types
    """

    SIDE_MOUNT = "Side Mount"
    BOTTOM_MOUNT = "Bottom Mount"
    SYSTEM = "System"


class HingeTypesChoices(models.TextChoices):
    """
    Hinge Types
    """

    CONCEALED = "Concealed"
    DOUBLE_DOOR = "Double Door"
    EXPOSED = "Exposed"


class HingePlateTypesChoices(models.TextChoices):
    """
    Hinge Plate Types
    """

    FRAME = "Frame"
    INLINE = "Inline"
    PANEL = "Panel"


class LegTypesChoices(models.TextChoices):
    """
    Leg Types
    """

    BUN_FOOT = "Bun Foot"
    PEDESTAL = "Pedestal"
    TAPERED = "Tapered"


class MoldingTypesChoices(models.TextChoices):
    """
    Molding Types
    """

    CROWN = "Crown"
    APPLIED = "Applied"
    BASE_BOARD = "Base Board"
    CASING = "Casing"
    CEILING = "Ceiling"
    CHAIR_RAIL = "Chair Rail"
    DOOR_APPLIED = "Door Applied"
    LIGHT_RAIL = "Light Rail"
    SCRIBE = "Scribe"


class PullTypesChoices(models.TextChoices):
    """
    Pull Types
    """

    CUP_1 = "Cup #1"
    KNOB_1 = "Knob #1"
    KNOB_2 = "Knob #2"
    KNOB_3 = "Knob #3"
    KNOB_4 = "Knob #4"
    KNOB_5 = "Knob #5"
    KNOB_6 = "Knob #6"
    PULL_1 = "Pull #1"
    PULL_2 = "Pull #2"
    PULL_3 = "Pull #3"
    PULL_4 = "Pull #4"
    PULL_5 = "Pull #5"
    PULL_6 = "Pull #6"
    PULL_7 = "Pull #7"
    PULL_8 = "Pull #8"
    PULL_9 = "Pull #9"
    SWING_1 = "Swing #1"


class RodTypesChoices(models.TextChoices):
    """
    Rod Types
    """

    OVEL = "Ovel"
    ROUND = "Round"


class RodPatternChoices(models.TextChoices):
    """
    Rod Pattern
    """

    ONE = "One"
    TWO_VERTICAL = "Two Vertical"
    TWO_HORIZONTAL = "Two Horizontal"
    THREE_HOLES = "Three Holes"
    FOUR_HOLES = "Four Holes"
    MULTIPLE_VERTICAL = "Multiple Vertical"


class SlidingDoorRailTypesChoices(models.TextChoices):
    """
    Sliding Door Rail Types
    """

    RAIL = "Rail"
    ROLLER = "Roller"
    SLOT = "Slot"


class DadoReferenceTypeChoices(models.TextChoices):
    """
    Dado Reference Type
    """

    CENTER = "Center"
    BACK = "Back"
    FRONT = "Front"


class WireBasketTypesChoices(models.TextChoices):
    """
    Wire Basket Types
    """

    TOP_MOUNT = "Top Mount"
    BOTTOM_MOUNT = "Bottom Mount"
    SIDE_MOUNT = "Side Mount"
    NO_MOUNT = "No Mount"


class FinishesChoices(models.TextChoices):
    """
    Finishes
    """

    FINISH = "Finish"
    FINISH_TYPE = "Finish Type"
    TEXTURE = "Texture"


class FinishTypeShaderChoices(models.TextChoices):
    """
    Finish Type Shader
    """

    GLASS = "Glass"
    GLOSS_METAL = "Gloss Metal"
    GLOSS_PLASTIC = "Gloss Plastic"
    METAL = "Metal"
    PLASTIC = "Plastic"
    MIRROR = "Mirror"
    WOOD = "Wood"


class TextureTypeChoices(models.TextChoices):
    """
    Texture Type
    """

    MISCELLANEOUS = "Miscellaneous"
    WOOD = "Wood"
    COUNTER_TOPS = "Counter Tops"
    WALLS = "Walls"
    FLOORS = "Floors"
    LAMINATE = "Laminate"


class LightChoices(models.TextChoices):
    """
    Light
    """

    BLUE = "Blue"
    FLUORESCENT = "Fluorescent"
    GREEN = "Green"
    INCANDESCENT = "Incandescent"
    ORANGE = "Orange"
    RED = "Red"
    SKY_LIGHT = "Sky Light"
    SUN_LIGHT = "Sun Light"
    VIOLET = "Violet"
    WHITE_LIGHT = "White Light"
    YELLOW = "Yellow"


class CatalogTypeChoices(models.TextChoices):
    """
    Catalog Type
    """

    PLANK = "Plank"
    DOOR = "Door"
    DRAWER = "Drawer"
    SLIDING_DOOR = "Sliding Door"
    CABINET = "Cabinet"
    PLATFORM = "Platform"
    INVISIBLE_COMPARTMENT = "Invisible Compartment"
    SKIRTING = "Skirting"


class ConnectionTypesChoices(models.TextChoices):
    """
    Connection Types
    """

    BORE = "Bore"
    DADO = "Dado"
    LINEBORE = "Linebore"
    CONNECTOR = "Connector"


class PositionOfHolesChoices(models.TextChoices):
    """
    Position of Holes
    """

    FRONT_AND_REAR_HOLES = "Front and Rear Holes"
    RUN_FRONT_TO_REAR = "Run Front to Rear"
    RUN_REAR_TO_FRONT = "Run Rear to Front"
    BALANCED = "Balanced"
    FRONT_TO_REAR = "Front to Rear"
    SPAN = "Span"


class DadoConnectionTypesChoices(models.TextChoices):
    """
    Dado Connection Types
    """

    STOP = "Stop"
    BLIND = "Blind"
    THROUGH = "Through"


class FinishesLibrary(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, null=True, blank=True
    )
    type = models.CharField(
        max_length=100, choices=FinishesChoices.choices, null=True, blank=True
    )
    texture_type = models.CharField(
        max_length=100, choices=TextureTypeChoices.choices, null=True, blank=True
    )
    parent_finish = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="child_finishes",
    )
    parent_texture = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="child_textures",
    )
    light = models.CharField(
        max_length=100, choices=FinishesChoices.choices, null=True, blank=True
    )
    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    color = models.CharField(max_length=100, null=True, blank=True)
    shader = models.CharField(
        max_length=100, choices=FinishTypeShaderChoices.choices, null=True, blank=True
    )
    ambient = models.IntegerField(null=True, blank=True)
    diffuse = models.IntegerField(null=True, blank=True)
    specular = models.IntegerField(null=True, blank=True)
    shininess = models.IntegerField(null=True, blank=True)
    transparency = models.IntegerField(null=True, blank=True)
    brightness = models.IntegerField(null=True, blank=True)
    width = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)
    decal = models.IntegerField(null=True, blank=True)
    tile = models.IntegerField(null=True, blank=True)
    url = models.CharField(max_length=100, null=True, blank=True)
    image = models.ImageField(null=True, blank=True, upload_to="upload_textures")
    is_deleted = models.BooleanField(default=False)


class Company(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    material_type = models.CharField(max_length=100, choices=MaterialTypes.choices)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, null=True, blank=True
    )


class Material(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=100, choices=MaterialTypes.choices)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, null=True, blank=True
    )
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, null=True, blank=True
    )
    description = models.TextField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)


class MountPlateHoles(models.Model):
    horizontal_offset = models.FloatField(default=0.00)
    vertical_offset = models.FloatField(default=0.00)
    diameter = models.FloatField(default=0.00)
    depth = models.FloatField(default=0.00)


class MountHoles(models.Model):
    top_reference = models.BooleanField(default=False)
    horizontal_offset = models.FloatField(default=0.00)
    vertical_offset = models.FloatField(default=0.00)
    diameter = models.FloatField(default=0.00)
    depth = models.FloatField(default=0.00)
    spacing = models.FloatField(default=0.00)
    quantity = models.IntegerField(default=0)


class Properties(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    material = models.ForeignKey(
        Material, on_delete=models.CASCADE, related_name="properties"
    )

    model_file = models.FileField(upload_to="model_files", null=True, blank=True)
    width = models.FloatField(null=True, blank=True)
    height = models.FloatField(null=True, blank=True)
    length = models.FloatField(null=True, blank=True)
    thickness = models.FloatField(default=0.00)

    mount_holes_position_1 = models.FloatField(default=0.00)
    mount_holes_position_2 = models.FloatField(default=0.00)
    mount_holes_position_3 = models.FloatField(default=0.00)
    mount_holes_position_4 = models.FloatField(default=0.00)
    mount_holes_position_5 = models.FloatField(default=0.00)
    mount_holes_position_6 = models.FloatField(default=0.00)

    # ---------- Base Material Properties ----------
    unit_of_issue = models.CharField(
        max_length=100,
        choices=UnitOfIssueChoices.choices,
        default=UnitOfIssueChoices.EACH,
    )
    default_cost = models.FloatField(default=0.00)
    sell_price = models.FloatField(default=0.00)
    default_markup = models.FloatField(default=0.00)
    sales_tax = models.BooleanField(default=False)
    default_tax_rate = models.FloatField(default=0.00)
    waste = models.FloatField(default=0.00)
    estimate = models.BooleanField(default=False)
    length_trim = models.FloatField(default=0.00)
    rough_thickness = models.FloatField(default=0.00)

    # ---------- CNC Settings ----------
    cnc_optimize = models.BooleanField(default=False)
    cnc_grain_dependent = models.BooleanField(default=False)
    cnc_drop_width = models.IntegerField(null=True, blank=True)
    cnc_drop_length = models.IntegerField(null=True, blank=True)
    cnc_feed_rate_percent = models.FloatField(default=0.00)
    cnc_spindle_speed_percent = models.FloatField(default=0.00)
    cnc_minimize_face_chip = models.BooleanField(default=False)
    cnc_minimize_back_chip = models.BooleanField(default=False)
    cnc_climb_cut = models.BooleanField(default=False)
    cnc_maximum_depth_per_pass = models.IntegerField(null=True, blank=True)

    # ---------- Connector Fields ----------
    connector_type = models.CharField(
        max_length=100, choices=ConnecterTypeChoices.choices, blank=True, null=True
    )
    connector_slot_type = models.CharField(max_length=100, blank=True, null=True)

    # ---------- Drawer Guide Fields ----------
    side_clearance = models.FloatField(default=0.00)
    top_clearance = models.FloatField(default=0.00)
    bottom_clearance = models.FloatField(default=0.00)
    minimum_below_box = models.FloatField(default=0.00)
    minimum_above_box = models.FloatField(default=0.00)
    guide_type = models.CharField(max_length=100, blank=True, null=True)
    extension = models.CharField(max_length=100, blank=True, null=True)
    screw_center_reference_to_top = models.BooleanField(default=False)
    screw_center_to_box_reference = models.FloatField(default=0.00)
    back_notch_length = models.FloatField(default=0.00)
    back_notch_height = models.FloatField(default=0.00)
    back_notch_offset = models.FloatField(default=0.00)

    mount_holes_diameter = models.FloatField(default=0.00)
    mount_holes_depth = models.FloatField(default=0.00)
    mount_holes_top_reference = models.BooleanField(default=False)
    mount_holes_screw_center_to_reference = models.FloatField(default=0.00)
    front_mount_holes = models.ForeignKey(
        MountHoles,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="front_properties",
    )

    back_mount_holes = models.ForeignKey(
        MountHoles,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="back_properties",
    )

    bottom_mount_holes = models.ForeignKey(
        MountHoles,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bottom_properties",
    )
    back_mount_notches_length = models.FloatField(default=0.00)
    back_mount_notches_height = models.FloatField(default=0.00)
    back_mount_notches_horizontal_offset = models.FloatField(default=0.00)

    bottom_mount_holes_first_position = models.FloatField(default=0.00)

    bottom_mount_grooves_horizontal_offset = models.FloatField(default=0.00)
    bottom_mount_grooves_width = models.FloatField(default=0.00)
    bottom_mount_grooves_depth = models.FloatField(default=0.00)

    # ---------- Hinge Fields ----------
    hinge_type = models.CharField(
        max_length=100, choices=HingeTypesChoices.choices, blank=True, null=True
    )
    horizontal_overlay = models.FloatField(default=0.00)
    vertical_overlay = models.FloatField(default=0.00)
    door_end_to_hinge = models.FloatField(default=0.00)
    inset = models.FloatField(default=0.00)
    maximum_spacing = models.FloatField(default=0.00)
    opening_angle = models.FloatField(default=0.00)
    door_edge_to_reference_point = models.FloatField(default=0.00)
    roll_out_clearance = models.FloatField(default=0.00)
    cup_diameter = models.FloatField(default=0.00)
    cup_depth = models.FloatField(default=0.00)
    anchor_holes_cup_to_anchor = models.FloatField(default=0.00)
    anchor_holes_diameter = models.FloatField(default=0.00)
    anchor_holes_depth = models.FloatField(default=0.00)
    anchor_holes_spacing = models.FloatField(default=0.00)

    # ---------- Hinge Plate ----------
    hinge_plate_type = models.CharField(
        max_length=100, choices=HingePlateTypesChoices.choices, blank=True, null=True
    )
    hole_offset = models.FloatField(default=0.00)
    hinge_diameter = models.FloatField(default=0.00)
    depth = models.FloatField(default=0.00)
    spacing = models.FloatField(default=0.00)

    # ---------- Laminate ----------
    oversize = models.FloatField(default=0.00)

    # ---------- Leg ----------
    leg_type = models.CharField(
        max_length=100, choices=LegTypesChoices.choices, blank=True, null=True
    )

    # ---------- Miscellaneous ----------
    model = models.BooleanField(default=False)

    # ---------- Molding ----------
    molding_type = models.CharField(
        max_length=100, choices=MoldingTypesChoices.choices, blank=True, null=True
    )
    cost_per_joint = models.FloatField(default=0.00)
    miter_trim = models.FloatField(default=0.00)

    # ---------- Pull ----------
    pull_type = models.CharField(
        max_length=100, choices=PullTypesChoices.choices, blank=True, null=True
    )
    center_to_center = models.FloatField(default=0.00)
    horizontal_inset = models.FloatField(default=0.00)
    vertical_inset = models.FloatField(default=0.00)
    mounting_holes_holes_diameter = models.FloatField(default=0.00)

    # ---------- Rod ----------
    rod_type = models.CharField(
        max_length=100, choices=RodTypesChoices.choices, blank=True, null=True
    )
    boring_pattern = models.CharField(
        max_length=100, choices=RodPatternChoices.choices, blank=True, null=True
    )
    boring_diameter = models.FloatField(default=0.00)  # kept
    boring_spacing = models.FloatField(default=0.00)
    boring_depth = models.FloatField(default=0.00)
    boring_quantity = models.IntegerField(default=0)

    # ---------- Sliding Door Rail ----------
    sliding_door_rail_type = models.CharField(
        max_length=100,
        choices=SlidingDoorRailTypesChoices.choices,
        blank=True,
        null=True,
    )
    boring_first_position = models.FloatField(default=0.00)
    rail_boring_diameter = models.FloatField(default=0.00)  # renamed
    boring_depth = models.FloatField(default=0.00)
    boring_spacing = models.FloatField(default=0.00)

    # ---------- Sliding Door Roller ----------
    sliding_door_roller_type = models.CharField(
        max_length=100,
        choices=SlidingDoorRailTypesChoices.choices,
        blank=True,
        null=True,
    )
    mount_on_back = models.BooleanField(default=False)
    horizontal_offset = models.FloatField(default=0.00)
    vertical_offset = models.FloatField(default=0.00)
    door_edge_inset = models.FloatField(default=0.00)
    door_end_inset = models.FloatField(default=0.00)
    dado_reference = models.CharField(
        max_length=100, choices=DadoReferenceTypeChoices.choices, blank=True, null=True
    )
    dado_offset = models.FloatField(default=0.00)
    mount_plate_hole_one = models.ForeignKey(
        MountPlateHoles,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="plate_hole_one_properties",
    )
    mount_plate_hole_two = models.ForeignKey(
        MountPlateHoles,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="plate_hole_two_properties",
    )
    mount_plate_hole_third = models.ForeignKey(
        MountPlateHoles,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="plate_hole_third_properties",
    )
    mount_plate_hole_forth = models.ForeignKey(
        MountPlateHoles,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="plate_hole_forth_properties",
    )
    mount_plate_hole_fifth = models.ForeignKey(
        MountPlateHoles,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="plate_hole_fifth_properties",
    )

    # ---------- Wire Basket ----------
    wire_basket_type = models.CharField(
        max_length=100, choices=WireBasketTypesChoices.choices, blank=True, null=True
    )
    basket_diameter = models.FloatField(default=0.00)
    screw_center_to_reference = models.FloatField(default=0.00)

    # ---------- Connection ----------
    connection_type = models.CharField(
        max_length=100, choices=ConnectionTypesChoices.choices, blank=True, null=True
    )
    position_of_holes = models.CharField(
        max_length=100, choices=PositionOfHolesChoices.choices, blank=True, null=True
    )
    # ----- Bore Connection -----
    primary_hole_diameter = models.FloatField(default=0.00)
    primary_hole_depth = models.FloatField(default=0.00)
    primary_hole_center_on_thickness = models.BooleanField(default=False)
    primary_hole_table_bed_to_hole_center = models.BooleanField(default=False)
    primary_hole_table_bed_to_hole_center_value = models.FloatField(default=0.00)
    primary_hole_mitered_part_center_holes = models.BooleanField(default=False)
    primary_hole_mitered_part_distance_from_face = models.BooleanField(default=False)
    primary_hole_mitered_part_distance_from_face_value = models.FloatField(default=0.00)
    horizontal_boring_machine = models.BooleanField(default=False)
    machine_spindles = models.IntegerField(default=0, blank=True, null=True)
    position_of_the_first_hole = models.BooleanField(default=False)
    position_of_the_first_hole_value = models.FloatField(default=0.00)
    minimum_distance_of_the_first_hole = models.BooleanField(default=False)
    minimum_distance_of_the_first_hole_value = models.FloatField(default=0.00)
    spacing_distance_between_holes = models.BooleanField(default=False)
    spacing_distance_between_holes_value = models.FloatField(default=0.00)
    max_spacing_distance_between_holes = models.BooleanField(default=False)
    max_spacing_distance_between_holes_value = models.FloatField(default=0.00)
    minimum_distance_from_the_last_hole_to_edge = models.FloatField(default=0.00)
    secondary_hole_diameter = models.FloatField(default=0.00)
    secondary_hole_depth = models.FloatField(default=0.00)

    # ----- Dado Connection -----
    dado_connection_type = models.CharField(
        max_length=100,
        choices=DadoConnectionTypesChoices.choices,
        blank=True,
        null=True,
    )
    depth = models.FloatField(default=0.00)
    width_adjustment = models.FloatField(default=0.00)
    length_adjustment = models.FloatField(default=0.00)
    depth_adjustment = models.FloatField(default=0.00)

    blind_dado = models.BooleanField(default=False)
    front_notch_length = models.FloatField(default=0.00)
    rear_notch = models.BooleanField(default=False)
    rear_notch_length = models.FloatField(default=0.00)

    # ----- Linebore Connection -----
    part_side_clearence = models.FloatField(default=0.00)
    use_case_holes = models.BooleanField(default=False)
    bore_required_holes = models.BooleanField(default=False)
    number_of_holes = models.IntegerField(default=0, blank=True, null=True)
    hole_diameter = models.FloatField(default=0.00)
    hole_depth = models.FloatField(default=0.00)
    front_hole_position_from_front = models.FloatField(default=0.00)
    front_hole_position_from_rear = models.FloatField(default=0.00)
    rear_hole_position_from_front = models.FloatField(default=0.00)
    rear_hole_position_from_rear = models.FloatField(default=0.00)
    maximun_spacing_between_mid_lines = models.FloatField(default=0.00)
    holes_spacing = models.FloatField(default=0.00)


class MaterialFinish(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    material = models.ForeignKey(
        Material, on_delete=models.CASCADE, related_name="finishes"
    )
    finish = models.ForeignKey(FinishesLibrary, on_delete=models.CASCADE)


class MaterialFinishType(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    material = models.ForeignKey(
        Material, on_delete=models.CASCADE, related_name="finish_types"
    )
    finish_type = models.ForeignKey(FinishesLibrary, on_delete=models.CASCADE)


class MaterialTexture(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    material = models.ForeignKey(
        Material, on_delete=models.CASCADE, related_name="textures"
    )
    texture = models.ForeignKey(FinishesLibrary, on_delete=models.CASCADE)
