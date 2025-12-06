import * as THREE from 'three';
import { store } from '../../store';
import { setobjectSelected, setSelectedChildObject } from '../../store/dataSlice';
import { OBJECT_TYPES, PART_TYPES } from '../interface';

export class SelectObjectController {
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private hoveredObject: THREE.Mesh | null = null;
  private hoverOutline: THREE.LineSegments | null = null;
  private selectedMainObject: THREE.Mesh | null = null;
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

  private _nullAllValues() {
    this._clearAllOutlines();
    this.hoveredObject = null;
    this.hoverOutline = null;
    this.selectedMainObject = null;
    this.selectedPart = null;
    this.selectedOutline = null;
    this.objectSelectOutline = null;
    this.partSelectOutline = null;

    store.dispatch(setobjectSelected(null));
    store.dispatch(setSelectedChildObject(null));
  }

  private _onMouseMove(event: MouseEvent) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  private _selectMainObject() {
    const object = this.hoveredObject;
    if (!object) return;

    this._clearAllOutlines();
    this.selectedMainObject = object;
    this.selectedPart = null;

    store.dispatch(setobjectSelected(object.userData.objectId));
    store.dispatch(setSelectedChildObject(null));

    this._applySmallCupboardSelectOutline(object);
    return;
  }

  private _selectChildObject() {
    const object = this.hoveredObject;
    if (!object) return;

    if (!this.selectedMainObject) return;
    this._clearAllOutlines();
    this.selectedPart = object;

    if (this.onSelect) this.onSelect(object);
    store.dispatch(setSelectedChildObject(object.userData.objectId));

    this._applyPartSelectOutline(object);
    this._applyObjectBigOutline(this.selectedMainObject);
    return;
  }

  /**
   * Retrieve the top parent of the object other than scene (E.g.: Cupboard)
   */
  private _getTopParent(object: THREE.Mesh): THREE.Mesh {
    let current = object;

    while (
      current.parent &&
      current.parent instanceof THREE.Mesh && 
      !(current.parent instanceof THREE.Scene)
    ) {
      current = current.parent;
    }

    return current;
  }

  private _onDoubleClick() {
    if (!this.hoveredObject) {
      this._nullAllValues();
      return;
    }

    const object = this.hoveredObject;
    if (
      this.selectedMainObject !== object &&
      Object.values(OBJECT_TYPES).includes(object.userData.type)
    ) {
      this._selectMainObject();
    } else if (
      (Object.values(PART_TYPES).includes(object.userData.type) ||
        object.userData.isInvisibleBox === true) &&
          this._getTopParent(object).userData.objectId === this.selectedMainObject?.userData.objectId
    ) {
      this._selectChildObject();
    } else {
      this._nullAllValues();
    }
  }

  private _findTargetToHover(): THREE.Mesh[] {
    const targets: THREE.Mesh[] = [];

    this.scene.traverse((object) => {
      if (
        object instanceof THREE.Mesh &&
        Object.values(OBJECT_TYPES).includes(object.userData.type) &&
        object.userData.objectId !== this.selectedMainObject?.userData.objectId
      ) {
        targets.push(object);
      }
    });

    if (this.selectedMainObject) {
      this.selectedMainObject?.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          targets.push(child);
        }
      });
    }

    return targets;
  }

  private _findHoverObject(targets: THREE.Mesh[]) {
    let hits = this.raycaster.intersectObjects(targets, true);
    if (this.selectedPart) {
      hits = hits.filter((h) => h.object !== this.selectedPart);
    }

    let newHover: THREE.Mesh | null = null;

    if (hits.length > 0) {
      newHover = hits[0].object as THREE.Mesh;
    } else {
      newHover = null;
    }

    return newHover;
  }

  // check if the mouse is hovering over a selectable object
  private _handleHover() {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // get all object behinds of the mouse cursor
    const targets = this._findTargetToHover();

    // find the closest object to the mouse using raycasting
    const newHover = this._findHoverObject(targets);

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

  private _clearAllOutlines() {
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
    const outline = this._createDashedLineObject(object, 0x000000, center);
    this.scene.add(outline);
    this.selectedOutline = outline;
  }
}
