import * as THREE from 'three';

export type PlankOrientation = 'HORIZONTAL' | 'VERTICAL' | 'PLANK';
export type Axis = 'x' | 'y' | 'z';

export interface PlankInfo {
  orientation: PlankOrientation;
  size: { x: number; y: number; z: number };
  thicknessAxis: Axis;
}

/**
 * Detects plank orientation and dimensions using the geometry bounding box.
 *
 * Rules:
 * - The largest bounding box axis determines plank direction
 * - If largest axis is Y → plank is VERTICAL
 * - Otherwise → plank is HORIZONTAL
 * - The smallest axis represents plank thickness
 *
 * @param mesh The mesh to analyze
 * @returns PlankInfo object containing orientation, physical size, and thickness axis
 */
export function detectPlankByBoundingBox(mesh: THREE.Mesh): PlankInfo {
  // 1. Check if we already have the info cached
  if (mesh.userData.plankInfo) {
    return mesh.userData.plankInfo as PlankInfo;
  }

  if (!mesh.geometry) {
    // Fallback for empty geometry, though shouldn't happen in valid flow
    return {
      orientation: 'HORIZONTAL',
      size: { x: 0, y: 0, z: 0 },
      thicknessAxis: 'y',
    };
  }

  // 2. Compute Bounding Box
  mesh.geometry.computeBoundingBox();
  const box = mesh.geometry.boundingBox;

  if (!box) {
    return {
      orientation: 'HORIZONTAL',
      size: { x: 0, y: 0, z: 0 },
      thicknessAxis: 'y',
    };
  }

  const size = new THREE.Vector3();
  box.getSize(size);

  // 3. Determine Thickness Axis (Smallest Axis)
  const axes: { axis: Axis; val: number }[] = [
    { axis: 'x', val: size.x },
    { axis: 'y', val: size.y },
    { axis: 'z', val: size.z },
  ];

  // Sort ascending to find smallest (thickness)
  axes.sort((a, b) => a.val - b.val);
  const thicknessAxis = axes[0].axis;

  // 4. Determine Orientation (Largest Axis)
  // Sort descending to find largest
  axes.sort((a, b) => b.val - a.val);
  const largestAxis = axes[0].axis;

  let orientation: PlankOrientation = 'HORIZONTAL';

  // Rule: If largest axis is Y → plank is VERTICAL
  if (largestAxis === 'y') {
    orientation = 'VERTICAL';
  }
  // Otherwise → plank is HORIZONTAL (default)

  // 5. Construct and Cache PlankInfo
  const info: PlankInfo = {
    orientation,
    size: { x: size.x, y: size.y, z: size.z },
    thicknessAxis,
  };

  mesh.userData.plankInfo = info;

  return info;
}
