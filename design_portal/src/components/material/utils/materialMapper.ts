import type { CategoryMap, MaterialMap, TableRow } from '../types';

export const normalizeMaterialType = (typeName: string): string => {
  return typeName.trim().toLowerCase().replace(/\s+/g, '_');
};

export const mapMaterial = (m: MaterialMap, type?: string): TableRow => {
  // Base material variables (common to all categories)
  const baseMaterial = {
    id: m.id,
    _original: m,
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
    material_estimate: m.properties.estimate,
    material_model: m.properties.model,
  };

  // Initialize empty object for category-specific properties
  const categorySpecific: CategoryMap = {};
  const normalizedType = normalizeMaterialType(type || m.type || '');
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
      categorySpecific.board_cnc_grain_dependent = m.properties.cnc_grain_dependent;
      categorySpecific.board_cnc_drop_width = m.properties.cnc_drop_width;
      categorySpecific.board_cnc_drop_length = m.properties.cnc_drop_length;
      categorySpecific.board_cnc_feed_rate_percent = m.properties.cnc_feed_rate_percent;
      categorySpecific.board_cnc_spindle_speed_percent = m.properties.cnc_spindle_speed_percent;
      categorySpecific.board_cnc_minimize_face_chip = m.properties.cnc_minimize_face_chip;
      categorySpecific.board_cnc_minimize_back_chip = m.properties.cnc_minimize_back_chip;
      categorySpecific.board_cnc_climb_cut = m.properties.cnc_climb_cut;
      categorySpecific.board_cnc_maximum_depth_per_pass = m.properties.cnc_maximum_depth_per_pass;
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
      categorySpecific.drawer_guide_side_clearance = m.properties.side_clearance;
      categorySpecific.drawer_guide_minimum_below_box = m.properties.minimum_below_box;
      categorySpecific.drawer_guide_minimum_above_box = m.properties.minimum_above_box;
      categorySpecific.drawer_guide_type = m.properties.guide_type;
      categorySpecific.drawer_guide_height = m.properties.height;
      categorySpecific.drawer_guide_length = m.properties.length;
      categorySpecific.drawer_guide_extension = m.properties.extension;
      categorySpecific.drawer_guide_screw_center_reference_to_top =
        m.properties.screw_center_reference_to_top;
      categorySpecific.drawer_guide_screw_center_to_box_reference =
        m.properties.screw_center_to_box_reference;
      categorySpecific.drawer_guide_back_notch_length = m.properties.back_notch_length;
      categorySpecific.drawer_guide_back_notch_height = m.properties.back_notch_height;
      categorySpecific.drawer_guide_back_notch_offset = m.properties.back_notch_offset;
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
      categorySpecific.hinge_horizontal_overlay = m.properties.horizontal_overlay;
      categorySpecific.hinge_vertical_overlay = m.properties.vertical_overlay;
      categorySpecific.hinge_door_end_to_hinge = m.properties.door_end_to_hinge;
      categorySpecific.hinge_inset = m.properties.inset;
      categorySpecific.hinge_maximum_spacing = m.properties.maximum_spacing;
      categorySpecific.hinge_opening_angle = m.properties.opening_angle;
      categorySpecific.hinge_door_edge_to_reference_point =
        m.properties.door_edge_to_reference_point;
      categorySpecific.hinge_roll_out_clearance = m.properties.roll_out_clearance;
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
      categorySpecific.laminate_cnc_grain_dependent = m.properties.cnc_grain_dependent;
      categorySpecific.laminate_cnc_drop_width = m.properties.cnc_drop_width;
      categorySpecific.laminate_cnc_drop_length = m.properties.cnc_drop_length;
      categorySpecific.laminate_cnc_feed_rate_percent = m.properties.cnc_feed_rate_percent;
      categorySpecific.laminate_cnc_spindle_speed_percent = m.properties.cnc_spindle_speed_percent;
      categorySpecific.laminate_cnc_minimize_face_chip = m.properties.cnc_minimize_face_chip;
      categorySpecific.laminate_cnc_minimize_back_chip = m.properties.cnc_minimize_back_chip;
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
      categorySpecific.panel_stock_cnc_grain_dependent = m.properties.cnc_grain_dependent;
      categorySpecific.panel_stock_cnc_drop_width = m.properties.cnc_drop_width;
      categorySpecific.panel_stock_cnc_drop_length = m.properties.cnc_drop_length;
      categorySpecific.panel_stock_cnc_feed_rate_percent = m.properties.cnc_feed_rate_percent;
      categorySpecific.panel_stock_cnc_spindle_speed_percent =
        m.properties.cnc_spindle_speed_percent;
      categorySpecific.panel_stock_cnc_minimize_face_chip = m.properties.cnc_minimize_face_chip;
      categorySpecific.panel_stock_cnc_minimize_back_chip = m.properties.cnc_minimize_back_chip;
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
      categorySpecific.sliding_door_roller_door_edge_inset = m.properties.door_edge_inset;
      categorySpecific.sliding_door_roller_door_end_inset = m.properties.door_end_inset;
      categorySpecific.sliding_door_roller_mount_on_back = m.properties.mount_on_back;
      categorySpecific.sliding_door_roller_dado_reference = m.properties.dado_reference;
      categorySpecific.sliding_door_roller_dado_offset = m.properties.dado_offset;
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
      categorySpecific.wire_basket_depth = m.properties.depth; // Fixed typo from 'depth'
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
      return { ...baseMaterial, name: m.name ? m.name : '' };
  }

  // Combine base material and category-specific properties
  return { ...baseMaterial, name: m.name || '', ...categorySpecific };
};

export const flattenMaterial = (m: MaterialMap): any => {
  return {
    id: m.id,
    name: m.name,
    description: m.description,
    type: m.properties.material_type || m.type,
    ...m.properties,
    // Map snake_case to camelCase for the form if necessary
    thickness: m.properties.thickness,
    lengthTrim: m.properties.length_trim,
    roughThickness: m.properties.rough_thickness,
    unitOfIssue: m.properties.unit_of_issue,
    defaultCost: m.properties.default_cost,
    sellPrice: m.properties.sell_price,
    defaultMarkup: m.properties.default_markup,
    salesTax: m.properties.sales_tax,
    defaultTaxRate: m.properties.default_tax_rate,
    waste: m.properties.waste,
    estimate: m.properties.estimate,
    // Add more if needed, but the form seems to use these
  };
};
