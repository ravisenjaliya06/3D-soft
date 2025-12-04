import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { findXY } from '../utils';

/**
 * Handles drag-to-zoom functionality.
 * Draws a selection rectangle, finds objects inside it,
 * and moves the camera to focus on the selected area.
 */
export class ZoomSelectionController {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private mount: HTMLDivElement;
  private controls: OrbitControls;

  private isZoomMode = false;
  private startPoint: THREE.Vector2 | null = null;

  private overlayCanvas: HTMLCanvasElement | null = null;
  private overlayContext: CanvasRenderingContext2D | null = null;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
    renderer: THREE.WebGLRenderer,
    mount: HTMLDivElement,
    controls: OrbitControls
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.mount = mount;
    this.controls = controls;
  }

  /** Enable / disable zoom mode */
  public toggleZoomMode(enable: boolean): void {
    this.isZoomMode = enable;

    if (enable) {
      this._enableZoomMode();
    } else {
      this._disableZoomMode();
    }
  }

  private _enableZoomMode() {
    document.body.style.cursor = 'zoom-in';
    this.controls.enabled = false;

    this.renderer.domElement.addEventListener('mousedown', this._handleMouseDown);
  }

  private _disableZoomMode() {
    document.body.style.cursor = 'default';
    this.controls.enabled = true;

    this.renderer.domElement.removeEventListener('mousedown', this._handleMouseDown);
    this._removeOverlayCanvas();
  }

  private _handleMouseDown = (event: MouseEvent) => {
    if (!this.isZoomMode) return;

    this._startSelection(event);

    this.renderer.domElement.addEventListener('mousemove', this._handleMouseMove);
    this.renderer.domElement.addEventListener('mouseup', this._handleMouseUp, { once: true });
  };

  private _handleMouseMove = (event: MouseEvent) => {
    this._updateSelectionRect(event);
  };

  private _handleMouseUp = (event: MouseEvent) => {
    this._completeSelection(event);

    this.renderer.domElement.removeEventListener('mousemove', this._handleMouseMove);
    this.toggleZoomMode(false);
  };

  private _startSelection(event: MouseEvent) {
    const { x, y } = findXY(this.renderer, event);
    this.startPoint = new THREE.Vector2(x, y);

    this._createOverlayCanvas();
  }

  private _updateSelectionRect(event: MouseEvent) {
    if (!this.startPoint || !this.overlayContext || !this.overlayCanvas) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    const { startX, startY, currentX, currentY } = this._getSelectionScreenCoords(event, rect);

    this.overlayContext.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

    const w = currentX - startX;
    const h = currentY - startY;

    this.overlayContext.strokeStyle = 'green';
    this.overlayContext.fillStyle = 'rgba(0, 255, 0, 0.1)';
    this.overlayContext.lineWidth = 2;
    this.overlayContext.beginPath();
    this.overlayContext.rect(startX, startY, w, h);
    this.overlayContext.fill();
    this.overlayContext.stroke();
  }

  private _completeSelection(event: MouseEvent) {
    if (!this.startPoint) return;

    const { x, y } = findXY(this.renderer, event);
    const endPoint = new THREE.Vector2(x, y);

    this._removeOverlayCanvas();

    const bounds = this._computeBoundingBox(this.startPoint, endPoint);

    if (bounds) {
      this._zoomCameraToBounds(bounds);
    }

    this.startPoint = null;
  }

  private _createOverlayCanvas() {
    this.overlayCanvas = document.createElement('canvas');
    this.overlayCanvas.style.position = 'absolute';
    this.overlayCanvas.style.top = '0';
    this.overlayCanvas.style.left = '0';
    this.overlayCanvas.style.pointerEvents = 'none';

    this.overlayCanvas.width = window.innerWidth;
    this.overlayCanvas.height = window.innerHeight;

    this.mount.appendChild(this.overlayCanvas);
    this.overlayContext = this.overlayCanvas.getContext('2d');
  }

  private _removeOverlayCanvas() {
    if (this.overlayCanvas && this.overlayCanvas.parentNode) {
      this.overlayCanvas.parentNode.removeChild(this.overlayCanvas);
    }
    this.overlayCanvas = null;
    this.overlayContext = null;
  }

  private _getSelectionScreenCoords(event: MouseEvent, rect: DOMRect) {
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;

    const startX = ((this.startPoint!.x + 1) / 2) * rect.width;
    const startY = ((-this.startPoint!.y + 1) / 2) * rect.height;

    return { startX, startY, currentX, currentY };
  }

  /**
   * When the mouse goes up, we get two points.
   * Using those points, we create the rectangle’s bounding box for the zoom.
   */
  private _computeBoundingBox(start: THREE.Vector2, end: THREE.Vector2) {
    const raycaster = new THREE.Raycaster();
    const min = new THREE.Vector3(Infinity, Infinity, Infinity);
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

    const selectable = this.scene.children.filter(
      (obj) =>
        obj.visible &&
        !(obj instanceof THREE.GridHelper) &&
        !(obj instanceof Sky) &&
        obj.name !== 'stars'
    );

    const xMin = Math.min(start.x, end.x);
    const xMax = Math.max(start.x, end.x);
    const yMin = Math.min(start.y, end.y);
    const yMax = Math.max(start.y, end.y);

    const steps = 5;
    let found = false;

    /*
     * Check many points inside the selection area to see which objects are hit,
     * and use those hits to figure out the full bounding box of the selected region.
     */
    for (let i = 0; i <= steps; i++) {
      for (let j = 0; j <= steps; j++) {
        const x = xMin + (xMax - xMin) * (i / steps);
        const y = yMin + (yMax - yMin) * (j / steps);

        raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
        const hits = raycaster.intersectObjects(selectable, true);

        if (hits.length) {
          min.min(hits[0].point);
          max.max(hits[0].point);
          found = true;
        }
      }
    }

    if (!found) return null;

    const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
    return { min, max, center };
  }

  private _zoomCameraToBounds(bounds: {
    min: THREE.Vector3;
    max: THREE.Vector3;
    center: THREE.Vector3;
  }) {
    if (!(this.camera instanceof THREE.PerspectiveCamera)) return;

    const { min, max, center } = bounds;

    const width = max.x - min.x;
    const height = max.y - min.y;
    const depth = max.z - min.z;

    const fovRad = this.camera.fov * (Math.PI / 180);
    const aspect = window.innerWidth / window.innerHeight;
    const maxDimension = Math.max(width, height, depth);
    let distance: number;

    if (width / height > aspect) {
      distance = maxDimension / 2 / Math.tan(fovRad / 2);
    } else {
      distance = maxDimension / 2 / (Math.tan(fovRad / 2) * aspect);
    }

    distance = Math.max(distance * 1.2, 0.1);

    const direction = this.camera.getWorldDirection(new THREE.Vector3()).normalize();
    const newPosition = center.clone().add(direction.clone().negate().multiplyScalar(distance));

    this.camera.position.copy(newPosition);
    this.camera.lookAt(center);
    this.controls.target.copy(center);
    this.controls.update();
  }
}
