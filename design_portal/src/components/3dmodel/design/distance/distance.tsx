import * as THREE from 'three';
import { generateCompartmentsFromMesh } from '../../handler/items';
import { getActiveUnit, metersToUnit, unitToMeters } from '../../handler/unitConversion';
import { findXY } from '../../sceneCreator/utils';
import { Axis } from '../../sidebar/interface';
import { isPlankObjectFindByName, isWallObject } from '../../utils/objectTypes';
import {
  AxisConfig,
  CreateAxisDistanceParams,
  CreateDistanceLineParams,
  CreateSideDistanceParams,
  DimensionMeta,
  Priority,
  ReferenceParam,
  ThreeDView,
} from '../interface';

export class DistanceTool {
  private scene: THREE.Scene;
  private selectedMesh: THREE.Mesh | null = null;
  private selectedBox: THREE.Box3 | null = null;
  private readonly DISTANCE_LABEL_PREFIX = 'dist_label_';
  private readonly DISTANCE_GROUP_PREFIX = 'dist_group_';
  // EPS: small tolerance value to avoid floating-point precision issues
  private readonly EPS = 1e-6;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public showDistances(mesh: THREE.Mesh): void {
    this.clearDistances();
    this.selectedMesh = mesh;

    const group = new THREE.Group();
    group.name = this.getDistanceGroupName(mesh.uuid);

    this.selectedBox = this.computeBoundingBox(mesh);
    const geometryInfo = this.analyzePlankGeometry();

    let direction: Axis | null = null;

    if (geometryInfo.isHorizontal) {
      // horizontal plank → measure Y
      direction = 'y';
    } else if (geometryInfo.isThinX) {
      // vertical plank facing X
      direction = 'x';
    } else if (geometryInfo.isThinZ) {
      // vertical plank facing Z
      direction = 'z';
    }
    if (direction) {
      this.createDistanceByAxis(group, direction);
    }
    if (group.children.length > 0) {
      this.scene.add(group);
    }
  }

  public clearDistances(): void {
    const target = this.selectedMesh;
    if (!target) return;

    const name = this.getDistanceGroupName(target.uuid);
    const existing = this.scene.getObjectByName(name) as THREE.Group | null;
    if (existing) {
      this.scene.remove(existing);
      this.disposeObjectResources(existing);
    }

    if (target === this.selectedMesh) {
      this.selectedMesh = null;
      this.selectedBox = null;
    }
  }

  public clearAllDistances(): void {
    const toRemove: THREE.Object3D[] = [];
    this.scene.traverse((obj) => {
      if (obj.name && obj.name.startsWith(this.DISTANCE_GROUP_PREFIX)) {
        toRemove.push(obj);
      }
    });
    toRemove.forEach((group) => {
      this.scene.remove(group);
      this.disposeObjectResources(group);
    });
    this.selectedMesh = null;
    this.selectedBox = null;
  }

  // enable editing for distance
  public enableEditing(
    view: ThreeDView,
    onUpdate?: (selectedMesh: THREE.Mesh, newPosition: THREE.Vector3) => void
  ): void {
    const onClick = (event: MouseEvent) => {
      this.handleDistanceInteraction(event, view, onUpdate);
    };

    view.renderer.domElement.addEventListener('dblclick', onClick);
  }

  private handleDistanceInteraction(
    event: MouseEvent,
    view: ThreeDView,
    onUpdate?: (selectedMesh: THREE.Mesh, newPosition: THREE.Vector3) => void
  ) {
    const mouse = findXY(view.renderer, event);

    const sprite = this.findHoveredSprite(view, new THREE.Vector2(mouse.x, mouse.y));
    if (!sprite) return;

    this.promptAndApplyDistance(sprite, view, onUpdate);
  }

  private findHoveredSprite(view: ThreeDView, mouse: THREE.Vector2): THREE.Sprite | null {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, view.camera);

    const sprites: THREE.Object3D[] = [];
    view.scene.traverse((obj) => {
      if (obj instanceof THREE.Sprite && obj.name.startsWith(this.DISTANCE_LABEL_PREFIX)) {
        sprites.push(obj);
      }
    });

    const hits = ray.intersectObjects(sprites, true);
    return hits.length ? (hits[0].object as THREE.Sprite) : null;
  }

  private promptAndApplyDistance(
    sprite: THREE.Sprite,
    view: ThreeDView,
    onUpdate?: (selectedMesh: THREE.Mesh, newPosition: THREE.Vector3) => void
  ) {
    // Gets dimension info from the sprite
    const meta = sprite.userData?.dimMeta as DimensionMeta | undefined;
    if (!meta) return;

    // Finds the related mesh in the scene
    const target = view.scene.getObjectByProperty('uuid', meta.targetUuid) as THREE.Mesh | null;
    if (!target) return;

    // Calculates the current distance
    const box = this.computeBoundingBox(target);
    const currentDistanceM = this.calculateDistance(box, meta);
    const currentInUnit = currentDistanceM;

    // Prompts the user to enter a new distance
    const unit = getActiveUnit();
    const input = prompt(
      `Enter new distance (${unit}):`,
      metersToUnit(currentInUnit, unit).toFixed(0)
    );
    if (!input) return;
    const newValUnit = parseFloat(input);
    if (!Number.isFinite(newValUnit) || newValUnit < 0) return;

    // Calculates the movement delta for the target mesh based on the new distance
    const newM = unitToMeters(newValUnit, unit);
    const desiredFace = meta.ref + (meta.side === 'min' ? newM : -newM);
    const currentFace = this.getCurrentFacePosition(box, meta);
    const delta = desiredFace - currentFace;

    // Moves the target mesh based on the movement delta
    this.applyPositionDelta(target, meta.axis, delta);
    generateCompartmentsFromMesh(target.parent as THREE.Mesh);

    if (onUpdate) {
      onUpdate(target, target.position.clone());
    }

    // Clear selection (which removes outlines and dimensions)
    if (view.selector) {
      view.selector.deselect();
    } else {
      // Fallback if selector not available
      this.clearAllDistances();
    }

    view.renderer.render(view.scene, view.camera);
  }

  // create bounding box
  private computeBoundingBox(obj: THREE.Object3D): THREE.Box3 {
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3();
    box.setFromObject(obj);
    return box;
  }

  private getBoxSize(box: THREE.Box3): THREE.Vector3 {
    const size = new THREE.Vector3();
    box.getSize(size);
    return size;
  }

  private analyzePlankGeometry() {
    if (!this.selectedMesh || !this.selectedBox)
      return { width: 0, height: 0, depth: 0, isHorizontal: false, isThinX: false, isThinZ: false };

    const params = (this.selectedMesh.geometry as THREE.BoxGeometry).parameters || {};
    const size = this.getBoxSize(this.selectedBox);

    const width = params.width ?? size.x;
    const height = params.height ?? size.y;
    const depth = params.depth ?? size.z;

    // Height comparison determines if it's a horizontal plank (flat) vs vertical/upright
    const isHorizontal = height < width && height < depth;
    // Thin X/Z detection helps determine orientation of vertical planks
    const isThinX = width <= depth && !isHorizontal;
    const isThinZ = depth < width && !isHorizontal;

    return { width, height, depth, isHorizontal, isThinX, isThinZ };
  }

  private createLine(group: THREE.Group, start: THREE.Vector3, end: THREE.Vector3): THREE.Line {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({
      color: 0x111111,
      depthTest: false,
    });

    const line = new THREE.Line(geometry, material);
    group.add(line);

    return line;
  }

  // create distance line
  private createDistanceLine({
    group,
    start,
    end,
    viewOffsetDir,
    label,
    meta = null,
  }: CreateDistanceLineParams) {
    const offset = 0.03;
    const startOffset = start.clone().addScaledVector(viewOffsetDir, offset);
    const endOffset = end.clone().addScaledVector(viewOffsetDir, offset);

    this.createLine(group, startOffset, endOffset);

    // Extension ticks
    const axis = endOffset.clone().sub(startOffset).normalize();
    const tickDir = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 1, 0));
    if (tickDir.lengthSq() < 1e-6) tickDir.set(1, 0, 0);
    tickDir.normalize();

    this.addTick(group, startOffset, tickDir);
    this.addTick(group, endOffset, tickDir);

    // Label
    const mid = startOffset.clone().lerp(endOffset, 0.5);
    const sprite = this.createTextSprite(label);
    sprite.name = this.DISTANCE_LABEL_PREFIX + (meta?.side || '') + '_' + (meta?.axis || '');
    if (meta) sprite.userData.dimMeta = meta;
    sprite.position.copy(mid);
    group.add(sprite);

    return sprite;
  }

  private addTick(group: THREE.Group, point: THREE.Vector3, direction: THREE.Vector3, size = 0.02) {
    const point1 = point.clone().addScaledVector(direction, size / 2);
    const point2 = point.clone().addScaledVector(direction, -size / 2);
    const geo = new THREE.BufferGeometry().setFromPoints([point1, point2]);
    const mat = new THREE.LineBasicMaterial({
      color: 0x222222,
      depthTest: false,
    });
    const line = new THREE.Line(geo, mat);
    group.add(line);
  }

  private createTextSprite(label: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 1024;
    canvas.height = 256;

    this.drawLabelCanvas(ctx, canvas.width, canvas.height, label);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.24, 0.06, 1);
    return sprite;
  }

  private drawLabelCanvas(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    label: string
  ): void {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, width, height);

    ctx.fillStyle = 'black';
    ctx.font = 'bold 160px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, width / 2, height / 2);
  }

  private getDistanceGroupName(uuid: string): string {
    return this.DISTANCE_GROUP_PREFIX + uuid;
  }

  // check if two boxes overlap on given axes
  private overlapsOnAxes(a: THREE.Box3, b: THREE.Box3, axes: Array<Axis>): boolean {
    for (const axis of axes) {
      if (axis === 'x' && (a.max.x <= b.min.x + this.EPS || a.min.x >= b.max.x - this.EPS))
        return false;
      if (axis === 'y' && (a.max.y <= b.min.y + this.EPS || a.min.y >= b.max.y - this.EPS))
        return false;
      if (axis === 'z' && (a.max.z <= b.min.z + this.EPS || a.min.z >= b.max.z - this.EPS))
        return false;
    }
    return true;
  }

  // Find nearest plank and wall to the given object
  private findNearestReferences(axis: Axis, overlapAxes: Axis[]) {
    if (!this.selectedMesh || !this.selectedBox)
      return { minPos: null, maxPos: null, minBox: null, maxBox: null };

    this.scene.updateMatrixWorld(true);

    let negative: ReferenceParam | null = null;
    let positive: ReferenceParam | null = null;

    const selfMin = this.selectedBox.min[axis];
    const selfMax = this.selectedBox.max[axis];

    const getPriority = (obj: THREE.Object3D): Priority => {
      if (isPlankObjectFindByName(obj)) return Priority.PLANK;
      if (isWallObject(obj)) return Priority.WALL;
      return Priority.NONE;
    };

    this.scene.traverse((obj) => {
      if (obj === this.selectedMesh || !(obj instanceof THREE.Mesh)) return;

      const priority = getPriority(obj);
      if (priority === Priority.NONE) return;

      const box = this.computeBoundingBox(obj);
      if (!this.overlapsOnAxes(this.selectedBox!, box, overlapAxes)) return;

      // Negative direction (find max pos < selfMin)
      if (box.max[axis] <= selfMin - this.EPS) {
        negative = this.updateNearestReference(negative, priority, box.max[axis], box, true);
      }

      // Positive direction (find min pos > selfMax)
      if (box.min[axis] >= selfMax + this.EPS) {
        positive = this.updateNearestReference(positive, priority, box.min[axis], box, false);
      }
    });

    return {
      minPos: (negative as ReferenceParam | null)?.pos ?? null,
      maxPos: (positive as ReferenceParam | null)?.pos ?? null,
      minBox: (negative as ReferenceParam | null)?.box ?? null,
      maxBox: (positive as ReferenceParam | null)?.box ?? null,
    };
  }

  private updateNearestReference(
    current: ReferenceParam | null,
    priority: Priority,
    pos: number,
    box: THREE.Box3,
    findMax: boolean
  ): ReferenceParam | null {
    if (
      !current ||
      priority > current.priority ||
      (priority === current.priority && (findMax ? pos > current.pos : pos < current.pos))
    ) {
      return {
        pos,
        priority,
        box: priority === Priority.PLANK ? box : undefined,
      };
    }
    return current;
  }

  private createSideDistance({
    side,
    refPos,
    mainAxis,
    offsetDir,
    group,
    fixed,
  }: CreateSideDistanceParams): void {
    if (refPos === null || !this.selectedMesh || !this.selectedBox) return;

    // Check if the side is min or max
    const isMin = side === 'min';
    const meshPos = isMin ? this.selectedBox.min[mainAxis] : this.selectedBox.max[mainAxis];

    // Calculate the distance between the reference position and the mesh position
    const distanceM = Math.abs(refPos - meshPos);
    const dist = distanceM;

    // Create points for the distance line
    const makePoint = (axisValue: number) =>
      new THREE.Vector3(fixed.x ?? axisValue, fixed.y ?? axisValue, fixed.z ?? axisValue);

    const p1 = makePoint(isMin ? refPos : meshPos);
    const p2 = makePoint(isMin ? meshPos : refPos);

    // Create distance line for the side
    this.createDistanceLine({
      group,
      start: p1,
      end: p2,
      viewOffsetDir: offsetDir,
      label: `${metersToUnit(dist, getActiveUnit()).toFixed(0)}`,
      meta: {
        axis: mainAxis,
        side,
        ref: refPos,
        targetUuid: this.selectedMesh.uuid,
      },
    });
  }

  // Create axis distance line
  private createAxisDistance({
    group,
    mainAxis,
    secondaryAxes,
    offsetDirFn,
  }: CreateAxisDistanceParams): void {
    if (!this.selectedMesh || !this.selectedBox) return;

    const { minPos, maxPos } = this.findNearestReferences(mainAxis, secondaryAxes);

    const offsetDir = offsetDirFn(this.selectedMesh, this.selectedBox);

    // Fixed coords for the two non-main axes
    const fixed = {
      x: mainAxis === 'x' ? null : (this.selectedBox.min.x + this.selectedBox.max.x) / 2,
      y: mainAxis === 'y' ? null : (this.selectedBox.min.y + this.selectedBox.max.y) / 2,
      z: mainAxis === 'z' ? null : (this.selectedBox.min.z + this.selectedBox.max.z) / 2,
    };

    this.createSideDistance({
      side: 'min',
      refPos: minPos,
      mainAxis,
      offsetDir,
      group,
      fixed,
    });

    this.createSideDistance({
      side: 'max',
      refPos: maxPos,
      mainAxis,
      offsetDir,
      group,
      fixed,
    });
  }

  private createDistanceByAxis(group: THREE.Group, mainAxis: Axis) {
    const axisConfig: Record<Axis, AxisConfig> = {
      x: {
        secondaryAxes: ['y', 'z'],
        offsetDir: new THREE.Vector3(0, 1, 0),
      },
      y: {
        secondaryAxes: ['x', 'z'],
        offsetDir: new THREE.Vector3(1, 0, 0),
      },
      z: {
        secondaryAxes: ['x', 'y'],
        offsetDir: new THREE.Vector3(0, 0, 1),
      },
    };

    const config = axisConfig[mainAxis];

    this.createAxisDistance({
      group,
      mainAxis,
      secondaryAxes: config.secondaryAxes,
      offsetDirFn: () => config.offsetDir,
    });
  }

  private disposeObjectResources(obj: THREE.Object3D) {
    obj.traverse((node: THREE.Object3D) => {
      if (node instanceof THREE.Mesh) {
        if (node.geometry) node.geometry.dispose?.();
        // Don't dispose material if shared, but usually lines created here have new materials
        if (Array.isArray(node.material)) {
          node.material.forEach((m) => m.dispose?.());
        } else if (node.material) {
          node.material.dispose?.();
        }
      }
      if (node instanceof THREE.Line) {
        if (node.geometry) node.geometry.dispose?.();
        if (node.material) node.material.dispose?.();
      }
      if (node instanceof THREE.Sprite) {
        if (node.material) {
          if (node.material.map) node.material.map.dispose?.();
          node.material.dispose?.();
        }
      }
    });
  }

  private calculateDistance(box: THREE.Box3, meta: DimensionMeta): number {
    const { axis, side, ref } = meta;

    if (axis === 'x') {
      return side === 'min' ? box.min.x - ref : ref - box.max.x;
    } else if (axis === 'y') {
      return side === 'min' ? box.min.y - ref : ref - box.max.y;
    } else {
      return side === 'min' ? box.min.z - ref : ref - box.max.z;
    }
  }

  private getCurrentFacePosition(box: THREE.Box3, meta: DimensionMeta): number {
    const { axis, side } = meta;

    if (axis === 'x') return side === 'min' ? box.min.x : box.max.x;
    if (axis === 'y') return side === 'min' ? box.min.y : box.max.y;
    return side === 'min' ? box.min.z : box.max.z;
  }

  private applyPositionDelta(target: THREE.Object3D, axis: string, delta: number) {
    const worldPos = new THREE.Vector3();
    target.getWorldPosition(worldPos);
    if (axis === 'x') worldPos.x += delta;
    else if (axis === 'y') worldPos.y += delta;
    else worldPos.z += delta;

    if (target.parent) {
      target.parent.worldToLocal(worldPos);
    }
    target.position.copy(worldPos);
  }
}
