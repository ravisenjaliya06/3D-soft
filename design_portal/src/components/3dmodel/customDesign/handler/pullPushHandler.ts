import { ThreeDView } from '@/components/3dmodel/customDesign/interface';
import { Position as position } from '@/components/3dmodel/store/interface';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class PushPullHandler {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private controls: OrbitControls;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private selectedFace: THREE.Face | null = null;
  private selectedMesh: THREE.Mesh | null = null;
  private originalSelectedMesh: THREE.Mesh | null = null;
  private initialMouseY: number = 0;
  private extrudeDistance: number = 0;
  private originalShape: THREE.Shape | null = null;
  private originalSettings: { depth: number; bevelEnabled: boolean } | null =
    null;
  private originalPosition: THREE.Vector3 | null = null;
  private originalRotation: THREE.Euler | null = null;
  private originalScale: THREE.Vector3 | null = null;
  private normal: THREE.Vector3 | null = null;
  private targetLinesToRemove: [THREE.Vector3, THREE.Vector3][] = [];

  private extrusionOutline: THREE.Line[] = [];
  private oppositeLines: [THREE.Line, THREE.Line][] = [];
  private findedPoints: THREE.Vector3[] = [];
  private faceCenter: THREE.Vector3 | null = null;
  private hasRemovedLines: boolean = false;
  private originalPoints: THREE.Vector3[] | null = null;
  private baseLines: THREE.Line[] = [];
  private removedLines: THREE.Line[] = [];
  private newShapesLinesIds: string[] = [];
  private newShapes: { [key: string]: THREE.Line[] } = {};
  private mergedLine: {
    [key: string]: { new: THREE.Line; old: THREE.Line[] };
  } = {};
  private newExtrudeMesh: THREE.Mesh | null = null;
  private original_points: {
    [uuid: string]: { a: THREE.Vector3; b: THREE.Vector3 };
  } = {};

  constructor(threeDView: ThreeDView) {
    this.scene = threeDView.scene;
    this.camera = threeDView.camera;
    this.controls = threeDView.controls;
    this.renderer = threeDView.renderer;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
  }

  activate() {
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown);
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp);
    document.body.style.cursor = 'crosshair';
  }

  deactivate() {
    this.renderer.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.removeEventListener('mouseup', this.onMouseUp);
    document.body.style.cursor = 'default';
  }

  private updateMouse(event: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getIntersectedFace(): THREE.Intersection | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.scene.children,
      true,
    );
    return (
      intersects.find((i) => i.object instanceof THREE.Mesh && i.face) || null
    );
  }

  private getShapeFromMesh(mesh: THREE.Mesh): THREE.Shape | null {
    if (mesh.userData?.shape instanceof THREE.Shape) {
      return mesh.userData.shape;
    }
    console.warn('Shape not found in mesh userData.');
    return null;
  }

  private getPointsFromMesh(mesh: THREE.Mesh): THREE.Vector3[] | null {
    if (mesh.userData?.points) {
      return mesh.userData.points;
    }
    console.warn('Points not found in mesh userData.');
    return null;
  }

  private onMouseDown(event: MouseEvent) {
    this.updateMouse(event);
    const intersection = this.getIntersectedFace();
    this.baseLines = [];

    if (!intersection) return;

    this.selectedMesh = intersection.object as THREE.Mesh;
    this.selectedFace = intersection.face ? intersection.face : null;
    this.originalSelectedMesh = this.selectedMesh;

    const shape = this.getShapeFromMesh(this.selectedMesh);
    if (!shape) {
      console.warn('Shape not found or cannot be extracted from mesh.');
      this.selectedMesh = null;
      this.selectedFace = null;
      return;
    }

    const meshPoints = this.getPointsFromMesh(this.selectedMesh);
    if (!meshPoints) {
      console.warn('Mesh Points not found or cannot be extracted from mesh.');
      this.selectedMesh = null;
      this.selectedFace = null;
      return;
    }

    this.originalShape = shape;
    this.originalPoints = meshPoints;
    this.originalSettings = { depth: 0.001, bevelEnabled: false };
    this.originalPosition = this.selectedMesh.userData.center.clone();
    this.originalRotation = this.selectedMesh.rotation.clone();
    this.originalScale = this.selectedMesh.scale.clone();
    this.initialMouseY = event.clientY;

    const normalMatrix = new THREE.Matrix3().getNormalMatrix(
      this.selectedMesh.matrixWorld,
    );
    this.normal = this.selectedFace
      ? this.selectedFace.normal.clone().applyMatrix3(normalMatrix).normalize()
      : null;

    const geometry = this.selectedMesh.geometry as THREE.BufferGeometry;
    const positionAttr = geometry.attributes.position;
    const face = this.selectedFace ? this.selectedFace : { a: 0, b: 0, c: 0 };

    const vA = new THREE.Vector3().fromBufferAttribute(positionAttr, face.a);
    const vB = new THREE.Vector3().fromBufferAttribute(positionAttr, face.b);
    const vC = new THREE.Vector3().fromBufferAttribute(positionAttr, face.c);

    const centerLocal = new THREE.Vector3()
      .addVectors(vA, vB)
      .add(vC)
      .divideScalar(3);
    const centerWorld = centerLocal
      .clone()
      .applyMatrix4(this.selectedMesh.matrixWorld);

    this.faceCenter = centerWorld;

    this.selectedMesh.userData.points.forEach((p: THREE.Vector3) => {
      let matchCount = 0;

      this.selectedMesh?.parent?.children.forEach((mesh) => {
        const points = mesh.userData.points;
        if (!Array.isArray(points)) return;

        const matched = points.some((point: THREE.Vector3) => point.equals(p));
        if (matched) {
          matchCount++;
        }
      });

      // if (matchCount > 0 && matchCount <= 3) {
      if (matchCount === 3) {
        this.findedPoints.push(p);
      }
    });
    if (
      this.selectedMesh?.userData?.lineUUIDs?.length &&
      this.selectedMesh.parent
    ) {
      const parent = this.selectedMesh.parent;
      this.selectedMesh.userData.lineUUIDs.forEach((uuid: string) => {
        const line = parent.getObjectByProperty('uuid', uuid);
        if (line instanceof THREE.Line) {
          this.baseLines.push(line);
        }
      });
    }

    this.controls.enabled = false;
    this.hasRemovedLines = false;
  }

  private removeTargetLinesFromScene() {
    const toRemove: THREE.Line[] = [];
    this.findedPoints.forEach((point) => {
      this.selectedMesh?.parent?.children.forEach((obj) => {
        if (!(obj instanceof THREE.Line)) return;

        const points = obj.userData.points;
        if (
          (points?.a?.equals(point) || points?.b?.equals(point)) &&
          this.selectedMesh?.userData.lineUUIDs?.includes(obj.uuid)
        ) {
          toRemove.push(obj);
        }
      });
    });

    this.removedLines = toRemove;
    toRemove.forEach((line) => {
      this.selectedMesh?.parent?.remove(line);
    });
  }

  private onMouseMove(event: MouseEvent) {
    if (
      !this.selectedMesh ||
      !this.selectedFace ||
      !this.originalShape ||
      !this.normal
    )
      return;

    this.updateMouse(event);

    if (!this.hasRemovedLines) {
      this.removeTargetLinesFromScene();
      this.hasRemovedLines = true;
    }

    const dragDelta = (event.clientY - this.initialMouseY) * 0.01;
    this.extrudeDistance = dragDelta;

    if (Math.abs(this.extrudeDistance) < 0.001) return;

    this.updateExtrusion();
  }

  private isAnyTwoPointsAreEqual(
    p1: THREE.Vector3,
    p2: THREE.Vector3,
  ): boolean {
    let equalCount = 0;

    if (p1.x === p2.x) equalCount++;
    if (p1.y === p2.y) equalCount++;
    if (p1.z === p2.z) equalCount++;

    return equalCount >= 2;
  }

  private createEdge(
    extrusionLine: THREE.Line,
    start: THREE.Vector3,
    end: THREE.Vector3,
  ) {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    const line = new THREE.Line(geometry, lineMaterial);

    if (start.equals(end) || start === end) {
      line.userData.isEndPointChangeble = true;
    }

    line.userData.isExtrusionLine = true;
    line.userData.points = { a: start.clone(), b: end.clone() };
    line.userData.basePoints = [start.clone(), end.clone()];
    line.userData.curruntExtrusion = this.extrudeDistance;
    if (extrusionLine.userData.baseLineConnectedId) {
      line.userData.baseLineConnectedId =
        extrusionLine.userData.baseLineConnectedId;
    } else {
      line.userData.baseLineConnectedId = extrusionLine.uuid;
    }

    this.extrusionOutline.push(line);
    this.original_points[line.uuid] = { a: start.clone(), b: end.clone() };

    this.selectedMesh?.parent?.add(line);
    return line;
  }

  private getLineOrientation(line: THREE.Line) {
    const point1 = line.userData.points.a;
    const point2 = line.userData.points.b;

    const directionX = Math.abs(point1.x - point2.x);
    const directionY = Math.abs(point1.y - point2.y);
    const directionZ = Math.abs(point1.z - point2.z);

    if (directionY > 0) {
      return 'Y';
    }
    if (directionX > 0) {
      return 'X';
    }
    if (directionZ > 0) {
      return 'Z';
    }
    return 'DIAGONAL';
  }

  private getExtrusionDirection(): string {
    if (!this.normal) return 'NONE';
    const absX = Math.abs(this.normal.x);
    const absY = Math.abs(this.normal.y);
    const absZ = Math.abs(this.normal.z);
    const max = Math.max(absX, absY, absZ);
    if (max === absX) return 'X';
    if (max === absY) return 'Y';
    if (max === absZ) return 'Z';
    return 'NONE';
  }

  private changeTheBaseLine(
    line: THREE.Line,
    newLine: THREE.Line,
    start: THREE.Vector3,
    end: THREE.Vector3,
  ) {
    this.baseLines.forEach((baseLine) => {
      const points = baseLine.userData.points;

      if (
        (this.isAnyTwoPointsAreEqual(start, points.a) &&
          this.isAnyTwoPointsAreEqual(end, points.b)) ||
        (this.isAnyTwoPointsAreEqual(start, points.b) &&
          this.isAnyTwoPointsAreEqual(end, points.a))
      ) {
        const matchingLineUUIDs: string[] = [];

        this.selectedMesh?.parent?.children.forEach((obj) => {
          if (!(obj instanceof THREE.Line)) return;

          const linePoints = obj.userData.points;
          if (
            (linePoints.a.equals(points.a) && linePoints.b.equals(points.b)) ||
            (linePoints.a.equals(points.b) && linePoints.b.equals(points.a))
          ) {
            matchingLineUUIDs.push(obj.uuid);
            this.selectedMesh?.parent?.remove(obj);
          }
        });

        if (matchingLineUUIDs.length === 0) return;

        this.selectedMesh?.parent?.children.forEach((obj) => {
          if (!(obj instanceof THREE.Mesh)) return;

          const lineUUIDs: string[] = obj.userData.lineUUIDs || [];

          const shouldRemove =
            matchingLineUUIDs.some((uuid) => lineUUIDs.includes(uuid)) ||
            lineUUIDs.includes(baseLine.uuid);
          if (shouldRemove) {
            this.selectedMesh?.parent?.remove(obj);
          }
        });

        this.selectedMesh?.parent?.remove(baseLine);
        this.baseLines = this.baseLines.filter((l) => l.uuid !== baseLine.uuid);
        line.userData.isNewBaseLine = true;
        delete newLine.userData.baseLineConnectedId;
        this.baseLines.push(line);
      }
    });
  }

  private checkExistingLine(line: THREE.Line) {
    const linePoints = line.userData.points;

    this.selectedMesh?.parent?.children.forEach((obj) => {
      if (!(obj instanceof THREE.Line)) return;

      if (obj.userData.isExtrusionLine) return;

      const points = obj.userData.points;
      if (
        (points?.a?.equals(linePoints.a) && points?.b?.equals(linePoints.b)) ||
        (points?.a?.equals(linePoints.b) && points?.b?.equals(linePoints.a))
      ) {
        obj.userData.isExtrusionLine = true;
        obj.userData.isEndPointChangeble = false;
        obj.userData.isChangeble = false;

        line.userData.isChangeble = false;
        line.userData.isEndPointChangeble = false;
        line.userData.isNewBaseLine = true;

        const orientation = this.getLineOrientation(line);
        const extrusionDirection = this.getExtrusionDirection();
        if (orientation === extrusionDirection) {
          const newLine = this.createEdge(line, linePoints.b, linePoints.b);
          this.changeTheBaseLine(line, newLine, linePoints.b, linePoints.b);
        } else {
          const newLine = this.createEdge(line, linePoints.a, linePoints.b);
          this.changeTheBaseLine(line, newLine, linePoints.a, linePoints.b);
        }
      }
    });
  }

  private updateExtrusion() {
    if (
      !this.selectedMesh ||
      !this.originalShape ||
      !this.originalPosition ||
      !this.originalRotation ||
      !this.originalScale ||
      !this.normal
    )
      return;

    const extrudeSettings = {
      depth: this.extrudeDistance,
      bevelEnabled: false,
    };
    const newGeometry = new THREE.ExtrudeGeometry(
      this.originalShape,
      extrudeSettings,
    );
    newGeometry.center();

    const newMesh = new THREE.Mesh(newGeometry, this.selectedMesh.material);
    newMesh.position.copy(this.originalPosition);
    newMesh.rotation.copy(this.originalRotation);
    newMesh.scale.copy(this.originalScale);

    const offset = this.normal.clone().multiplyScalar(this.extrudeDistance / 2);
    newMesh.position.add(offset);

    const parent = this.selectedMesh.parent!;
    parent.remove(this.selectedMesh);
    parent.add(newMesh);
    this.selectedMesh = newMesh;
    this.selectedMesh.userData.points = this.originalPoints;
    this.selectedMesh.userData.shape = this.originalShape;

    const basePoints = (this.selectedMesh.userData.points ??
      []) as THREE.Vector3[];
    const baseWorld = basePoints.map((p) =>
      p
        .clone()
        .applyMatrix4(
          this.selectedMesh
            ? this.selectedMesh.matrixWorld
            : new THREE.Matrix4(),
        ),
    );

    const normalDir = this.normal
      .clone()
      .normalize()
      .multiplyScalar(this.extrudeDistance);
    const extrudedWorld = baseWorld.map((p) => p.clone().add(normalDir));

    const addEdge = (start: THREE.Vector3, end: THREE.Vector3) => {
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
      const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
      const line = new THREE.Line(geometry, lineMaterial);
      if (start === end) {
        line.userData.isEndPointChangeble = true;
      }
      line.userData.isExtrusionLine = true;
      line.userData.points = { a: start.clone(), b: end.clone() };
      this.extrusionOutline.push(line);

      this.original_points[line.uuid] = line.userData.points;
      this.selectedMesh?.parent?.add(line);
    };

    const numPoints = basePoints.length;

    if (this.extrusionOutline.length === 0) {
      for (let i = 0; i < numPoints; i++) {
        addEdge(baseWorld[i], baseWorld[i]);
      }

      this.baseLines.forEach((line) => {
        addEdge(
          new THREE.Vector3(
            line.userData.points.a.x,
            line.userData.points.a.y,
            line.userData.points.a.z,
          ),
          new THREE.Vector3(
            line.userData.points.b.x,
            line.userData.points.b.y,
            line.userData.points.b.z,
          ),
        );
      });
    }

    this.extrusionOutline.forEach((line) => {
      let new_distance;

      new_distance = new THREE.Vector3(
        extrudedWorld[0].x - basePoints[0].x,
        extrudedWorld[0].y - basePoints[0].y,
        extrudedWorld[0].z - basePoints[0].z,
      );

      if (line.userData.basePoints) {
        const points = line.userData.basePoints as THREE.Vector3[];
        const baseWorld = points.map((p) =>
          p
            .clone()
            .applyMatrix4(
              this.selectedMesh
                ? this.selectedMesh.matrixWorld
                : new THREE.Matrix4(),
            ),
        );

        const normalDir = this.normal
          ?.clone()
          .normalize()
          .multiplyScalar(
            this.extrudeDistance - line.userData.curruntExtrusion,
          );
        const extrudedWorld = baseWorld.map((p) =>
          p.clone().add(normalDir ? normalDir : new THREE.Vector3()),
        );

        new_distance = new THREE.Vector3(
          extrudedWorld[0].x - points[0].x,
          extrudedWorld[0].y - points[0].y,
          extrudedWorld[0].z - points[0].z,
        );
      }
      const start = this.original_points[line.uuid].a.clone().add(new_distance);
      const end = this.original_points[line.uuid].b.clone().add(new_distance);
      let newGeometry;

      if (line.userData.isEndPointChangeble) {
        newGeometry = new THREE.BufferGeometry().setFromPoints([
          this.original_points[line.uuid].a.clone(),
          end,
        ]);
        line.userData.points = {
          a: this.original_points[line.uuid].a.clone(),
          b: end.clone(),
        };
      } else if (line.userData.isChangeble === false) {
        newGeometry = line.geometry.clone();
      } else {
        newGeometry = new THREE.BufferGeometry().setFromPoints([start, end]);
        line.userData.points = { a: start.clone(), b: end.clone() };
      }
      line.geometry.dispose();
      line.geometry = newGeometry;
      this.checkExistingLine(line);
    });

    const shapes: { [key: string]: THREE.Line[] } = {};
    this.baseLines.forEach((originalLine) => {
      const shape: THREE.Line[] = [];
      // 1. line from original selected faces
      shape.push(originalLine);

      originalLine.userData.points = {
        a: new THREE.Vector3(
          originalLine.userData.points.a.x,
          originalLine.userData.points.a.y,
          originalLine.userData.points.a.z,
        ),
        b: new THREE.Vector3(
          originalLine.userData.points.b.x,
          originalLine.userData.points.b.y,
          originalLine.userData.points.b.z,
        ),
      };

      for (const new_line of this.extrusionOutline) {
        let new_line_points = this.original_points[new_line.uuid];
        if (
          new_line.userData.baseLineConnectedId &&
          originalLine.userData.isNewBaseLine !== true
        ) {
          new_line_points =
            this.original_points[new_line.userData.baseLineConnectedId];
        }

        // 2. line from opposite side
        if (
          originalLine.userData.points.a.equals(new_line_points.a) &&
          originalLine.userData.points.b.equals(new_line_points.b)
        ) {
          shape.push(new_line);
        }

        // 3. line from one side
        if (
          new_line_points.a.equals(new_line_points.b) &&
          originalLine.userData.points.a.equals(new_line_points.a)
        ) {
          shape.push(new_line);
        }

        // 4. line from another side
        if (
          new_line_points.a.equals(new_line_points.b) &&
          originalLine.userData.points.b.equals(new_line_points.a)
        ) {
          shape.push(new_line);
        }
      }

      shapes[originalLine.uuid] = shape;
    });

    const last_shape: THREE.Line[] = [];
    this.extrusionOutline.forEach((line) => {
      if (!line.userData.isEndPointChangeble && !line.userData.isNewBaseLine) {
        last_shape.push(line);
      }
    });
    shapes[last_shape[0].uuid] = last_shape;
    this.newShapes = shapes;
    this.selectedMesh.userData.points = extrudedWorld;
  }

  private mergeTwoLines(
    line1: THREE.Line,
    line2: THREE.Line,
  ): THREE.Line | null {
    const { a: a1, b: b1 } = line1.userData.points;
    const { a: a2, b: b2 } = line2.userData.points;

    let p1: THREE.Vector3, p2: THREE.Vector3;

    if (a1.equals(a2) || a1.equals(b2)) {
      p1 = b1;
      p2 = a2.equals(a1) ? b2 : a2;
    } else if (b1.equals(a2) || b1.equals(b2)) {
      p1 = a1;
      p2 = a2.equals(b1) ? b2 : a2;
    } else {
      console.warn('No shared point found between the two lines.');
      return null;
    }

    const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
    const material = line1.material;
    const newLine = new THREE.Line(geometry, material);
    newLine.userData.points = { a: p1.clone(), b: p2.clone() };

    return newLine;
  }

  private mergeLines() {
    if (!this.selectedMesh?.parent) return;

    const parent = this.selectedMesh.parent;
    const candidateLines: THREE.Line[] = [];

    this.findedPoints.forEach((point) => {
      parent.children.forEach((obj) => {
        if (!(obj instanceof THREE.Line)) return;

        const points = obj.userData.points;
        if (points?.a?.equals(point) || points?.b?.equals(point)) {
          if (!candidateLines.includes(obj)) {
            candidateLines.push(obj);
          }
        }
      });
    });

    const mergedPairs: Set<string> = new Set();

    for (let i = 0; i < candidateLines.length; i++) {
      for (let j = i + 1; j < candidateLines.length; j++) {
        const l1 = candidateLines[i];
        const l2 = candidateLines[j];

        if (mergedPairs.has(l1.uuid) || mergedPairs.has(l2.uuid)) continue;

        const p1 = [l1.userData.points.a, l1.userData.points.b];
        const p2 = [l2.userData.points.a, l2.userData.points.b];

        const shared = p1.filter((p) => p.equals(p2[0]) || p.equals(p2[1]));

        if (shared.length === 1) {
          const newLine = this.mergeTwoLines(l1, l2);
          if (newLine) {
            parent.add(newLine);

            this.mergedLine[newLine.uuid] = {
              new: newLine,
              old: [l1, l2],
            };

            [l1, l2].forEach((line) => {
              line.geometry.dispose();
              if (Array.isArray(line.material)) {
                line.material.forEach((m) => m.dispose());
              } else {
                line.material.dispose();
              }
              parent.remove(line);
              mergedPairs.add(line.uuid);
            });
          }
        }
      }
    }

    if (mergedPairs.size === 0) {
      console.warn('No valid line pairs found to merge.');
    }
  }

  private mergeShapes(newShapes: { [key: string]: THREE.Line[] }) {
    const findedShapes: THREE.Mesh[] = [];

    const faceData: THREE.Line[][] = [];
    this.removedLines.forEach((line) => {
      let shape_lines: THREE.Line[] = [];
      let oppositeShape: THREE.Mesh | null = null;
      this.selectedMesh?.parent?.children.forEach((obj) => {
        const uuids = obj.userData.lineUUIDs;
        if (
          Array.isArray(uuids) &&
          uuids.includes(line.uuid) &&
          obj instanceof THREE.Mesh
        ) {
          if (!findedShapes.includes(obj)) {
            oppositeShape = obj;
            findedShapes.push(obj);
            oppositeShape.userData.lineUUIDs =
              oppositeShape.userData.lineUUIDs.filter(
                (id: string) => id !== line.uuid,
              );
          }
        }
      });
      const targetA = line.userData.points.a;
      const targetB = line.userData.points.b;
      let lines;
      if (oppositeShape) {
        lines = (oppositeShape as THREE.Mesh).userData.lines;
        for (const [lineId, points] of Object.entries(lines)) {
          const pointsTyped = points as { a: THREE.Vector3; b: THREE.Vector3 };
          const a = new THREE.Vector3(
            pointsTyped.a.x,
            pointsTyped.a.y,
            pointsTyped.a.z,
          );
          const b = new THREE.Vector3(
            pointsTyped.b.x,
            pointsTyped.b.y,
            pointsTyped.b.z,
          );

          const match =
            (a.equals(targetA) && b.equals(targetB)) ||
            (a.equals(targetB) && b.equals(targetA));

          if (match) {
            delete lines[lineId];
            break;
          }
        }
      }

      if (!newShapes[line.uuid]) return;

      const new_not_required_shape_lines = newShapes[line.uuid];
      delete newShapes[line.uuid];
      shape_lines.push(line, ...new_not_required_shape_lines);
      shape_lines = shape_lines.filter((l) => l.uuid !== line.uuid);
      this.selectedMesh?.parent?.children.forEach((obj) => {
        if (
          obj instanceof THREE.Line &&
          oppositeShape?.userData.lineUUIDs.includes(obj.uuid)
        ) {
          shape_lines.push(obj);
        }
      });

      for (const [, data] of Object.entries(this.mergedLine)) {
        data.old.forEach((line: THREE.Line) => {
          shape_lines = shape_lines.filter((l) => l.uuid !== line.uuid);
        });
        shape_lines.push(data.new);
      }

      faceData.push(shape_lines);
    });

    for (const [, data] of Object.entries(newShapes)) {
      faceData.push(data);
    }

    findedShapes.forEach((shape) => {
      this.selectedMesh?.parent?.remove(shape);
    });

    const shape = this.createExtrudeMeshFromLines(faceData);
    shape.forEach((mesh) => {
      this.selectedMesh?.parent?.add(mesh);
    });
    this.selectedMesh?.parent?.remove(this.selectedMesh);
  }

  private arePointsEqual(p1: THREE.Vector3, p2: THREE.Vector3): boolean {
    return p1.distanceToSquared(p2) < 1e-6;
  }

  private orderLinesIntoLoop(lines: THREE.Line[]): THREE.Line[] {
    if (lines.length === 0) return [];

    const ordered: THREE.Line[] = [lines[0]];
    lines = lines.slice(1);

    while (lines.length > 0) {
      const lastLine = ordered[ordered.length - 1];
      const lastPoint = lastLine.userData.points.b;

      const index = lines.findIndex(
        (line) =>
          this.arePointsEqual(line.userData.points.a, lastPoint) ||
          this.arePointsEqual(line.userData.points.b, lastPoint),
      );

      if (index === -1) break;
      const nextLine = lines.splice(index, 1)[0];

      if (!this.arePointsEqual(nextLine.userData.points.a, lastPoint)) {
        const temp = nextLine.userData.points.a;
        nextLine.userData.points.a = nextLine.userData.points.b;
        nextLine.userData.points.b = temp;
      }

      ordered.push(nextLine);
    }

    return ordered;
  }

  private calculatePolygonCentroid3D(points: THREE.Vector3[]): THREE.Vector3 {
    if (points.length < 3) return new THREE.Vector3();
    const p0 = points[0];
    const p1 = points[1];
    const p2 = points[2];

    const v1 = new THREE.Vector3().subVectors(p1, p0).normalize();
    const v2 = new THREE.Vector3().subVectors(p2, p0).normalize();
    const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();

    const u = v1.clone();
    const v = new THREE.Vector3().crossVectors(normal, u).normalize();
    const projectedPoints: THREE.Vector2[] = points.map((p) => {
      const vec = p.clone().sub(p0);
      return new THREE.Vector2(vec.dot(u), vec.dot(v));
    });
    if (
      !projectedPoints[0].equals(projectedPoints[projectedPoints.length - 1])
    ) {
      projectedPoints.push(projectedPoints[0].clone());
    }
    let area = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < projectedPoints.length - 1; i++) {
      const p1 = projectedPoints[i];
      const p2 = projectedPoints[i + 1];
      const cross = p1.x * p2.y - p2.x * p1.y;
      area += cross;
      cx += (p1.x + p2.x) * cross;
      cy += (p1.y + p2.y) * cross;
    }
    area *= 0.5;
    if (area === 0) return p0.clone();
    cx /= 6 * area;
    cy /= 6 * area;
    const center3D = p0
      .clone()
      .add(u.clone().multiplyScalar(cx))
      .add(v.clone().multiplyScalar(cy));

    return center3D;
  }

  private createExtrudeMeshFromLines(
    faces: THREE.Line[][],
    depth = 0.0001,
  ): THREE.Mesh[] {
    const extrudedMeshes: THREE.Mesh[] = [];

    for (const face of faces) {
      if (face.length < 3) continue;
      const orderedLines = this.orderLinesIntoLoop(face);
      const edgePoints: THREE.Vector3[] = orderedLines.map(
        (line) =>
          new THREE.Vector3(
            line.userData.points.a.x,
            line.userData.points.a.y,
            line.userData.points.a.z,
          ),
      );
      if (edgePoints.length < 3) continue;

      let p0 = edgePoints[0];
      const u = new THREE.Vector3();
      const v = new THREE.Vector3();
      const normal = new THREE.Vector3();

      for (let i = 0; i < edgePoints.length - 2; i++) {
        const a = edgePoints[i];
        const b = edgePoints[i + 1];
        const c = edgePoints[i + 2];

        const tempU = new THREE.Vector3().subVectors(b, a).normalize();
        const tempV = new THREE.Vector3().subVectors(c, a).normalize();
        const tempNormal = new THREE.Vector3().crossVectors(tempU, tempV);

        if (tempNormal.lengthSq() > 1e-6) {
          p0 = a.clone();
          u.copy(tempU);
          v.crossVectors(tempNormal.normalize(), u).normalize();
          normal.copy(tempNormal.normalize());
          break;
        }
      }

      const projectedPoints: THREE.Vector2[] = edgePoints.map((p) => {
        const vec = p.clone().sub(p0);
        return new THREE.Vector2(vec.dot(u), vec.dot(v));
      });
      projectedPoints.push(projectedPoints[0].clone());

      // edgePoints.push(edgePoints[0].clone());
      const center = this.calculatePolygonCentroid3D(edgePoints);

      const shape = new THREE.Shape();
      shape.moveTo(projectedPoints[0].x, projectedPoints[0].y);
      for (let i = 1; i < projectedPoints.length; i++) {
        shape.lineTo(projectedPoints[i].x, projectedPoints[i].y);
      }
      shape.lineTo(projectedPoints[0].x, projectedPoints[0].y);
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: false,
      });

      const material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
      const extrudeMesh = new THREE.Mesh(geometry, material);
      const basis = new THREE.Matrix4().makeBasis(u, v, normal);
      const translation = new THREE.Matrix4().makeTranslation(p0.x, p0.y, p0.z);
      extrudeMesh.applyMatrix4(basis);
      extrudeMesh.applyMatrix4(translation);

      extrudeMesh.userData.points = edgePoints;
      extrudeMesh.userData.lineUUIDs = orderedLines.map((l) => l.uuid);
      extrudeMesh.userData.shape = shape;
      extrudeMesh.userData.center = center;

      const lineData: { [key: string]: { a: position; b: position } } = {};
      orderedLines.forEach((line, idx) => {
        const a = {
          x: line.userData.points.a.x,
          y: line.userData.points.a.y,
          z: line.userData.points.a.z,
        };
        const b = {
          x: line.userData.points.b.x,
          y: line.userData.points.b.y,
          z: line.userData.points.b.z,
        };
        lineData[`line${idx + 1}`] = { a, b };
      });
      extrudeMesh.userData.lines = lineData;

      extrudedMeshes.push(extrudeMesh);
    }

    return extrudedMeshes;
  }

  private onMouseUp() {
    this.extrusionOutline.forEach((line) => {
      delete line.userData.isExtrusionLine;
      delete line.userData.isEndPointChangeble;
      delete line.userData.isNewBaseLine;
      delete line.userData.isChangeble;
      delete line.userData.basePoints;
      delete line.userData.curruntExtrusion;
    });
    this.mergeLines();
    this.mergeShapes(this.newShapes);

    this.selectedFace = null;
    this.extrusionOutline = [];
    this.selectedMesh = null;
    this.findedPoints = [];
    this.originalShape = null;
    this.originalSettings = null;
    this.originalPosition = null;
    this.originalRotation = null;
    this.originalScale = null;
    this.normal = null;
    this.extrudeDistance = 0;
    this.initialMouseY = 0;
    this.faceCenter = null;
    this.hasRemovedLines = false;
    this.originalPoints = null;
    this.baseLines = [];
    this.controls.enabled = true;
    this.originalPoints = null;
  }
}
