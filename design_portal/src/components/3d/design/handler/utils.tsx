import { Position } from '@/components/3dmodel/store/interface';
import commonService from '@/services/CommonService';
import * as THREE from 'three';
import { APIResponseData } from './interface';

interface CupboardDimensions {
  width: number;
  height: number;
  depth: number;
}

export const getCupboardDimensions = (
  cupboard: THREE.Object3D,
): CupboardDimensions => {
  const box = new THREE.Box3().setFromObject(cupboard);
  const size = box.getSize(new THREE.Vector3());

  return {
    width: size.x,
    height: size.y,
    depth: size.z,
  };
};

export const adjustPlankDimensions = (
  plankType: string,
  cupboardDims: CupboardDimensions,
  position?: THREE.Vector3, // Optional position for dynamic adjustment
): { width: number; height: number; depth: number } => {
  const padding = 0.5; // Small padding to fit inside cupboard
  const minThickness = 2; // Minimum thickness for planks

  if (plankType === 'VERTICAL_PLANK') {
    // For vertical planks, height matches cupboard height
    return {
      width: minThickness,
      height: cupboardDims.height - padding,
      depth: cupboardDims.depth - padding,
    };
  } else {
    // For horizontal planks, width matches cupboard width
    return {
      width: cupboardDims.width - padding,
      height: minThickness,
      depth: cupboardDims.depth - padding,
    };
  }
};

export const classifyPlanks = (planks: Plank[]) => {
  const vertical: Plank[] = [];
  const horizontal: Plank[] = [];

  planks.forEach((p) => {
    if (p.height > p.width) vertical.push(p);
    else if (p.width > p.height) horizontal.push(p);
  });

  return { vertical, horizontal };
};

type Point = { x: number; y: number };
type Plank = {
  center_point: Point;
  width: number;
  height: number;
  position: Position;
};

type GridCell = 'empty' | 'plank';

export const calculateBoxes = (planks: Plank[]) => {
  // Step 1: Find the furthest points
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  planks.forEach(({ position, width, height }) => {
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    minX = Math.min(minX, position.x - halfWidth);
    maxX = Math.max(maxX, position.x + halfWidth);
    minY = Math.min(minY, position.y - halfHeight);
    maxY = Math.max(maxY, position.y + halfHeight);
  });

  // Step 2: Create the grid
  const grid: GridCell[][] = [];
  const step = 1; // Define a unit step size for grid resolution

  for (let y = minY; y <= maxY; y += step) {
    const row: GridCell[] = [];
    for (let x = minX; x <= maxX; x += step) {
      row.push('empty');
    }
    grid.push(row);
  }

  // Step 3: Place planks as obstacles
  planks.forEach((plank) => {
    const startX = plank.position.x - plank.width / 2 - minX;
    const endX = plank.position.x + plank.width / 2 - minX;
    const startY = plank.position.y - plank.height / 2 - minY;
    const endY = plank.position.y + plank.height / 2 - minY;

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (x >= startX && x <= endX && y >= startY && y <= endY) {
          grid[y][x] = 'plank';
        }
      }
    }
  });

  // Step 4: Detect blank rectangular areas
  const boxes: Record<string, [number, number][]> = {};

  function findNextEmptyCell(): Point | null {
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] === 'empty') {
          return { x, y };
        }
      }
    }
    return null;
  }

  function fillBox(topLeft: Point, bottomRight: Point) {
    for (let y = topLeft.y; y <= bottomRight.y; y++) {
      for (let x = topLeft.x; x <= bottomRight.x; x++) {
        grid[y][x] = 'plank';
      }
    }
  }

  let nextCell;
  while ((nextCell = findNextEmptyCell()) !== null) {
    const { x, y } = nextCell;
    let bottomRightX = x;
    let bottomRightY = y;

    while (
      bottomRightX + 1 < grid[0].length &&
      grid[y][bottomRightX + 1] === 'empty'
    ) {
      bottomRightX++;
    }

    while (
      bottomRightY + 1 < grid.length &&
      grid[bottomRightY + 1][x] === 'empty'
    ) {
      bottomRightY++;
    }

    const boxKey = `b${Object.keys(boxes).length + 1}`;
    boxes[boxKey] = [
      [minX + x * step, minY + bottomRightY * step], // Top-left
      [minX + bottomRightX * step, minY + bottomRightY * step], // Top-right
      [minX + bottomRightX * step, minY + y * step], // Bottom-right
      [minX + x * step, minY + y * step], // Bottom-left
    ];

    fillBox({ x, y }, { x: bottomRightX, y: bottomRightY });
  }
  return boxes;
};

export const findBoxContainingPoint = (
  boxes: Record<string, [number, number][]>,
  cupboard?: THREE.Object3D,
) => {
  const clicked_point = JSON.parse(
    localStorage.getItem('clicked_point') || '{}',
  );
  const clicked_x = clicked_point?.x;
  const clicked_y = clicked_point?.y;

  if (cupboard && clicked_x !== undefined && clicked_y !== undefined) {
    const cupboardDims = getCupboardDimensions(cupboard);
    const localPoint = new THREE.Vector3(clicked_x, 0, clicked_y);

    // Convert to local cupboard space if needed
    const cupboardLocal = cupboard.worldToLocal(localPoint.clone());

    // Return the cupboard space information
    return {
      boxKey: 'cupboard',
      center: {
        x: cupboardLocal.x,
        y: cupboardLocal.z, // Using z as y in 2D space
      },
      width: cupboardDims.width,
      height: cupboardDims.height,
      depth: cupboardDims.depth,
      localPosition: cupboardLocal, // Add local position for precise placement
    };
  }

  // Rest of your existing box detection logic...
  for (const [boxKey, coordinates] of Object.entries(boxes)) {
    const [topLeft, topRight, bottomRight] = coordinates;

    const x1 = topLeft[0],
      y1 = topLeft[1];
    const x2 = topRight[0],
      y2 = bottomRight[1];

    if (
      clicked_x >= x1 &&
      clicked_x <= x2 &&
      clicked_y >= y2 &&
      clicked_y <= y1
    ) {
      const center_x = (x1 + x2) / 2;
      const center_y = (y1 + y2) / 2;

      const width = x2 - x1;
      const height = y1 - y2;
      return {
        boxKey,
        coordinates,
        center: { x: center_x, y: center_y },
        width,
        height,
      };
    }
  }
  return null;
};

export const gettingDesignID = () => {
  const designID = window.location.pathname.split('/')[2];
  return designID;
};

export const createObjectData = async (data: string | FormData) => {
  const response: { status: number; data: APIResponseData } =
    await commonService.postObjectData(
      'design',
      gettingDesignID(),
      'object',
      // @ts-ignore
      data,
    );
  if (response.status === 201) {
    return response.data.id;
  } else {
    return null;
  }
};

export const updateObjectData = async (formData: FormData) => {
  const response: { status: number; data: APIResponseData } =
    await commonService.putObjectData(
      'design',
      gettingDesignID(),
      'object',
      formData,
    );
  if (response.status === 200) {
    return response.data.id;
  } else {
    return null;
  }
};

export const deleteObjectData = async (id: string) => {
  const response: { status: number; data: APIResponseData } =
    await commonService.deleteObjectData(
      'design',
      gettingDesignID(),
      'object',
      id,
    );
  if (response.status === 200) {
    return response.data;
  } else {
    return null;
  }
};

export const deleteAllObjectData = async () => {
  const response: { status: number; data: APIResponseData } =
    await commonService.delete(
      'design',
      //@ts-ignore
      `${gettingDesignID()}/objects`,
    );
  if (response.status === 200) {
    return response.data;
  } else {
    return null;
  }
};

export const getDesignData = async () => {
  const response: { status: number; data: APIResponseData } =
    await commonService.getObjectData('design', gettingDesignID(), 'objects');
  if (response.status === 200) {
    return response.data;
  } else {
    return null;
  }
};
