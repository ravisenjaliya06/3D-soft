import { Position } from '../store/interface';
import { MINIFIX_STANDARDS } from './constant';
import type {
  MinifixConnection,
  MinifixHole,
  MinifixStandards,
  PlankConnection,
  PlankData,
} from './types';

function getFaceId(normal: Position, name?: string): string {
  console.log(normal);
  const { x, y, z } = normal;

  if (name?.toUpperCase().includes('VERTICAL')) {
    if (x >= 1) return '1';
    if (z >= 1) return '2';
    if (y <= -1) return '3';
    if (z <= -1) return '4';
    if (y >= 1) return '5';
    if (x <= -1) return '6';
  }

  if (y >= 1) return '1';
  if (z >= 1) return '2';
  if (x >= 1) return '3';
  if (z <= -1) return '4';
  if (x <= -1) return '5';
  if (y <= -1) return '6';

  return '0';
}

function calculateLocal2D(
  point: Position,
  plank: PlankData,
  faceId: string
): { x: number; y: number } {
  const { position: center, width, height, depth } = plank;
  const halfW = width / 2;
  const halfH = height / 2;
  const halfD = depth / 2;

  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const dz = point.z - center.z;

  switch (faceId) {
    case '1':
      return { x: dx + halfW, y: dz + halfD };

    case '6':
      return { x: dx + halfW, y: dz + halfD };

    case '2':
      return { x: dx + halfW, y: dy + halfH };

    case '4':
      return { x: -dx + halfW, y: dy + halfH };

    case '3':
      return { x: -dz + halfD, y: dy + halfH };

    case '5':
      return { x: dz + halfD, y: dy + halfH };

    default:
      return { x: 0, y: 0 };
  }
}

export function calculateMinifixPositions(
  connections: PlankConnection[],
  cupboardId: string,
  spacing?: number | MinifixStandards
): MinifixConnection[] {
  const minifixConnections: MinifixConnection[] = [];

  // Resolve standards
  let activeStandards = MINIFIX_STANDARDS;
  if (typeof spacing === 'object') {
    activeStandards = spacing;
  }
  const effectiveSpacing =
    (typeof spacing === 'number' ? spacing : activeStandards.minifixDistance) ||
    MINIFIX_STANDARDS.minifixDistance;

  if (effectiveSpacing <= 0) return [];

  // Sort for determinism
  connections.sort(
    (a, b) => a.plankA.id.localeCompare(b.plankA.id) || a.plankB.id.localeCompare(b.plankB.id)
  );

  connections.forEach((connection, index) => {
    const { plankA, plankB, connectionType } = connection;

    let housingPlank = plankA;
    let boltPlank = plankB;

    if (
      connectionType === 'HORIZONTAL_TO_VERTICAL' ||
      connectionType === 'VERTICAL_TO_HORIZONTAL'
    ) {
      const isOverlay = Math.abs(connection.touchingFaceNormal.y) > 0.9;

      if (isOverlay) {
        const p1 = plankA.width > plankA.height ? plankB : plankA;
        const p2 = plankA.width > plankA.height ? plankA : plankB;

        housingPlank = p1;
        boltPlank = p2;
      } else {
        const p1 = plankA.width > plankA.height ? plankB : plankA;
        const p2 = plankA.width > plankA.height ? plankA : plankB;

        housingPlank = p2;
        boltPlank = p1;
      }
    } else {
      const isSideA =
        plankA.name.toUpperCase().includes('LEFT') || plankA.name.toUpperCase().includes('RIGHT');
      if (isSideA) {
        housingPlank = plankB;
        boltPlank = plankA;
      } else {
        housingPlank = plankA;
        boltPlank = plankB;
      }
    }

    const spacingAxis = connectionType === 'VERTICAL_TO_VERTICAL' ? 'y' : 'z';
    const dimA = spacingAxis === 'y' ? plankA.height : plankA.depth;
    const dimB = spacingAxis === 'y' ? plankB.height : plankB.depth;
    const limitDimension = Math.min(dimA, dimB);

    const dowelDistance = activeStandards.dowelDistance || MINIFIX_STANDARDS.dowelDistance;
    const limit = limitDimension / 2 - (dowelDistance + 8);

    const offsets: number[] = [0];
    let k = 1;
    let iterations = 0;
    if (!isNaN(limit) && !isNaN(effectiveSpacing)) {
      while (iterations < 100) {
        iterations++;
        const dist = k * effectiveSpacing;
        if (dist > limit - 0.0001) break;
        offsets.push(dist);
        offsets.push(-dist);
        k++;
      }
    }

    offsets.forEach((offset, i) => {
      const shiftedJoint = { ...connection.jointPosition };
      if (spacingAxis === 'y') shiftedJoint.y += offset;
      else shiftedJoint.z += offset; // z axis

      const connId = `minifix-${cupboardId}-${plankA.id}-${plankB.id}-${index * 100 + i}`;

      const mp = calculateSingleConnectionData(
        housingPlank,
        boltPlank,
        shiftedJoint,
        activeStandards,
        connId,
        connection,
        spacingAxis
      );

      if (mp) minifixConnections.push(mp);
    });
  });

  return minifixConnections;
}

function calculateSingleConnectionData(
  housingPlank: PlankData,
  boltPlank: PlankData,
  jointPos: Position,
  standards: MinifixStandards,
  id: string,
  connection: PlankConnection,
  spacingAxis: 'y' | 'z'
): MinifixConnection | null {
  let intoHousingDir: Position;

  if (housingPlank.id === connection.plankA.id) {
    intoHousingDir = {
      x: -Math.round(connection.touchingFaceNormal.x),
      y: -Math.round(connection.touchingFaceNormal.y),
      z: -Math.round(connection.touchingFaceNormal.z),
    };
  } else {
    intoHousingDir = {
      x: Math.round(connection.touchingFaceNormal.x),
      y: Math.round(connection.touchingFaceNormal.y),
      z: Math.round(connection.touchingFaceNormal.z),
    };
  }

  const housingFaceNormal = { x: -intoHousingDir.x, y: -intoHousingDir.y, z: -intoHousingDir.z };
  const housingFaceId = getFaceId(housingFaceNormal, housingPlank.name);

  const screwHousingHole: MinifixHole = {
    type: 'SCREW',
    connectorId: id,
    position: jointPos,
    direction: intoHousingDir,
    drillType: '1',
    face: housingFaceId,
    diameter: standards.screwDiameter,
    length: standards.screwLength - 10,
    localPosition2D: calculateLocal2D(jointPos, housingPlank, housingFaceId),
  };

  const intoBoltDir = { x: -intoHousingDir.x, y: -intoHousingDir.y, z: -intoHousingDir.z };
  const boltFaceNormal = { x: -intoBoltDir.x, y: -intoBoltDir.y, z: -intoBoltDir.z };
  const boltFaceId = getFaceId(boltFaceNormal, boltPlank.name);

  const screwMatingHole: MinifixHole = {
    type: 'SCREW',
    connectorId: id,
    position: jointPos,
    direction: intoBoltDir,
    drillType: '2',
    face: boltFaceId,
    diameter: standards.screwDiameter,
    length: standards.screwLength - 30,
    localPosition2D: calculateLocal2D(jointPos, boltPlank, boltFaceId),
  };

  const camDist = 34;
  const camPos3D = {
    x: jointPos.x + intoHousingDir.x * camDist,
    y: jointPos.y + intoHousingDir.y * camDist,
    z: jointPos.z + intoHousingDir.z * camDist,
  };

  let camDir = { x: 0, y: -1, z: 0 };
  if (Math.abs(intoHousingDir.y) > 0.9) {
    camDir = { x: 1, y: 0, z: 0 };
  }

  const camHole: MinifixHole = {
    type: 'CAM',
    connectorId: id,
    position: camPos3D,
    direction: camDir,
    drillType: '2',
    face: getFaceId({ x: -camDir.x, y: -camDir.y, z: -camDir.z }, housingPlank.name),
    diameter: standards.camDiameter,
    depth: standards.camDepth,
    localPosition2D: calculateLocal2D(
      camPos3D,
      housingPlank,
      getFaceId({ x: -camDir.x, y: -camDir.y, z: -camDir.z })
    ),
  };

  // DOWEL HOLES
  const dowelOffsetVector = { x: 0, y: 0, z: 0 };
  if (spacingAxis === 'z') dowelOffsetVector.z = standards.dowelDistance;
  else dowelOffsetVector.y = standards.dowelDistance;

  const dowelPos = {
    x: jointPos.x + dowelOffsetVector.x,
    y: jointPos.y + dowelOffsetVector.y,
    z: jointPos.z + dowelOffsetVector.z,
  };

  // Dowel Housing (20mm, Type 2)
  const dowelHousingHole: MinifixHole = {
    type: 'DOWEL',
    connectorId: id,
    position: dowelPos,
    direction: intoHousingDir,
    drillType: '1',
    face: housingFaceId,
    diameter: standards.dowelDiameter,
    length: standards.dowelLength - 10,
    localPosition2D: calculateLocal2D(dowelPos, housingPlank, housingFaceId),
  };

  const dowelMatingHole: MinifixHole = {
    type: 'DOWEL',
    connectorId: id,
    position: dowelPos,
    direction: intoBoltDir,
    drillType: '2',
    face: boltFaceId,
    diameter: standards.dowelDiameter,
    length: standards.dowelLength - 20,
    localPosition2D: calculateLocal2D(dowelPos, boltPlank, boltFaceId),
  };

  return {
    id,
    cupboardId: 'cupboard-1',
    plankAId: housingPlank.id,
    plankBId: boltPlank.id,
    jointPosition: jointPos,
    connectionType: 'HORIZONTAL_TO_VERTICAL',
    screwHousing: screwHousingHole,
    screwMating: screwMatingHole,
    dowelHousing: dowelHousingHole,
    dowelMating: dowelMatingHole,
    cam: camHole,
  };
}

export function getMinifixStandards(): MinifixStandards {
  return MINIFIX_STANDARDS;
}
