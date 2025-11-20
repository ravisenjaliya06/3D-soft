import * as THREE from 'three';
import { findXY } from './utils';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

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
  private controls: any;

  private isZoomMode = false;
  private startPoint: THREE.Vector2 | null = null;
  private overlayCanvas: HTMLCanvasElement | null = null;
  private overlayContext: CanvasRenderingContext2D | null = null;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
    renderer: THREE.WebGLRenderer,
    mount: HTMLDivElement,
    controls: any
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.mount = mount;
    this.controls = controls;
  }

  public toggleZoomMode(enable: boolean): void {
    this.isZoomMode = enable;

    if (enable) {
      document.body.style.cursor = 'zoom-in';
      this.controls.enabled = false;

      this.renderer.domElement.addEventListener('mousedown', this.onMouseDown);
    } else {
      document.body.style.cursor = 'default';
      this.controls.enabled = true;

      this.renderer.domElement.removeEventListener('mousedown', this.onMouseDown);

      // Remove overlay canvas
      if (this.overlayCanvas && this.overlayCanvas.parentNode) {
        this.overlayCanvas.parentNode.removeChild(this.overlayCanvas);
      }
      this.overlayCanvas = null;
      this.overlayContext = null;
    }
  }

  /** MOUSE DOWN */
  private onMouseDown = (event: MouseEvent) => {
    if (!this.isZoomMode) return;

    const { x, y } = findXY(this.renderer, event);
    this.startPoint = new THREE.Vector2(x, y);

    // Canvas overlay for rectangle
    this.overlayCanvas = document.createElement('canvas');
    this.overlayCanvas.style.position = 'absolute';
    this.overlayCanvas.style.top = '0';
    this.overlayCanvas.style.left = '0';
    this.overlayCanvas.style.pointerEvents = 'none';
    this.overlayCanvas.width = window.innerWidth;
    this.overlayCanvas.height = window.innerHeight;

    this.mount.appendChild(this.overlayCanvas);
    this.overlayContext = this.overlayCanvas.getContext('2d');

    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp, { once: true });
  };

  /** MOUSE MOVE — draw selection rectangle */
  private onMouseMove = (event: MouseEvent) => {
    if (!this.startPoint || !this.isZoomMode || !this.overlayCanvas || !this.overlayContext) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;

    const startX = ((this.startPoint.x + 1) / 2) * rect.width;
    const startY = ((-this.startPoint.y + 1) / 2) * rect.height;

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
  };

  /** MOUSE UP — zoom on selected objects */
  private onMouseUp = (event: MouseEvent) => {
    if (!this.startPoint) return;

    const { x, y } = findXY(this.renderer, event);
    const endPoint = new THREE.Vector2(x, y);

    if (this.overlayCanvas && this.overlayCanvas.parentNode) {
      this.overlayCanvas.parentNode.removeChild(this.overlayCanvas);
    }
    this.overlayCanvas = null;
    this.overlayContext = null;

    const bounds = this.getObjectsBoundingBox(this.startPoint, endPoint);

    if (!bounds) {
      this.startPoint = null;
      this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove);
      this.toggleZoomMode(false);
      return;
    }

    this.zoomCameraToBounds(bounds);

    this.startPoint = null;
    this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.toggleZoomMode(false);
  };

  /** 
   * When the mouse goes up, we get two points.
   * Using those points, we create the rectangle’s bounding box for the zoom.
  */
  private getObjectsBoundingBox(
    start: THREE.Vector2,
    end: THREE.Vector2
  ): { min: THREE.Vector3; max: THREE.Vector3; center: THREE.Vector3 } | null {
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

    let hit = false;
    const steps = 5;

    for (let i = 0; i <= steps; i++) {
      for (let j = 0; j <= steps; j++) {
        const x = xMin + (xMax - xMin) * (i / steps);
        const y = yMin + (yMax - yMin) * (j / steps);

        raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
        const intersects = raycaster.intersectObjects(selectable, true);

        if (intersects.length) {
          min.min(intersects[0].point);
          max.max(intersects[0].point);
          hit = true;
        }
      }
    }

    if (!hit) return null;

    const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
    return { min, max, center };
  }

  /** Move camera to fit bounding box */
  private zoomCameraToBounds(bounds: {
    min: THREE.Vector3;
    max: THREE.Vector3;
    center: THREE.Vector3;
  }): void {
    const { min, max, center } = bounds;

    if (!(this.camera instanceof THREE.PerspectiveCamera)) return;

    const width = max.x - min.x;
    const height = max.y - min.y;
    const depth = max.z - min.z;

    const fovRad = this.camera.fov * (Math.PI / 180);
    const aspect = window.innerWidth / window.innerHeight;

    const maxDim = Math.max(width, height, depth);
    let distance;

    if (width / height > aspect) {
      distance = maxDim / (2 * Math.tan(fovRad / 2));
    } else {
      distance = maxDim / (2 * Math.tan(fovRad / 2) * aspect);
    }

    distance = Math.max(distance * 1.2, 0.1);

    const dir = this.camera.getWorldDirection(new THREE.Vector3()).normalize();

    const newPos = center.clone().add(dir.clone().negate().multiplyScalar(distance));

    this.camera.position.copy(newPos);
    this.camera.lookAt(center);

    if (this.controls) {
      this.controls.target.copy(center);
      this.controls.update();
    }
  }
}
