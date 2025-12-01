import * as THREE from 'three';
import { OBJECT_TYPES, PART_TYPES } from '../interface';

export class SelectObjectController {
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private hoveredObject: THREE.Mesh | null = null;
  private hoverOutline: THREE.LineSegments | null = null;
  private selectedCupboard: THREE.Mesh | null = null;
  private selectedPart: THREE.Mesh | null = null;
  private selectedOutline: THREE.LineSegments | null = null;
  private objectSelectOutline: THREE.LineSegments | null = null;
  private partSelectOutline: THREE.LineSegments | null = null;

  // optional callbacks for React
  public onHover: ((obj: THREE.Mesh | null) => void) | null = null;
  public onSelect: ((obj: THREE.Mesh | null) => void) | null = null;

  constructor(camera: THREE.Camera, scene: THREE.Scene) {
    this.camera = camera;
    this.scene = scene;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this._onMouseMove = this._onMouseMove.bind(this);
    this._onDoubleClick = this._onDoubleClick.bind(this);

    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('dblclick', this._onDoubleClick);
  }

  public update() {
    this._handleHover();
  }

  public dispose() {
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('dblclick', this._onDoubleClick);
  }

  private _onMouseMove(event: MouseEvent) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  private _onDoubleClick() {
    if (!this.hoveredObject) {
      this.clearAllOutlines();
      this.hoveredObject = null;
      this.selectedCupboard = null;
      this.selectedPart = null;
      return;
    }

    const object = this.hoveredObject;

    if (
      this.selectedCupboard !== object &&
      Object.values(OBJECT_TYPES).includes(object.userData.type)
    ) {
      this.clearAllOutlines();
      this.selectedCupboard = object;
      this.selectedPart = null;

      this._applySmallCupboardSelectOutline(object);
      return;
    }

    if (
      Object.values(PART_TYPES).includes(object.userData.type) ||
      (object.userData.isInvisibleBox === true &&
        object.parent?.userData.objectId === this.selectedCupboard?.userData.objectId)
    ) {
      if (!this.selectedCupboard) return;
      this.clearAllOutlines();
      this.selectedPart = object;
      if (this.onSelect) this.onSelect(object);
      this._applyPartSelectOutline(object);

      this._applyObjectBigOutline(this.selectedCupboard);
      return;
    }
  }

  private _handleHover() {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const targets: THREE.Mesh[] = [];

    this.scene.traverse((object) => {
      if (
        object instanceof THREE.Mesh &&
        Object.values(OBJECT_TYPES).includes(object.userData.type) &&
        object.userData.objectId !== this.selectedCupboard?.userData.objectId
      ) {
        targets.push(object);
      }
    });

    if (this.selectedCupboard) {
      this.selectedCupboard?.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          targets.push(child);
        }
      });
    }

    const hits = this.raycaster.intersectObjects(targets, true);
    let newHover: THREE.Mesh | null = null;

    if (hits.length > 0) {
      newHover = hits[0].object as THREE.Mesh;
    } else {
      newHover = null;
    }

    if (newHover !== this.hoveredObject) {
      this._removeHoverEffect();
      this.hoveredObject = newHover;
      if (newHover) this._applyHoverEffect();
    }
  }

  private _removeOutline(outline: THREE.LineSegments) {
    if (!outline) return;
    this.scene.remove(outline);
    outline.geometry.dispose();
    (outline.material as THREE.LineBasicMaterial).dispose?.();
  }

  private _createLineObjects(obj: THREE.Mesh, color: number): THREE.LineSegments {
    const edges = new THREE.EdgesGeometry(obj.geometry);
    const mat = new THREE.LineBasicMaterial({
      color: color,
      linewidth: 2,
      depthTest: false,
    });
    const outline = new THREE.LineSegments(edges, mat);

    outline.name = `outline-${obj.userData.objectId}`;
    obj.updateWorldMatrix(true, false);
    obj.getWorldPosition(outline.position);
    outline.quaternion.copy(obj.getWorldQuaternion(new THREE.Quaternion()));
    return outline;
  }

  private _applyHoverEffect() {
    if (this.hoverOutline) {
      this._removeOutline(this.hoverOutline);
      this.hoverOutline = null;
    }

    if (!this.hoveredObject) return;
    const outline = this._createLineObjects(this.hoveredObject, 0x0088ff);
    this.scene.add(outline);
    this.hoverOutline = outline;
  }

  private _removeHoverEffect() {
    if (this.hoverOutline) {
      this._removeOutline(this.hoverOutline);
      this.hoverOutline = null;
    }
  }

  private clearAllOutlines() {
    if (this.objectSelectOutline) {
      this._removeOutline(this.objectSelectOutline);
      this.objectSelectOutline = null;
    }

    if (this.selectedOutline) {
      this._removeOutline(this.selectedOutline);
      this.selectedOutline = null;
    }

    if (this.hoverOutline) {
      this._removeOutline(this.hoverOutline);
      this.hoverOutline = null;
    }

    if (this.partSelectOutline) {
      this._removeOutline(this.partSelectOutline);
      this.partSelectOutline = null;
    }
  }

  private _applyPartSelectOutline(obj: THREE.Mesh) {
    const outline = this._createLineObjects(obj, 0xffff00);
    this.scene.add(outline);
    this.partSelectOutline = outline;
  }

  private _applySmallCupboardSelectOutline(obj: THREE.Mesh) {
    const outline = this._createLineObjects(obj, 0xffff00);
    this.scene.add(outline);
    this.objectSelectOutline = outline;
  }

  private _getBoxCenter(obj: THREE.Mesh): THREE.Vector3 {
    const box = new THREE.Box3().setFromObject(obj);
    const center = new THREE.Vector3();
    box.getCenter(center);
    return center;
  }

  private _createDashedLineObject(
    object: THREE.Mesh,
    color: number,
    center: THREE.Vector3
  ): THREE.LineSegments {
    const geometry = object.geometry as THREE.BoxGeometry;
    const geo = new THREE.BoxGeometry(
      geometry.parameters.width * 1.05,
      geometry.parameters.height * 1.05,
      geometry.parameters.depth * 1.05
    );
    const edges = new THREE.EdgesGeometry(geo);

    const dashedMat = new THREE.LineDashedMaterial({
      color: color,
      dashSize: 0.04,
      gapSize: 0.02,
      linewidth: 2,
    });

    const outline = new THREE.LineSegments(edges, dashedMat);
    outline.position.copy(center);
    outline.computeLineDistances();
    outline.name = 'cupboard_big_dotted_outline';
    return outline;
  }

  private _applyObjectBigOutline(object: THREE.Mesh) {
    if (this.selectedOutline) {
      this._removeOutline(this.selectedOutline);
      this.selectedOutline = null;
    }

    if (this.objectSelectOutline) {
      this._removeOutline(this.objectSelectOutline);
      this.objectSelectOutline = null;
    }

    const center = this._getBoxCenter(object);
    const outline = this._createDashedLineObject(object, 0xffff00, center);
    this.scene.add(outline);
    this.selectedOutline = outline;
  }
}
