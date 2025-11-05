import banding from '@/assets/material/banding.svg';
import boardstock from '@/assets/material/brandstok.svg';
import caster from '@/assets/material/caster.svg';
import connector from '@/assets/material/connector.svg';
import drawerguide from '@/assets/material/drawerguid.svg';
import hinge from '@/assets/material/hing.svg';
import misc from '@/assets/material/mis.svg';
import molding from '@/assets/material/molding.svg';
import type { MaterialItem, TableColumn } from './types';

export const STATIC_MATERIAL_TYPES: MaterialItem[] = [
  { id: 'banding', name: 'Banding', icon: banding.src },
  { id: 'board_stock', name: 'Board Stock', icon: boardstock.src },
  { id: 'caster', name: 'Caster', icon: caster.src },
  { id: 'connector', name: 'Connector', icon: connector.src },
  { id: 'drawer_guide', name: 'Drawer Guide', icon: drawerguide.src },
  { id: 'hinge', name: 'Hinge', icon: hinge.src },
  { id: 'hinge_plate', name: 'Hinge Plate', icon: hinge.src },
  { id: 'laminate', name: 'Laminate', icon: boardstock.src },
  { id: 'leg', name: 'Leg', icon: banding.src },
  { id: 'leg_leveler', name: 'Leg Leveler', icon: banding.src },
  { id: 'miscellaneous', name: 'Miscellaneous', icon: misc.src },
  { id: 'molding', name: 'Molding', icon: molding.src },
  { id: 'panel_stock', name: 'Panel Stock', icon: banding.src },
  { id: 'rod', name: 'Rod', icon: banding.src },
  { id: 'sliding_door_rail', name: 'Sliding Door Rail', icon: banding.src },
  { id: 'sliding_door_roller', name: 'Sliding Door Roller', icon: banding.src },
  { id: 'wire_basket', name: 'Wire Basket', icon: banding.src },
];

export const CATEGORY_TABS: Record<
  string,
  { id: string; label: string; columns: TableColumn[] }[]
> = {
  banding: [
    {
      id: 'material',
      label: 'Material',
      columns: [
        { key: 'material_name', label: 'Name', sortable: true },
        { key: 'material_description', label: 'Description', sortable: false },
        { key: 'material_type', label: 'Type', sortable: true },
        {
          key: 'material_unit_of_issue',
          label: 'Unit of Issue',
          sortable: false,
        },
        { key: 'material_vendor', label: 'Vendor', sortable: false },
        {
          key: 'material_default_cost',
          label: 'Default Cost',
          sortable: false,
        },
        { key: 'material_sell_price', label: 'Sell Price', sortable: false },
        {
          key: 'material_default_markup',
          label: 'Default Markup',
          sortable: false,
        },
        { key: 'material_sales_tax', label: 'Sales Tax', sortable: false },
        {
          key: 'material_default_tax_rate',
          label: 'Default Tax Rate',
          sortable: false,
        },
        { key: 'material_waste', label: 'Waste', sortable: false },
        { key: 'material_estimate', label: 'Estimate', sortable: false },
        { key: 'material_model', label: 'Load Model', sortable: false },
      ],
    },
    {
      id: 'banding',
      label: 'Banding',
      columns: [
        { key: 'banding_length_trim', label: 'Length Trim', sortable: false },
        { key: 'banding_thickness', label: 'Thickness', sortable: false },
      ],
    },
    {
      id: 'finishes',
      label: 'Finishes',
      columns: [{ key: 'banding_finishes_front', label: 'Front', sortable: false }],
    },
    {
      id: 'finish_type',
      label: 'Finish Type',
      columns: [{ key: 'banding_finish_type_front', label: 'Front', sortable: false }],
    },
    {
      id: 'textures',
      label: 'Textures',
      columns: [{ key: 'banding_textures_front', label: 'Front', sortable: false }],
    },
  ],
  board_stock: [
    {
      id: 'material',
      label: 'Material',
      columns: [
        { key: 'material_name', label: 'Name', sortable: true },
        { key: 'material_description', label: 'Description', sortable: false },
        { key: 'material_type', label: 'Type', sortable: true },
        {
          key: 'material_unit_of_issue',
          label: 'Unit of Issue',
          sortable: false,
        },
        { key: 'material_vendor', label: 'Vendor', sortable: false },
        {
          key: 'material_default_cost',
          label: 'Default Cost',
          sortable: false,
        },
        { key: 'material_sell_price', label: 'Sell Price', sortable: false },
        {
          key: 'material_default_markup',
          label: 'Default Markup',
          sortable: false,
        },
        { key: 'material_sales_tax', label: 'Sales Tax', sortable: false },
        {
          key: 'material_default_tax_rate',
          label: 'Default Tax Rate',
          sortable: false,
        },
        { key: 'material_waste', label: 'Waste', sortable: false },
        { key: 'material_estimate', label: 'Estimate', sortable: false },
        { key: 'material_model', label: 'Load Model', sortable: false },
      ],
    },
    {
      id: 'board',
      label: 'Board',
      columns: [
        { key: 'board_thickness', label: 'Thickness', sortable: false },
        {
          key: 'board_rough_thickness',
          label: 'Rough Thickness',
          sortable: false,
        },
      ],
    },
    {
      id: 'cnc',
      label: 'CNC',
      columns: [
        { key: 'board_cnc_optimize', label: 'Optimize', sortable: false },
        {
          key: 'board_cnc_grain_dependent',
          label: 'Grain Dependent',
          sortable: false,
        },
        { key: 'board_cnc_drop_width', label: 'Drop Width', sortable: false },
        { key: 'board_cnc_drop_length', label: 'Drop Length', sortable: false },
        {
          key: 'board_cnc_feed_rate_percent',
          label: 'Feed Rate Percent',
          sortable: false,
        },
        {
          key: 'board_cnc_spindle_speed_percent',
          label: 'Spindle Speed Percent',
          sortable: false,
        },
        {
          key: 'board_cnc_minimize_face_chip',
          label: 'Minimize Face Chip',
          sortable: false,
        },
        {
          key: 'board_cnc_minimize_back_chip',
          label: 'Minimize Back Chip',
          sortable: false,
        },
        { key: 'board_cnc_climb_cut', label: 'Climb Cut', sortable: false },
        {
          key: 'board_cnc_maximum_depth_per_pass',
          label: 'Maximum Depth Per Pass',
          sortable: false,
        },
      ],
    },
    {
      id: 'finishes',
      label: 'Finishes',
      columns: [
        { key: 'board_finishes_front', label: 'Front', sortable: false },
        { key: 'board_finishes_back', label: 'Back', sortable: false },
        { key: 'board_finishes_edge', label: 'Edge', sortable: false },
        { key: 'board_finishes_end', label: 'End', sortable: false },
      ],
    },
    {
      id: 'finish_type',
      label: 'Finish Type',
      columns: [
        { key: 'board_finish_type_front', label: 'Front', sortable: false },
        { key: 'board_finish_type_back', label: 'Back', sortable: false },
        { key: 'board_finish_type_edge', label: 'Edge', sortable: false },
        { key: 'board_finish_type_end', label: 'End', sortable: false },
      ],
    },
    {
      id: 'textures',
      label: 'Textures',
      columns: [
        { key: 'board_textures_front', label: 'Front', sortable: false },
        { key: 'board_textures_back', label: 'Back', sortable: false },
        { key: 'board_textures_edge', label: 'Edge', sortable: false },
        { key: 'board_textures_end', label: 'End', sortable: false },
      ],
    },
  ],
  caster: [
    {
      id: 'material',
      label: 'Material',
      columns: [
        { key: 'material_name', label: 'Name', sortable: true },
        { key: 'material_description', label: 'Description', sortable: false },
        { key: 'material_type', label: 'Type', sortable: true },
        {
          key: 'material_unit_of_issue',
          label: 'Unit of Issue',
          sortable: false,
        },
        { key: 'material_vendor', label: 'Vendor', sortable: false },
        {
          key: 'material_default_cost',
          label: 'Default Cost',
          sortable: false,
        },
        { key: 'material_sell_price', label: 'Sell Price', sortable: false },
        {
          key: 'material_default_markup',
          label: 'Default Markup',
          sortable: false,
        },
        { key: 'material_sales_tax', label: 'Sales Tax', sortable: false },
        {
          key: 'material_default_tax_rate',
          label: 'Default Tax Rate',
          sortable: false,
        },
        { key: 'material_waste', label: 'Waste', sortable: false },
        { key: 'material_estimate', label: 'Estimate', sortable: false },
        { key: 'material_model', label: 'Load Model', sortable: false },
      ],
    },
    {
      id: 'caster',
      label: 'Caster',
      columns: [{ key: 'caster_height', label: 'Height', sortable: false }],
    },
    {
      id: 'finishes',
      label: 'Finishes',
      columns: [
        { key: 'caster_finishes_g1', label: 'G1', sortable: false },
        { key: 'caster_finishes_g2', label: 'G2', sortable: false },
        { key: 'caster_finishes_g3', label: 'G3', sortable: false },
        { key: 'caster_finishes_g4', label: 'G4', sortable: false },
      ],
    },
    {
      id: 'finish_type',
      label: 'Finish Type',
      columns: [
        { key: 'caster_finish_type_g1', label: 'G1', sortable: false },
        { key: 'caster_finish_type_g2', label: 'G2', sortable: false },
        { key: 'caster_finish_type_g3', label: 'G3', sortable: false },
        { key: 'caster_finish_type_g4', label: 'G4', sortable: false },
      ],
    },
    {
      id: 'textures',
      label: 'Textures',
      columns: [
        { key: 'caster_textures_g1', label: 'G1', sortable: false },
        { key: 'caster_textures_g2', label: 'G2', sortable: false },
        { key: 'caster_textures_g3', label: 'G3', sortable: false },
        { key: 'caster_textures_g4', label: 'G4', sortable: false },
      ],
    },
  ],
  connector: [
    {
      id: 'material',
      label: 'Material',
      columns: [
        { key: 'material_name', label: 'Name', sortable: true },
        { key: 'material_description', label: 'Description', sortable: false },
        { key: 'material_type', label: 'Type', sortable: true },
        {
          key: 'material_unit_of_issue',
          label: 'Unit of Issue',
          sortable: false,
        },
        { key: 'material_vendor', label: 'Vendor', sortable: false },
        {
          key: 'material_default_cost',
          label: 'Default Cost',
          sortable: false,
        },
        { key: 'material_sell_price', label: 'Sell Price', sortable: false },
        {
          key: 'material_default_markup',
          label: 'Default Markup',
          sortable: false,
        },
        { key: 'material_sales_tax', label: 'Sales Tax', sortable: false },
        {
          key: 'material_default_tax_rate',
          label: 'Default Tax Rate',
          sortable: false,
        },
        { key: 'material_waste', label: 'Waste', sortable: false },
        { key: 'material_estimate', label: 'Estimate', sortable: false },
        { key: 'material_model', label: 'Load Model', sortable: false },
      ],
    },
    {
      id: 'connector',
      label: 'Connector',
      columns: [{ key: 'connector_type', label: 'Type', sortable: false }],
    },
    {
      id: 'finishes',
      label: 'Finishes',
      columns: [
        { key: 'connector_finishes_g1', label: 'G1', sortable: false },
        { key: 'connector_finishes_g2', label: 'G2', sortable: false },
      ],
    },
    {
      id: 'finish_type',
      label: 'Finish Type',
      columns: [
        { key: 'connector_finish_type_g1', label: 'G1', sortable: false },
        { key: 'connector_finish_type_g2', label: 'G2', sortable: false },
      ],
    },
    {
      id: 'textures',
      label: 'Textures',
      columns: [
        { key: 'connector_textures_g1', label: 'G1', sortable: false },
        { key: 'connector_textures_g2', label: 'G2', sortable: false },
      ],
    },
  ],
  drawer_guide: [
    {
      id: 'material',
      label: 'Material',
      columns: [
        { key: 'material_name', label: 'Name', sortable: true },
        { key: 'material_description', label: 'Description', sortable: false },
        { key: 'material_type', label: 'Type', sortable: true },
        {
          key: 'material_unit_of_issue',
          label: 'Unit of Issue',
          sortable: false,
        },
        { key: 'material_vendor', label: 'Vendor', sortable: false },
        {
          key: 'material_default_cost',
          label: 'Default Cost',
          sortable: false,
        },
        { key: 'material_sell_price', label: 'Sell Price', sortable: false },
        {
          key: 'material_default_markup',
          label: 'Default Markup',
          sortable: false,
        },
        { key: 'material_sales_tax', label: 'Sales Tax', sortable: false },
        {
          key: 'material_default_tax_rate',
          label: 'Default Tax Rate',
          sortable: false,
        },
        { key: 'material_waste', label: 'Waste', sortable: false },
        { key: 'material_estimate', label: 'Estimate', sortable: false },
        { key: 'material_model', label: 'Load Model', sortable: false },
      ],
    },
    {
      id: 'clearance',
      label: 'Clearance',
      columns: [
        {
          key: 'drawer_guide_side_clearance',
          label: 'Side Clearance',
          sortable: false,
        },
        {
          key: 'drawer_guide_minimum_below_box',
          label: 'Minimum Below Box',
          sortable: false,
        },
        {
          key: 'drawer_guide_minimum_above_box',
          label: 'Minimum Above Box',
          sortable: false,
        },
      ],
    },
    {
      id: 'guide',
      label: 'Guide',
      columns: [
        { key: 'drawer_guide_type', label: 'Type', sortable: false },
        { key: 'drawer_guide_height', label: 'Height', sortable: false },
        { key: 'drawer_guide_length', label: 'Length', sortable: false },
        { key: 'drawer_guide_extension', label: 'Extension', sortable: false },
        {
          key: 'drawer_guide_screw_center_reference_to_top',
          label: 'Screw Center Reference to Top',
          sortable: false,
        },
        {
          key: 'drawer_guide_screw_center_to_box_reference',
          label: 'Screw Center to Box Reference',
          sortable: false,
        },
        {
          key: 'drawer_guide_back_notch_length',
          label: 'Back Notch Length',
          sortable: false,
        },
        {
          key: 'drawer_guide_back_notch_height',
          label: 'Back Notch Height',
          sortable: false,
        },
        {
          key: 'drawer_guide_back_notch_offset',
          label: 'Back Notch Offset',
          sortable: false,
        },
      ],
    },
    {
      id: 'finishes',
      label: 'Finishes',
      columns: [
        { key: 'drawer_guide_finishes_g1', label: 'G1', sortable: false },
        { key: 'drawer_guide_finishes_g2', label: 'G2', sortable: false },
      ],
    },
    {
      id: 'finish_type',
      label: 'Finish Type',
      columns: [
        { key: 'drawer_guide_finish_type_g1', label: 'G1', sortable: false },
        { key: 'drawer_guide_finish_type_g2', label: 'G2', sortable: false },
      ],
    },
    {
      id: 'textures',
      label: 'Textures',
      columns: [
        { key: 'drawer_guide_textures_g1', label: 'G1', sortable: false },
        { key: 'drawer_guide_textures_g2', label: 'G2', sortable: false },
      ],
    },
  ],
  hinge: [
    {
      id: 'material',
      label: 'Material',
      columns: [
        { key: 'material_name', label: 'Name', sortable: true },
        { key: 'material_description', label: 'Description', sortable: false },
        { key: 'material_type', label: 'Type', sortable: true },
        {
          key: 'material_unit_of_issue',
          label: 'Unit of Issue',
          sortable: false,
        },
        { key: 'material_vendor', label: 'Vendor', sortable: false },
        {
          key: 'material_default_cost',
          label: 'Default Cost',
          sortable: false,
        },
        { key: 'material_sell_price', label: 'Sell Price', sortable: false },
        {
          key: 'material_default_markup',
          label: 'Default Markup',
          sortable: false,
        },
        { key: 'material_sales_tax', label: 'Sales Tax', sortable: false },
        {
          key: 'material_default_tax_rate',
          label: 'Default Tax Rate',
          sortable: false,
        },
        { key: 'material_waste', label: 'Waste', sortable: false },
        { key: 'material_estimate', label: 'Estimate', sortable: false },
        { key: 'material_model', label: 'Load Model', sortable: false },
      ],
    },
    {
      id: 'hinge',
      label: 'Hinge',
      columns: [
        { key: 'hinge_type', label: 'Type', sortable: false },
        {
          key: 'hinge_horizontal_overlay',
          label: 'Horizontal Overlay',
          sortable: false,
        },
        {
          key: 'hinge_vertical_overlay',
          label: 'Vertical Overlay',
          sortable: false,
        },
        {
          key: 'hinge_door_end_to_hinge',
          label: 'Door End to Hinge',
          sortable: false,
        },
        { key: 'hinge_inset', label: 'Inset', sortable: false },
        {
          key: 'hinge_maximum_spacing',
          label: 'Maximum Spacing',
          sortable: false,
        },
        { key: 'hinge_opening_angle', label: 'Opening Angle', sortable: false },
        {
          key: 'hinge_door_edge_to_reference_point',
          label: 'Door Edge to Reference Point',
          sortable: false,
        },
        {
          key: 'hinge_roll_out_clearance',
          label: 'Roll Out Clearance',
          sortable: false,
        },
      ],
    },
    {
      id: 'finishes',
      label: 'Finishes',
      columns: [
        { key: 'hinge_finishes_g1', label: 'G1', sortable: false },
        { key: 'hinge_finishes_g2', label: 'G2', sortable: false },
      ],
    },
    {
      id: 'finish_type',
      label: 'Finish Type',
      columns: [
        { key: 'hinge_finish_type_g1', label: 'G1', sortable: false },
        { key: 'hinge_finish_type_g2', label: 'G2', sortable: false },
      ],
    },
    {
      id: 'textures',
      label: 'Textures',
      columns: [
        { key: 'hinge_textures_g1', label: 'G1', sortable: false },
        { key: 'hinge_textures_g2', label: 'G2', sortable: false },
      ],
    },
  ],
  hinge_plate: [
    {
      id: 'material',
      label: 'Material',
      columns: [
        { key: 'material_name', label: 'Name', sortable: true },
        { key: 'material_description', label: 'Description', sortable: false },
        { key: 'material_type', label: 'Type', sortable: true },
        {
          key: 'material_unit_of_issue',
          label: 'Unit of Issue',
          sortable: false,
        },
        { key: 'material_vendor', label: 'Vendor', sortable: false },
        {
          key: 'material_default_cost',
          label: 'Default Cost',
          sortable: false,
        },
        { key: 'material_sell_price', label: 'Sell Price', sortable: false },
        {
          key: 'material_default_markup',
          label: 'Default Markup',
          sortable: false,
        },
        { key: 'material_sales_tax', label: 'Sales Tax', sortable: false },
        {
          key: 'material_default_tax_rate',
          label: 'Default Tax Rate',
          sortable: false,
        },
        { key: 'material_waste', label: 'Waste', sortable: false },
        { key: 'material_estimate', label: 'Estimate', sortable: false },
        { key: 'material_model', label: 'Load Model', sortable: false },
      ],
    },
    {
      id: 'hinge_plate',
      label: 'Hinge Plate',
      columns: [
        { key: 'hinge_plate_type', label: 'Type', sortable: false },
        {
          key: 'hinge_plate_hole_offset',
          label: 'Plate Hole Offset',
          sortable: false,
        },
      ],
    },
    {
      id: 'finishes',
      label: 'Finishes',
      columns: [{ key: 'hinge_plate_finishes_g1', label: 'G1', sortable: false }],
    },
    {
      id: 'finish_type',
      label: 'Finish Type',
      columns: [{ key: 'hinge_plate_finish_type_g1', label: 'G1', sortable: false }],
    },
    {
      id: 'textures',
      label: 'Textures',
      columns: [{ key: 'hinge_plate_textures_g1', label: 'G1', sortable: false }],
    },
  ],
  laminate: [
    {
      id: 'material',
      label: 'Material',
      columns: [
        { key: 'material_name', label: 'Name', sortable: true },
        { key: 'material_description', label: 'Description', sortable: false },
        { key: 'material_type', label: 'Type', sortable: true },
        {
          key: 'material_unit_of_issue',
          label: 'Unit of Issue',
          sortable: false,
        },
        { key: 'material_vendor', label: 'Vendor', sortable: false },
        {
          key: 'material_default_cost',
          label: 'Default Cost',
          sortable: false,
        },
        { key: 'material_sell_price', label: 'Sell Price', sortable: false },
        {
          key: 'material_default_markup',
          label: 'Default Markup',
          sortable: false,
        },
        { key: 'material_sales_tax', label: 'Sales Tax', sortable: false },
        {
          key: 'material_default_tax_rate',
          label: 'Default Tax Rate',
          sortable: false,
        },
        { key: 'material_waste', label: 'Waste', sortable: false },
        { key: 'material_estimate', label: 'Estimate', sortable: false },
        { key: 'material_model', label: 'Load Model', sortable: false },
      ],
    },
    {
      id: 'cnc',
      label: 'CNC',
      columns: [
        { key: 'laminate_cnc_optimize', label: 'Optimize', sortable: false },
        {
          key: 'laminate_cnc_grain_dependent',
          label: 'Grain Dependent',
          sortable: false,
        },
        {
          key: 'laminate_cnc_drop_width',
          label: 'Drop Width',
          sortable: false,
        },
        {
          key: 'laminate_cnc_drop_length',
          label: 'Drop Length',
          sortable: false,
        },
        {
          key: 'laminate_cnc_feed_rate_percent',
          label: 'Feed Rate Percent',
          sortable: false,
        },
        {
          key: 'laminate_cnc_spindle_speed_percent',
          label: 'Spindle Speed Percent',
          sortable: false,
        },
        {
          key: 'laminate_cnc_minimize_face_chip',
          label: 'Minimize Face Chip',
          sortable: false,
        },
        {
          key: 'laminate_cnc_minimize_back_chip',
          label: 'Minimize Back Chip',
          sortable: false,
        },
        { key: 'laminate_cnc_climb_cut', label: 'Climb Cut', sortable: false },
        {
          key: 'laminate_cnc_maximum_depth_per_pass',
          label: 'Maximum Depth Per Pass',
          sortable: false,
        },
      ],
    },
    {
      id: 'laminate',
      label: 'Laminate',
      columns: [{ key: 'laminate_oversize', label: 'Oversize', sortable: false }],
    },
    {
      id: 'size',
      label: 'Size',
      columns: [
        { key: 'laminate_size_width', label: 'Width', sortable: false },
        { key: 'laminate_size_length', label: 'Length', sortable: false },
        { key: 'laminate_size_thickness', label: 'Thickness', sortable: false },
      ],
    },
    {
      id: 'finishes',
      label: 'Finishes',
      columns: [{ key: 'laminate_finishes_front', label: 'Front', sortable: false }],
    },
    {
      id: 'finish_type',
      label: 'Finish Type',
      columns: [{ key: 'laminate_finish_type_front', label: 'Front', sortable: false }],
    },
    {
      id: 'textures',
      label: 'Textures',
      columns: [{ key: 'laminate_textures_front', label: 'Front', sortable: false }],
    },
  ],
  leg: [
    {
      id: 'material',
      label: 'Material',
      columns: [
        { key: 'material_name', label: 'Name', sortable: true },
        { key: 'material_description', label: 'Description', sortable: false },
        { key: 'material_type', label: 'Type', sortable: true },
        {
          key: 'material_unit_of_issue',
          label: 'Unit of Issue',
          sortable: false,
        },
        { key: 'material_vendor', label: 'Vendor', sortable: false },
        {
          key: 'material_default_cost',
          label: 'Default Cost',
          sortable: false,
        },
        { key: 'material_sell_price', label: 'Sell Price', sortable: false },
        {
          key: 'material_default_markup',
          label: 'Default Markup',
          sortable: false,
        },
        { key: 'material_sales_tax', label: 'Sales Tax', sortable: false },
        {
          key: 'material_default_tax_rate',
          label: 'Default Tax Rate',
          sortable: false,
        },
        { key: 'material_waste', label: 'Waste', sortable: false },
        { key: 'material_estimate', label: 'Estimate', sortable: false },
        { key: 'material_model', label: 'Load Model', sortable: false },
      ],
    },
    {
      id: 'leg',
      label: 'Leg',
      columns: [{ key: 'leg_height', label: 'Height', sortable: false }],
    },
    {
      id: 'finishes',
      label: 'Finishes',
      columns: [{ key: 'leg_finishes_g1', label: 'G1', sortable: false }],
    },
    {
      id: 'finish_type',
      label: 'Finish Type',
      columns: [{ key: 'leg_finish_type_g1', label: 'G1', sortable: false }],
    },
    {
      id: 'textures',
      label: 'Textures',
      columns: [{ key: 'leg_textures_g1', label: 'G1', sortable: false }],
    },
  ],
  leg_leveler: [
    {
      id: 'material',
      label: 'Material',
      columns: [
        { key: 'material_name', label: 'Name', sortable: true },
        { key: 'material_description', label: 'Description', sortable: false },
        { key: 'material_type', label: 'Type', sortable: true },
        {
          key: 'material_unit_of_issue',
          label: 'Unit of Issue',
          sortable: false,
        },
        { key: 'material_vendor', label: 'Vendor', sortable: false },
        {
          key: 'material_default_cost',
          label: 'Default Cost',
          sortable: false,
        },
        { key: 'material_sell_price', label: 'Sell Price', sortable: false },
        {
          key: 'material_default_markup',
          label: 'Default Markup',
          sortable: false,
        },
        { key: 'material_sales_tax', label: 'Sales Tax', sortable: false },
        {
          key: 'material_default_tax_rate',
          label: 'Default Tax Rate',
          sortable: false,
        },
        { key: 'material_waste', label: 'Waste', sortable: false },
        { key: 'material_estimate', label: 'Estimate', sortable: false },
        { key: 'material_model', label: 'Load Model', sortable: false },
      ],
    },
    {
      id: 'leg_leveler',
      label: 'Leg Leveler',
      columns: [{ key: 'leg_leveler_height', label: 'Height', sortable: false }],
    },
    {
      id: 'finishes',
      label: 'Finishes',
      columns: [
        { key: 'leg_leveler_finishes_g1', label: 'G1', sortable: false },
        { key: 'leg_leveler_finishes_g2', label: 'G2', sortable: false },
      ],
    },
    {
      id: 'finish_type',
      label: 'Finish Type',
      columns: [
        { key: 'leg_leveler_finish_type_g1', label: 'G1', sortable: false },
        { key: 'leg_leveler_finish_type_g2', label: 'G2', sortable: false },
      ],
    },
    {
      id: 'textures',
      label: 'Textures',
      columns: [
        { key: 'leg_leveler_textures_g1', label: 'G1', sortable: false },
        { key: 'leg_leveler_textures_g2', label: 'G2', sortable: false },
      ],
    },
  ],
  miscellaneous: [
    {
      id: 'material',
      label: 'Material',
      columns: [
        { key: 'material_name', label: 'Name', sortable: true },
        { key: 'material_description', label: 'Description', sortable: false },
        { key: 'material_type', label: 'Type', sortable: true },
        {
          key: 'material_unit_of_issue',
          label: 'Unit of Issue',
          sortable: false,
        },
        { key: 'material_vendor', label: 'Vendor', sortable: false },
        {
          key: 'material_default_cost',
          label: 'Default Cost',
          sortable: false,
        },
        { key: 'material_sell_price', label: 'Sell Price', sortable: false },
        {
          key: 'material_default_markup',
          label: 'Default Markup',
          sortable: false,
        },
        { key: 'material_sales_tax', label: 'Sales Tax', sortable: false },
        {
          key: 'material_default_tax_rate',
          label: 'Default Tax Rate',
          sortable: false,
        },
        { key: 'material_waste', label: 'Waste', sortable: false },
        { key: 'material_estimate', label: 'Estimate', sortable: false },
        { key: 'material_model', label: 'Load Model', sortable: false },
      ],
    },
    {
      id: 'miscellaneous',
      label: 'Miscellaneous',
      columns: [
        { key: 'miscellaneous_thickness', label: 'Thickness', sortable: false },
        { key: 'miscellaneous_model', label: 'Model', sortable: false },
      ],
    },
    {
      id: 'finishes',
      label: 'Finishes',
      columns: [
        {
          key: 'miscellaneous_finishes_front',
          label: 'Front',
          sortable: false,
        },
        { key: 'miscellaneous_finishes_back', label: 'Back', sortable: false },
        { key: 'miscellaneous_finishes_edge', label: 'Edge', sortable: false },
        { key: 'miscellaneous_finishes_end', label: 'End', sortable: false },
      ],
    },
    {
      id: 'finish_type',
      label: 'Finish Type',
      columns: [
        {
          key: 'miscellaneous_finish_type_front',
          label: 'Front',
          sortable: false,
        },
        {
          key: 'miscellaneous_finish_type_back',
          label: 'Back',
          sortable: false,
        },
        {
          key: 'miscellaneous_finish_type_edge',
          label: 'Edge',
          sortable: false,
        },
        { key: 'miscellaneous_finish_type_end', label: 'End', sortable: false },
      ],
    },
    {
      id: 'textures',
      label: 'Textures',
      columns: [
        {
          key: 'miscellaneous_textures_front',
          label: 'Front',
          sortable: false,
        },
        { key: 'miscellaneous_textures_back', label: 'Back', sortable: false },
        { key: 'miscellaneous_textures_edge', label: 'Edge', sortable: false },
        { key: 'miscellaneous_textures_end', label: 'End', sortable: false },
      ],
    },
  ],
  molding: [
    {
      id: 'material',
      label: 'Material',
      columns: [
        { key: 'material_name', label: 'Name', sortable: true },
        { key: 'material_description', label: 'Description', sortable: false },
        { key: 'material_type', label: 'Type', sortable: true },
        {
          key: 'material_unit_of_issue',
          label: 'Unit of Issue',
          sortable: false,
        },
        { key: 'material_vendor', label: 'Vendor', sortable: false },
        {
          key: 'material_default_cost',
          label: 'Default Cost',
          sortable: false,
        },
        { key: 'material_sell_price', label: 'Sell Price', sortable: false },
        {
          key: 'material_default_markup',
          label: 'Default Markup',
          sortable: false,
        },
        { key: 'material_sales_tax', label: 'Sales Tax', sortable: false },
        {
          key: 'material_default_tax_rate',
          label: 'Default Tax Rate',
          sortable: false,
        },
        { key: 'material_waste', label: 'Waste', sortable: false },
        { key: 'material_estimate', label: 'Estimate', sortable: false },
        { key: 'material_model', label: 'Load Model', sortable: false },
      ],
    },
    {
      id: 'molding',
      label: 'Molding',
      columns: [
        { key: 'molding_type', label: 'Type', sortable: false },
        { key: 'molding_length', label: 'Length', sortable: false },
        {
          key: 'molding_cost_per_joint',
          label: 'Cost per Joint',
          sortable: false,
        },
        { key: 'molding_miter_trim', label: 'Miter Trim', sortable: false },
      ],
    },
    {
      id: 'finishes',
      label: 'Finishes',
      columns: [{ key: 'molding_finishes_front', label: 'Front', sortable: false }],
    },
    {
      id: 'finish_type',
      label: 'Finish Type',
      columns: [{ key: 'molding_finish_type_front', label: 'Front', sortable: false }],
    },
    {
      id: 'textures',
      label: 'Textures',
      columns: [{ key: 'molding_textures_front', label: 'Front', sortable: false }],
    },
  ],
  panel_stock: [
    {
      id: 'material',
      label: 'Material',
      columns: [
        { key: 'material_name', label: 'Name', sortable: true },
        { key: 'material_description', label: 'Description', sortable: false },
        { key: 'material_type', label: 'Type', sortable: true },
        {
          key: 'material_unit_of_issue',
          label: 'Unit of Issue',
          sortable: false,
        },
        { key: 'material_vendor', label: 'Vendor', sortable: false },
        {
          key: 'material_default_cost',
          label: 'Default Cost',
          sortable: false,
        },
        { key: 'material_sell_price', label: 'Sell Price', sortable: false },
        {
          key: 'material_default_markup',
          label: 'Default Markup',
          sortable: false,
        },
        { key: 'material_sales_tax', label: 'Sales Tax', sortable: false },
        {
          key: 'material_default_tax_rate',
          label: 'Default Tax Rate',
          sortable: false,
        },
        { key: 'material_waste', label: 'Waste', sortable: false },
        { key: 'material_estimate', label: 'Estimate', sortable: false },
        { key: 'material_model', label: 'Load Model', sortable: false },
      ],
    },
    {
      id: 'cnc',
      label: 'CNC',
      columns: [
        { key: 'panel_stock_cnc_optimize', label: 'Optimize', sortable: false },
        {
          key: 'panel_stock_cnc_grain_dependent',
          label: 'Grain Dependent',
          sortable: false,
        },
        {
          key: 'panel_stock_cnc_drop_width',
          label: 'Drop Width',
          sortable: false,
        },
        {
          key: 'panel_stock_cnc_drop_length',
          label: 'Drop Length',
          sortable: false,
        },
        {
          key: 'panel_stock_cnc_feed_rate_percent',
          label: 'Feed Rate Percent',
          sortable: false,
        },
        {
          key: 'panel_stock_cnc_spindle_speed_percent',
          label: 'Spindle Speed Percent',
          sortable: false,
        },
        {
          key: 'panel_stock_cnc_minimize_face_chip',
          label: 'Minimize Face Chip',
          sortable: false,
        },
        {
          key: 'panel_stock_cnc_minimize_back_chip',
          label: 'Minimize Back Chip',
          sortable: false,
        },
        {
          key: 'panel_stock_cnc_climb_cut',
          label: 'Climb Cut',
          sortable: false,
        },
        {
          key: 'panel_stock_cnc_maximum_depth_per_pass',
          label: 'Maximum Depth Per Pass',
          sortable: false,
        },
      ],
    },
    {
      id: 'size',
      label: 'Size',
      columns: [
        { key: 'panel_stock_size_width', label: 'Width', sortable: false },
        { key: 'panel_stock_size_length', label: 'Length', sortable: false },
        {
          key: 'panel_stock_size_thickness',
          label: 'Thickness',
          sortable: false,
        },
      ],
    },
    {
      id: 'finishes',
      label: 'Finishes',
      columns: [
        { key: 'panel_stock_finishes_front', label: 'Front', sortable: false },
        { key: 'panel_stock_finishes_back', label: 'Back', sortable: false },
        { key: 'panel_stock_finishes_edge', label: 'Edge', sortable: false },
        { key: 'panel_stock_finishes_end', label: 'End', sortable: false },
      ],
    },
    {
      id: 'finish_type',
      label: 'Finish Type',
      columns: [
        {
          key: 'panel_stock_finish_type_front',
          label: 'Front',
          sortable: false,
        },
        { key: 'panel_stock_finish_type_back', label: 'Back', sortable: false },
        { key: 'panel_stock_finish_type_edge', label: 'Edge', sortable: false },
        { key: 'panel_stock_finish_type_end', label: 'End', sortable: false },
      ],
    },
    {
      id: 'textures',
      label: 'Textures',
      columns: [
        { key: 'panel_stock_textures_front', label: 'Front', sortable: false },
        { key: 'panel_stock_textures_back', label: 'Back', sortable: false },
        { key: 'panel_stock_textures_edge', label: 'Edge', sortable: false },
        { key: 'panel_stock_textures_end', label: 'End', sortable: false },
      ],
    },
  ],
  pull: [
    {
      id: 'material',
      label: 'Material',
      columns: [
        { key: 'material_name', label: 'Name', sortable: true },
        { key: 'material_description', label: 'Description', sortable: false },
        { key: 'material_type', label: 'Type', sortable: true },
        {
          key: 'material_unit_of_issue',
          label: 'Unit of Issue',
          sortable: false,
        },
        { key: 'material_vendor', label: 'Vendor', sortable: false },
        {
          key: 'material_default_cost',
          label: 'Default Cost',
          sortable: false,
        },
        { key: 'material_sell_price', label: 'Sell Price', sortable: false },
        {
          key: 'material_default_markup',
          label: 'Default Markup',
          sortable: false,
        },
        { key: 'material_sales_tax', label: 'Sales Tax', sortable: false },
        {
          key: 'material_default_tax_rate',
          label: 'Default Tax Rate',
          sortable: false,
        },
        { key: 'material_waste', label: 'Waste', sortable: false },
        { key: 'material_estimate', label: 'Estimate', sortable: false },
        { key: 'material_model', label: 'Load Model', sortable: false },
      ],
    },
    {
      id: 'pull',
      label: 'Pull',
      columns: [
        { key: 'pull_type', label: 'Type', sortable: false },
        {
          key: 'pull_horizontal_inset',
          label: 'Horizontal Inset',
          sortable: false,
        },
        {
          key: 'pull_vertical_inset',
          label: 'Vertical Inset',
          sortable: false,
        },
      ],
    },
    {
      id: 'finishes',
      label: 'Finishes',
      columns: [
        { key: 'pull_finishes_g1', label: 'G1', sortable: false },
        { key: 'pull_finishes_g2', label: 'G2', sortable: false },
        { key: 'pull_finishes_g3', label: 'G3', sortable: false },
      ],
    },
    {
      id: 'finish_type',
      label: 'Finish Type',
      columns: [
        { key: 'pull_finish_type_g1', label: 'G1', sortable: false },
        { key: 'pull_finish_type_g2', label: 'G2', sortable: false },
        { key: 'pull_finish_type_g3', label: 'G3', sortable: false },
      ],
    },
    {
      id: 'textures',
      label: 'Textures',
      columns: [
        { key: 'pull_textures_g1', label: 'G1', sortable: false },
        { key: 'pull_textures_g2', label: 'G2', sortable: false },
        { key: 'pull_textures_g3', label: 'G3', sortable: false },
      ],
    },
  ],
  rod: [
    {
      id: 'material',
      label: 'Material',
      columns: [
        { key: 'material_name', label: 'Name', sortable: true },
        { key: 'material_description', label: 'Description', sortable: false },
        { key: 'material_type', label: 'Type', sortable: true },
        {
          key: 'material_unit_of_issue',
          label: 'Unit of Issue',
          sortable: false,
        },
        { key: 'material_vendor', label: 'Vendor', sortable: false },
        {
          key: 'material_default_cost',
          label: 'Default Cost',
          sortable: false,
        },
        { key: 'material_sell_price', label: 'Sell Price', sortable: false },
        {
          key: 'material_default_markup',
          label: 'Default Markup',
          sortable: false,
        },
        { key: 'material_sales_tax', label: 'Sales Tax', sortable: false },
        {
          key: 'material_default_tax_rate',
          label: 'Default Tax Rate',
          sortable: false,
        },
        { key: 'material_waste', label: 'Waste', sortable: false },
        { key: 'material_estimate', label: 'Estimate', sortable: false },
        { key: 'material_model', label: 'Load Model', sortable: false },
      ],
    },
    {
      id: 'closet_rod',
      label: 'Closet Rod',
      columns: [{ key: 'rod_length', label: 'Length', sortable: false }],
    },
    {
      id: 'finishes',
      label: 'Finishes',
      columns: [{ key: 'rod_finishes_g1', label: 'G1', sortable: false }],
    },
    {
      id: 'finish_type',
      label: 'Finish Type',
      columns: [{ key: 'rod_finish_type_g1', label: 'G1', sortable: false }],
    },
    {
      id: 'textures',
      label: 'Textures',
      columns: [{ key: 'rod_textures_g1', label: 'G1', sortable: false }],
    },
  ],
  sliding_door_rail: [
    {
      id: 'material',
      label: 'Material',
      columns: [
        { key: 'material_name', label: 'Name', sortable: true },
        { key: 'material_description', label: 'Description', sortable: false },
        { key: 'material_type', label: 'Type', sortable: true },
        {
          key: 'material_unit_of_issue',
          label: 'Unit of Issue',
          sortable: false,
        },
        { key: 'material_vendor', label: 'Vendor', sortable: false },
        {
          key: 'material_default_cost',
          label: 'Default Cost',
          sortable: false,
        },
        { key: 'material_sell_price', label: 'Sell Price', sortable: false },
        {
          key: 'material_default_markup',
          label: 'Default Markup',
          sortable: false,
        },
        { key: 'material_sales_tax', label: 'Sales Tax', sortable: false },
        {
          key: 'material_default_tax_rate',
          label: 'Default Tax Rate',
          sortable: false,
        },
        { key: 'material_waste', label: 'Waste', sortable: false },
        { key: 'material_estimate', label: 'Estimate', sortable: false },
        { key: 'material_model', label: 'Load Model', sortable: false },
      ],
    },
    {
      id: 'sliding_door_rail',
      label: 'Sliding Door Rail',
      columns: [{ key: 'sliding_door_rail_length', label: 'Length', sortable: false }],
    },
    {
      id: 'finishes',
      label: 'Finishes',
      columns: [],
    },
    {
      id: 'finish_type',
      label: 'Finish Type',
      columns: [],
    },
    {
      id: 'textures',
      label: 'Textures',
      columns: [],
    },
  ],
  sliding_door_roller: [
    {
      id: 'material',
      label: 'Material',
      columns: [
        { key: 'material_name', label: 'Name', sortable: true },
        { key: 'material_description', label: 'Description', sortable: false },
        { key: 'material_type', label: 'Type', sortable: true },
        {
          key: 'material_unit_of_issue',
          label: 'Unit of Issue',
          sortable: false,
        },
        { key: 'material_vendor', label: 'Vendor', sortable: false },
        {
          key: 'material_default_cost',
          label: 'Default Cost',
          sortable: false,
        },
        { key: 'material_sell_price', label: 'Sell Price', sortable: false },
        {
          key: 'material_default_markup',
          label: 'Default Markup',
          sortable: false,
        },
        { key: 'material_sales_tax', label: 'Sales Tax', sortable: false },
        {
          key: 'material_default_tax_rate',
          label: 'Default Tax Rate',
          sortable: false,
        },
        { key: 'material_waste', label: 'Waste', sortable: false },
        { key: 'material_estimate', label: 'Estimate', sortable: false },
        { key: 'material_model', label: 'Load Model', sortable: false },
      ],
    },
    {
      id: 'sliding_door_roller',
      label: 'Sliding Door Roller',
      columns: [
        { key: 'sliding_door_roller_type', label: 'Type', sortable: false },
        {
          key: 'sliding_door_roller_door_edge_inset',
          label: 'Door Edge Inset',
          sortable: false,
        },
        {
          key: 'sliding_door_roller_door_end_inset',
          label: 'Door End Inset',
          sortable: false,
        },
        {
          key: 'sliding_door_roller_mount_on_back',
          label: 'Mount On Back',
          sortable: false,
        },
        {
          key: 'sliding_door_roller_dado_reference',
          label: 'Dado Reference',
          sortable: false,
        },
        {
          key: 'sliding_door_roller_dado_offset',
          label: 'Dado Offset',
          sortable: false,
        },
      ],
    },
    {
      id: 'finishes',
      label: 'Finishes',
      columns: [
        {
          key: 'sliding_door_roller_finishes_g1',
          label: 'G1',
          sortable: false,
        },
      ],
    },
    {
      id: 'finish_type',
      label: 'Finish Type',
      columns: [
        {
          key: 'sliding_door_roller_finish_type_g1',
          label: 'G1',
          sortable: false,
        },
      ],
    },
    {
      id: 'textures',
      label: 'Textures',
      columns: [
        {
          key: 'sliding_door_roller_textures_g1',
          label: 'G1',
          sortable: false,
        },
      ],
    },
  ],
  wire_basket: [
    {
      id: 'material',
      label: 'Material',
      columns: [
        { key: 'material_name', label: 'Name', sortable: true },
        { key: 'material_description', label: 'Description', sortable: false },
        { key: 'material_type', label: 'Type', sortable: true },
        {
          key: 'material_unit_of_issue',
          label: 'Unit of Issue',
          sortable: false,
        },
        { key: 'material_vendor', label: 'Vendor', sortable: false },
        {
          key: 'material_default_cost',
          label: 'Default Cost',
          sortable: false,
        },
        { key: 'material_sell_price', label: 'Sell Price', sortable: false },
        {
          key: 'material_default_markup',
          label: 'Default Markup',
          sortable: false,
        },
        { key: 'material_sales_tax', label: 'Sales Tax', sortable: false },
        {
          key: 'material_default_tax_rate',
          label: 'Default Tax Rate',
          sortable: false,
        },
        { key: 'material_waste', label: 'Waste', sortable: false },
        { key: 'material_estimate', label: 'Estimate', sortable: false },
        { key: 'material_model', label: 'Load Model', sortable: false },
      ],
    },
    {
      id: 'basket',
      label: 'Basket',
      columns: [
        { key: 'wire_basket_type', label: 'Type', sortable: false },
        { key: 'wire_basket_depth', label: 'Depth', sortable: false },
        { key: 'wire_basket_width', label: 'Width', sortable: false },
        { key: 'wire_basket_height', label: 'Height', sortable: false },
      ],
    },
    {
      id: 'finishes',
      label: 'Finishes',
      columns: [
        { key: 'wire_basket_finishes_g1', label: 'G1', sortable: false },
        { key: 'wire_basket_finishes_g2', label: 'G2', sortable: false },
        { key: 'wire_basket_finishes_g3', label: 'G3', sortable: false },
        { key: 'wire_basket_finishes_g4', label: 'G4', sortable: false },
        { key: 'wire_basket_finishes_g5', label: 'G5', sortable: false },
      ],
    },
    {
      id: 'finish_type',
      label: 'Finish Type',
      columns: [
        { key: 'wire_basket_finish_type_g1', label: 'G1', sortable: false },
        { key: 'wire_basket_finish_type_g2', label: 'G2', sortable: false },
        { key: 'wire_basket_finish_type_g3', label: 'G3', sortable: false },
        { key: 'wire_basket_finish_type_g4', label: 'G4', sortable: false },
        { key: 'wire_basket_finish_type_g5', label: 'G5', sortable: false },
      ],
    },
    {
      id: 'textures',
      label: 'Textures',
      columns: [
        { key: 'wire_basket_textures_g1', label: 'G1', sortable: false },
        { key: 'wire_basket_textures_g2', label: 'G2', sortable: false },
        { key: 'wire_basket_textures_g3', label: 'G3', sortable: false },
        { key: 'wire_basket_textures_g4', label: 'G4', sortable: false },
        { key: 'wire_basket_textures_g5', label: 'G5', sortable: false },
      ],
    },
  ],
};
