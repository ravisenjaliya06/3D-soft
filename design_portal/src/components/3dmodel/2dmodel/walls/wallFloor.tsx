import { MeshObjectData } from '../../sceneCreator/interface';
import { getWallFootprintQuad, getWallReferenceEdgePoints } from '../../sceneCreator/utils';
import { WallPoint } from '../interface';

export function getFloorPolygon(walls: MeshObjectData[]): WallPoint[] {
  if (walls.length < 3) return [];

  const POINT_SNAP = 1;
  const POINT_MERGE_TOLERANCE = 3;

  const pointKey = (p: WallPoint) =>
    `${Math.round(p.x / POINT_SNAP)}:${Math.round(p.y / POINT_SNAP)}`;

  const distance = (a: WallPoint, b: WallPoint) => Math.hypot(a.x - b.x, a.y - b.y);
  const polygonArea = (pts: WallPoint[]) => {
    let area = 0;
    for (let i = 0; i < pts.length; i += 1) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      area += a.x * b.y - b.x * a.y;
    }
    return area;
  };

  const fallbackFromReferenceEndpoints = (): WallPoint[] => {
    const unique = new Map<string, WallPoint>();
    walls.forEach((wall) => {
      const { startPoint, endPoint } = getWallReferenceEdgePoints(wall);
      unique.set(pointKey(startPoint), { x: startPoint.x, y: startPoint.y });
      unique.set(pointKey(endPoint), { x: endPoint.x, y: endPoint.y });
    });
    const points = Array.from(unique.values());
    if (points.length < 3) return [];
    const center = {
      x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
      y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
    };
    points.sort((a, b) => {
      const aa = Math.atan2(a.y - center.y, a.x - center.x);
      const bb = Math.atan2(b.y - center.y, b.x - center.x);
      return aa - bb;
    });
    const area = polygonArea(points);
    if (Math.abs(area) < 1e-3) return [];
    return area < 0 ? [...points].reverse() : points;
  };

  type CandidateSegment = {
    start: WallPoint;
    end: WallPoint;
    mid: WallPoint;
  };

  const midpoint = (a: WallPoint, b: WallPoint): WallPoint => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });

  const normalizeCandidate = (p1: WallPoint, p2: WallPoint, rs: WallPoint, re: WallPoint) => {
    const p1Score = distance(p1, rs) + distance(p2, re);
    const p2Score = distance(p2, rs) + distance(p1, re);
    const useDirect = p1Score <= p2Score;
    const start = useDirect ? p1 : p2;
    const end = useDirect ? p2 : p1;
    return { start, end, mid: midpoint(start, end) };
  };

  const candidatesByWall = new Map<string, CandidateSegment[]>();
  const refByWall = new Map<string, { startPoint: WallPoint; endPoint: WallPoint }>();
  const endpointWallMap = new Map<string, string[]>();

  walls.forEach((wall) => {
    const ref = getWallReferenceEdgePoints(wall);
    refByWall.set(wall.id, ref);
    const startKey = pointKey(ref.startPoint);
    const endKey = pointKey(ref.endPoint);
    endpointWallMap.set(startKey, [...(endpointWallMap.get(startKey) || []), wall.id]);
    endpointWallMap.set(endKey, [...(endpointWallMap.get(endKey) || []), wall.id]);

    const [a, b, c, d] = getWallFootprintQuad(wall);
    const c1 = normalizeCandidate(a, b, ref.startPoint, ref.endPoint);
    const c2 = normalizeCandidate(d, c, ref.startPoint, ref.endPoint);
    candidatesByWall.set(wall.id, [c1, c2]);
  });

  const seedCenterPoints = walls.flatMap((wall) => {
    const [a, b, c, d] = getWallFootprintQuad(wall);
    return [a, b, c, d];
  });
  const center = {
    x: seedCenterPoints.reduce((sum, point) => sum + point.x, 0) / seedCenterPoints.length,
    y: seedCenterPoints.reduce((sum, point) => sum + point.y, 0) / seedCenterPoints.length,
  };

  const chosenIndex = new Map<string, number>();
  const queue: string[] = [];
  const seedWall = walls[0];
  const seedCandidates = candidatesByWall.get(seedWall.id);
  if (!seedCandidates || seedCandidates.length !== 2) return fallbackFromReferenceEndpoints();
  const d0 = distance(seedCandidates[0].mid, center);
  const d1 = distance(seedCandidates[1].mid, center);
  chosenIndex.set(seedWall.id, d0 <= d1 ? 0 : 1);
  queue.push(seedWall.id);

  while (queue.length > 0) {
    const currentWallId = queue.shift()!;
    const currentRef = refByWall.get(currentWallId);
    const currentCandidates = candidatesByWall.get(currentWallId);
    const currentChoice = chosenIndex.get(currentWallId);
    if (!currentRef || !currentCandidates || currentChoice == null) continue;

    const currentSegment = currentCandidates[currentChoice];
    const endpointKeys = [pointKey(currentRef.startPoint), pointKey(currentRef.endPoint)];

    endpointKeys.forEach((epKey, epIdx) => {
      const connected = endpointWallMap.get(epKey) || [];
      connected.forEach((neighborId) => {
        if (neighborId === currentWallId || chosenIndex.has(neighborId)) return;
        const neighborRef = refByWall.get(neighborId);
        const neighborCandidates = candidatesByWall.get(neighborId);
        if (!neighborRef || !neighborCandidates || neighborCandidates.length !== 2) return;

        const currentSharedPoint = epIdx === 0 ? currentSegment.start : currentSegment.end;
        const neighborSharesAtStart = pointKey(neighborRef.startPoint) === epKey;

        const cand0Point = neighborSharesAtStart
          ? neighborCandidates[0].start
          : neighborCandidates[0].end;
        const cand1Point = neighborSharesAtStart
          ? neighborCandidates[1].start
          : neighborCandidates[1].end;

        const pick =
          distance(currentSharedPoint, cand0Point) <= distance(currentSharedPoint, cand1Point)
            ? 0
            : 1;
        chosenIndex.set(neighborId, pick);
        queue.push(neighborId);
      });
    });
  }

  walls.forEach((wall) => {
    if (!chosenIndex.has(wall.id)) {
      const cands = candidatesByWall.get(wall.id);
      if (!cands) return;
      const pick = distance(cands[0].mid, center) <= distance(cands[1].mid, center) ? 0 : 1;
      chosenIndex.set(wall.id, pick);
    }
  });

  const chosenSegments = walls
    .map((wall) => {
      const cands = candidatesByWall.get(wall.id);
      const idx = chosenIndex.get(wall.id);
      if (!cands || idx == null) return null;
      return cands[idx];
    })
    .filter((s): s is CandidateSegment => Boolean(s));

  if (chosenSegments.length < 3) return fallbackFromReferenceEndpoints();

  const nodeByKey = new Map<string, WallPoint>();
  const neighbors = new Map<string, Set<string>>();
  const addNode = (p: WallPoint) => {
    const k = pointKey(p);
    if (!nodeByKey.has(k)) {
      nodeByKey.set(k, { x: p.x, y: p.y });
    }
    if (!neighbors.has(k)) {
      neighbors.set(k, new Set<string>());
    }
    return k;
  };

  const addEdge = (start: WallPoint, end: WallPoint) => {
    const a = addNode(start);
    const b = addNode(end);
    if (a === b) return;
    neighbors.get(a)!.add(b);
    neighbors.get(b)!.add(a);
  };

  chosenSegments.forEach((seg) => addEdge(seg.start, seg.end));

  const degree1Nodes = Array.from(neighbors.entries())
    .filter(([, set]) => set.size === 1)
    .map(([k]) => k);
  const hasBranching = Array.from(neighbors.values()).some((set) => set.size > 2);
  if (hasBranching) return fallbackFromReferenceEndpoints();

  if (degree1Nodes.length === 2) {
    neighbors.get(degree1Nodes[0])!.add(degree1Nodes[1]);
    neighbors.get(degree1Nodes[1])!.add(degree1Nodes[0]);
  } else if (degree1Nodes.length !== 0) {
    return fallbackFromReferenceEndpoints();
  }

  const startKey = Array.from(neighbors.keys())[0];
  if (!startKey) return fallbackFromReferenceEndpoints();

  const orderedKeys: string[] = [startKey];
  let prevKey: string | null = null;
  let currentKey: string = startKey;
  const guard = neighbors.size + 5;

  for (let i = 0; i < guard; i += 1) {
    const nextCandidates = Array.from(neighbors.get(currentKey) || []).filter((k) => k !== prevKey);
    if (nextCandidates.length === 0) break;

    const nextKey =
      nextCandidates.length === 1
        ? nextCandidates[0]
        : (() => {
            const prevPoint = prevKey ? nodeByKey.get(prevKey)! : null;
            const currentPoint = nodeByKey.get(currentKey)!;
            if (!prevPoint) {
              return nextCandidates.sort((a, b) => {
                const pa = nodeByKey.get(a)!;
                const pb = nodeByKey.get(b)!;
                const aa = Math.atan2(pa.y - currentPoint.y, pa.x - currentPoint.x);
                const ab = Math.atan2(pb.y - currentPoint.y, pb.x - currentPoint.x);
                return aa - ab;
              })[0];
            }
            const inX = currentPoint.x - prevPoint.x;
            const inY = currentPoint.y - prevPoint.y;
            let best = nextCandidates[0];
            let bestTurn = Infinity;
            nextCandidates.forEach((candidateKey) => {
              const nextPoint = nodeByKey.get(candidateKey)!;
              const outX = nextPoint.x - currentPoint.x;
              const outY = nextPoint.y - currentPoint.y;
              const turn = Math.atan2(inX * outY - inY * outX, inX * outX + inY * outY);
              const normalizedTurn = turn < 0 ? turn + Math.PI * 2 : turn;
              if (normalizedTurn < bestTurn) {
                bestTurn = normalizedTurn;
                best = candidateKey;
              }
            });
            return best;
          })();

    if (nextKey === startKey) break;

    orderedKeys.push(nextKey);
    prevKey = currentKey;
    currentKey = nextKey;
  }

  const points: WallPoint[] = orderedKeys
    .map((k) => nodeByKey.get(k))
    .filter((p): p is WallPoint => Boolean(p))
    .map((p) => ({ x: p.x, y: p.y }));

  if (points.length < 3) return fallbackFromReferenceEndpoints();

  const deduped: WallPoint[] = [];
  for (const p of points) {
    const last = deduped[deduped.length - 1];
    if (!last || Math.hypot(last.x - p.x, last.y - p.y) > POINT_MERGE_TOLERANCE) {
      deduped.push(p);
    }
  }
  if (deduped.length >= 2) {
    const first = deduped[0];
    const last = deduped[deduped.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) < POINT_MERGE_TOLERANCE) {
      deduped.pop();
    }
  }
  if (deduped.length < 3) return fallbackFromReferenceEndpoints();

  const signedArea = polygonArea(deduped);
  if (Math.abs(signedArea) < 1e-3) return fallbackFromReferenceEndpoints();

  return signedArea < 0 ? [...deduped].reverse() : deduped;
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
