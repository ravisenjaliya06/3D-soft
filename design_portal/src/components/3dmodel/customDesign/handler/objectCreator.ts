import { addShape } from '@/components/3dmodel/store/customDesignSlice';
import commonService from '@/services/CommonService';
import type { Dispatch } from 'redux';
import * as THREE from 'three';
import type { MoveHandler } from '../../handler/moveHandlerInterface';
import { store } from '../../store';
import { Position } from '../../store/interface';
import { supportedGeometryTypes } from '../constants';
import {
  arcPoints,
  CustomImageMaterial,
  DatabaseObject,
  Face,
  FaceLine,
  GeometryData,
  GeometryType,
  ShapeData,
} from '../interface';

function disableEraserAndSelectTool(dispatchFn: Dispatch) {
  dispatchFn({
    type: 'SET_ACTIVE_TOOLS',
    payload: {
      eraser: { isActive: false },
      select: { isActive: true },
      measure: { isActive: false },
    },
  });
}

interface ImageMesh extends THREE.Mesh {
  isImageMesh: boolean;
  onBeforeRender: () => void;
  onAfterRender: () => void;
}

function createEdge(
  start: THREE.Vector3,
  end: THREE.Vector3,
  name: string,
  edgeType: string,
): THREE.Line {
  const material = new THREE.LineBasicMaterial({ color: 0x000000 });
  const points = [start, end];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const edge = new THREE.Line(geometry, material);
  edge.name = name;
  edge.userData = {
    type: 'edge',
    edgeType,
    isSelectable: true,
    edgeInfo: {
      edgeType,
      start: start.toArray(),
      end: end.toArray(),
    },
  };
  return edge;
}

export function getAllFacesFromLines(group: THREE.Mesh): THREE.Mesh[] {
  const pointMap = new Map<string, THREE.Vector3>();
  const graph = new Map<string, Set<string>>();
  const lines = group.children.filter((c) => c.type === 'Line');

  for (const line of lines) {
    const { a, b } = line.userData.points;
    const keyA = `${a.x}, ${a.y}, ${a.z}`;
    const keyB = `${b.x}, ${b.y}, ${b.z}`;
    pointMap.set(keyA, a);
    pointMap.set(keyB, b);

    if (!graph.has(keyA)) graph.set(keyA, new Set());
    if (!graph.has(keyB)) graph.set(keyB, new Set());
    graph.get(keyA)!.add(keyB);
    graph.get(keyB)!.add(keyA);
  }
  const seenFaces = new Set<string>();
  const faces: THREE.Vector3[][] = [];

  function findLoops(
    start: string,
    current: string,
    path: string[],
    visited: Set<string>,
    maxLength: number,
  ): void {
    if (path.length > maxLength) return;

    for (const neighbor of graph.get(current) || []) {
      if (neighbor === start && path.length >= 3) {
        const loop = [...path];
        const loopKey = [...loop].sort().join('|');

        if (!seenFaces.has(loopKey)) {
          const vertices = loop.map((key) => {
            const [x, y, z] = key.split(',').map(Number);
            return new THREE.Vector3(x, y, z);
          });

          if (isPlanar(vertices)) {
            seenFaces.add(loopKey);
            faces.push(vertices);
          }
        }
        continue;
      }

      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        findLoops(
          start,
          neighbor,
          [...path, neighbor],
          new Set(visited),
          maxLength,
        );
      }
    }
  }

  for (const key of graph.keys()) {
    findLoops(key, key, [key], new Set([key]), 4);
  }

  const meshes: THREE.Mesh[] = [];

  const extrudedMaterial = new THREE.MeshBasicMaterial({
    color: 0xcccccc,
    transparent: true,
    side: THREE.DoubleSide,
    opacity: 1,
    visible: true,
  });

  for (const vertices of faces) {
    const center = vertices
      .reduce((sum, v) => sum.add(v.clone()), new THREE.Vector3())
      .divideScalar(vertices.length);

    let edge1;
    let edge2;
    let normal = new THREE.Vector3();
    if (vertices.length >= 3) {
      edge1 = vertices[1].clone().sub(vertices[0]);
      edge2 = vertices[2].clone().sub(vertices[0]);
      normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

      if (normal.y < 0) normal.negate();
    }

    const u = edge1!.clone().normalize();
    const v = new THREE.Vector3().crossVectors(normal, u).normalize();

    const shape = new THREE.Shape();
    vertices.forEach((vert, i) => {
      const local = vert.clone().sub(center);
      const x = local.dot(u);
      const y = local.dot(v);
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
    shape.closePath();

    const extrudeSettings = {
      depth: 0.000001,
      bevelEnabled: false,
      steps: 1,
    };
    const extrudeGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    extrudeGeometry.center();

    const extrudeMesh = new THREE.Mesh(extrudeGeometry, extrudedMaterial);
    extrudeMesh.userData.shape = shape;

    const defaultNormal = new THREE.Vector3(0, 0, 1);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      defaultNormal,
      normal,
    );

    extrudeMesh.setRotationFromQuaternion(quaternion);
    extrudeMesh.name = `face-${faces.indexOf(vertices)}`;
    const lineUUIDs: string[] = [];

    const face_lines: FaceLine[] = [];
    for (let i = 0; i < vertices.length; i++) {
      const a = vertices[i];
      const b = vertices[(i + 1) % vertices.length];

      const line = lines.find((l) => {
        const points = l.userData?.points;

        if (
          !points ||
          !(points.a instanceof THREE.Vector3) ||
          !(points.b instanceof THREE.Vector3)
        ) {
          return false;
        }

        const p1 = points.a;
        const p2 = points.b;

        return (p1.equals(a) && p2.equals(b)) || (p1.equals(b) && p2.equals(a));
      });

      if (line) {
        lineUUIDs.push(line.uuid);
        const a = line.userData?.points?.a;
        const b = line.userData?.points?.b;
        face_lines.push({
          [line.uuid]: {
            a: {
              x: a.x,
              y: a.y,
              z: a.z,
            },
            b: {
              x: b.x,
              y: b.y,
              z: b.z,
            },
          },
        });
      }
    }

    extrudeMesh.userData.points = vertices;
    extrudeMesh.userData.lineUUIDs = lineUUIDs;
    extrudeMesh.userData.lines = face_lines;

    extrudeMesh.position.copy(center);

    meshes.push(extrudeMesh);
  }

  return meshes;
}

function isPlanar(points: THREE.Vector3[]): boolean {
  if (points.length < 3) return false;
  const normal = new THREE.Vector3()
    .crossVectors(
      points[1].clone().sub(points[0]),
      points[2].clone().sub(points[0]),
    )
    .normalize();

  for (let i = 3; i < points.length; i++) {
    const vec = points[i].clone().sub(points[0]);
    if (Math.abs(normal.dot(vec)) > 0.001) return false;
  }

  return true;
}

const faces = [
  // Front faces (z = 1)
  {
    faceId: 'front_0_0',
    points: [
      { x: -1, y: -1, z: 1 },
      { x: 0, y: -1, z: 1 },
      { x: 0, y: 0, z: 1 },
      { x: -1, y: 0, z: 1 },
    ],
    lines: {
      line1: { a: { x: -1, y: -1, z: 1 }, b: { x: 0, y: -1, z: 1 } },
      line2: { a: { x: 0, y: -1, z: 1 }, b: { x: 0, y: 0, z: 1 } },
      line3: { a: { x: 0, y: 0, z: 1 }, b: { x: -1, y: 0, z: 1 } },
      line4: { a: { x: -1, y: 0, z: 1 }, b: { x: -1, y: -1, z: 1 } },
    },
  },
  {
    faceId: 'front_1_0',
    points: [
      { x: 0, y: -1, z: 1 },
      { x: 1, y: -1, z: 1 },
      { x: 1, y: 0, z: 1 },
      { x: 0, y: 0, z: 1 },
    ],
    lines: {
      line1: { a: { x: 0, y: -1, z: 1 }, b: { x: 1, y: -1, z: 1 } },
      line2: { a: { x: 1, y: -1, z: 1 }, b: { x: 1, y: 0, z: 1 } },
      line3: { a: { x: 1, y: 0, z: 1 }, b: { x: 0, y: 0, z: 1 } },
      line4: { a: { x: 0, y: 0, z: 1 }, b: { x: 0, y: -1, z: 1 } },
    },
  },
  {
    faceId: 'front_0_1',
    points: [
      { x: -1, y: 0, z: 1 },
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 1, z: 1 },
      { x: -1, y: 1, z: 1 },
    ],
    lines: {
      line1: { a: { x: -1, y: 0, z: 1 }, b: { x: 0, y: 0, z: 1 } },
      line2: { a: { x: 0, y: 0, z: 1 }, b: { x: 0, y: 1, z: 1 } },
      line3: { a: { x: 0, y: 1, z: 1 }, b: { x: -1, y: 1, z: 1 } },
      line4: { a: { x: -1, y: 1, z: 1 }, b: { x: -1, y: 0, z: 1 } },
    },
  },
  {
    faceId: 'front_1_1',
    points: [
      { x: 0, y: 0, z: 1 },
      { x: 1, y: 0, z: 1 },
      { x: 1, y: 1, z: 1 },
      { x: 0, y: 1, z: 1 },
    ],
    lines: {
      line1: { a: { x: 0, y: 0, z: 1 }, b: { x: 1, y: 0, z: 1 } },
      line2: { a: { x: 1, y: 0, z: 1 }, b: { x: 1, y: 1, z: 1 } },
      line3: { a: { x: 1, y: 1, z: 1 }, b: { x: 0, y: 1, z: 1 } },
      line4: { a: { x: 0, y: 1, z: 1 }, b: { x: 0, y: 0, z: 1 } },
    },
  },

  // Back faces (z = -1)
  {
    faceId: 'back_0_0',
    points: [
      { x: -1, y: -1, z: -1 },
      { x: 0, y: -1, z: -1 },
      { x: 0, y: 0, z: -1 },
      { x: -1, y: 0, z: -1 },
    ],
    lines: {
      line1: { a: { x: -1, y: -1, z: -1 }, b: { x: 0, y: -1, z: -1 } },
      line2: { a: { x: 0, y: -1, z: -1 }, b: { x: 0, y: 0, z: -1 } },
      line3: { a: { x: 0, y: 0, z: -1 }, b: { x: -1, y: 0, z: -1 } },
      line4: { a: { x: -1, y: 0, z: -1 }, b: { x: -1, y: -1, z: -1 } },
    },
  },
  {
    faceId: 'back_1_0',
    points: [
      { x: 0, y: -1, z: -1 },
      { x: 1, y: -1, z: -1 },
      { x: 1, y: 0, z: -1 },
      { x: 0, y: 0, z: -1 },
    ],
    lines: {
      line1: { a: { x: 0, y: -1, z: -1 }, b: { x: 1, y: -1, z: -1 } },
      line2: { a: { x: 1, y: -1, z: -1 }, b: { x: 1, y: 0, z: -1 } },
      line3: { a: { x: 1, y: 0, z: -1 }, b: { x: 0, y: 0, z: -1 } },
      line4: { a: { x: 0, y: 0, z: -1 }, b: { x: 0, y: -1, z: -1 } },
    },
  },
  {
    faceId: 'back_0_1',
    points: [
      { x: -1, y: 0, z: -1 },
      { x: 0, y: 0, z: -1 },
      { x: 0, y: 1, z: -1 },
      { x: -1, y: 1, z: -1 },
    ],
    lines: {
      line1: { a: { x: -1, y: 0, z: -1 }, b: { x: 0, y: 0, z: -1 } },
      line2: { a: { x: 0, y: 0, z: -1 }, b: { x: 0, y: 1, z: -1 } },
      line3: { a: { x: 0, y: 1, z: -1 }, b: { x: -1, y: 1, z: -1 } },
      line4: { a: { x: -1, y: 1, z: -1 }, b: { x: -1, y: 0, z: -1 } },
    },
  },
  {
    faceId: 'back_1_1',
    points: [
      { x: 0, y: 0, z: -1 },
      { x: 1, y: 0, z: -1 },
      { x: 1, y: 1, z: -1 },
      { x: 0, y: 1, z: -1 },
    ],
    lines: {
      line1: { a: { x: 0, y: 0, z: -1 }, b: { x: 1, y: 0, z: -1 } },
      line2: { a: { x: 1, y: 0, z: -1 }, b: { x: 1, y: 1, z: -1 } },
      line3: { a: { x: 1, y: 1, z: -1 }, b: { x: 0, y: 1, z: -1 } },
      line4: { a: { x: 0, y: 1, z: -1 }, b: { x: 0, y: 0, z: -1 } },
    },
  },

  // Top faces (y = 1)
  {
    faceId: 'top_0_0',
    points: [
      { x: -1, y: 1, z: -1 },
      { x: 0, y: 1, z: -1 },
      { x: 0, y: 1, z: 0 },
      { x: -1, y: 1, z: 0 },
    ],
    lines: {
      line1: { a: { x: -1, y: 1, z: -1 }, b: { x: 0, y: 1, z: -1 } },
      line2: { a: { x: 0, y: 1, z: -1 }, b: { x: 0, y: 1, z: 0 } },
      line3: { a: { x: 0, y: 1, z: 0 }, b: { x: -1, y: 1, z: 0 } },
      line4: { a: { x: -1, y: 1, z: 0 }, b: { x: -1, y: 1, z: -1 } },
    },
  },
  {
    faceId: 'top_1_0',
    points: [
      { x: 0, y: 1, z: -1 },
      { x: 1, y: 1, z: -1 },
      { x: 1, y: 1, z: 0 },
      { x: 0, y: 1, z: 0 },
    ],
    lines: {
      line1: { a: { x: 0, y: 1, z: -1 }, b: { x: 1, y: 1, z: -1 } },
      line2: { a: { x: 1, y: 1, z: -1 }, b: { x: 1, y: 1, z: 0 } },
      line3: { a: { x: 1, y: 1, z: 0 }, b: { x: 0, y: 1, z: 0 } },
      line4: { a: { x: 0, y: 1, z: 0 }, b: { x: 0, y: 1, z: -1 } },
    },
  },
  {
    faceId: 'top_0_1',
    points: [
      { x: -1, y: 1, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 1, z: 1 },
      { x: -1, y: 1, z: 1 },
    ],
    lines: {
      line1: { a: { x: -1, y: 1, z: 0 }, b: { x: 0, y: 1, z: 0 } },
      line2: { a: { x: 0, y: 1, z: 0 }, b: { x: 0, y: 1, z: 1 } },
      line3: { a: { x: 0, y: 1, z: 1 }, b: { x: -1, y: 1, z: 1 } },
      line4: { a: { x: -1, y: 1, z: 1 }, b: { x: -1, y: 1, z: 0 } },
    },
  },
  {
    faceId: 'top_1_1',
    points: [
      { x: 0, y: 1, z: 0 },
      { x: 1, y: 1, z: 0 },
      { x: 1, y: 1, z: 1 },
      { x: 0, y: 1, z: 1 },
    ],
    lines: {
      line1: { a: { x: 0, y: 1, z: 0 }, b: { x: 1, y: 1, z: 0 } },
      line2: { a: { x: 1, y: 1, z: 0 }, b: { x: 1, y: 1, z: 1 } },
      line3: { a: { x: 1, y: 1, z: 1 }, b: { x: 0, y: 1, z: 1 } },
      line4: { a: { x: 0, y: 1, z: 1 }, b: { x: 0, y: 1, z: 0 } },
    },
  },

  // Bottom faces (y = -1)
  {
    faceId: 'bottom_0_0',
    points: [
      { x: -1, y: -1, z: -1 },
      { x: 0, y: -1, z: -1 },
      { x: 0, y: -1, z: 0 },
      { x: -1, y: -1, z: 0 },
    ],
    lines: {
      line1: { a: { x: -1, y: -1, z: -1 }, b: { x: 0, y: -1, z: -1 } },
      line2: { a: { x: 0, y: -1, z: -1 }, b: { x: 0, y: -1, z: 0 } },
      line3: { a: { x: 0, y: -1, z: 0 }, b: { x: -1, y: -1, z: 0 } },
      line4: { a: { x: -1, y: -1, z: 0 }, b: { x: -1, y: -1, z: -1 } },
    },
  },
  {
    faceId: 'bottom_1_0',
    points: [
      { x: 0, y: -1, z: -1 },
      { x: 1, y: -1, z: -1 },
      { x: 1, y: -1, z: 0 },
      { x: 0, y: -1, z: 0 },
    ],
    lines: {
      line1: { a: { x: 0, y: -1, z: -1 }, b: { x: 1, y: -1, z: -1 } },
      line2: { a: { x: 1, y: -1, z: -1 }, b: { x: 1, y: -1, z: 0 } },
      line3: { a: { x: 1, y: -1, z: 0 }, b: { x: 0, y: -1, z: 0 } },
      line4: { a: { x: 0, y: -1, z: 0 }, b: { x: 0, y: -1, z: -1 } },
    },
  },
  {
    faceId: 'bottom_0_1',
    points: [
      { x: -1, y: -1, z: 0 },
      { x: 0, y: -1, z: 0 },
      { x: 0, y: -1, z: 1 },
      { x: -1, y: -1, z: 1 },
    ],
    lines: {
      line1: { a: { x: -1, y: -1, z: 0 }, b: { x: 0, y: -1, z: 0 } },
      line2: { a: { x: 0, y: -1, z: 0 }, b: { x: 0, y: -1, z: 1 } },
      line3: { a: { x: 0, y: -1, z: 1 }, b: { x: -1, y: -1, z: 1 } },
      line4: { a: { x: -1, y: -1, z: 1 }, b: { x: -1, y: -1, z: 0 } },
    },
  },
  {
    faceId: 'bottom_1_1',
    points: [
      { x: 0, y: -1, z: 0 },
      { x: 1, y: -1, z: 0 },
      { x: 1, y: -1, z: 1 },
      { x: 0, y: -1, z: 1 },
    ],
    lines: {
      line1: { a: { x: 0, y: -1, z: 0 }, b: { x: 1, y: -1, z: 0 } },
      line2: { a: { x: 1, y: -1, z: 0 }, b: { x: 1, y: -1, z: 1 } },
      line3: { a: { x: 1, y: -1, z: 1 }, b: { x: 0, y: -1, z: 1 } },
      line4: { a: { x: 0, y: -1, z: 1 }, b: { x: 0, y: -1, z: 0 } },
    },
  },

  // Left faces (x = -1)
  {
    faceId: 'left_0_0',
    points: [
      { x: -1, y: -1, z: -1 },
      { x: -1, y: 0, z: -1 },
      { x: -1, y: 0, z: 0 },
      { x: -1, y: -1, z: 0 },
    ],
    lines: {
      line1: { a: { x: -1, y: -1, z: -1 }, b: { x: -1, y: 0, z: -1 } },
      line2: { a: { x: -1, y: 0, z: -1 }, b: { x: -1, y: 0, z: 0 } },
      line3: { a: { x: -1, y: 0, z: 0 }, b: { x: -1, y: -1, z: 0 } },
      line4: { a: { x: -1, y: -1, z: 0 }, b: { x: -1, y: -1, z: -1 } },
    },
  },
  {
    faceId: 'left_0_1',
    points: [
      { x: -1, y: 0, z: -1 },
      { x: -1, y: 1, z: -1 },
      { x: -1, y: 1, z: 0 },
      { x: -1, y: 0, z: 0 },
    ],
    lines: {
      line1: { a: { x: -1, y: 0, z: -1 }, b: { x: -1, y: 1, z: -1 } },
      line2: { a: { x: -1, y: 1, z: -1 }, b: { x: -1, y: 1, z: 0 } },
      line3: { a: { x: -1, y: 1, z: 0 }, b: { x: -1, y: 0, z: 0 } },
      line4: { a: { x: -1, y: 0, z: 0 }, b: { x: -1, y: 0, z: -1 } },
    },
  },
  {
    faceId: 'left_0_2',
    points: [
      { x: -1, y: -1, z: 0 },
      { x: -1, y: 0, z: 0 },
      { x: -1, y: 0, z: 1 },
      { x: -1, y: -1, z: 1 },
    ],
    lines: {
      line1: { a: { x: -1, y: -1, z: 0 }, b: { x: -1, y: 0, z: 0 } },
      line2: { a: { x: -1, y: 0, z: 0 }, b: { x: -1, y: 0, z: 1 } },
      line3: { a: { x: -1, y: 0, z: 1 }, b: { x: -1, y: -1, z: 1 } },
      line4: { a: { x: -1, y: -1, z: 1 }, b: { x: -1, y: -1, z: 0 } },
    },
  },
  {
    faceId: 'left_0_3',
    points: [
      { x: -1, y: 0, z: 0 },
      { x: -1, y: 1, z: 0 },
      { x: -1, y: 1, z: 1 },
      { x: -1, y: 0, z: 1 },
    ],
    lines: {
      line1: { a: { x: -1, y: 0, z: 0 }, b: { x: -1, y: 1, z: 0 } },
      line2: { a: { x: -1, y: 1, z: 0 }, b: { x: -1, y: 1, z: 1 } },
      line3: { a: { x: -1, y: 1, z: 1 }, b: { x: -1, y: 0, z: 1 } },
      line4: { a: { x: -1, y: 0, z: 1 }, b: { x: -1, y: 0, z: 0 } },
    },
  },

  // Right faces (x = 1)
  {
    faceId: 'right_0_0',
    points: [
      { x: 1, y: -1, z: -1 },
      { x: 1, y: 0, z: -1 },
      { x: 1, y: 0, z: 0 },
      { x: 1, y: -1, z: 0 },
    ],
    lines: {
      line1: { a: { x: 1, y: -1, z: -1 }, b: { x: 1, y: 0, z: -1 } },
      line2: { a: { x: 1, y: 0, z: -1 }, b: { x: 1, y: 0, z: 0 } },
      line3: { a: { x: 1, y: 0, z: 0 }, b: { x: 1, y: -1, z: 0 } },
      line4: { a: { x: 1, y: -1, z: 0 }, b: { x: 1, y: -1, z: -1 } },
    },
  },
  {
    faceId: 'right_0_1',
    points: [
      { x: 1, y: 0, z: -1 },
      { x: 1, y: 1, z: -1 },
      { x: 1, y: 1, z: 0 },
      { x: 1, y: 0, z: 0 },
    ],
    lines: {
      line1: { a: { x: 1, y: 0, z: -1 }, b: { x: 1, y: 1, z: -1 } },
      line2: { a: { x: 1, y: 1, z: -1 }, b: { x: 1, y: 1, z: 0 } },
      line3: { a: { x: 1, y: 1, z: 0 }, b: { x: 1, y: 0, z: 0 } },
      line4: { a: { x: 1, y: 0, z: 0 }, b: { x: 1, y: 0, z: -1 } },
    },
  },
  {
    faceId: 'right_0_2',
    points: [
      { x: 1, y: -1, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 1, y: 0, z: 1 },
      { x: 1, y: -1, z: 1 },
    ],
    lines: {
      line1: { a: { x: 1, y: -1, z: 0 }, b: { x: 1, y: 0, z: 0 } },
      line2: { a: { x: 1, y: 0, z: 0 }, b: { x: 1, y: 0, z: 1 } },
      line3: { a: { x: 1, y: 0, z: 1 }, b: { x: 1, y: -1, z: 1 } },
      line4: { a: { x: 1, y: -1, z: 1 }, b: { x: 1, y: -1, z: 0 } },
    },
  },
  {
    faceId: 'right_0_3',
    points: [
      { x: 1, y: 0, z: 0 },
      { x: 1, y: 1, z: 0 },
      { x: 1, y: 1, z: 1 },
      { x: 1, y: 0, z: 1 },
    ],
    lines: {
      line1: { a: { x: 1, y: 0, z: 0 }, b: { x: 1, y: 1, z: 0 } },
      line2: { a: { x: 1, y: 1, z: 0 }, b: { x: 1, y: 1, z: 1 } },
      line3: { a: { x: 1, y: 1, z: 1 }, b: { x: 1, y: 0, z: 1 } },
      line4: { a: { x: 1, y: 0, z: 1 }, b: { x: 1, y: 0, z: 0 } },
    },
  },
];

export function Box2(faces: Face[]) {
  const group = new THREE.Mesh();

  const material = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    side: THREE.DoubleSide,
  });

  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
  const lineMap = new Map<string, string>();
  const linePointMap = new Map<string, THREE.Vector3[]>();

  for (const face of faces) {
    const { points, faceId } = face;

    const vectorPoints = points.map(
      (point) => new THREE.Vector3(point.x, point.y, point.z),
    );

    const center = vectorPoints
      .reduce((sum, vector) => sum.add(vector.clone()), new THREE.Vector3())
      .divideScalar(vectorPoints.length);

    const p0 = new THREE.Vector3(points[0].x, points[0].y, points[0].z);
    const p1 = new THREE.Vector3(points[1].x, points[1].y, points[1].z);
    const p2 = new THREE.Vector3(points[2].x, points[2].y, points[2].z);

    const v1 = new THREE.Vector3().subVectors(p1, p0).normalize();
    const v2 = new THREE.Vector3().subVectors(p2, p0).normalize();
    const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();

    const u = v1.clone();
    const v = new THREE.Vector3().crossVectors(normal, u).normalize();

    const projectedPoints = points.map((p) => {
      const vec = new THREE.Vector3(p.x, p.y, p.z).sub(p0);
      return new THREE.Vector2(vec.dot(u), vec.dot(v));
    });

    const shape = new THREE.Shape();
    shape.moveTo(projectedPoints[0].x, projectedPoints[0].y);
    for (let i = 1; i < projectedPoints.length; i++) {
      shape.lineTo(projectedPoints[i].x, projectedPoints[i].y);
    }
    shape.lineTo(projectedPoints[0].x, projectedPoints[0].y);

    const extrudeSettings = { depth: 0.0001, bevelEnabled: false };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const extrudeMesh = new THREE.Mesh(geometry, material);

    const basis = new THREE.Matrix4().makeBasis(u, v, normal);
    const translation = new THREE.Matrix4().makeTranslation(p0.x, p0.y, p0.z);
    extrudeMesh.applyMatrix4(basis);
    extrudeMesh.applyMatrix4(translation);

    extrudeMesh.name = faceId;
    const lineUUIDs: string[] = [];

    const face_lines = face.lines ?? {};
    const lineArray = Object.values(face_lines);

    function getLineKey(p1: Position, p2: Position): string {
      const key1 = `${p1.x},${p1.y},${p1.z}`;
      const key2 = `${p2.x},${p2.y},${p2.z}`;
      return [key1, key2].sort().join('|');
    }

    for (const line of lineArray) {
      const { a: p1, b: p2 } = line;
      const key = getLineKey(p1, p2);

      if (lineMap.has(key)) {
        // If line already exists, reuse UUID
        const existingUUID = lineMap.get(key)!;
        lineUUIDs.push(existingUUID);
      } else {
        // Create new line
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(
            [p1.x, p1.y, p1.z, p2.x, p2.y, p2.z],
            3,
          ),
        );

        const lineMesh = new THREE.Line(geometry, lineMaterial);
        lineMesh.userData.points = {
          a: new THREE.Vector3(p1.x, p1.y, p1.z),
          b: new THREE.Vector3(p2.x, p2.y, p2.z),
        };

        group.add(lineMesh);
        lineUUIDs.push(lineMesh.uuid);
        lineMap.set(key, lineMesh.uuid);
        linePointMap.set(lineMesh.uuid, [
          lineMesh.userData.points.a,
          lineMesh.userData.points.b,
        ]);
      }
      console.log(lineMap, 'lineMap');
    }

    // Attach userData
    extrudeMesh.userData.points = vectorPoints;
    extrudeMesh.userData.lineUUIDs = lineUUIDs;
    extrudeMesh.userData.lines = face_lines;
    extrudeMesh.userData.shape = shape;
    extrudeMesh.userData.center = center;
    group.add(extrudeMesh);
  }

  group.userData.faces = faces;
  return group;
}

function createObject(data: GeometryData): THREE.Mesh {
  if (data.type === 'image') {
    const width = data.dimensions?.width || 1;
    const height = data.dimensions?.height || 1;
    const imageUrl = data.dimensions?.imageUrl;

    if (!imageUrl) {
      const planeGeometry = new THREE.PlaneGeometry(width, height);
      const placeholderMaterial = new THREE.MeshBasicMaterial({
        color: 0xaaaaaa,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      });

      const placeholderMesh = new THREE.Mesh(
        planeGeometry,
        placeholderMaterial,
      );
      placeholderMesh.name = 'image-placeholder';
      return placeholderMesh;
    }

    const aspectRatio =
      data.dimensions?.imageSize?.width && data.dimensions?.imageSize?.height
        ? data.dimensions.imageSize.width / data.dimensions.imageSize.height
        : 1;

    const planeGeometry = new THREE.PlaneGeometry(width, width / aspectRatio);

    let texture;
    if (data.preloadedTexture) {
      texture = data.preloadedTexture;
    } else {
      const textureLoader = new THREE.TextureLoader();
      texture = textureLoader.load(imageUrl);
    }
    texture.flipY = false;
    texture.needsUpdate = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    const renderer = new THREE.WebGLRenderer();
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    texture.anisotropy = maxAnisotropy;
    renderer.dispose();
    const imageMaterial: CustomImageMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      alphaTest: 0.1,
      depthTest: true,
      depthWrite: true,
    }) as CustomImageMaterial;

    imageMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.forceUpdate = { value: 1.0 };
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #include <map_fragment>
        // Ensure image always shows at full opacity when it has a texture
        if (diffuseColor.a < 0.1) {
          discard;
        }
        `,
      );
    };
    imageMaterial.imageUrl = imageUrl;
    try {
      if (store && store.dispatch) {
        disableEraserAndSelectTool(store.dispatch);
      }
    } catch (err) {
      console.warn('Failed to disable eraser tool:', err);
    }
    imageMaterial.isImageMaterial = true;
    imageMaterial.originalUrl = imageUrl;
    imageMaterial.aspectRatio = aspectRatio;
    imageMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.forceUpdate = { value: 1.0 };
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #include <map_fragment>
        // Ensure image always shows at full opacity when it has a texture
        if (diffuseColor.a < 0.1) {
          discard;
        }
        `,
      );
    };
    imageMaterial.imageUrl = imageUrl;
    try {
      if (store && store.dispatch) {
        disableEraserAndSelectTool(store.dispatch);
      }
    } catch (err) {
      console.warn('Failed to disable eraser tool:', err);
    }
    imageMaterial.isImageMaterial = true;

    const imageMesh = new THREE.Mesh(
      planeGeometry,
      imageMaterial,
    ) as unknown as ImageMesh;
    imageMesh.name = 'image-' + Date.now().toString();

    imageMesh.userData.originalImageUrl = imageUrl;
    imageMesh.userData.aspectRatio = aspectRatio;
    imageMesh.userData.width = width;
    imageMesh.userData.height = width / aspectRatio;
    imageMesh.rotation.x = -Math.PI / 2;
    imageMesh.isImageMesh = true;
    imageMesh.userData.isImage = true;

    imageMesh.onBeforeRender = () => {
      if (imageMaterial.map) {
        imageMaterial.map.needsUpdate = true;
        imageMaterial.needsUpdate = true;
      }
    };
    imageMesh.onAfterRender = () => {
      imageMesh.visible = true;
      if (imageMaterial.map) {
        imageMaterial.map.needsUpdate = true;
      }
    };

    const wireframeLines = createCustomWireframe(planeGeometry, 'image');
    if (wireframeLines) {
      imageMesh.add(wireframeLines);
    }
    return imageMesh;
  }
  if (data.type === 'image') {
    const width = data.dimensions?.width || 1;
    const height = data.dimensions?.height || 1;
    const imageUrl = data.dimensions?.imageUrl;

    if (!imageUrl) {
      const planeGeometry = new THREE.PlaneGeometry(width, height);
      const placeholderMaterial = new THREE.MeshBasicMaterial({
        color: 0xaaaaaa,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      });

      const placeholderMesh = new THREE.Mesh(
        planeGeometry,
        placeholderMaterial,
      );
      placeholderMesh.name = 'image-placeholder';
      return placeholderMesh;
    }

    const aspectRatio =
      data.dimensions?.imageSize?.width && data.dimensions?.imageSize?.height
        ? data.dimensions.imageSize.width / data.dimensions.imageSize.height
        : 1;

    const planeGeometry = new THREE.PlaneGeometry(width, width / aspectRatio);

    let texture;
    if (data.preloadedTexture) {
      texture = data.preloadedTexture;
    } else {
      const textureLoader = new THREE.TextureLoader();
      texture = textureLoader.load(imageUrl);
    }
    texture.flipY = false;
    texture.needsUpdate = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    const renderer = new THREE.WebGLRenderer();
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    texture.anisotropy = maxAnisotropy;
    renderer.dispose();
    const imageMaterial: CustomImageMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      alphaTest: 0.1,
      depthTest: true,
      depthWrite: true,
    }) as CustomImageMaterial;
    imageMaterial.isImageMaterial = true;
    imageMaterial.originalUrl = imageUrl;
    imageMaterial.aspectRatio = aspectRatio;
    imageMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.forceUpdate = { value: 1.0 };
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #include <map_fragment>
        // Ensure image always shows at full opacity when it has a texture
        if (diffuseColor.a < 0.1) {
          discard;
        }
        `,
      );
    };
    imageMaterial.imageUrl = imageUrl;
    try {
      if (store && store.dispatch) {
        disableEraserAndSelectTool(store.dispatch);
      }
    } catch (err) {
      console.warn('Failed to disable eraser tool:', err);
    }
    imageMaterial.isImageMaterial = true;

    const imageMesh = new THREE.Mesh(
      planeGeometry,
      imageMaterial,
    ) as unknown as ImageMesh;
    imageMesh.name = 'image-' + Date.now().toString();

    imageMesh.userData.originalImageUrl = imageUrl;
    imageMesh.userData.aspectRatio = aspectRatio;
    imageMesh.userData.width = width;
    imageMesh.userData.height = width / aspectRatio;
    imageMesh.rotation.x = -Math.PI / 2;
    imageMesh.isImageMesh = true;
    imageMesh.userData.isImage = true;

    imageMesh.onBeforeRender = () => {
      if (imageMaterial.map) {
        imageMaterial.map.needsUpdate = true;
        imageMaterial.needsUpdate = true;
      }
    };
    imageMesh.onAfterRender = () => {
      imageMesh.visible = true;
      if (imageMaterial.map) {
        imageMaterial.map.needsUpdate = true;
      }
    };

    const wireframeLines = createCustomWireframe(planeGeometry, 'image');
    if (wireframeLines) {
      imageMesh.add(wireframeLines);
    }
    return imageMesh;
  }
  if (data.type == 'box2') {
    return Box2(faces);
  }

  // Handle other object types...
  let geometry: THREE.BufferGeometry;
  const material =
    data.material ||
    new THREE.MeshStandardMaterial({
      color: data.color || 0xd3d3d3,
      side: THREE.DoubleSide,
      flatShading: false,
    });

  switch (data.type) {
    case 'box':
      geometry = new THREE.BoxGeometry(
        data.dimensions?.width || 1,
        data.dimensions?.height || 1,
        data.dimensions?.depth || 1,
        data.dimensions?.widthSegments || 2,
        data.dimensions?.heightSegments || 2,
        data.dimensions?.depthSegments || 2,
      ).toNonIndexed();
      geometry.computeVertexNormals();
      break;
    case 'sphere':
      geometry = new THREE.SphereGeometry(
        data.dimensions?.radius || 1,
        data.dimensions?.segments || 16,
        data.dimensions?.segments || 16,
      ).toNonIndexed();
      break;
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(
        data.dimensions?.radiusTop || 1,
        data.dimensions?.radiusBottom || 1,
        data.dimensions?.height || 1,
        data.dimensions?.segments || 16,
        data.dimensions?.heightSegments || 4,
      );
      break;
    case 'cone':
      geometry = new THREE.ConeGeometry(
        data.dimensions?.radius || 1,
        data.dimensions?.height || 2,
        data.dimensions?.segments || 16,
        data.dimensions?.heightSegments || 4,
      );
      break;
    case 'torus':
      geometry = new THREE.TorusGeometry(
        data.dimensions?.radius || 1,
        data.dimensions?.tube || 0.2,
        data.dimensions?.segments || 16,
      );
      break;
    case 'plane':
      geometry = new THREE.PlaneGeometry(
        data.dimensions?.width || 1,
        data.dimensions?.height || 1,
        data.dimensions?.segments || 1,
        data.dimensions?.segments || 1,
      );
      break;
    case 'circle':
      geometry = new THREE.CircleGeometry(
        data.dimensions?.radius || 1,
        data.dimensions?.segments || 32,
      );
      break;
    case 'polygon':
      const sides = data.dimensions?.sides || 5;
      const radius = data.dimensions?.radius || 1;
      const shape = new THREE.Shape();

      for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);

        if (i === 0) {
          shape.moveTo(x, y);
        } else {
          shape.lineTo(x, y);
        }
      }
      shape.closePath();

      geometry = new THREE.ShapeGeometry(shape);
      break;
    case 'rectangle':
      const width = data.dimensions?.width || 1;
      const height = data.dimensions?.height || 1;
      const rectShape = new THREE.Shape();
      rectShape.moveTo(-width / 2, -height / 2);
      rectShape.lineTo(width / 2, -height / 2);
      rectShape.lineTo(width / 2, height / 2);
      rectShape.lineTo(-width / 2, height / 2);
      rectShape.lineTo(-width / 2, -height / 2);

      geometry = new THREE.ShapeGeometry(rectShape);
      break;
    case 'box2':
      const width1 = data.dimensions?.width || 1;
      const height1 = 0.00001;
      const depth1 = data.dimensions?.depth || 1;

      geometry = new THREE.BoxGeometry(width1, height1, depth1);
      break;
    case 'arc':
      if (
        data.dimensions?.curvePoints &&
        Array.isArray(data.dimensions.curvePoints)
      ) {
        // Create arc from curve points
        const curvePoints = data.dimensions.curvePoints;
        const arcShape = new THREE.Shape();

        // Get the first point
        const firstPoint = curvePoints[0];
        let firstX = 0,
          firstZ = 0;

        if ('x' in firstPoint && 'z' in firstPoint) {
          firstX = firstPoint.x;
          firstZ = firstPoint.z;
        } else {
          console.error('Invalid curve point format:', firstPoint);
          return new THREE.Mesh(); // Return empty mesh on error
        }

        // Start the shape
        arcShape.moveTo(firstX, firstZ);

        // Add all points to the shape
        for (let i = 1; i < curvePoints.length; i++) {
          const point = curvePoints[i];
          if ('x' in point && 'z' in point) {
            arcShape.lineTo(point.x, point.z);
          }
        }

        // Create geometry and material
        geometry = new THREE.ShapeGeometry(arcShape);
        const material = new THREE.MeshStandardMaterial({
          color: data.color || 0xd3d3d3,
          side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = data.type;
        mesh.rotation.x = Math.PI / 2; // Ensure consistent rotation

        // Add wireframe
        const wireframeLines = createCustomWireframe(geometry, 'arc');
        if (wireframeLines) {
          mesh.add(wireframeLines);
        }

        // Store original data in userData
        mesh.userData.isArc = true;
        mesh.userData.curvePoints = curvePoints;
        if (data.dimensions.points) {
          mesh.userData.arcPoints = data.dimensions.points;
        }

        return mesh;
      } else if (
        data.dimensions?.start &&
        data.dimensions?.end &&
        data.dimensions?.bulge
      ) {
        // Create arc from control points
        const start = data.dimensions.start;
        const end = data.dimensions.end;
        const bulge = data.dimensions.bulge;

        const startPoint = new THREE.Vector3(start.x, start.y, start.z);
        const endPoint = new THREE.Vector3(end.x, end.y, end.z);
        const bulgePoint = new THREE.Vector3(bulge.x, bulge.y, bulge.z);

        // Create the curve
        const curve = createQuadraticBezierFromThreePoints(
          startPoint,
          endPoint,
          bulgePoint,
        );
        const curvePoints = curve.getPoints(64);

        // Create shape from curve points
        const arcShape = new THREE.Shape();
        arcShape.moveTo(curvePoints[0].x, curvePoints[0].z);
        for (let i = 1; i < curvePoints.length; i++) {
          arcShape.lineTo(curvePoints[i].x, curvePoints[i].z);
        }

        // Create geometry and material
        geometry = new THREE.ShapeGeometry(arcShape);
        const material = new THREE.MeshStandardMaterial({
          color: data.color || 0xd3d3d3,
          side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = data.type;
        mesh.rotation.x = Math.PI / 2;

        // Add wireframe
        const wireframeLines = createCustomWireframe(geometry, 'arc');
        if (wireframeLines) {
          mesh.add(wireframeLines);
        }

        // Store original data in userData
        mesh.userData.isArc = true;
        mesh.userData.curvePoints = curvePoints.map((p) => ({
          x: p.x,
          y: p.y,
          z: p.z,
        }));
        mesh.userData.arcPoints = {
          start: { x: startPoint.x, y: startPoint.y, z: startPoint.z },
          end: { x: endPoint.x, y: endPoint.y, z: endPoint.z },
          bulge: { x: bulgePoint.x, y: bulgePoint.y, z: bulgePoint.z },
        };

        return mesh;
      } else {
        console.error('Arc data is missing required points');
        return new THREE.Mesh(); // Return empty mesh on error
      }

    case 'steppedCube': {
      return createSteppedCube(
        data.dimensions?.width || 1,
        data.dimensions?.height || 1,
        data.dimensions?.depth || 1,
        data.dimensions?.steps || 4,
      );
    }
    case 'line':
      if (
        data.dimensions?.points &&
        Array.isArray(data.dimensions.points) &&
        data.dimensions.points.length >= 2
      ) {
        // Convert points to THREE.Vector3 if they aren't already
        const points3D = data.dimensions.points.map(
          (p: { x: number; y?: number; z?: number }) =>
            new THREE.Vector3(p.x, p.y || 0, p.z || p.y || 0),
        );

        // Compute centroid for positioning
        const centroid = new THREE.Vector3();
        points3D.forEach((p: THREE.Vector3) => centroid.add(p));
        centroid.divideScalar(points3D.length);

        // Create shape in XZ plane
        const lineShape = new THREE.Shape();
        const firstPoint = points3D[0];
        lineShape.moveTo(firstPoint.x - centroid.x, firstPoint.z - centroid.z);
        for (let i = 1; i < points3D.length; i++) {
          const point = points3D[i];
          lineShape.lineTo(point.x - centroid.x, point.z - centroid.z);
        }

        geometry = new THREE.ShapeGeometry(lineShape);

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2; // Align with XZ plane
        mesh.name = `line-${Math.random().toString(36).substr(2, 9)}`; // Temporary name, will be overridden
        return mesh;
      } else {
        // Fallback to a simple line
        const lineShape = new THREE.Shape();
        lineShape.moveTo(-0.5, 0);
        lineShape.lineTo(0.5, 0);
        geometry = new THREE.ShapeGeometry(lineShape);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.name = `line-${Math.random().toString(36).substr(2, 9)}`;
        return mesh;
      }

    default:
      throw new Error(`Unsupported geometry type: ${data.type}`);
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = data.type;

  if (data.type === 'box2') {
    const width = data.dimensions?.width || 1;
    const height = data.dimensions?.height || 1;
    const depth = data.dimensions?.depth || 1;
    const widthSegments = data.dimensions?.widthSegments || 2;
    const heightSegments = data.dimensions?.heightSegments || 2;
    const depthSegments = data.dimensions?.depthSegments || 2;

    const segmentWidth = width / widthSegments;
    const segmentHeight = height / heightSegments;
    const segmentDepth = depth / depthSegments;

    // Create segments
    for (let x = 0; x < widthSegments; x++) {
      for (let y = 0; y < heightSegments; y++) {
        for (let z = 0; z < depthSegments; z++) {
          const segmentGroup = new THREE.Group();
          segmentGroup.name = `segment_${x}_${y}_${z}`;

          // Calculate segment position
          const posX = -width / 2 + x * segmentWidth + segmentWidth / 2;
          const posY = -height / 2 + y * segmentHeight + segmentHeight / 2;
          const posZ = -depth / 2 + z * segmentDepth + segmentDepth / 2;
          segmentGroup.position.set(posX, posY, posZ);

          // Store segment info
          segmentGroup.userData = {
            segmentInfo: {
              dimensions: {
                width: segmentWidth,
                height: segmentHeight,
                depth: segmentDepth,
              },
              position: { x: posX, y: posY, z: posZ },
              indices: { x, y, z },
            },
          };

          // Create edges for this segment
          const corners = [
            new THREE.Vector3(
              posX + segmentWidth / 2,
              posY + segmentHeight / 2,
              posZ + segmentDepth / 2,
            ),
            new THREE.Vector3(
              posX - segmentWidth / 2,
              posY + segmentHeight / 2,
              posZ + segmentDepth / 2,
            ),
            new THREE.Vector3(
              posX - segmentWidth / 2,
              posY - segmentHeight / 2,
              posZ + segmentDepth / 2,
            ),
            new THREE.Vector3(
              posX + segmentWidth / 2,
              posY - segmentHeight / 2,
              posZ + segmentDepth / 2,
            ),
            new THREE.Vector3(
              posX + segmentWidth / 2,
              posY + segmentHeight / 2,
              posZ - segmentDepth / 2,
            ),
            new THREE.Vector3(
              posX - segmentWidth / 2,
              posY + segmentHeight / 2,
              posZ - segmentDepth / 2,
            ),
            new THREE.Vector3(
              posX - segmentWidth / 2,
              posY - segmentHeight / 2,
              posZ - segmentDepth / 2,
            ),
            new THREE.Vector3(
              posX + segmentWidth / 2,
              posY - segmentHeight / 2,
              posZ - segmentDepth / 2,
            ),
          ];

          // Create edges between corners
          const edges = [
            [0, 1],
            [1, 2],
            [2, 3],
            [3, 0], // Front face
            [4, 5],
            [5, 6],
            [6, 7],
            [7, 4], // Back face
            [0, 4],
            [1, 5],
            [2, 6],
            [3, 7], // Connecting edges
          ];

          edges.forEach(([start, end], index) => {
            mesh.add(
              createEdge(
                corners[start],
                corners[end],
                `edge_${x}_${y}_${z}_${index}`,
                `edge_${x}_${y}_${z}_${index}`,
              ),
            );
          });
        }
      }
    }
  }
  return mesh;
}

// Helper function for arc creation
function createQuadraticBezierFromThreePoints(
  p0: THREE.Vector3,
  p2: THREE.Vector3,
  p1Actual: THREE.Vector3,
): THREE.QuadraticBezierCurve3 {
  // For a quadratic bezier curve, we need to find the control point
  // that will make the curve pass through our desired bulge point

  // First, find the parameter t where the bulge point occurs
  // For simplicity, we'll assume it's at t=0.5 (midpoint of the curve)

  // For a point on a quadratic bezier curve:
  // P(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
  // At t=0.5, this becomes:
  // P(0.5) = 0.25*P0 + 0.5*P1 + 0.25*P2
  // Solving for P1:
  // P1 = (P(0.5) - 0.25*P0 - 0.25*P2) / 0.5

  const p1 = new THREE.Vector3()
    .copy(p1Actual)
    .multiplyScalar(2)
    .sub(p0.clone().multiplyScalar(0.25))
    .sub(p2.clone().multiplyScalar(0.25))
    .multiplyScalar(1 / 1);

  return new THREE.QuadraticBezierCurve3(p0.clone(), p1, p2.clone());
}

export function createCustomWireframe(
  geometry: THREE.BufferGeometry,
  type: string,
): THREE.LineSegments {
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x000000,
    side: THREE.DoubleSide,
  });
  const vertices: THREE.Vector3[] = [];
  const indices: number[] = [];

  const addVertex = (x: number, y: number, z: number): number => {
    const index = vertices.findIndex(
      (v) =>
        Math.abs(v.x - x) < 0.0001 &&
        Math.abs(v.y - y) < 0.0001 &&
        Math.abs(v.z - z) < 0.0001,
    );
    if (index !== -1) return index;
    vertices.push(new THREE.Vector3(x, y, z));
    return vertices.length - 1;
  };

  if (type === 'box' && geometry instanceof THREE.BoxGeometry) {
    const width = geometry.parameters.width;
    const height = geometry.parameters.height;
    const depth = geometry.parameters.depth;
    const widthSegments = geometry.parameters.widthSegments || 1;
    const heightSegments = geometry.parameters.heightSegments || 1;
    const depthSegments = geometry.parameters.depthSegments || 1;

    for (let i = 0; i <= widthSegments; i++) {
      for (let j = 0; j <= heightSegments; j++) {
        const x = -width / 2 + (i / widthSegments) * width;
        const y = -height / 2 + (j / heightSegments) * height;
        const z = depth / 2;
        if (i < widthSegments) {
          const v1 = addVertex(x, y, z);
          const v2 = addVertex(x + width / widthSegments, y, z);
          indices.push(v1, v2);
        }
        if (j < heightSegments) {
          const v1 = addVertex(x, y, z);
          const v2 = addVertex(x, y + height / heightSegments, z);
          indices.push(v1, v2);
        }
      }
    }

    for (let i = 0; i <= widthSegments; i++) {
      for (let j = 0; j <= heightSegments; j++) {
        const x = -width / 2 + (i / widthSegments) * width;
        const y = -height / 2 + (j / heightSegments) * height;
        const z = -depth / 2;
        if (i < widthSegments) {
          const v1 = addVertex(x, y, z);
          const v2 = addVertex(x + width / widthSegments, y, z);
          indices.push(v1, v2);
        }
        if (j < heightSegments) {
          const v1 = addVertex(x, y, z);
          const v2 = addVertex(x, y + height / heightSegments, z);
          indices.push(v1, v2);
        }
      }
    }

    for (let i = 0; i <= widthSegments; i++) {
      for (let k = 0; k <= depthSegments; k++) {
        const x = -width / 2 + (i / widthSegments) * width;
        const y = height / 2;
        const z = -depth / 2 + (k / depthSegments) * depth;
        if (i < widthSegments) {
          const v1 = addVertex(x, y, z);
          const v2 = addVertex(x + width / widthSegments, y, z);
          indices.push(v1, v2);
        }
        if (k < depthSegments) {
          const v1 = addVertex(x, y, z);
          const v2 = addVertex(x, y, z + depth / depthSegments);
          indices.push(v1, v2);
        }
      }
    }

    for (let i = 0; i <= widthSegments; i++) {
      for (let k = 0; k <= depthSegments; k++) {
        const x = -width / 2 + (i / widthSegments) * width;
        const y = -height / 2;
        const z = -depth / 2 + (k / depthSegments) * depth;
        if (i < widthSegments) {
          const v1 = addVertex(x, y, z);
          const v2 = addVertex(x + width / widthSegments, y, z);
          indices.push(v1, v2);
        }
        if (k < depthSegments) {
          const v1 = addVertex(x, y, z);
          const v2 = addVertex(x, y, z + depth / depthSegments);
          indices.push(v1, v2);
        }
      }
    }

    for (let j = 0; j <= heightSegments; j++) {
      for (let k = 0; k <= depthSegments; k++) {
        const x = -width / 2;
        const y = -height / 2 + (j / heightSegments) * height;
        const z = -depth / 2 + (k / depthSegments) * depth;
        if (j < heightSegments) {
          const v1 = addVertex(x, y, z);
          const v2 = addVertex(x, y + height / heightSegments, z);
          indices.push(v1, v2);
        }
        if (k < depthSegments) {
          const v1 = addVertex(x, y, z);
          const v2 = addVertex(x, y, z + depth / depthSegments);
          indices.push(v1, v2);
        }
      }
    }

    for (let j = 0; j <= heightSegments; j++) {
      for (let k = 0; k <= depthSegments; k++) {
        const x = width / 2;
        const y = -height / 2 + (j / heightSegments) * height;
        const z = -depth / 2 + (k / depthSegments) * depth;
        if (j < heightSegments) {
          const v1 = addVertex(x, y, z);
          const v2 = addVertex(x, y + height / heightSegments, z);
          indices.push(v1, v2);
        }
        if (k < depthSegments) {
          const v1 = addVertex(x, y, z);
          const v2 = addVertex(x, y, z + depth / depthSegments);
          indices.push(v1, v2);
        }
      }
    }
  } else if (type === 'cone' && geometry instanceof THREE.ConeGeometry) {
    const radius = geometry.parameters.radius;
    const height = geometry.parameters.height;
    const radialSegments = geometry.parameters.radialSegments || 16;
    const heightSegments = geometry.parameters.heightSegments || 1;

    for (let i = 0; i < radialSegments; i++) {
      const angle1 = (i / radialSegments) * Math.PI * 2;
      const angle2 = ((i + 1) / radialSegments) * Math.PI * 2;
      const x1 = radius * Math.cos(angle1);
      const y1 = -height / 2;
      const z1 = radius * Math.sin(angle1);
      const x2 = radius * Math.cos(angle2);
      const y2 = -height / 2;
      const z2 = radius * Math.sin(angle2);
      const v1 = addVertex(x1, y1, z1);
      const v2 = addVertex(x2, y2, z2);
      indices.push(v1, v2);
    }

    for (let j = 1; j < heightSegments; j++) {
      const t = j / heightSegments; // Interpolation factor from base to apex
      const currentRadius = radius * (1 - t); // Linearly interpolate radius
      const currentY = -height / 2 + t * height; // Linearly interpolate height
      for (let i = 0; i < radialSegments; i++) {
        const angle1 = (i / radialSegments) * Math.PI * 2;
        const angle2 = ((i + 1) / radialSegments) * Math.PI * 2;
        const x1 = currentRadius * Math.cos(angle1);
        const z1 = currentRadius * Math.sin(angle1);
        const x2 = currentRadius * Math.cos(angle2);
        const z2 = currentRadius * Math.sin(angle2);
        const v1 = addVertex(x1, currentY, z1);
        const v2 = addVertex(x2, currentY, z2);
        indices.push(v1, v2);
      }
    }

    // Vertical lines connecting base to apex through height segments
    for (let i = 0; i < radialSegments; i++) {
      const angle = (i / radialSegments) * Math.PI * 2;
      // Base vertex
      const xBase = radius * Math.cos(angle);
      const zBase = radius * Math.sin(angle);
      const yBase = -height / 2;
      let prevV = addVertex(xBase, yBase, zBase);

      // Intermediate height segments
      for (let j = 1; j < heightSegments; j++) {
        const t = j / heightSegments;
        const currentRadius = radius * (1 - t);
        const currentY = -height / 2 + t * height;
        const x = currentRadius * Math.cos(angle);
        const z = currentRadius * Math.sin(angle);
        const currentV = addVertex(x, currentY, z);
        indices.push(prevV, currentV);
        prevV = currentV;
      }

      // Connect to apex
      const apexV = addVertex(0, height / 2, 0);
      indices.push(prevV, apexV);
    }
  } else if (
    type === 'cylinder' &&
    geometry instanceof THREE.CylinderGeometry
  ) {
    const radiusTop = geometry.parameters.radiusTop;
    const radiusBottom = geometry.parameters.radiusBottom;
    const height = geometry.parameters.height;
    const radialSegments = geometry.parameters.radialSegments || 32;
    const heightSegments = geometry.parameters.heightSegments || 1;

    // Horizontal rings at each height segment (including top and bottom)
    for (let j = 0; j <= heightSegments; j++) {
      const t = j / heightSegments; // Interpolation factor from bottom to top
      const currentRadius = radiusBottom + (radiusTop - radiusBottom) * t; // Linearly interpolate radius
      const currentY = -height / 2 + (j / heightSegments) * height; // Linearly interpolate height
      for (let i = 0; i < radialSegments; i++) {
        const angle1 = (i / radialSegments) * Math.PI * 2;
        const angle2 = ((i + 1) / radialSegments) * Math.PI * 2;
        const x1 = currentRadius * Math.cos(angle1);
        const z1 = currentRadius * Math.sin(angle1);
        const x2 = currentRadius * Math.cos(angle2);
        const z2 = currentRadius * Math.sin(angle2);
        const v1 = addVertex(x1, currentY, z1);
        const v2 = addVertex(x2, currentY, z2);
        indices.push(v1, v2);
      }
    }

    for (let i = 0; i < radialSegments; i++) {
      const angle = (i / radialSegments) * Math.PI * 2;
      let prevV: number | null = null;
      for (let j = 0; j <= heightSegments; j++) {
        const t = j / heightSegments;
        const currentRadius = radiusBottom + (radiusTop - radiusBottom) * t;
        const currentY = -height / 2 + (j / heightSegments) * height;
        const x = currentRadius * Math.cos(angle);
        const z = currentRadius * Math.sin(angle);
        const currentV = addVertex(x, currentY, z);
        if (prevV !== null) {
          indices.push(prevV, currentV);
        }
        prevV = currentV;
      }
    }
  } else if (type === 'sphere' && geometry instanceof THREE.SphereGeometry) {
    const radius = geometry.parameters.radius;
    const widthSegments = geometry.parameters.widthSegments || 32;
    const heightSegments = geometry.parameters.heightSegments || 32;

    // Latitude lines (horizontal)
    for (let j = 0; j <= heightSegments; j++) {
      const theta = (j / heightSegments) * Math.PI;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      for (let i = 0; i < widthSegments; i++) {
        const phi1 = (i / widthSegments) * Math.PI * 2;
        const phi2 = ((i + 1) / widthSegments) * Math.PI * 2;
        const x1 = radius * sinTheta * Math.cos(phi1);
        const y1 = radius * cosTheta;
        const z1 = radius * sinTheta * Math.sin(phi1);
        const x2 = radius * sinTheta * Math.cos(phi2);
        const y2 = radius * cosTheta;
        const z2 = radius * sinTheta * Math.sin(phi2);
        const v1 = addVertex(x1, y1, z1);
        const v2 = addVertex(x2, y2, z2);
        indices.push(v1, v2);
      }
    }

    // Longitude lines (vertical)
    for (let i = 0; i < widthSegments; i++) {
      const phi = (i / widthSegments) * Math.PI * 2;
      for (let j = 0; j < heightSegments; j++) {
        const theta1 = (j / heightSegments) * Math.PI;
        const theta2 = ((j + 1) / heightSegments) * Math.PI;
        const x1 = radius * Math.sin(theta1) * Math.cos(phi);
        const y1 = radius * Math.cos(theta1);
        const z1 = radius * Math.sin(theta1) * Math.sin(phi);
        const x2 = radius * Math.sin(theta2) * Math.cos(phi);
        const y2 = radius * Math.cos(theta2);
        const z2 = radius * Math.sin(theta2) * Math.sin(phi);
        const v1 = addVertex(x1, y1, z1);
        const v2 = addVertex(x2, y2, z2);
        indices.push(v1, v2);
      }
    }
  } else if (
    type === 'tetrahedron' &&
    geometry instanceof THREE.TetrahedronGeometry
  ) {
    // Define the four vertices of a tetrahedron
    const radius = geometry.parameters.radius;
    const s = radius / Math.sqrt(3);
    const verticesTetra = [
      new THREE.Vector3(s, s, s),
      new THREE.Vector3(-s, -s, s),
      new THREE.Vector3(-s, s, -s),
      new THREE.Vector3(s, -s, -s),
    ];
    const edges = [
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 2],
      [1, 3],
      [2, 3],
    ];
    edges.forEach(([i, j]) => {
      const v1 = addVertex(
        verticesTetra[i].x,
        verticesTetra[i].y,
        verticesTetra[i].z,
      );
      const v2 = addVertex(
        verticesTetra[j].x,
        verticesTetra[j].y,
        verticesTetra[j].z,
      );
      indices.push(v1, v2);
    });
  }

  // Create the wireframe geometry
  const wireframeGeo = new THREE.BufferGeometry();
  if (vertices.length > 0 && indices.length > 0) {
    wireframeGeo.setFromPoints(vertices);
    wireframeGeo.setIndex(indices);
  } else {
    // Fallback to EdgesGeometry if no custom wireframe is defined
    const edges = new THREE.EdgesGeometry(geometry, 1);
    return new THREE.LineSegments(edges, lineMaterial);
  }
  return new THREE.LineSegments(wireframeGeo, lineMaterial);
}

function createSteppedCube(width = 1, height = 1, depth = 1, steps = 4) {
  const group = new THREE.Mesh();
  const stepWidth = width / steps;
  const stepHeight = height / steps;
  const stepDepth = depth / steps;
  for (let i = 0; i < steps; i++) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(stepWidth, 0);
    shape.lineTo(stepWidth, stepHeight * (i + 1));
    shape.lineTo(0, stepHeight * (i + 1));
    shape.lineTo(0, 0);
    const extrudeSettings = {
      steps: 1,
      depth: stepDepth * (i + 1),
      bevelEnabled: false,
    };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const material = new THREE.MeshStandardMaterial({ color: 0x808080 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(-width / 2 + i * stepWidth, -height / 2, -depth / 2);
    group.add(mesh);
  }
  return group;
}

async function addObjectToScene(
  scene: THREE.Scene,
  camera: THREE.Camera,
  data: GeometryData,
  moveHandler: MoveHandler,
  dispatch: Dispatch,
  distanceFromCamera = 3,
): Promise<THREE.Mesh> {
  const object = createObject(data);

  if (!data.position) {
    const cameraPosition = camera.position.clone();
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    cameraDirection.applyQuaternion(camera.quaternion);

    // static position of the object
    const targetPosition = cameraPosition.add(
      cameraDirection.multiplyScalar(distanceFromCamera),
    );
    object.position.set(targetPosition.x, targetPosition.y, targetPosition.z);
  }
  const boundingBox = new THREE.Box3().setFromObject(object);
  const objectHeight = boundingBox.max.y - boundingBox.min.y;
  object.position.y = 0.0001 + objectHeight / 2;
  scene.add(object);

  // Start dragging the object if the handler supports it
  let draggingStarted = false;

  try {
    // Check if moveHandler has the startDragging method
    if (moveHandler && typeof moveHandler.startDragging === 'function') {
      // Start dragging the object
      moveHandler.startDragging(object);
      draggingStarted = true;
    } else {
      console.warn(
        'Move handler does not have startDragging method, skipping drag operation',
      );
    }
  } catch (err) {
    console.warn('Error starting drag operation:', err);
  }

  // Wait for the object to stop being dragged or resolve immediately if dragging didn't start
  const finalPosition = await new Promise<THREE.Vector3>((resolve) => {
    if (!draggingStarted) {
      // If dragging didn't start, just resolve with the current position
      resolve(object.position.clone());
      return;
    }

    const checkPosition = () => {
      try {
        if (!moveHandler.isDragging) {
          resolve(object.position.clone());
        } else {
          requestAnimationFrame(checkPosition);
        }
      } catch (err) {
        console.warn('Error in position checking:', err);
        resolve(object.position.clone());
      }
    };

    checkPosition();
  });

  const designId = getDesignId();
  if (!designId) {
    return object;
  }

  try {
    // Create a payload that includes image data if needed
    const apiPayload = {
      data: {
        catalog: {
          name: data.type.toUpperCase(),
          data: {
            width: data.dimensions?.width || 1,
            height: data.dimensions?.height || 1,
            depth: data.dimensions?.depth || 1,
            ...(data.type === 'image' && {
              imageUrl: data.dimensions?.imageUrl || '',

              imageSize: data.dimensions?.imageSize || {
                width: 100,
                height: 100,
              },

              aspectRatio:
                data.dimensions?.aspectRatio ||
                (data.dimensions?.imageSize
                  ? data.dimensions.imageSize.width /
                    data.dimensions.imageSize.height
                  : 1),

              fileName: data.dimensions?.fileName || 'image.png',

              imageMetadata: {
                timestamp: new Date().toISOString(),

                ...(data.imageData && {
                  originalFile: data.imageData.fileName,
                  originalAspectRatio: data.imageData.aspectRatio,
                }),

                persistDuringTransform: true,
              },
            }),
            ...(data.type === 'arc' &&
              data.dimensions?.start &&
              data.dimensions?.end &&
              data.dimensions?.bulge && {
                points: {
                  start: data.dimensions.start,
                  end: data.dimensions.end,
                  bulge: data.dimensions.bulge,
                },
                curvePoints: data.dimensions.curvePoints,
              }),
            position: {
              x: finalPosition.x,
              y: finalPosition.y,
              z: finalPosition.z,
            },
            rotateX: object.rotation.x,
            rotateY: object.rotation.y,
            rotateZ: object.rotation.z,
            scale: {
              x: object.scale.x,
              y: object.scale.y,
              z: object.scale.z,
            },
            points:
              data.type === 'line' && data.dimensions?.points
                ? data.dimensions.points.map(
                    (p: { x: number; y: number }) =>
                      new THREE.Vector2(p.x, p.y || 0),
                  )
                : undefined,
          },
          is_default: true,
          is_custom: true,
        },
      },
    };

    const response = await commonService.post(
      'design',
      `${designId}/object`,
      apiPayload,
    );
    if (response.status === 200 || response.status === 201) {
      const objectList = response.data;
      const objectID = objectList[0].id;

      object.userData.objectId = objectID;

      // Store the object in Redux store
      const shapeData: ShapeData = {
        id: objectID,
        type: data.type,
        properties: {
          dimensions: {
            ...data.dimensions,
            points:
              data.type === 'line' && Array.isArray(data.dimensions?.points)
                ? data.dimensions.points.map((p: Position) => ({
                    x: p.x || 0,
                    y: p.y || 0,
                    z: p.z || 0,
                  }))
                : undefined,
          },
          color: data.color || 0xd3d3d3,
          ...(data.type === 'image' && {
            imageUrl: data.dimensions?.imageUrl || '',
            imageSize: data.dimensions?.imageSize || {
              width: 100,
              height: 100,
            },
            aspectRatio:
              data.dimensions?.aspectRatio ||
              (data.dimensions?.imageSize
                ? data.dimensions.imageSize.width /
                  data.dimensions.imageSize.height
                : 1),
            fileName: data.dimensions?.fileName || 'image.png',
            isImageMaterial: true,
            persistThroughTransform: true,
            recoveryInfo: {
              originalImageUrl: data.dimensions?.imageUrl,
              timestamp: new Date().toISOString(),
            },
          }),
        },
        // Arc-specific data
        ...(data.type === 'arc' &&
          data.dimensions?.start &&
          data.dimensions?.end &&
          data.dimensions?.bulge && {
            points: {
              start: data.dimensions.start,
              end: data.dimensions.end,
              bulge: data.dimensions.bulge,
            },
            curvePoints: data.dimensions.curvePoints,
          }),
        position: {
          x: finalPosition.x,
          y: finalPosition.y,
          z: finalPosition.z,
        },
        rotation: {
          x: object.rotation.x,
          y: object.rotation.y,
          z: object.rotation.z,
        },
        scale: {
          x: object.scale.x,
          y: object.scale.y,
          z: object.scale.z,
        },
      };

      store.dispatch(addShape(shapeData));
      store.dispatch({
        type: 'customDesignHistory/addToHistory',
        payload: {
          id: shapeData.id,
          type: 'ADD',
          data: { shape: shapeData, mesh: object },
        },
      });
    }
  } catch (error) {
    console.error('Error storing object in database:', error);
  }

  return object;
}
async function loadObjectsFromDatabase(scene: THREE.Scene): Promise<void> {
  const designId = getDesignId();
  if (!designId) {
    return;
  }

  try {
    const response: { status: number; data: DatabaseObject[] } =
      await commonService.get('design', `${designId}/object/?is_custom=True`);

    if (response.status !== 200) {
      console.error('could not load objects from database');
      return;
    }

    const objects = response.data;

    if (objects.length === 0) {
      return;
    }

    for (const objectData of objects) {
      const type: GeometryType = (
        objectData.data.originalType || objectData.name
      )
        .toString()
        .toLowerCase();
      const supportedTypes = supportedGeometryTypes;

      if (!supportedTypes.includes(type)) {
        console.warn(`Unsupported geometry type: ${type}, defaulting to 'box'`);
      }
      // Handle other shapes (image, arc, etc.)
      let geometryData: GeometryData;

      if (supportedTypes.includes(type) && type === 'image') {
        const imageUrl = objectData.data.imageUrl || '';
        let preloadedTexture: THREE.Texture | undefined;

        if (imageUrl) {
          const textureLoader = new THREE.TextureLoader();
          preloadedTexture = textureLoader.load(imageUrl);
          preloadedTexture.needsUpdate = true;
          preloadedTexture.flipY = false;
        }

        geometryData = {
          type: 'image',
          dimensions: {
            width: objectData.data.imageSize.width || 1,
            height: objectData.data.imageSize.height || 1,
            imageUrl: imageUrl,
            imageSize: objectData.data.imageSize || { width: 100, height: 100 },
            aspectRatio: objectData.data.aspectRatio || 1,
          },
          position: objectData.data.position,
          color: 0xd3d3d3,
          preloadedTexture: preloadedTexture,
        };
      } else if (supportedTypes.includes(type) && type === 'arc') {
        const arcPoints = objectData.data.points as arcPoints;
        geometryData = {
          type: 'arc',
          dimensions: {
            start: arcPoints.start,
            end: arcPoints.end,
            bulge: arcPoints.bulge,
            curvePoints: objectData.data.curvePoints,
          },
          position: objectData.data.position,
          rotation: {
            x: objectData.data.rotateX || 0,
            y: objectData.data.rotateY || 0,
            z: objectData.data.rotateZ || 0,
          },
          scale: objectData.data.scale || { x: 1, y: 1, z: 1 },
          color: 0xd3d3d3,
        };
      } else {
        geometryData = {
          type: supportedTypes.includes(type) ? type : 'box',
          dimensions: {
            width: objectData.data.width || 1,
            height: objectData.data.height || 1,
            depth: objectData.data.depth || 1,
            radius: objectData.data.radius,
            points:
              type === 'line' && Array.isArray(objectData.data.points)
                ? objectData.data.points.map((p: Position) => ({
                    x: p.x,
                    y: p.y || 0,
                    z: p.z,
                  }))
                : undefined,
            filletRadius: objectData.data.filletRadius,
          },
          position: objectData.data.position,
          color: 0xd3d3d3,
        };
      }

      const object: THREE.Mesh = createObject(geometryData);
      object.position.set(
        objectData.data.position.x,
        objectData.data.position.y,
        objectData.data.position.z,
      );
      object.rotation.set(
        objectData.data.rotateX || 0,
        objectData.data.rotateY || 0,
        objectData.data.rotateZ || 0,
      );
      object.scale.set(
        objectData.data.scale.x || 1,
        objectData.data.scale.y || 1,
        objectData.data.scale.z || 1,
      );

      // If there's a filletRadius and cornerIndex, recreate the shape with the curve
      if (
        objectData.data.filletRadius &&
        objectData.data.points &&
        objectData.data.cornerIndex !== undefined
      ) {
        const points = objectData.data.points as Position[];
        const filletRadius = objectData.data.filletRadius;
        const cornerIndex = objectData.data.cornerIndex;
        const shape = new THREE.Shape();
        shape.moveTo(points[0].x, points[0].z);
        for (let i = 1; i <= points.length; i++) {
          const currIndex = i % points.length;
          const prevIndex = (currIndex - 1 + points.length) % points.length;
          const nextIndex = (currIndex + 1) % points.length;
          if (currIndex === cornerIndex) {
            const prevPoint = points[prevIndex];
            const currPoint = points[currIndex];
            const nextPoint = points[nextIndex];
            // Compute directions
            const prevDir = new THREE.Vector2(
              prevPoint.x - currPoint.x,
              prevPoint.z - currPoint.z,
            );
            const nextDir = new THREE.Vector2(
              nextPoint.x - currPoint.x,
              nextPoint.z - currPoint.z,
            );
            if (prevDir.length() < 0.001 || nextDir.length() < 0.001) {
              console.error(`Invalid edge length at vertex ${currIndex}`);
              continue;
            }
            prevDir.normalize();
            nextDir.normalize();
            // Check for collinear edges
            const dot = prevDir.dot(nextDir);
            if (Math.abs(dot + 1) < 0.001) {
              console.error(`Collinear edges at vertex ${currIndex}`);
              continue;
            }
            // Calculate tangent points
            const tangentPoint1 = new THREE.Vector2(
              currPoint.x + prevDir.x * filletRadius,
              currPoint.z + prevDir.y * filletRadius,
            );
            const tangentPoint2 = new THREE.Vector2(
              currPoint.x + nextDir.x * filletRadius,
              currPoint.z + nextDir.y * filletRadius,
            );
            // Create quadratic Bezier curve
            const curve = new THREE.QuadraticBezierCurve(
              tangentPoint1,
              new THREE.Vector2(currPoint.x, currPoint.z),
              tangentPoint2,
            );
            const curvePoints = curve.getPoints(10);
            curvePoints.forEach((point) => {
              shape.lineTo(point.x, point.y);
            });
          } else {
            shape.lineTo(points[currIndex].x, points[currIndex].z);
          }
        }
        shape.closePath();
        // Create new geometry
        const newGeometry = new THREE.ShapeGeometry(shape);
        // Update object
        if (object.geometry) {
          object.geometry.dispose();
        }
        object.geometry = newGeometry;
        // Update wireframe
        const wireframe = object.children.find(
          (child) => child instanceof THREE.LineSegments,
        );
        if (wireframe) {
          object.remove(wireframe);
        }
        const newWireframe = createCustomWireframe(newGeometry, type);
        object.add(newWireframe);
      }
      // Store filletRadius in userData for future reference
      if (objectData.data.filletRadius) {
        object.userData.filletRadius = objectData.data.filletRadius;
      }

      if (type === 'arc') {
        const arcPoints = objectData.data.points as arcPoints;
        object.userData.originalPoints = {
          start: arcPoints.start,
          end: arcPoints.end,
          bulge: arcPoints.bulge,
        };
        object.userData.curvePoints = objectData.data.curvePoints;
        object.userData.isArc = true;
      }

      object.userData.objectId = objectData.id;

      if (
        (type === 'line' || type === 'arc') &&
        !object.children.some((child) => child instanceof THREE.LineSegments)
      ) {
        const wireframeLines = createCustomWireframe(object.geometry, type);
        object.add(wireframeLines);
      }

      if (geometryData.type === 'image') {
        const imageObject = object;
        imageObject.userData.isImage = true;

        imageObject.onAfterRender = () => {
          if (imageObject.material) {
            const material = imageObject.material as CustomImageMaterial;
            if (material.map) {
              material.map.needsUpdate = true;
              material.needsUpdate = true;
            }
          }
        };
        imageObject.visible = true;
      }

      scene.add(object);

      const shapeData: ShapeData = {
        id: objectData.id,
        type: type, // Use original type
        properties: {
          dimensions: {
            ...geometryData.dimensions,
            points:
              type === 'line' && Array.isArray(objectData.data.points)
                ? objectData.data.points.map(
                    (p: { x: number; y: number; z: number }) => ({
                      x: p.x,
                      y: p.y || 0,
                      z: p.z,
                    }),
                  )
                : undefined,
          },
          color: geometryData.color || 0x808080,
          ...(geometryData.type === 'image' && {
            imageUrl: objectData.data.imageUrl || '',
            imageSize: objectData.data.imageSize || { width: 100, height: 100 },
            aspectRatio: objectData.data.aspectRatio || 1,
            isImageMaterial: true,
          }),
        },
        position: {
          x: object.position.x,
          y: object.position.y,
          z: object.position.z,
        },
        rotation: {
          x: object.rotation.x,
          y: object.rotation.y,
          z: object.rotation.z,
        },
        scale: {
          x: object.scale.x,
          y: object.scale.y,
          z: object.scale.z,
        },
      };

      if (type === 'arc') {
        const arcPoints = objectData.data.points as arcPoints;
        shapeData.properties.points = {
          start: arcPoints.start,
          end: arcPoints.end,
          bulge: arcPoints.bulge,
        };
        shapeData.properties.curvePoints = objectData.data.curvePoints;
      }

      store.dispatch(addShape(shapeData));

      if (type === 'image') {
        object.userData.imageMetadata = {
          ...objectData.data.imageMetadata,
          preventAutoDelete: true,
          preventAccidentalDelete: true,
          toolState: {
            isSelectable: true,
            isErasable: false,
            isTransformable: true,
            lastToolUsed: null,
            preventAccidentalDelete: true,
          },
        };
      }
    }
  } catch (error) {
    console.error('Error loading objects from database:', error);
  }
}

export async function updateArcInDatabase(
  objectId: string,
  position: Position,
  rotation: Position,
  scale: Position,
  points: {
    start?: Position;
    end?: Position;
    bulge?: Position;
  },
  curvePoints?: Position[],
): Promise<boolean> {
  const designId = getDesignId();
  if (!designId) {
    console.error('No design ID found in URL');
    return Promise.resolve(false);
  }

  const clonedCurvePoints = curvePoints
    ? JSON.parse(JSON.stringify(curvePoints))
    : undefined;

  const payload = {
    data: {
      catalog: {
        id: objectId,
        name: 'ARC',
        data: {
          position: position,
          rotateX: rotation.x,
          rotateY: rotation.y,
          rotateZ: rotation.z,
          scale: scale,
          points: points,
          curvePoints: clonedCurvePoints,
          is_arc: true,
          timestamp: new Date().toISOString(),
        },
        is_custom: true,
        is_default: true,
      },
    },
  };

  try {
    const response: { status: number } = await commonService.putObjectData(
      'design',
      designId,
      'object',
      payload,
    );
    if (response.status !== 200) {
      console.error(`Failed to update arc ${objectId}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error updating arc:', error);
    return false;
  }
}

export function createSegmentFaces(
  width: number,
  height: number,
  depth: number,
  color: number,
  parent: THREE.Group,
): void {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const halfDepth = depth / 2;

  // Create material for outer faces
  const outerMaterial = new THREE.MeshStandardMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7,
  });

  // Create a more distinct material for inner faces
  const innerMaterial = new THREE.MeshStandardMaterial({
    color: color,
    side: THREE.DoubleSide,
    transparent: true,
    emissive: new THREE.Color(0x444444),
    emissiveIntensity: 0.2,
  });

  // Get segment indices from parent name
  const segmentIndices = parent.name.split('_').slice(1);
  const i = parseInt(segmentIndices[0]);
  const j = parseInt(segmentIndices[1]);
  const k = parseInt(segmentIndices[2]);

  // Front face (+Z)
  const frontGeometry = new THREE.PlaneGeometry(width, height);
  const frontFace = new THREE.Mesh(frontGeometry, outerMaterial.clone());
  frontFace.position.z = halfDepth;
  frontFace.name = `face_front_${i}_${j}_${k}`;
  frontFace.userData = {
    faceInfo: {
      type: 'face',
      faceType: 'front',
      dimensions: { width, height, depth },
      parentSegment: parent.name,
      segmentIndices: { i, j, k },
      isOuterFace: true,
      isFrontFace: true,
    },
    isSelectable: true,
  };
  parent.add(frontFace);

  // Back face (-Z)
  const backGeometry = new THREE.PlaneGeometry(width, height);
  const backFace = new THREE.Mesh(backGeometry, outerMaterial.clone());
  backFace.position.z = -halfDepth;
  backFace.rotation.y = Math.PI;
  backFace.name = `face_back_${i}_${j}_${k}`;
  backFace.userData = {
    faceInfo: {
      type: 'face',
      faceType: 'back',
      dimensions: { width, height, depth },
      parentSegment: parent.name,
      segmentIndices: { i, j, k },
      isOuterFace: true,
      isBackFace: true,
    },
    isSelectable: true,
  };
  parent.add(backFace);

  // Top face (+Y)
  const topGeometry = new THREE.PlaneGeometry(width, depth);
  const topFace = new THREE.Mesh(topGeometry, outerMaterial.clone());
  topFace.position.y = halfHeight;
  topFace.rotation.x = -Math.PI / 2;
  topFace.name = `face_top_${i}_${j}_${k}`;
  topFace.userData = {
    faceInfo: {
      type: 'face',
      faceType: 'top',
      dimensions: { width, height, depth },
      parentSegment: parent.name,
      segmentIndices: { i, j, k },
      isOuterFace: true,
      isTopFace: true,
    },
    isSelectable: true,
  };
  parent.add(topFace);

  // Bottom face (-Y)
  const bottomGeometry = new THREE.PlaneGeometry(width, depth);
  const bottomFace = new THREE.Mesh(bottomGeometry, outerMaterial.clone());
  bottomFace.position.y = -halfHeight;
  bottomFace.rotation.x = Math.PI / 2;
  bottomFace.name = `face_bottom_${i}_${j}_${k}`;
  bottomFace.userData = {
    faceInfo: {
      type: 'face',
      faceType: 'bottom',
      dimensions: { width, height, depth },
      parentSegment: parent.name,
      segmentIndices: { i, j, k },
      isOuterFace: true,
      isBottomFace: true,
    },
    isSelectable: true,
  };
  parent.add(bottomFace);

  // Right face (+X)
  const rightGeometry = new THREE.PlaneGeometry(depth, height);
  const rightFace = new THREE.Mesh(rightGeometry, outerMaterial.clone());
  rightFace.position.x = halfWidth;
  rightFace.rotation.y = Math.PI / 2;
  rightFace.name = `face_right_${i}_${j}_${k}`;
  rightFace.userData = {
    faceInfo: {
      type: 'face',
      faceType: 'right',
      dimensions: { width, height, depth },
      parentSegment: parent.name,
      segmentIndices: { i, j, k },
      isOuterFace: true,
      isRightFace: true,
    },
    isSelectable: true,
  };
  parent.add(rightFace);

  // Left face (-X)
  const leftGeometry = new THREE.PlaneGeometry(depth, height);
  const leftFace = new THREE.Mesh(leftGeometry, outerMaterial.clone());
  leftFace.position.x = -halfWidth;
  leftFace.rotation.y = -Math.PI / 2;
  leftFace.name = `face_left_${i}_${j}_${k}`;
  leftFace.userData = {
    faceInfo: {
      type: 'face',
      faceType: 'left',
      dimensions: { width, height, depth },
      parentSegment: parent.name,
      segmentIndices: { i, j, k },
      isOuterFace: true,
      isLeftFace: true,
    },
    isSelectable: true,
  };
  parent.add(leftFace);

  // Create inner faces (facing the interior of the cube)
  // We offset the inner faces by a tiny amount to prevent z-fighting
  const INNER_OFFSET = 0.001;

  // Inner Front face (facing -Z)
  const innerFrontGeometry = new THREE.PlaneGeometry(width, height);
  const innerFrontFace = new THREE.Mesh(
    innerFrontGeometry,
    innerMaterial.clone(),
  );
  innerFrontFace.position.z = halfDepth - INNER_OFFSET;
  innerFrontFace.rotation.y = Math.PI; // Flip to face inward
  innerFrontFace.name = `face_inner_front_${i}_${j}_${k}`;
  innerFrontFace.userData = {
    faceInfo: {
      type: 'face',
      faceType: 'inner_front',
      dimensions: { width, height, depth },
      parentSegment: parent.name,
      segmentIndices: { i, j, k },
      isInnerFace: true,
      isFrontFace: true,
    },
    isSelectable: true,
  };
  parent.add(innerFrontFace);

  // Inner Back face (facing +Z)
  const innerBackGeometry = new THREE.PlaneGeometry(width, height);
  const innerBackFace = new THREE.Mesh(
    innerBackGeometry,
    innerMaterial.clone(),
  );
  innerBackFace.position.z = -halfDepth + INNER_OFFSET;
  // No rotation needed as it naturally faces inward
  innerBackFace.name = `face_inner_back_${i}_${j}_${k}`;
  innerBackFace.userData = {
    faceInfo: {
      type: 'face',
      faceType: 'inner_back',
      dimensions: { width, height, depth },
      parentSegment: parent.name,
      segmentIndices: { i, j, k },
      isInnerFace: true,
      isBackFace: true,
    },
    isSelectable: true,
  };
  parent.add(innerBackFace);

  // Inner Top face (facing -Y)
  const innerTopGeometry = new THREE.PlaneGeometry(width, depth);
  const innerTopFace = new THREE.Mesh(innerTopGeometry, innerMaterial.clone());
  innerTopFace.position.y = halfHeight - INNER_OFFSET;
  innerTopFace.rotation.x = Math.PI / 2; // Flip to face inward
  innerTopFace.name = `face_inner_top_${i}_${j}_${k}`;
  innerTopFace.userData = {
    faceInfo: {
      type: 'face',
      faceType: 'inner_top',
      dimensions: { width, height, depth },
      parentSegment: parent.name,
      segmentIndices: { i, j, k },
      isInnerFace: true,
      isTopFace: true,
    },
    isSelectable: true,
  };
  parent.add(innerTopFace);

  // Inner Bottom face (facing +Y)
  const innerBottomGeometry = new THREE.PlaneGeometry(width, depth);
  const innerBottomFace = new THREE.Mesh(
    innerBottomGeometry,
    innerMaterial.clone(),
  );
  innerBottomFace.position.y = -halfHeight + INNER_OFFSET;
  innerBottomFace.rotation.x = -Math.PI / 2; // Flip to face inward
  innerBottomFace.name = `face_inner_bottom_${i}_${j}_${k}`;
  innerBottomFace.userData = {
    faceInfo: {
      type: 'face',
      faceType: 'inner_bottom',
      dimensions: { width, height, depth },
      parentSegment: parent.name,
      segmentIndices: { i, j, k },
      isInnerFace: true,
      isBottomFace: true,
    },
    isSelectable: true,
  };
  parent.add(innerBottomFace);

  // Inner Right face (facing -X)
  const innerRightGeometry = new THREE.PlaneGeometry(depth, height);
  const innerRightFace = new THREE.Mesh(
    innerRightGeometry,
    innerMaterial.clone(),
  );
  innerRightFace.position.x = halfWidth - INNER_OFFSET;
  innerRightFace.rotation.y = -Math.PI / 2; // Flip to face inward
  innerRightFace.name = `face_inner_right_${i}_${j}_${k}`;
  innerRightFace.userData = {
    faceInfo: {
      type: 'face',
      faceType: 'inner_right',
      dimensions: { width, height, depth },
      parentSegment: parent.name,
      segmentIndices: { i, j, k },
      isInnerFace: true,
      isRightFace: true,
    },
    isSelectable: true,
  };
  parent.add(innerRightFace);

  // Inner Left face (facing +X)
  const innerLeftGeometry = new THREE.PlaneGeometry(depth, height);
  const innerLeftFace = new THREE.Mesh(
    innerLeftGeometry,
    innerMaterial.clone(),
  );
  innerLeftFace.position.x = -halfWidth + INNER_OFFSET;
  innerLeftFace.rotation.y = Math.PI / 2; // Flip to face inward
  innerLeftFace.name = `face_inner_left_${i}_${j}_${k}`;
  innerLeftFace.userData = {
    faceInfo: {
      type: 'face',
      faceType: 'inner_left',
      dimensions: { width, height, depth },
      parentSegment: parent.name,
      segmentIndices: { i, j, k },
      isInnerFace: true,
      isLeftFace: true,
    },
    isSelectable: true,
  };
  parent.add(innerLeftFace);
}

export function createSegmentEdges(
  width: number,
  height: number,
  depth: number,
  parent: THREE.Group,
): void {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const halfDepth = depth / 2;

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x000000,
    side: THREE.DoubleSide,
    linewidth: 2,
  });

  // Edge names for better identification
  const edgeNames = [
    'edge_bottom_front',
    'edge_bottom_left',
    'edge_bottom_back',
    'edge_bottom_right',
    'edge_top_front',
    'edge_top_left',
    'edge_top_back',
    'edge_top_right',
    'edge_front_right',
    'edge_front_left',
    'edge_back_left',
    'edge_back_right',
  ];

  // Create the 12 edges of the cube
  const edges = [
    // Bottom face edges
    [
      [halfWidth, -halfHeight, halfDepth],
      [-halfWidth, -halfHeight, halfDepth],
    ],
    [
      [-halfWidth, -halfHeight, halfDepth],
      [-halfWidth, -halfHeight, -halfDepth],
    ],
    [
      [-halfWidth, -halfHeight, -halfDepth],
      [halfWidth, -halfHeight, -halfDepth],
    ],
    [
      [halfWidth, -halfHeight, -halfDepth],
      [halfWidth, -halfHeight, halfDepth],
    ],

    // Top face edges
    [
      [halfWidth, halfHeight, halfDepth],
      [-halfWidth, halfHeight, halfDepth],
    ],
    [
      [-halfWidth, halfHeight, halfDepth],
      [-halfWidth, halfHeight, -halfDepth],
    ],
    [
      [-halfWidth, halfHeight, -halfDepth],
      [halfWidth, halfHeight, -halfDepth],
    ],
    [
      [halfWidth, halfHeight, -halfDepth],
      [halfWidth, halfHeight, halfDepth],
    ],

    // Vertical edges
    [
      [halfWidth, -halfHeight, halfDepth],
      [halfWidth, halfHeight, halfDepth],
    ],
    [
      [-halfWidth, -halfHeight, halfDepth],
      [-halfWidth, halfHeight, halfDepth],
    ],
    [
      [-halfWidth, -halfHeight, -halfDepth],
      [-halfWidth, halfHeight, -halfDepth],
    ],
    [
      [halfWidth, -halfHeight, -halfDepth],
      [halfWidth, halfHeight, -halfDepth],
    ],
  ];

  edges.forEach((points, index) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setFromPoints([
      new THREE.Vector3(...points[0]),
      new THREE.Vector3(...points[1]),
    ]);
    const line = new THREE.Line(geometry, lineMaterial);
    line.name = edgeNames[index];
    // Add edge-specific userData for selection
    line.userData.edgeInfo = {
      type: 'edge',
      edgeType: edgeNames[index],
      parentSegment: parent.name,
    };
    parent.add(line);
  });
}

function getDesignId(): string | null {
  const path = window.location.pathname;
  const segments = path.split('/');
  return segments[4] || null;
}

const objectCreator = {
  createObject,
  addObjectToScene,
  getDesignId,
  loadObjectsFromDatabase,
  updateArcInDatabase,
};

export { addObjectToScene, createObject, getDesignId, loadObjectsFromDatabase };
export default objectCreator;
