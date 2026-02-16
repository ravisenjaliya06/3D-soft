import * as THREE from 'three';
import { store } from '../../store';
import { setobjectSelected, setSelectedChildObject } from '../../store/dataSlice';
import { createLineObjects } from '../../utils/outlineHelpers';
import { INVISIBLE_BOXES, PART_TYPES } from '../interface';

export class SelectObjectController {
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private hoveredObject: THREE.Mesh | null = null;
  private hoverOutline: THREE.LineSegments | null = null;
  private selectedMainObject: THREE.Mesh | null = null;
  private selectedPart: THREE.Mesh | null = null;
  private selectedOutline: THREE.LineSegments | null = null;
  private objectSelectOutline: THREE.Object3D | null = null;
  private partSelectOutline: THREE.Object3D | null = null;

  // optional callbacks for React
  public onHover: ((obj: THREE.Mesh | null) => void) | null = null;
  public onSelect: ((obj: THREE.Mesh | null) => void) | null = null;
  public onShowHelperTool: ((obj: THREE.Mesh | null) => void) | null = null;

  constructor(camera: THREE.PerspectiveCamera, scene: THREE.Scene) {
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
    // Auto-cleanup if objects were removed from scene outside of this controller
    if (this.selectedMainObject && !this.selectedMainObject.parent) {
      this.deselect();
    }
    if (this.hoveredObject && !this.hoveredObject.parent) {
      this._removeHoverEffect();
      this.hoveredObject = null;
      if (this.onHover) this.onHover(null);
    }
    this._handleHover();
  }

  public dispose() {
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('dblclick', this._onDoubleClick);
  }

  public deselect() {
    this._nullAllValues();
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

    if (this.onSelect) this.onSelect(null);

    // Hide HelperTool when deselecting
    if (this.onShowHelperTool) {
      this.onShowHelperTool(null);
    }
  }

  public getSelectedMainObject(): THREE.Mesh | null {
    return this.selectedMainObject;
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

    // Trigger HelperTool display
    if (this.onShowHelperTool) {
      this.onShowHelperTool(object);
    }

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

    // If the part is also a 'Main' object (like a Drawer group),
    // we might want the big dotted outline on it.
    this._applyObjectBigOutline();
    return;
  }

  /**
   * Retrieve the group parent (E.g.: Drawer, Door)
   * A group is defined by having isMain: true and type like 'drawer' or 'door'
   */
  private _getGroupParent(object: THREE.Mesh): THREE.Mesh | null {
    let current: THREE.Object3D | null = object;
    while (current && current instanceof THREE.Mesh && !(current instanceof THREE.Scene)) {
      if (
        current.userData.isMain === true &&
        (current.userData.type === PART_TYPES.DRAWER || current.userData.type === PART_TYPES.DOOR)
      ) {
        return current;
      }
      current = current.parent;
    }
    return null;
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
    const topParent = this._getTopParent(object);

    // 1. Level 0 -> Level 1 (Cupboard)
    if (this.selectedMainObject?.userData.objectId !== topParent.userData.objectId) {
      this.hoveredObject = topParent;
      this._selectMainObject();
      return;
    }

    // 2. Level 1 (Cupboard) is selected. Check for Groups (Drawer/Door)
    const groupParent = this._getGroupParent(object);

    if (groupParent) {
      // If we clicked inside or on a group
      if (this.selectedPart === groupParent) {
        // Group is already selected, now select the specific part (if it's not the group mesh itself)
        if (object !== groupParent) {
          this.hoveredObject = object;
          this._selectChildObject();
        } else {
          // Double clicked the group mesh again? Deselect.
          this._nullAllValues();
        }
      } else {
        // Check if some other part is already selected
        if (this.selectedPart) {
          // If the selected part belongs to the same group, and we clicked it again, deselect
          if (this.selectedPart === object) {
            this._nullAllValues();
          } else {
            // Selecting a different part or selecting the group wrapper
            this.hoveredObject = groupParent;
            this._selectChildObject();
          }
        } else {
          // Selecting this group for the first time
          this.hoveredObject = groupParent;
          this._selectChildObject();
        }
      }
    } else {
      // Not in a group (e.g. standard plank on cupboard)
      if (this.selectedPart === object) {
        this._nullAllValues();
      } else {
        this.hoveredObject = object;
        this._selectChildObject();
      }
    }
  }

  private _findTargetToHover(): THREE.Mesh[] {
    const targets: THREE.Mesh[] = [];

    this.scene.traverse((object) => {
      if (
        object instanceof THREE.Mesh &&
        object.userData.objectId !== this.selectedMainObject?.userData.objectId
      ) {
        targets.push(object);
      }
    });

    if (this.selectedMainObject) {
      this.selectedMainObject.traverse((child) => {
        if (child instanceof THREE.Mesh && child !== this.selectedMainObject) {
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

  private _handleHover() {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const targets = this._findTargetToHover();

    const newHover = this._findHoverObject(targets);

    if (newHover !== this.hoveredObject) {
      this._removeHoverEffect();
      this.hoveredObject = newHover;

      // Only apply hover effect if it's not the already selected object
      if (newHover && newHover !== this.selectedMainObject && newHover !== this.selectedPart) {
        this._applyHoverEffect();
      }

      if (this.onHover) {
        this.onHover(newHover);
      }
    }
  }

  private _removeOutline(outline: THREE.Object3D) {
    if (!outline) return;
    this.scene.remove(outline);
    if ((outline as THREE.Mesh).geometry) (outline as THREE.Mesh).geometry.dispose();

    const mat = (outline as THREE.Mesh).material;
    if (mat) {
      if (Array.isArray(mat)) {
        mat.forEach((m) => m.dispose());
      } else {
        (mat as THREE.Material).dispose();
      }
    }
  }

  private _applyHoverEffect() {
    if (this.hoverOutline) {
      this._removeOutline(this.hoverOutline);
      this.hoverOutline = null;
    }

    if (!this.hoveredObject) return;
    const outline = createLineObjects(this.hoveredObject, 0x00eeff);
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

  private _createSelectionBox(obj: THREE.Mesh): THREE.Mesh {
    const material = new THREE.MeshBasicMaterial({
      color: 0x12086f,
      transparent: true,
      opacity: 0.5,
      depthTest: false,
      side: THREE.DoubleSide,
    });

    let box: THREE.Box3;

    if (obj.geometry) {
      if (!obj.geometry.boundingBox) {
        obj.geometry.computeBoundingBox();
      }

      box = obj.geometry.boundingBox!.clone();
    } else {
      box = new THREE.Box3().setFromObject(obj);
    }

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    geometry.translate(center.x, center.y, center.z);

    // Here we create the mesh without MeshBuilder because in the future we may need to apply draggable behavior
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'outline_box';

    if (obj.geometry) {
      mesh.matrixAutoUpdate = false;
      mesh.matrix.copy(obj.matrixWorld);
    } else {
      mesh.position.copy(center);
    }

    mesh.raycast = () => {};

    return mesh;
  }

  private _createOutLine(obj: THREE.Mesh) {
    let outline: THREE.Object3D;
    if (
      obj.userData.type === INVISIBLE_BOXES.INVISIBLE_BOX ||
      obj.userData.type === PART_TYPES.PLANK
    ) {
      outline = this._createSelectionBox(obj);
    } else {
      outline = createLineObjects(obj, 0x1a7af8);
    }

    this.scene.add(outline);
    this.partSelectOutline = outline;
  }

  private _applyPartSelectOutline(obj: THREE.Mesh) {
    // Ensure the object's world matrix is updated before creating outline
    // This is critical for child objects (like planks) that may have transforms from their parent
    obj.updateWorldMatrix(true, false);

    // Also update parent matrices to ensure accurate bounding box calculation
    let parent = obj.parent;
    while (parent && parent instanceof THREE.Mesh) {
      parent.updateWorldMatrix(false, false);
      parent = parent.parent;
    }

    this._createOutLine(obj);
  }

  private _applySmallCupboardSelectOutline(obj: THREE.Mesh) {
    // Ensure the object's world matrix is updated before creating outline
    obj.updateWorldMatrix(true, false);
    this._createOutLine(obj);
  }

  private _applyObjectBigOutline() {
    if (this.selectedOutline) {
      this._removeOutline(this.selectedOutline);
      this.selectedOutline = null;
    }

    if (this.objectSelectOutline) {
      this._removeOutline(this.objectSelectOutline);
      this.objectSelectOutline = null;
    }
  }
}
