import { useDispatch, useSelector } from 'react-redux';
import { FLOOR_PLAN_TYPES, MeshObjectData } from '../../sceneCreator/interface';
import { SyncManager } from '../../sceneCreator/syncState';
import { convertPosition2DTo3D, findRotation, getWall2DPoints } from '../../sceneCreator/utils';
import { RootState } from '../../store';
import { updateObjects, updatePoints } from '../../store/dataSlice';
import { WallPoint } from '../interface';
import { getFloorPolygon } from './wallFloor';

export function useWallAdjustment() {
  const dispatch = useDispatch();
  const objects = useSelector((state: RootState) => state.data.objects);
  const points = useSelector((state: RootState) => state.data.points);

  const adjustWallLength = async (wallId: string, newLength: number) => {
    const selectedWall = objects.find((obj) => obj.id === wallId);
    if (!selectedWall) return;

    // 1. Determine canonical fixed/moving points
    const { startPoint, endPoint } = getWall2DPoints(selectedWall);
    const isVertical = Math.abs(endPoint.x - startPoint.x) < Math.abs(endPoint.y - startPoint.y);

    const isSamePt = (p1: { x: number; y: number }, p2: { x: number; y: number }) =>
      Math.round(p1.x) === Math.round(p2.x) && Math.round(p1.y) === Math.round(p2.y);

    // Count connections to decide pivot point
    const startConnections = objects.filter((obj) => {
      if (obj.type !== FLOOR_PLAN_TYPES.WALL || obj.id === wallId) return false;
      const pts = getWall2DPoints(obj);
      return isSamePt(pts.startPoint, startPoint) || isSamePt(pts.endPoint, startPoint);
    }).length;

    const endConnections = objects.filter((obj) => {
      if (obj.type !== FLOOR_PLAN_TYPES.WALL || obj.id === wallId) return false;
      const pts = getWall2DPoints(obj);
      return isSamePt(pts.startPoint, endPoint) || isSamePt(pts.endPoint, endPoint);
    }).length;

    let canonicalFixed: { x: number; y: number }, canonicalMoving: { x: number; y: number };

    // Priority 1: If only one point is connected, anchor it.
    if (startConnections > 0 && endConnections === 0) {
      canonicalFixed = startPoint;
      canonicalMoving = endPoint;
    } else if (endConnections > 0 && startConnections === 0) {
      canonicalFixed = endPoint;
      canonicalMoving = startPoint;
    } else {
      // Priority 2: Fallback to coordinate-based canonical growth (Vertical -> Down, Horizontal -> Right)
      if (isVertical) {
        if (startPoint.y <= endPoint.y) {
          canonicalFixed = startPoint;
          canonicalMoving = endPoint;
        } else {
          canonicalFixed = endPoint;
          canonicalMoving = startPoint;
        }
      } else {
        if (startPoint.x <= endPoint.x) {
          canonicalFixed = startPoint;
          canonicalMoving = endPoint;
        } else {
          canonicalFixed = endPoint;
          canonicalMoving = startPoint;
        }
      }
    }

    const dx = canonicalMoving.x - canonicalFixed.x;
    const dy = canonicalMoving.y - canonicalFixed.y;
    const currentLength = Math.hypot(dx, dy);

    if (currentLength === 0) return;

    const ux = dx / currentLength;
    const uy = dy / currentLength;

    const newMovingPoint = {
      x: canonicalFixed.x + ux * newLength,
      y: canonicalFixed.y + uy * newLength,
    };

    const objectUpdates: (Partial<MeshObjectData> & { id: string })[] = [];
    const pointUpdates: WallPoint[] = [];

    // 2. Update dots (points) that share coordinates with the moving point
    points.forEach((p) => {
      const isSamePoint =
        Math.round(p.x) === Math.round(canonicalMoving.x) &&
        Math.round(p.y) === Math.round(canonicalMoving.y);
      if (isSamePoint) {
        pointUpdates.push({ ...p, x: newMovingPoint.x, y: newMovingPoint.y });
      }
    });

    // 3. Update selected wall
    // Important: We must maintain the wall's logical orientation from its origin if possible,
    // but the geometry utilities (position/rotation) always assume startPoint -> endPoint.
    // So we pass the NEW fixed/moving points as start/end.
    const updatedSelectedWall = {
      id: selectedWall.id,
      dimensions: { ...selectedWall.dimensions, width: newLength },
      position: convertPosition2DTo3D({ startPoint: canonicalFixed, endPoint: newMovingPoint }),
      rotation: findRotation({ startPoint: canonicalFixed, endPoint: newMovingPoint }),
    };
    objectUpdates.push(updatedSelectedWall);

    // 4. Update connected walls
    objects.forEach((obj) => {
      if (obj.type !== FLOOR_PLAN_TYPES.WALL || obj.id === wallId) return;

      const { startPoint: otherStart, endPoint: otherEnd } = getWall2DPoints(obj);

      const isSamePoint = (p1: { x: number; y: number }, p2: { x: number; y: number }) =>
        Math.round(p1.x) === Math.round(p2.x) && Math.round(p1.y) === Math.round(p2.y);

      let changed = false;
      let nextStart = otherStart;
      let nextEnd = otherEnd;

      if (isSamePoint(otherStart, canonicalMoving)) {
        nextStart = newMovingPoint;
        changed = true;
      } else if (isSamePoint(otherEnd, canonicalMoving)) {
        nextEnd = newMovingPoint;
        changed = true;
      }

      if (changed) {
        const newWidth = Math.hypot(nextEnd.x - nextStart.x, nextEnd.y - nextStart.y);
        const updatedWall = {
          id: obj.id,
          dimensions: { ...obj.dimensions, width: newWidth },
          position: convertPosition2DTo3D({ startPoint: nextStart, endPoint: nextEnd }),
          rotation: findRotation({ startPoint: nextStart, endPoint: nextEnd }),
        };
        objectUpdates.push(updatedWall);
      }
    });

    // 5. Recalculate floors
    // Get all walls with their new (proposed) coordinates for floor recalculation
    const allProposedWalls = objects.map((obj) => {
      if (obj.type !== FLOOR_PLAN_TYPES.WALL) return obj;
      const update = objectUpdates.find((u) => u.id === obj.id);
      return update ? { ...obj, ...update } : obj;
    });

    objects.forEach((obj) => {
      if (obj.type === FLOOR_PLAN_TYPES.FLOOR && obj.floorData) {
        // Find which walls are part of this floor
        const floorWalls = allProposedWalls.filter((w) => obj.floorData?.walls.includes(w.id));
        if (floorWalls.length >= 2) {
          const newFloorPoints = getFloorPolygon(floorWalls);
          objectUpdates.push({
            id: obj.id,
            floorData: {
              ...obj.floorData,
              points: newFloorPoints,
            },
          });
        }
      }
    });

    // 6. Apply updates to Redux
    if (pointUpdates.length > 0) {
      dispatch(updatePoints(pointUpdates));
    }
    dispatch(updateObjects(objectUpdates));

    // 7. Sync changes to 3D scene
    // Prepare ALL updated objects including the recalculated floors
    const finalUpdatesToSync = objectUpdates.map((update) => {
      const fullObj = objects.find((o) => o.id === update.id);
      return { ...fullObj, ...update } as MeshObjectData;
    });

    if (finalUpdatesToSync.length > 0) {
      const syncManager = new SyncManager(finalUpdatesToSync);
      await syncManager.syncData();
    }
  };

  return { adjustWallLength };
}
