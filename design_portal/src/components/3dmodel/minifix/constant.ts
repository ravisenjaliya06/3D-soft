import { MinifixStandards } from './types';

export const STATIC_SCREW_SIZE = { diameter: 8, length: 25 };
export const STATIC_CAM_SIZE = { diameter: 15, depth: 12 };
export const STATIC_DOWEL_SIZE = { diameter: 8, length: 25, dowelDistance: 32 };

export const MINIFIX_STANDARDS: MinifixStandards = {
  minifixDistance: 32,
  minifixDiameterHole: 15,
  camDepth: 12,
  camHeight: 32,
  edgeBandingDistance: 2,
  screwDiameter: 8,
  screwLength: 25,
  camDiameter: 15,
  dowelDiameter: 8,
  dowelLength: 25,
  dowelDistance: 32,
  SPACING: 32,
  camBoltProtrusion: 25,
  boltTailDepth: 13,
};

export const JOINER_THRESHOLD = 5;
