import createicon from '@/assets/createicon.svg';
import close from '@/assets/design/close.svg';
import banding from '@/assets/material/banding.svg';
import boardstock from '@/assets/material/brandstok.svg';
import caster from '@/assets/material/caster.svg';
import connector from '@/assets/material/connector.svg';
import down_arrow from '@/assets/material/down arrow.svg';
import drawerguide from '@/assets/material/drawerguid.svg';
import filter from '@/assets/material/filter.svg';
import hinge from '@/assets/material/hing.svg';
import misc from '@/assets/material/mis.svg';
import molding from '@/assets/material/molding.svg';
import up_arrow from '@/assets/material/up arrow.svg';
import Header from '@/components/header/header';
import Sidebar from '@/components/sidebar/sidebar';
import commonService from '@/services/CommonService';
import { SetStateAction, useCallback, useEffect, useState } from 'react';
import InputField from '../inputfields/InputField';
import AddMaterialPopup from './addItem';
import styles from './material.module.css';

interface MaterialItem {
  id: string;
  name: string;
  icon?: string;
  subItems?: MaterialItem[];
}

interface TableColumn {
  key: string;
  label: string;
  sortable: boolean;
}

interface MaterialResponse {
  status: number;
  data: [];
}

interface TableRow {
  id: string;
  name: string;
  description?: string;
  material_type?: string;
  unit_of_issue?: string;
  default_cost?: number;
  default_markup?: number;
  sell_price?: number;
  sales_tax?: boolean;
  default_tax_rate?: number;
  waste?: number;
  estimate?: boolean;
  model?: boolean;
}

const staticMaterialTypes: MaterialItem[] = [
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

const categoryTabs: Record<
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
      columns: [
        { key: 'banding_finishes_front', label: 'Front', sortable: false },
      ],
    },
    {
      id: 'finish_type',
      label: 'Finish Type',
      columns: [
        { key: 'banding_finish_type_front', label: 'Front', sortable: false },
      ],
    },
    {
      id: 'textures',
      label: 'Textures',
      columns: [
        { key: 'banding_textures_front', label: 'Front', sortable: false },
      ],
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
      columns: [
        { key: 'hinge_plate_finishes_g1', label: 'G1', sortable: false },
      ],
    },
    {
      id: 'finish_type',
      label: 'Finish Type',
      columns: [
        { key: 'hinge_plate_finish_type_g1', label: 'G1', sortable: false },
      ],
    },
    {
      id: 'textures',
      label: 'Textures',
      columns: [
        { key: 'hinge_plate_textures_g1', label: 'G1', sortable: false },
      ],
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
      columns: [
        { key: 'laminate_oversize', label: 'Oversize', sortable: false },
      ],
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
      columns: [
        { key: 'laminate_finishes_front', label: 'Front', sortable: false },
      ],
    },
    {
      id: 'finish_type',
      label: 'Finish Type',
      columns: [
        { key: 'laminate_finish_type_front', label: 'Front', sortable: false },
      ],
    },
    {
      id: 'textures',
      label: 'Textures',
      columns: [
        { key: 'laminate_textures_front', label: 'Front', sortable: false },
      ],
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
      columns: [
        { key: 'leg_leveler_height', label: 'Height', sortable: false },
      ],
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
      columns: [
        { key: 'molding_finishes_front', label: 'Front', sortable: false },
      ],
    },
    {
      id: 'finish_type',
      label: 'Finish Type',
      columns: [
        { key: 'molding_finish_type_front', label: 'Front', sortable: false },
      ],
    },
    {
      id: 'textures',
      label: 'Textures',
      columns: [
        { key: 'molding_textures_front', label: 'Front', sortable: false },
      ],
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
      columns: [
        { key: 'sliding_door_rail_length', label: 'Length', sortable: false },
      ],
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

const Material = () => {
  const [expandedCategory, setExpandedCategory] = useState<string>('banding');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedSubItem, setSelectedSubItem] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<string>('');
  const [addMaterialPopup, setAddMaterialPopup] = useState<boolean>(false);
  const [companyMaterials, setCompanyMaterials] = useState<TableRow[]>([]);
  const [materialCategories, setMaterialCategories] =
    useState<MaterialItem[]>(staticMaterialTypes);
  const [companyID, setCompanyID] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    categoryId: string;
  } | null>(null);
  const [contextMaterialMenu, setContextMaterialMenu] = useState<{
    x: number;
    y: number;
    companyId: string;
  } | null>(null);
  const [createCompanyPopup, setCreateCompanyPopup] = useState<boolean>(false);
  const [companyName, setCompanyName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    try {
      const response: MaterialResponse = await commonService.get(
        'material',
        'company',
      );
      if (response.status === 200) {
        const companies: TableRow[] = response.data;
        const updatedCategories = staticMaterialTypes.map((category) => {
          const matchingCompanies = companies.filter(
            (c) => c.material_type === category.name,
          );
          return {
            ...category,
            subItems: matchingCompanies.map((c) => ({
              id: c.id,
              name: c.name,
            })),
          };
        });

        setMaterialCategories(updatedCategories);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      setError('Failed to fetch companies.');
    }
  }, []);

  const handleCategoryClick = (categoryId: string, name: string) => {
    setActiveCategory(categoryId);
    const tabs = categoryTabs[categoryId];
    console.log(tabs, 'tabs');
    if (tabs && tabs.length > 0) {
      setActiveTab(tabs[0].id); // default first tab
    }
    fetchMaterialsByType(name); // load data
  };

  const normalizeMaterialType = (typeName: string): string => {
    return typeName.trim().toLowerCase().replace(/\s+/g, '_');
  };

  const mapMaterial = (m: any, type?: string): TableRow => {
    // Base material variables (common to all categories)
    const baseMaterial = {
      id: m.id,
      material_name: m.name,
      material_description: m.description,
      material_type: m.properties.material_type || m.type,
      material_unit_of_issue: m.properties.unit_of_issue,
      material_vendor: m.properties.vendor,
      material_default_cost: m.properties.default_cost,
      material_sell_price: m.properties.sell_price,
      material_default_markup: m.properties.default_markup,
      material_sales_tax: m.properties.sales_tax,
      material_default_tax_rate: m.properties.default_tax_rate,
      material_waste: m.properties.waste,
      material_estimate: m.properties.estimate || m.properties.eslimate,
      material_model: m.properties.model,
    };

    // Initialize empty object for category-specific properties
    const categorySpecific: any = {};
    const normalizedType = normalizeMaterialType(type || m.type);
    // Map properties based on material type (category)
    switch (normalizedType) {
      case 'banding':
        // Banding specific variables
        categorySpecific.banding_length_trim = m.properties.length_trim;
        categorySpecific.banding_thickness = m.properties.thickness;
        categorySpecific.banding_finishes_front = m.finishes?.front;
        categorySpecific.banding_finish_type_front = m.finishes?.front;
        categorySpecific.banding_textures_front = m.finishes?.front;
        break;

      case 'board_stock':
        // Board Stock specific variables
        categorySpecific.board_thickness = m.properties.thickness;
        categorySpecific.board_rough_thickness = m.properties.rough_thickness;
        // CNC variables for board_stock
        categorySpecific.board_cnc_optimize = m.properties.cnc_optimize;
        categorySpecific.board_cnc_grain_dependent =
          m.properties.cnc_grain_dependent;
        categorySpecific.board_cnc_drop_width = m.properties.cnc_drop_width;
        categorySpecific.board_cnc_drop_length = m.properties.cnc_drop_length;
        categorySpecific.board_cnc_feed_rate_percent =
          m.properties.cnc_feed_rate_percent;
        categorySpecific.board_cnc_spindle_speed_percent =
          m.properties.cnc_spindle_speed_percent;
        categorySpecific.board_cnc_minimize_face_chip =
          m.properties.cnc_minimize_face_chip;
        categorySpecific.board_cnc_minimize_back_chip =
          m.properties.cnc_minimize_back_chip;
        categorySpecific.board_cnc_climb_cut = m.properties.cnc_climb_cut;
        categorySpecific.board_cnc_maximum_depth_per_pass =
          m.properties.cnc_maximum_depth_per_pass;
        // Finishes
        categorySpecific.board_finishes_front = m.finishes?.front;
        categorySpecific.board_finishes_back = m.finishes?.back;
        categorySpecific.board_finishes_edge = m.finishes?.edge;
        categorySpecific.board_finishes_end = m.finishes?.end;
        // Finish Types
        categorySpecific.board_finish_type_front = m.finishes?.front;
        categorySpecific.board_finish_type_back = m.finishes?.back;
        categorySpecific.board_finish_type_edge = m.finishes?.edge;
        categorySpecific.board_finish_type_end = m.finishes?.end;
        // Textures
        categorySpecific.board_textures_front = m.finishes?.front;
        categorySpecific.board_textures_back = m.finishes?.back;
        categorySpecific.board_textures_edge = m.finishes?.edge;
        categorySpecific.board_textures_end = m.finishes?.end;
        break;

      case 'caster':
        // Caster specific variables
        categorySpecific.caster_height = m.properties.height;
        // Finishes
        categorySpecific.caster_finishes_g1 = m.finishes?.g1;
        categorySpecific.caster_finishes_g2 = m.finishes?.g2;
        categorySpecific.caster_finishes_g3 = m.finishes?.g3;
        categorySpecific.caster_finishes_g4 = m.finishes?.g4;
        // Finish Types
        categorySpecific.caster_finish_type_g1 = m.finishes?.g1;
        categorySpecific.caster_finish_type_g2 = m.finishes?.g2;
        categorySpecific.caster_finish_type_g3 = m.finishes?.g3;
        categorySpecific.caster_finish_type_g4 = m.finishes?.g4;
        // Textures
        categorySpecific.caster_textures_g1 = m.finishes?.g1;
        categorySpecific.caster_textures_g2 = m.finishes?.g2;
        categorySpecific.caster_textures_g3 = m.finishes?.g3;
        categorySpecific.caster_textures_g4 = m.finishes?.g4;
        break;

      case 'connector':
        // Connector specific variables
        categorySpecific.connector_type = m.properties.connector_type;
        // Finishes
        categorySpecific.connector_finishes_g1 = m.finishes?.g1;
        categorySpecific.connector_finishes_g2 = m.finishes?.g2;
        // Finish Types
        categorySpecific.connector_finish_type_g1 = m.finishes?.g1;
        categorySpecific.connector_finish_type_g2 = m.finishes?.g2;
        // Textures
        categorySpecific.connector_textures_g1 = m.finishes?.g1;
        categorySpecific.connector_textures_g2 = m.finishes?.g2;
        break;

      case 'drawer_guide':
        // Drawer Guide specific variables
        categorySpecific.drawer_guide_side_clearance =
          m.properties.side_clearance;
        categorySpecific.drawer_guide_minimum_below_box =
          m.properties.minimum_below_box;
        categorySpecific.drawer_guide_minimum_above_box =
          m.properties.minimum_above_box;
        categorySpecific.drawer_guide_type = m.properties.guide_type;
        categorySpecific.drawer_guide_height = m.properties.height;
        categorySpecific.drawer_guide_length = m.properties.length;
        categorySpecific.drawer_guide_extension = m.properties.extension;
        categorySpecific.drawer_guide_screw_center_reference_to_top =
          m.properties.screw_center_reference_to_top;
        categorySpecific.drawer_guide_screw_center_to_box_reference =
          m.properties.screw_center_to_box_reference;
        categorySpecific.drawer_guide_back_notch_length =
          m.properties.back_notch_length;
        categorySpecific.drawer_guide_back_notch_height =
          m.properties.back_notch_height;
        categorySpecific.drawer_guide_back_notch_offset =
          m.properties.back_notch_offset;
        // Finishes
        categorySpecific.drawer_guide_finishes_g1 = m.finishes?.g1;
        categorySpecific.drawer_guide_finishes_g2 = m.finishes?.g2;
        // Finish Types
        categorySpecific.drawer_guide_finish_type_g1 = m.finishes?.g1;
        categorySpecific.drawer_guide_finish_type_g2 = m.finishes?.g2;
        // Textures
        categorySpecific.drawer_guide_textures_g1 = m.finishes?.g1;
        categorySpecific.drawer_guide_textures_g2 = m.finishes?.g2;
        break;

      case 'hinge':
        // Hinge specific variables
        categorySpecific.hinge_type = m.properties.hinge_type;
        categorySpecific.hinge_horizontal_overlay =
          m.properties.horizontal_overlay;
        categorySpecific.hinge_vertical_overlay = m.properties.vertical_overlay;
        categorySpecific.hinge_door_end_to_hinge =
          m.properties.door_end_to_hinge;
        categorySpecific.hinge_inset = m.properties.inset;
        categorySpecific.hinge_maximum_spacing = m.properties.maximum_spacing;
        categorySpecific.hinge_opening_angle = m.properties.opening_angle;
        categorySpecific.hinge_door_edge_to_reference_point =
          m.properties.door_edge_to_reference_point;
        categorySpecific.hinge_roll_out_clearance =
          m.properties.roll_out_clearance;
        // Finishes
        categorySpecific.hinge_finishes_g1 = m.finishes?.g1;
        categorySpecific.hinge_finishes_g2 = m.finishes?.g2;
        // Finish Types
        categorySpecific.hinge_finish_type_g1 = m.finishes?.g1;
        categorySpecific.hinge_finish_type_g2 = m.finishes?.g2;
        // Textures
        categorySpecific.hinge_textures_g1 = m.finishes?.g1;
        categorySpecific.hinge_textures_g2 = m.finishes?.g2;
        break;

      case 'hinge_plate':
        // Hinge Plate specific variables
        categorySpecific.hinge_plate_type = m.properties.hinge_plate_type;
        categorySpecific.hinge_plate_hole_offset = m.properties.hole_offset;
        // Finishes
        categorySpecific.hinge_plate_finishes_g1 = m.finishes?.g1;
        // Finish Types
        categorySpecific.hinge_plate_finish_type_g1 = m.finishes?.g1;
        // Textures
        categorySpecific.hinge_plate_textures_g1 = m.finishes?.g1;
        break;

      case 'laminate':
        // Laminate specific variables
        // CNC variables for laminate
        categorySpecific.laminate_cnc_optimize = m.properties.cnc_optimize;
        categorySpecific.laminate_cnc_grain_dependent =
          m.properties.cnc_grain_dependent;
        categorySpecific.laminate_cnc_drop_width = m.properties.cnc_drop_width;
        categorySpecific.laminate_cnc_drop_length =
          m.properties.cnc_drop_length;
        categorySpecific.laminate_cnc_feed_rate_percent =
          m.properties.cnc_feed_rate_percent;
        categorySpecific.laminate_cnc_spindle_speed_percent =
          m.properties.cnc_spindle_speed_percent;
        categorySpecific.laminate_cnc_minimize_face_chip =
          m.properties.cnc_minimize_face_chip;
        categorySpecific.laminate_cnc_minimize_back_chip =
          m.properties.cnc_minimize_back_chip;
        categorySpecific.laminate_cnc_climb_cut = m.properties.cnc_climb_cut;
        categorySpecific.laminate_cnc_maximum_depth_per_pass =
          m.properties.cnc_maximum_depth_per_pass;
        // Laminate specific
        categorySpecific.laminate_oversize = m.properties.oversize;
        // Size variables
        categorySpecific.laminate_size_width = m.properties.width;
        categorySpecific.laminate_size_length = m.properties.length;
        categorySpecific.laminate_size_thickness = m.properties.thickness;
        // Finishes
        categorySpecific.laminate_finishes_front = m.finishes?.front;
        // Finish Types
        categorySpecific.laminate_finish_type_front = m.finishes?.front;
        // Textures
        categorySpecific.laminate_textures_front = m.finishes?.front;
        break;

      case 'leg':
        // Leg specific variables
        categorySpecific.leg_height = m.properties.height;
        // Finishes
        categorySpecific.leg_finishes_g1 = m.finishes?.g1;
        // Finish Types
        categorySpecific.leg_finish_type_g1 = m.finishes?.g1;
        // Textures
        categorySpecific.leg_textures_g1 = m.finishes?.g1;
        break;

      case 'leg_leveler':
        // Leg Leveler specific variables
        categorySpecific.leg_leveler_height = m.properties.height;
        // Finishes
        categorySpecific.leg_leveler_finishes_g1 = m.finishes?.g1;
        categorySpecific.leg_leveler_finishes_g2 = m.finishes?.g2;
        // Finish Types
        categorySpecific.leg_leveler_finish_type_g1 = m.finishes?.g1;
        categorySpecific.leg_leveler_finish_type_g2 = m.finishes?.g2;
        // Textures
        categorySpecific.leg_leveler_textures_g1 = m.finishes?.g1;
        categorySpecific.leg_leveler_textures_g2 = m.finishes?.g2;
        break;

      case 'miscellaneous':
        // Miscellaneous specific variables
        categorySpecific.miscellaneous_thickness = m.properties.thickness;
        categorySpecific.miscellaneous_model = m.properties.model;
        // Finishes
        categorySpecific.miscellaneous_finishes_front = m.finishes?.front;
        categorySpecific.miscellaneous_finishes_back = m.finishes?.back;
        categorySpecific.miscellaneous_finishes_edge = m.finishes?.edge;
        categorySpecific.miscellaneous_finishes_end = m.finishes?.end;
        // Finish Types
        categorySpecific.miscellaneous_finish_type_front = m.finishes?.front;
        categorySpecific.miscellaneous_finish_type_back = m.finishes?.back;
        categorySpecific.miscellaneous_finish_type_edge = m.finishes?.edge;
        categorySpecific.miscellaneous_finish_type_end = m.finishes?.end;
        // Textures
        categorySpecific.miscellaneous_textures_front = m.finishes?.front;
        categorySpecific.miscellaneous_textures_back = m.finishes?.back;
        categorySpecific.miscellaneous_textures_edge = m.finishes?.edge;
        categorySpecific.miscellaneous_textures_end = m.finishes?.end;
        break;

      case 'molding':
        // Molding specific variables
        categorySpecific.molding_type = m.properties.type;
        categorySpecific.molding_length = m.properties.length;
        categorySpecific.molding_cost_per_joint = m.properties.cost_per_joint;
        categorySpecific.molding_miter_trim = m.properties.miter_trim;
        // Finishes
        categorySpecific.molding_finishes_front = m.finishes?.front;
        // Finish Types
        categorySpecific.molding_finish_type_front = m.finishes?.front;
        // Textures
        categorySpecific.molding_textures_front = m.finishes?.front;
        break;

      case 'panel_stock':
        // Panel Stock specific variables
        // CNC variables for panel_stock
        categorySpecific.panel_stock_cnc_optimize = m.properties.cnc_optimize;
        categorySpecific.panel_stock_cnc_grain_dependent =
          m.properties.cnc_grain_dependent;
        categorySpecific.panel_stock_cnc_drop_width =
          m.properties.cnc_drop_width;
        categorySpecific.panel_stock_cnc_drop_length =
          m.properties.cnc_drop_length;
        categorySpecific.panel_stock_cnc_feed_rate_percent =
          m.properties.cnc_feed_rate_percent;
        categorySpecific.panel_stock_cnc_spindle_speed_percent =
          m.properties.cnc_spindle_speed_percent;
        categorySpecific.panel_stock_cnc_minimize_face_chip =
          m.properties.cnc_minimize_face_chip;
        categorySpecific.panel_stock_cnc_minimize_back_chip =
          m.properties.cnc_minimize_back_chip;
        categorySpecific.panel_stock_cnc_climb_cut = m.properties.cnc_climb_cut;
        categorySpecific.panel_stock_cnc_maximum_depth_per_pass =
          m.properties.cnc_maximum_depth_per_pass;
        // Size variables
        categorySpecific.panel_stock_size_width = m.properties.width;
        categorySpecific.panel_stock_size_length = m.properties.length;
        categorySpecific.panel_stock_size_thickness = m.properties.thickness;
        // Finishes
        categorySpecific.panel_stock_finishes_front = m.finishes?.front;
        categorySpecific.panel_stock_finishes_back = m.finishes?.back;
        categorySpecific.panel_stock_finishes_edge = m.finishes?.edge;
        categorySpecific.panel_stock_finishes_end = m.finishes?.end;
        // Finish Types
        categorySpecific.panel_stock_finish_type_front = m.finishes?.front;
        categorySpecific.panel_stock_finish_type_back = m.finishes?.back;
        categorySpecific.panel_stock_finish_type_edge = m.finishes?.edge;
        categorySpecific.panel_stock_finish_type_end = m.finishes?.end;
        // Textures
        categorySpecific.panel_stock_textures_front = m.finishes?.front;
        categorySpecific.panel_stock_textures_back = m.finishes?.back;
        categorySpecific.panel_stock_textures_edge = m.finishes?.edge;
        categorySpecific.panel_stock_textures_end = m.finishes?.end;
        break;

      case 'pull':
        // Pull specific variables
        categorySpecific.pull_type = m.properties.type;
        categorySpecific.pull_horizontal_inset = m.properties.horizontal_inset;
        categorySpecific.pull_vertical_inset = m.properties.vertical_inset;
        // Finishes
        categorySpecific.pull_finishes_g1 = m.finishes?.g1;
        categorySpecific.pull_finishes_g2 = m.finishes?.g2;
        categorySpecific.pull_finishes_g3 = m.finishes?.g3;
        // Finish Types
        categorySpecific.pull_finish_type_g1 = m.finishes?.g1;
        categorySpecific.pull_finish_type_g2 = m.finishes?.g2;
        categorySpecific.pull_finish_type_g3 = m.finishes?.g3;
        // Textures
        categorySpecific.pull_textures_g1 = m.finishes?.g1;
        categorySpecific.pull_textures_g2 = m.finishes?.g2;
        categorySpecific.pull_textures_g3 = m.finishes?.g3;
        break;

      case 'rod':
        // Rod specific variables
        categorySpecific.rod_length = m.properties.length;
        // Finishes
        categorySpecific.rod_finishes_g1 = m.finishes?.g1;
        // Finish Types
        categorySpecific.rod_finish_type_g1 = m.finishes?.g1;
        // Textures
        categorySpecific.rod_textures_g1 = m.finishes?.g1;
        break;

      case 'sliding_door_rail_length':
        // Sliding Door Rail specific variables
        categorySpecific.sliding_door_rail_length = m.properties.length;
        // No finishes, finish types, or textures for this category
        break;

      case 'sliding_door_roller':
        // Sliding Door Roller specific variables
        categorySpecific.sliding_door_roller_type = m.properties.type;
        categorySpecific.sliding_door_roller_door_edge_inset =
          m.properties.door_edge_inset;
        categorySpecific.sliding_door_roller_door_end_inset =
          m.properties.door_end_inset;
        categorySpecific.sliding_door_roller_mount_on_back =
          m.properties.mount_on_back;
        categorySpecific.sliding_door_roller_dado_reference =
          m.properties.dado_reference;
        categorySpecific.sliding_door_roller_dado_offset =
          m.properties.dado_offset;
        // Finishes
        categorySpecific.sliding_door_roller_finishes_g1 = m.finishes?.g1;
        // Finish Types
        categorySpecific.sliding_door_roller_finish_type_g1 = m.finishes?.g1;
        // Textures
        categorySpecific.sliding_door_roller_textures_g1 = m.finishes?.g1;
        break;

      case 'wire_basket':
        // Wire Basket specific variables
        categorySpecific.wire_basket_type = m.properties.type;
        categorySpecific.wire_basket_depth = m.properties.depth; // Fixed typo from 'dpeth'
        categorySpecific.wire_basket_width = m.properties.width;
        categorySpecific.wire_basket_height = m.properties.height;
        // Finishes
        categorySpecific.wire_basket_finishes_g1 = m.finishes?.g1;
        categorySpecific.wire_basket_finishes_g2 = m.finishes?.g2;
        categorySpecific.wire_basket_finishes_g3 = m.finishes?.g3;
        categorySpecific.wire_basket_finishes_g4 = m.finishes?.g4;
        categorySpecific.wire_basket_finishes_g5 = m.finishes?.g5;
        // Finish Types
        categorySpecific.wire_basket_finish_type_g1 = m.finishes?.g1;
        categorySpecific.wire_basket_finish_type_g2 = m.finishes?.g2;
        categorySpecific.wire_basket_finish_type_g3 = m.finishes?.g3;
        categorySpecific.wire_basket_finish_type_g4 = m.finishes?.g4;
        categorySpecific.wire_basket_finish_type_g5 = m.finishes?.g5;
        // Textures
        categorySpecific.wire_basket_textures_g1 = m.finishes?.g1;
        categorySpecific.wire_basket_textures_g2 = m.finishes?.g2;
        categorySpecific.wire_basket_textures_g3 = m.finishes?.g3;
        categorySpecific.wire_basket_textures_g4 = m.finishes?.g4;
        categorySpecific.wire_basket_textures_g5 = m.finishes?.g5;
        break;

      default:
        console.warn(`Unknown material type: ${type}`);
        // Return only base material for unknown types, but ensure 'name' exists
        return { ...baseMaterial, name: m.name };
    }

    // Combine base material and category-specific properties
    return { ...baseMaterial, ...categorySpecific };
  };
  const fetchMaterialsByType = useCallback(async (type: string) => {
    try {
      const response: MaterialResponse = await commonService.getWithQueryParam(
        'material',
        '',
        'type',
        type,
      );

      if (response.status === 200) {
        const materials: TableRow[] = response.data.map((m: any) =>
          mapMaterial(m, type),
        );
        console.log(materials, 'materials by type');
        setCompanyMaterials(materials);
      }
    } catch (error) {
      console.error('Error fetching materials by type:', error);
      setError('Failed to fetch materials by type.');
    }
  }, []);

  const fetchCompanyMaterials = useCallback(async (companyId: string) => {
    try {
      const response: MaterialResponse = await commonService.get(
        `material`,
        `company/${companyId}/material`,
      );

      if (response.status === 200) {
        const materials: TableRow[] = response.data.map(
          (m: any) => mapMaterial(m), // type comes from m.type
        );

        setCompanyMaterials(materials);
      }
    } catch (error) {
      console.error('Error fetching company materials:', error);
      setError('Failed to fetch company materials.');
    }
  }, []);

  const createCompany = useCallback(async () => {
    if (!companyName.trim()) {
      setError('Company name is required');
      return;
    }

    try {
      const payload = {
        name: companyName,
        material_type: selectedType || '',
      };
      const response = await commonService.post('material', 'company', payload);
      if (response.status === 201 || response.status === 200) {
        setCreateCompanyPopup(false);
        setCompanyName('');
        setSelectedType(null);
        setError(null);
        fetchCompanies();
      } else {
        setError('Failed to create company. Try again.');
      }
    } catch (err) {
      console.error('Error creating company:', err);
      setError('Something went wrong.');
    }
  }, [companyName, selectedType, fetchCompanies]);

  useEffect(() => {
    setActiveCategory('banding');
    setActiveTab('material');
    fetchCompanies();
    fetchMaterialsByType('Banding');
  }, [fetchCompanies, fetchMaterialsByType]);

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
      setContextMaterialMenu(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleContextMenu = (
    e: React.MouseEvent,
    categoryId: string,
    name: string,
  ) => {
    e.preventDefault();
    setExpandedCategory(categoryId);
    setSelectedType(name);
    setContextMenu({ x: e.clientX, y: e.clientY, categoryId });
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory((prev) => (prev === categoryId ? '' : categoryId));
    setSelectedSubItem(null);
  };

  const getCellValue = (row: TableRow, columnKey: string): string => {
    const value = row[columnKey as keyof TableRow];
    if (value === undefined || value === null) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return value.toString();
  };

  let filteredMaterials = companyMaterials;
  if (expandedCategory && !selectedSubItem) {
    const categoryName = materialCategories.find(
      (c) => c.id === expandedCategory,
    )?.name;
    filteredMaterials = filteredMaterials.filter(
      (m) => m.material_type === categoryName,
    );
  }

  const searchedMaterials = filteredMaterials.filter((row) =>
    Object.values(row).some((value) =>
      value?.toString().toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  );

  const sortedMaterials = [...searchedMaterials].sort((a, b) => {
    if (!sortColumn) return 0;
    const aValue = a[sortColumn as keyof TableRow];
    const bValue = b[sortColumn as keyof TableRow];
    if (aValue === undefined || bValue === undefined) return 0;
    return aValue < bValue ? 1 : -1;
  });

  const renderMenuItem = (item: MaterialItem, parentType?: string) => {
    const isExpanded = expandedCategory === item.id;
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isSubItem = !!parentType;
    return (
      <div
        key={item.id}
        className={styles.categoryContainer}
        onContextMenu={(e) => {
          if (!parentType) {
            handleContextMenu(e, item.id, item.name);
          }
        }}
      >
        <div
          className={`${styles.categoryItem} ${isExpanded ? styles.expanded : ''}`}
          onClick={() => {
            if (!isSubItem) {
              toggleCategory(item.id);
              handleCategoryClick(item.id, item.name);
            } else {
              setSelectedSubItem(item.id);
              fetchCompanyMaterials(item.id);
            }
          }}
        >
          <div className={styles.categoryContent}>
            {!isSubItem && item.icon && (
              <span className={styles.categoryIcon}>
                <img src={item.icon} alt="" />
              </span>
            )}
            <span className={styles.categoryName}>{item.name}</span>
          </div>
          {!isSubItem && hasSubItems && (
            <span className={styles.dropdownArrow}>
              <img src={isExpanded ? up_arrow.src : down_arrow.src} alt="" />
            </span>
          )}
        </div>

        {hasSubItems && isExpanded && !isSubItem && (
          <div className={styles.subItemsContainer}>
            {item.subItems!.map((subItem) => (
              <div
                key={subItem.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMaterialMenu({
                    x: e.clientX,
                    y: e.clientY,
                    companyId: subItem.id,
                  });
                }}
              >
                {renderMenuItem(subItem, item.name)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <Sidebar />
      <div className={styles.rightside}>
        <Header isBorderRadius={true} dashboardName="Material Manager" />

        <div className={styles.maincontainer}>
          {/* Left Sidebar */}
          <div className={styles.materialleftside}>
            <div className={styles.menuContainer}>
              {materialCategories.map((category) => renderMenuItem(category))}
            </div>
          </div>

          {/* Right Content */}
          <div className={styles.materialrightside}>
            {/* Toolbar */}
            <div className={styles.topToolbar}>
              <div className={styles.toolbarLeft}>
                {/* Dropdown can be added here if needed */}
              </div>

              <div className={styles.toolbarRight}>
                <button className={styles.filterButton}>
                  <img src={filter.src} alt="" />
                </button>
                <div className={styles.searchContainer}>
                  <input
                    type="text"
                    placeholder="Search..."
                    className={styles.searchInput}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <svg
                    className={styles.searchIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </div>
                {/* <button
                  className={styles.addNewButton}
                  onClick={() => setAddMaterialPopup(true)}
                >
                  <span className={styles.plusIcon}>+</span>
                  Add New
                </button> */}
              </div>
            </div>

            {/* Table */}
            <div className={styles.tableContainer}>
              {activeCategory && categoryTabs[activeCategory] && (
                <div className={styles.tabletabsbox}>
                  {categoryTabs[activeCategory].map((tab) => (
                    <div
                      key={tab.id}
                      className={`${styles.tabletabs} ${activeTab === tab.id ? styles.activeTab : ''}`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.label}
                    </div>
                  ))}
                </div>
              )}
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    {activeCategory &&
                      activeTab &&
                      categoryTabs[activeCategory]
                        .find((t) => t.id === activeTab)
                        ?.columns.map((column) => (
                          <th
                            key={column.key}
                            className={`${styles.tableHeader} ${column.sortable ? styles.sortable : ''}`}
                            onClick={() =>
                              column.sortable && setSortColumn(column.key)
                            }
                          >
                            {column.label}
                          </th>
                        ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedMaterials.map((row) => (
                    <tr key={row.id} className={styles.tableRow}>
                      {activeCategory &&
                        activeTab &&
                        categoryTabs[activeCategory]
                          .find((t) => t.id === activeTab)
                          ?.columns.map((column) => (
                            <td key={column.key} className={styles.tableCell}>
                              {getCellValue(row, column.key)}
                            </td>
                          ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
            position: 'absolute',
          }}
        >
          <button
            className={styles.contextMenuItem}
            onClick={() => {
              setCreateCompanyPopup(true);
              setContextMenu(null);
            }}
          >
            ➕ Add Company
          </button>
        </div>
      )}

      {contextMaterialMenu && (
        <div
          className={styles.contextMenu}
          style={{
            top: contextMaterialMenu.y,
            left: contextMaterialMenu.x,
            position: 'absolute',
          }}
        >
          <button
            className={styles.contextMenuItem}
            onClick={() => {
              setAddMaterialPopup(true);
              setContextMaterialMenu(null);
              setCompanyID(contextMaterialMenu.companyId);
            }}
          >
            ➕ Add Material
          </button>
        </div>
      )}

      {createCompanyPopup && (
        <div className={styles.createpopupOverlay}>
          <div className={styles.createpopup}>
            <img
              src={createicon.src}
              className={styles.createicon}
              alt="createicon"
            />
            <img
              src={close.src}
              className={styles.createclose}
              alt="close"
              onClick={() => setCreateCompanyPopup(false)}
            />
            <div className={styles.create_right_side}>
              <h2>Create Company</h2>
              <p>Please fill all the details to create company.</p>
              <form
                className={styles.form}
                onSubmit={(e) => {
                  e.preventDefault();
                  createCompany();
                }}
              >
                <div className={styles.createinputGroup}>
                  <InputField
                    mediumField={true}
                    className={styles.inputField}
                    borderColor="var(--primary-color-grey-2)"
                    value={companyName}
                    onChange={(e: {
                      target: { value: SetStateAction<string> };
                    }) => setCompanyName(e.target.value)}
                    placeholder="Enter Company Name"
                    label={companyName ? 'Company Name' : ''}
                    error={error || ''}
                  />
                </div>
              </form>
            </div>
            <div className={styles.createButtonGrop}>
              <button
                className={styles.cancelcreateButton}
                onClick={() => setCreateCompanyPopup(false)}
              >
                Cancel
              </button>
              <button
                className={styles.createcontinueButton}
                onClick={createCompany}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {addMaterialPopup && (
        <AddMaterialPopup
          setCreateWorkOrderPopup={setAddMaterialPopup}
          companyState={companyID}
          handleGetCompanyMaterials={fetchCompanyMaterials}
        />
      )}
    </div>
  );
};

export default Material;
