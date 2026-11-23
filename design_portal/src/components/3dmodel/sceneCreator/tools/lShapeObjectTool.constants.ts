import { store } from '../../store';
import { PART_TYPES } from '../interface';

/**
 * Constants for L-shape object dimensions and configuration
 */
export const L_SHAPE_CONSTANTS = {
  DEFAULT_VERTICAL_HEIGHT: 100,
  DEFAULT_VERTICAL_DEPTH: 18,
  DEFAULT_VERTICAL_WIDTH: 18,
  DEFAULT_HORIZONTAL_HEIGHT: 20,
  DEFAULT_HORIZONTAL_DEPTH: 50,
  REDUCTION_AMOUNT: 25,
  GAP_THRESHOLD: 50,
  ALIGNMENT_THRESHOLD_FACTOR: 0.15,
  DISTANCE_THRESHOLD: 200,
  POSITION_TOLERANCE: 50,
  Y_OFFSET: -50,
  FRONT_Z_OFFSET: -2, // Position 2mm behind the front face
} as const;

/**
 * Get L-shape material from catalog data stored in Redux.
 * Falls back to hardcoded default if catalog hasn't been loaded yet.
 */
export function getDefaultLShapeMaterial() {
  // Try to get material from catalog store
  const catalogState = store.getState().catalog;
  const catalogItems = (catalogState as any).catalogItems;

  if (catalogItems && Array.isArray(catalogItems)) {
    // Find the L-Shape Object group in the catalog items
    for (const group of catalogItems) {
      if (!Array.isArray(group)) continue;
      const mainItem = group.find(
        (item: any) =>
          item.type === PART_TYPES.L_SHAPE_OBJECT ||
          (item.name || '').toLowerCase().includes('l-shape')
      );
      if (mainItem?.material && Array.isArray(mainItem.material) && mainItem.material.length > 0) {
        return mainItem.material;
      }
    }
  }
}
