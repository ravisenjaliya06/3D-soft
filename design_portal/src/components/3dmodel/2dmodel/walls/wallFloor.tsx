import { MeshObjectData } from '../../sceneCreator/interface';
import { getWallFootprintQuad, getWallReferenceEdgePoints } from '../../sceneCreator/utils';
import { WallPoint } from '../interface';

export function getFloorPolygon(walls: MeshObjectData[]): WallPoint[] {
  if (walls.length < 3) return [];

  const lineIntersection = (
    a1: WallPoint,
    a2: WallPoint,
    b1: WallPoint,
    b2: WallPoint
  ): WallPoint | null => {
    const x1 = a1.x;
    const y1 = a1.y;
    const x2 = a2.x;
    const y2 = a2.y;
    const x3 = b1.x;
    const y3 = b1.y;
    const x4 = b2.x;
    const y4 = b2.y;

    const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denominator) < 1e-6) return null;

    const detA = x1 * y2 - y1 * x2;
    const detB = x3 * y4 - y3 * x4;

    const px = (detA * (x3 - x4) - (x1 - x2) * detB) / denominator;
    const py = (detA * (y3 - y4) - (y1 - y2) * detB) / denominator;
    return { x: px, y: py };
  };

  const midpoint = (a: WallPoint, b: WallPoint): WallPoint => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });

  const roomSeedPoints = walls.flatMap((wall) => {
    const [a, b, c, d] = getWallFootprintQuad(wall);
    return [a, b, c, d];
  });
  const center = {
    x: roomSeedPoints.reduce((sum, point) => sum + point.x, 0) / roomSeedPoints.length,
    y: roomSeedPoints.reduce((sum, point) => sum + point.y, 0) / roomSeedPoints.length,
  };

  const innerSegments = walls.map((wall) => {
    const [a, b, c, d] = getWallFootprintQuad(wall);
    const edge1 = { start: a, end: b };
    const edge2 = { start: d, end: c };

    const edge1Mid = midpoint(edge1.start, edge1.end);
    const edge2Mid = midpoint(edge2.start, edge2.end);

    const dist1 = Math.hypot(edge1Mid.x - center.x, edge1Mid.y - center.y);
    const dist2 = Math.hypot(edge2Mid.x - center.x, edge2Mid.y - center.y);
    const chosen = dist1 <= dist2 ? edge1 : edge2;

    const crossToCenter =
      (chosen.end.x - chosen.start.x) * (center.y - chosen.start.y) -
      (chosen.end.y - chosen.start.y) * (center.x - chosen.start.x);

    const oriented =
      crossToCenter >= 0
        ? chosen
        : {
            start: chosen.end,
            end: chosen.start,
          };

    return {
      ...oriented,
      mid: midpoint(oriented.start, oriented.end),
    };
  });

  if (innerSegments.length < 3) return [];

  innerSegments.sort((segA, segB) => {
    const angleA = Math.atan2(segA.mid.y - center.y, segA.mid.x - center.x);
    const angleB = Math.atan2(segB.mid.y - center.y, segB.mid.x - center.x);
    return angleA - angleB;
  });

  const points: WallPoint[] = [];
  for (let i = 0; i < innerSegments.length; i += 1) {
    const current = innerSegments[i];
    const next = innerSegments[(i + 1) % innerSegments.length];
    const intersection = lineIntersection(current.start, current.end, next.start, next.end);
    if (intersection) {
      points.push(intersection);
    } else {
      points.push({ x: current.end.x, y: current.end.y });
    }
  }

  if (points.length < 3) return [];

  let signedArea = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    signedArea += a.x * b.y - b.x * a.y;
  }
  if (Math.abs(signedArea) < 1e-3) return [];

  return points;
}

export function findConnectedWalls(walls: MeshObjectData[]): MeshObjectData[][] {
  const connectedGroups: MeshObjectData[][] = [];
  const visited = new Set<string>();

  // Helper to find connected walls using BFS
  function bfs(startWall: MeshObjectData): MeshObjectData[] {
    const group: MeshObjectData[] = [];
    const queue: MeshObjectData[] = [startWall];
    visited.add(startWall.id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      group.push(current);

      // Find neighbors
      const neighbors = walls.filter((w) => {
        if (visited.has(w.id)) return false;

        // Check if directly connected via ID reference or geometry overlap
        // We use geometric check here since connectedTo might not be fully synced or reliable outside of redux actions
        // But useWallDrawing calculates connectedTo, so let's try to use that first if available
        if (current.connectedTo && current.connectedTo.includes(w.id)) return true;
        if (w.connectedTo && w.connectedTo.includes(current.id)) return true;

        // Fallback to geometric check
        const { startPoint: s1, endPoint: e1 } = getWallReferenceEdgePoints(current);
        const { startPoint: s2, endPoint: e2 } = getWallReferenceEdgePoints(w);

        // Simple point equality check (using rounding to avoid float issues)
        const isSamePoint = (p1: WallPoint, p2: WallPoint) =>
          Math.round(p1.x) === Math.round(p2.x) && Math.round(p1.y) === Math.round(p2.y);

        return (
          isSamePoint(s1, s2) || isSamePoint(s1, e2) || isSamePoint(e1, s2) || isSamePoint(e1, e2)
        );
      });

      for (const neighbor of neighbors) {
        visited.add(neighbor.id);
        queue.push(neighbor);
      }
    }
    return group;
  }

  for (const wall of walls) {
    if (!visited.has(wall.id)) {
      const group = bfs(wall);
      // Only return groups with at least 3 walls as requested
      if (group.length >= 3) {
        connectedGroups.push(group);
      }
    }
  }

  return connectedGroups;
}

// Kept for backward compatibility if needed, but implementation redirects to findConnectedWalls
export function findRoomsFromWalls(walls: MeshObjectData[]): MeshObjectData[][] {
  return findConnectedWalls(walls);
}
