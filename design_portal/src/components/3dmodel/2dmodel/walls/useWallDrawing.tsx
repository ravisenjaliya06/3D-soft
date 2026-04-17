import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ViewerMouseEvent } from 'react-svg-pan-zoom';
import { WALL_DEFAULT_HEIGHT } from '../../sceneCreator/constants';
import {
  FLOOR_PLAN_TYPES,
  GEOMETRY,
  MATERIAL_TYPES,
  MeshObjectData,
} from '../../sceneCreator/interface';
import { SyncManager } from '../../sceneCreator/syncState';
import {
  computeWallOffsetSignForNewWall,
  convertPosition2DTo3D,
  findRotation,
  getWallReferenceEdgePoints,
  referenceEdgeToCenterline,
  WALL_THICKNESS_2D_UNITS,
} from '../../sceneCreator/utils';
import { RootState } from '../../store';
import {
  addObjects,
  addPoint,
  removeObject,
  setWallDrawStartPointId,
  setWalls,
  updateObjects,
} from '../../store/dataSlice';
import { WallPoint } from '../interface';
import { snapToGrid } from '../utils';
import { findRoomsFromWalls, getFloorPolygon } from './wallFloor';

export function useWallDrawing(svgWidth: number, svgHeight: number) {
  const dispatch = useDispatch();

  const storeSelector = useSelector((state: RootState) => state.data);
  const points = storeSelector.points;
  const objects = storeSelector.objects;
  const walls = objects.filter((obj) => obj.type === FLOOR_PLAN_TYPES.WALL);
  const isWallDrawingActive = storeSelector.isWallDrawingActive;
  const startPointId = storeSelector.wallDrawStartPointId;

  const [previewEnd, setPreviewEnd] = useState<{ x: number; y: number } | null>(null);
  const [inputLength, setInputLength] = useState<number | null>(null);

  // Dynamic center offset
  const offsetX = svgWidth / 2;
  const offsetY = svgHeight / 2;

  // Convert screen coordinates → logical centered coordinates
  function getLogicalCoords<T>(event: ViewerMouseEvent<T>, offsetX: number, offsetY: number) {
    return {
      x: event.point.x - offsetX,
      y: event.point.y - offsetY,
    };
  }

  // Reset in-session preview (Esc also exits mode via toggleWallDrawing, which clears wallDrawStartPointId)
  const resetDrawing = () => {
    dispatch(setWallDrawStartPointId(null));
    setPreviewEnd(null);
    setInputLength(null);
  };

  // Find or create point for the given coordinates and add it to the store and drawing wall besed on it
  const findOrCreatePoint = (x: number, y: number): WallPoint => {
    const existing = points.find((point) => point.x === x && point.y === y);
    if (existing) {
      return existing;
    }
    const newPoint: WallPoint = { id: crypto.randomUUID(), x, y };
    dispatch(addPoint(newPoint));
    return newPoint;
  };

  // Update wall connections which wall connected to each wall
  const updateWallConnections = (allWalls: MeshObjectData[]) => {
    return allWalls.map((currentWall) => {
      const { startPoint: currentStart, endPoint: currentEnd } =
        getWallReferenceEdgePoints(currentWall);

      const connectedWallIds = allWalls
        .filter((otherWall) => otherWall.id !== currentWall.id)
        .filter((otherWall) => {
          const { startPoint, endPoint } = getWallReferenceEdgePoints(otherWall);

          const isSamePoint = (p1: { x: number; y: number }, p2: { x: number; y: number }) =>
            Math.round(p1.x) === Math.round(p2.x) && Math.round(p1.y) === Math.round(p2.y);

          return (
            isSamePoint(startPoint, currentStart) ||
            isSamePoint(endPoint, currentEnd) ||
            isSamePoint(startPoint, currentEnd) ||
            isSamePoint(endPoint, currentStart)
          );
        })
        .map((w) => w.id);

      return { ...currentWall, connectedTo: connectedWallIds };
    });
  };

  // We explicitly add the generic <T> here because react-svg-pan-zoom defines
  // <T,> makes this function generic so it can handle any event payload type.
  // The comma prevents TypeScript from parsing it as JSX.
  // Create a wall between two points and handle room reconciliation
  const createWallSegment = (startPoint: WallPoint, endCoords: { x: number; y: number }) => {
    const clickedPoint = findOrCreatePoint(endCoords.x, endCoords.y);

    // Prevent drawing wall to itself
    const isSamePoint = startPoint.x === clickedPoint.x && startPoint.y === clickedPoint.y;
    if (isSamePoint) return;

    // Prevent duplicate wall in either direction
    const isDuplicateWall = walls.some((existingWall: MeshObjectData) => {
      const wallCoords = getWallReferenceEdgePoints(existingWall);
      const start = wallCoords.startPoint;
      const end = wallCoords.endPoint;

      return (
        //math.round is used to avoid floating point precision issues
        (Math.round(start.x) === Math.round(startPoint.x) &&
          Math.round(start.y) === Math.round(startPoint.y) &&
          Math.round(end.x) === Math.round(clickedPoint.x) &&
          Math.round(end.y) === Math.round(clickedPoint.y)) ||
        (Math.round(start.x) === Math.round(clickedPoint.x) &&
          Math.round(start.y) === Math.round(clickedPoint.y) &&
          Math.round(end.x) === Math.round(startPoint.x) &&
          Math.round(end.y) === Math.round(startPoint.y))
      );
    });

    if (isDuplicateWall) {
      dispatch(setWallDrawStartPointId(clickedPoint.id || null));
      setInputLength(null);
      return;
    }

    const thickness = WALL_THICKNESS_2D_UNITS;
    const wallOffsetSign = computeWallOffsetSignForNewWall(startPoint, clickedPoint, walls);

    const { startPoint: centerStart, endPoint: centerEnd } = referenceEdgeToCenterline(
      startPoint,
      clickedPoint,
      wallOffsetSign,
      thickness
    );

    // Run length along reference edge equals centerline length for straight segments
    const wallLength = Math.hypot(clickedPoint.x - startPoint.x, clickedPoint.y - startPoint.y);

    const wallMeshData = {
      id: crypto.randomUUID(),
      name: `Wall`,
      type: FLOOR_PLAN_TYPES.WALL,
      isMain: true,
      geometryType: GEOMETRY.BOX_GEOMETRY,
      dimensions: {
        width: wallLength,
        height: WALL_DEFAULT_HEIGHT,
        depth: thickness,
      },
      wallOffsetSign,
      position: convertPosition2DTo3D({ startPoint: centerStart, endPoint: centerEnd }),
      rotation: findRotation({ startPoint: centerStart, endPoint: centerEnd }),
      scale: { x: 0.01, y: 0.001, z: 0.01 },
      material: [
        {
          id: crypto.randomUUID(),
          name: 'Wall Material',
          type: MATERIAL_TYPES.MISCELLANEOUS,
          properties: {
            model: false,
            unit_of_issue: 'Each',
            default_cost: 0,
            sell_price: 0,
            default_markup: 0,
            sales_tax: false,
            default_tax_rate: 0,
            waste: 0,
            estimate: false,
            model_file: null,
          },
          textures: [],
        },
      ],
      connectedTo: [],
    };

    const updatedWalls = updateWallConnections([...walls, wallMeshData]);

    // Update Redux before 3D sync so helpers that read the store (e.g. SyncManager maps) see the new wall.
    dispatch(setWalls(updatedWalls));

    const dataManager = new SyncManager(wallMeshData);
    dataManager.syncData();

    // Find rooms from walls
    const rooms = findRoomsFromWalls(updatedWalls);

    // Filter existing floors from the objects array
    const existingFloors = objects.filter((obj) => obj.type === FLOOR_PLAN_TYPES.FLOOR);

    if (rooms.length > 0) {
      const reconciledFloors: MeshObjectData[] = [];
      const usedFloorIds = new Set<string>();

      rooms.forEach((room) => {
        const roomWallIds = room.map((w) => w.id).sort();
        const roomWallIdsKey = roomWallIds.join(',');

        // Find an existing floor that matches the set of walls in the current room
        const existingFloor = existingFloors.find((f) => {
          const floorWallIds = (f.floorData?.walls || []).slice().sort();
          return floorWallIds.join(',') === roomWallIdsKey;
        });

        const points = getFloorPolygon(room);

        // Calculate bounding box for floor dimensions
        const xs = points.map((p) => p.x);
        const ys = points.map((p) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const width = maxX - minX;
        const depth = maxY - minY;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        if (existingFloor) {
          // Update existing floor
          reconciledFloors.push({
            ...existingFloor,
            dimensions: { ...existingFloor.dimensions, width, depth },
            position: { x: centerX / 100, y: 0, z: centerY / 100 },
            floorData: {
              ...existingFloor.floorData!,
              points: points,
              walls: room.map((wall) => wall.id),
            },
          });
          usedFloorIds.add(existingFloor.id);
        } else {
          // Create new floor object
          reconciledFloors.push({
            id: crypto.randomUUID(),
            name: 'Floor',
            type: FLOOR_PLAN_TYPES.FLOOR,
            isMain: true,
            geometryType: GEOMETRY.NONE,
            dimensions: {
              width: width,
              height: 0.01,
              depth: depth,
            },
            position: {
              x: centerX / 100,
              y: 0,
              z: centerY / 100,
            },
            rotation: { x: 0, y: 0, z: 0 },
            material: [
              {
                id: crypto.randomUUID(),
                name: 'Floor Material',
                type: MATERIAL_TYPES.MISCELLANEOUS,
                properties: {
                  model: false,
                  unit_of_issue: 'Each',
                  default_cost: 0,
                  sell_price: 0,
                  default_markup: 0,
                  sales_tax: false,
                  default_tax_rate: 0,
                  waste: 0,
                  estimate: false,
                  model_file: null,
                },
                textures: [],
              },
            ],
            floorData: {
              points: points,
              walls: room.map((wall) => wall.id),
            },
          });
        }
      });

      // Split into additions, updates and deletions
      const floorsToAdd = reconciledFloors.filter(
        (f) => !existingFloors.find((ef) => ef.id === f.id)
      );
      const floorsToUpdate = reconciledFloors.filter((f) =>
        existingFloors.find((ef) => ef.id === f.id)
      );
      // const floorsToDelete = existingFloors.filter(ef => !usedFloorIds.has(ef.id)); // Deletion logic if needed

      const floorsToDelete = existingFloors.filter((ef) => !usedFloorIds.has(ef.id));

      if (floorsToAdd.length > 0) {
        dispatch(addObjects(floorsToAdd));
      }

      if (floorsToUpdate.length > 0) {
        const updatePayload = floorsToUpdate.map((f) => ({
          id: f.id,
          dimensions: f.dimensions,
          position: f.position,
          floorData: f.floorData,
        }));
        dispatch(updateObjects(updatePayload));
      }

      if (floorsToDelete.length > 0) {
        floorsToDelete.forEach((ef) => dispatch(removeObject(ef.id)));
      }

      // Sync all reconciled floors + any remaining floors to 3D
      const syncManager = new SyncManager(reconciledFloors);
      syncManager.syncData();
    } else if (existingFloors.length > 0) {
      // No rooms detected, remove all existing floors
      existingFloors.forEach((ef) => dispatch(removeObject(ef.id)));
      const syncManager = new SyncManager([]);
      syncManager.syncData();
    }

    // Set next start point for continuous drawing
    dispatch(setWallDrawStartPointId(clickedPoint.id || null));
    setPreviewEnd(null);
    setInputLength(null);
  };

  const handleViewerClick = <T,>(event: ViewerMouseEvent<T>) => {
    if (!isWallDrawingActive) return;

    const localCoordinates = getLogicalCoords(event, offsetX, offsetY);
    const snappedCoords = snapToGrid(localCoordinates.x, localCoordinates.y);

    // Use current preview end if it exists (handles manual length override)
    const preview = getPreviewData();
    const finalCoords = preview ? preview.effectiveEnd : snappedCoords;

    // If first point is not selected
    if (!startPointId) {
      const clickedPoint = findOrCreatePoint(snappedCoords.x, snappedCoords.y);
      dispatch(setWallDrawStartPointId(clickedPoint.id || null));
      setPreviewEnd(null);
      setInputLength(null);
      return;
    }

    // Get the start point object
    const startPoint = points.find((point) => point.id === startPointId);
    if (!startPoint) return;

    createWallSegment(startPoint, finalCoords);
  };

  const getConnectedWallAngle = (startPoint: WallPoint) => {
    const connectedWall = walls.find((wall) => {
      const { startPoint: s, endPoint: e } = getWallReferenceEdgePoints(wall);

      return (
        (Math.round(s.x) === Math.round(startPoint.x) &&
          Math.round(s.y) === Math.round(startPoint.y)) ||
        (Math.round(e.x) === Math.round(startPoint.x) &&
          Math.round(e.y) === Math.round(startPoint.y))
      );
    });

    if (!connectedWall) return null;

    const { startPoint: s, endPoint: e } = getWallReferenceEdgePoints(connectedWall);

    return Math.atan2(e.y - s.y, e.x - s.x);
  };

  // We explicitly add the generic <T> here because react-svg-pan-zoom defines
  // <T,> makes this function generic so it can handle any event payload type.
  // The comma prevents TypeScript from parsing it as JSX.

  const handleViewerMouseMove = <T,>(event: ViewerMouseEvent<T>) => {
    if (!isWallDrawingActive || !startPointId) {
      setPreviewEnd(null);
      return;
    }

    const localCoordinates = getLogicalCoords(event, offsetX, offsetY);
    const snapped = snapToGrid(localCoordinates.x, localCoordinates.y);

    const start = points.find((p) => p.id === startPointId);
    if (!start) return;

    const baseAngle = getConnectedWallAngle(start);

    if (baseAngle === null) {
      setPreviewEnd(snapped);
      return;
    }

    const dx = snapped.x - start.x;
    const dy = snapped.y - start.y;

    const distance = Math.hypot(dx, dy);
    const currentAngle = Math.atan2(dy, dx);

    // Possible snap angles
    const angles = [baseAngle, baseAngle + Math.PI / 2, baseAngle - Math.PI / 2];

    let bestAngle = angles[0];
    let minDiff = Infinity;

    angles.forEach((angle) => {
      const diff = Math.abs(currentAngle - angle);
      if (diff < minDiff) {
        minDiff = diff;
        bestAngle = angle;
      }
    });

    const SNAP_THRESHOLD = 15 * (Math.PI / 180);

    if (minDiff < SNAP_THRESHOLD) {
      // Snap to aligned angle
      const alignedEnd = {
        x: start.x + distance * Math.cos(bestAngle),
        y: start.y + distance * Math.sin(bestAngle),
      };
      setPreviewEnd(alignedEnd);
    } else {
      // Free movement (any angle like 120°)
      setPreviewEnd(snapped);
    }
  };

  // this function helps to the preview data of the wall
  const getPreviewData = () => {
    if (!startPointId || !previewEnd) return null;

    const start = points.find((point) => point.id === startPointId);
    if (!start) return null;

    const deltaX = previewEnd.x - start.x;
    const deltaY = previewEnd.y - start.y;
    const angleRad = Math.atan2(deltaY, deltaX);
    const angleDeg = (angleRad * 180) / Math.PI;

    const mouseLength = Math.hypot(deltaX, deltaY);
    const effectiveLength = inputLength !== null ? inputLength : mouseLength;

    const effectiveEnd =
      inputLength !== null
        ? {
          x: start.x + inputLength * Math.cos(angleRad),
          y: start.y + inputLength * Math.sin(angleRad),
        }
        : previewEnd;

    const offsetSign = computeWallOffsetSignForNewWall(start, effectiveEnd, walls);

    return {
      start,
      length: effectiveLength,
      angle: angleDeg,
      effectiveEnd,
      offsetSign,
      thickness: WALL_THICKNESS_2D_UNITS,
    };
  };

  const finalizeWallByInput = () => {
    const preview = getPreviewData();
    if (!preview || !startPointId) return;

    const startPoint = points.find((point) => point.id === startPointId);
    if (!startPoint) return;

    createWallSegment(startPoint, preview.effectiveEnd);
  };

  return {
    points,
    walls,
    startPointId,
    previewEnd,
    inputLength,
    setInputLength,
    handleViewerClick,
    handleViewerMouseMove,
    getPreviewData,
    finalizeWallByInput,
    resetDrawing,
  };
}
