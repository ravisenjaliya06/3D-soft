import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ViewerMouseEvent } from 'react-svg-pan-zoom';
import { RootState } from '../../store';
import { addPoint, setWalls } from '../../store/dataSlice';
import { Wall, WallPoint } from '../interface';
import { snapToGrid } from '../utils';

export function useWallDrawing() {
  const dispatch = useDispatch();

  const storeSelector = useSelector((state: RootState) => state.data);
  const points = storeSelector.points;
  const walls = storeSelector.walls;
  const isWallDrawingActive = storeSelector.isWallDrawingActive;

  const [startPointId, setStartPointId] = useState<string | null>(null);
  const [previewEnd, setPreviewEnd] = useState<{ x: number; y: number } | null>(null);

  // Reset wall drawing
  const resetDrawing = () => {
    setStartPointId(null);
    setPreviewEnd(null);
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
  const updateWallConnections = (allWalls: Wall[]) => {
    return allWalls.map((currentWall) => {
      const connectedWallIds = allWalls
        .filter((otherWall) => otherWall.id !== currentWall.id)
        .filter(
          (otherWall) =>
            // Shared start → start
            (otherWall.startPoint.x === currentWall.startPoint.x &&
              otherWall.startPoint.y === currentWall.startPoint.y) ||
            // Shared end → start
            (otherWall.endPoint.x === currentWall.startPoint.x &&
              otherWall.endPoint.y === currentWall.startPoint.y) ||
            // Shared start → end
            (otherWall.startPoint.x === currentWall.endPoint.x &&
              otherWall.startPoint.y === currentWall.endPoint.y) ||
            // Shared end → end
            (otherWall.endPoint.x === currentWall.endPoint.x &&
              otherWall.endPoint.y === currentWall.endPoint.y)
        )
        .map((connectedWall) => connectedWall.id);

      return { ...currentWall, connectedTo: connectedWallIds };
    });
  };

  // We explicitly add the generic <T> here because react-svg-pan-zoom defines
  // <T,> makes this function generic so it can handle any event payload type.
  // The comma prevents TypeScript from parsing it as JSX.
  const handleViewerClick = <T,>(event: ViewerMouseEvent<T>) => {
    if (!isWallDrawingActive) return;

    const snappedPoint = snapToGrid(event.point.x, event.point.y);
    const clickedPoint = findOrCreatePoint(snappedPoint.x, snappedPoint.y);

    // If first point is not selected
    if (!startPointId) {
      setStartPointId(clickedPoint.id);
      setPreviewEnd(null);
      return;
    }

    // Get the start point object
    const startPoint = points.find((point) => point.id === startPointId);
    if (!startPoint) return;

    // Prevent drawing wall to itself
    const isSamePoint = startPoint.x === clickedPoint.x && startPoint.y === clickedPoint.y;
    if (isSamePoint) return;

    // Prevent duplicate wall in either direction
    const isDuplicateWall = walls.some(
      (existingWall) =>
        (existingWall.startPoint.x === startPoint.x &&
          existingWall.startPoint.y === startPoint.y &&
          existingWall.endPoint.x === clickedPoint.x &&
          existingWall.endPoint.y === clickedPoint.y) ||
        (existingWall.startPoint.x === clickedPoint.x &&
          existingWall.startPoint.y === clickedPoint.y &&
          existingWall.endPoint.x === startPoint.x &&
          existingWall.endPoint.y === startPoint.y)
    );

    if (isDuplicateWall) {
      setStartPointId(clickedPoint.id);
      return;
    }

    // Calculate wall length (distance between points)
    const wallLength = Math.hypot(clickedPoint.x - startPoint.x, clickedPoint.y - startPoint.y);

    const newWall: Wall = {
      id: crypto.randomUUID(),
      startPoint,
      endPoint: clickedPoint,
      width: 0,
      height: 0,
      depth: 0,
      thickness: 30,
      length: wallLength,
      connectedTo: [],
    };

    const updatedWalls = updateWallConnections([...walls, newWall]);
    dispatch(setWalls(updatedWalls));

    // Set next start point for continuous drawing
    setStartPointId(clickedPoint.id);
    setPreviewEnd(null);
  };

  // We explicitly add the generic <T> here because react-svg-pan-zoom defines
  // <T,> makes this function generic so it can handle any event payload type.
  // The comma prevents TypeScript from parsing it as JSX.
  const handleViewerMouseMove = <T,>(event: ViewerMouseEvent<T>) => {
    if (!isWallDrawingActive || !startPointId) {
      setPreviewEnd(null);
      return;
    }

    const snapped = snapToGrid(event.point.x, event.point.y);
    setPreviewEnd(snapped);
  };

  // this function helps to the preview data of the wall
  const getPreviewData = () => {
    if (!startPointId || !previewEnd) return null;

    const start = points.find((point) => point.id === startPointId);
    if (!start) return null;

    const deltaX = previewEnd.x - start.x;
    const deltaY = previewEnd.y - start.y;

    return {
      start,
      length: Math.hypot(deltaX, deltaY),
      angle: (Math.atan2(deltaY, deltaX) * 180) / Math.PI,
    };
  };

  return {
    points,
    walls,
    startPointId,
    previewEnd,
    handleViewerClick,
    handleViewerMouseMove,
    getPreviewData,
    resetDrawing,
  };
}
