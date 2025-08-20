import { store } from '@/components/3dmodel/store';
import { addShape } from '@/components/3dmodel/store/customDesignSlice';
import commonService from '@/services/CommonService';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { createCustomWireframe, getDesignId } from './objectCreator';

export enum RectangleCreationState {
  INACTIVE = 0,
  PLACING_FIRST_CORNER = 1,
  PLACING_SECOND_CORNER = 2,
}

export function createRectangleCreator(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
  renderer: THREE.WebGLRenderer,
) {
  // State variables
  let state: RectangleCreationState = RectangleCreationState.INACTIVE;
  let firstCorner: THREE.Vector3 | null = null;
  let previewRectangle: THREE.Mesh | null = null;
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // XZ plane

  // Event handlers
  const handleMouseMove = (event: MouseEvent) => {
    if (state === RectangleCreationState.INACTIVE) return;

    // Calculate mouse position in normalized device coordinates
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update raycaster
    raycaster.setFromCamera(mouse, camera);

    // Find intersection with plane
    const intersectionPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, intersectionPoint)) {
      if (
        state === RectangleCreationState.PLACING_SECOND_CORNER &&
        firstCorner
      ) {
        // Update preview rectangle
        updatePreviewRectangle(firstCorner, intersectionPoint);
      }
    }
  };

  const handleClick = (event: MouseEvent) => {
    if (state === RectangleCreationState.INACTIVE || event.button !== 0) return;

    // Calculate mouse position
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update raycaster
    raycaster.setFromCamera(mouse, camera);

    // Find intersection with plane
    const intersectionPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, intersectionPoint)) {
      if (state === RectangleCreationState.PLACING_FIRST_CORNER) {
        firstCorner = intersectionPoint.clone();
        createPreviewRectangle(firstCorner, firstCorner.clone());
        state = RectangleCreationState.PLACING_SECOND_CORNER;
      } else if (
        state === RectangleCreationState.PLACING_SECOND_CORNER &&
        firstCorner
      ) {
        finalizeRectangle(firstCorner, intersectionPoint);
        state = RectangleCreationState.INACTIVE;
        deactivate();
      }
    }
  };

  const handleRightClick = (event: MouseEvent) => {
    if (state === RectangleCreationState.INACTIVE) return;
    event.preventDefault();

    // Cancel rectangle creation
    cancelRectangle();
    state = RectangleCreationState.INACTIVE;
    deactivate();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (state === RectangleCreationState.INACTIVE) return;

    if (event.key === 'Escape') {
      cancelRectangle();
      state = RectangleCreationState.INACTIVE;
      deactivate();
    }
  };

  // Helper functions
  const createPreviewRectangle = (
    corner1: THREE.Vector3,
    corner2: THREE.Vector3,
  ) => {
    if (previewRectangle) {
      scene.remove(previewRectangle);
      if (previewRectangle.geometry) previewRectangle.geometry.dispose();
      if (previewRectangle.material instanceof THREE.Material) {
        previewRectangle.material.dispose();
      }
    }

    // Calculate width and height
    const width = Math.abs(corner2.x - corner1.x);
    const height = Math.abs(corner2.z - corner1.z);

    if (width < 0.01 && height < 0.01) return; // Don't create tiny rectangles

    // Create rectangle shape
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, -height / 2);
    shape.lineTo(width / 2, -height / 2);
    shape.lineTo(width / 2, height / 2);
    shape.lineTo(-width / 2, height / 2);
    shape.closePath();

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshStandardMaterial({
      color: 0x2ecc71,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });

    previewRectangle = new THREE.Mesh(geometry, material);

    // Position at the center of the two corners
    previewRectangle.position.set(
      (corner1.x + corner2.x) / 2,
      0.01, // Slight Y offset
      (corner1.z + corner2.z) / 2,
    );
    previewRectangle.rotation.x = -Math.PI / 2; // Align with XZ plane

    scene.add(previewRectangle);
  };

  const updatePreviewRectangle = (
    corner1: THREE.Vector3,
    corner2: THREE.Vector3,
  ) => {
    createPreviewRectangle(corner1, corner2);
  };

  const finalizeRectangle = (
    corner1: THREE.Vector3,
    corner2: THREE.Vector3,
  ) => {
    if (!corner1 || !corner2) {
      cancelRectangle();
      return;
    }

    // Calculate width and height
    const width = Math.abs(corner2.x - corner1.x);
    const height = Math.abs(corner2.z - corner1.z);

    if (width < 0.01 || height < 0.01) {
      console.warn('Rectangle too small, canceling creation');
      cancelRectangle();
      return;
    }

    // Calculate center position
    const centerX = (corner1.x + corner2.x) / 2;
    const centerZ = (corner1.z + corner2.z) / 2;
    const centerPosition = new THREE.Vector3(centerX, 0.01, centerZ);

    // Create rectangle shape
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, -height / 2);
    shape.lineTo(width / 2, -height / 2);
    shape.lineTo(width / 2, height / 2);
    shape.lineTo(-width / 2, height / 2);
    shape.closePath();

    // Create geometry and mesh
    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshStandardMaterial({
      color: 0xd3d3d3,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.isRectangle = true;

    // Position and rotate
    mesh.position.copy(centerPosition);
    mesh.rotation.x = -Math.PI / 2; // Align with XZ plane

    // Add wireframe lines
    const wireframeLines = createCustomWireframe(geometry, 'rectangle');
    if (wireframeLines) {
      mesh.add(wireframeLines);
    }

    // Store rectangle data in userData
    mesh.userData.isRectangle = true;
    mesh.userData.width = width;
    mesh.userData.height = height;
    mesh.userData.corners = {
      corner1: corner1.clone(),
      corner2: corner2.clone(),
    };

    // Add to scene
    scene.add(mesh);

    // Assign unique ID
    const objectId = uuidv4();
    mesh.userData.objectId = objectId;
    mesh.name = `rectangle-${objectId}`;

    // Save to database
    saveRectangleToDatabase(
      objectId,
      width,
      height,
      centerPosition,
      mesh.position,
      mesh.rotation,
      mesh.scale,
    );

    // Create rectangle data for Redux store
    const rectangleData = {
      id: objectId,
      type: 'rectangle',
      position: {
        x: mesh.position.x,
        y: mesh.position.y,
        z: mesh.position.z,
      },
      properties: {
        dimensions: {
          width: width,
          height: height,
        },
      },
      rotation: {
        x: mesh.rotation.x,
        y: mesh.rotation.y,
        z: mesh.rotation.z,
      },
      scale: {
        x: mesh.scale.x,
        y: mesh.scale.y,
        z: mesh.scale.z,
      },
    };

    // Dispatch to Redux store
    store.dispatch(addShape(rectangleData));

    // Clean up
    cancelRectangle();
  };

  async function saveRectangleToDatabase(
    objectId: string,
    width: number,
    height: number,
    center: THREE.Vector3,
    position: THREE.Vector3,
    rotation: THREE.Euler,
    scale: THREE.Vector3,
  ) {
    const designId = getDesignId();
    if (!designId) {
      console.error('No design ID found in URL');
      return;
    }

    const mainDataObject = {
      width: width,
      height: height,
      center: {
        x: center.x,
        y: center.y,
        z: center.z,
      },
      position: {
        x: position.x,
        y: position.y,
        z: position.z,
      },
      rotateX: rotation.x,
      rotateY: rotation.y,
      rotateZ: rotation.z,
      scale: {
        x: scale.x,
        y: scale.y,
        z: scale.z,
      },
    };

    const payload = {
      data: {
        catalog: {
          id: objectId,
          name: 'rectangle',
          data: mainDataObject,
          is_custom: true,
          is_default: true,
        },
      },
    };

    const response: { status: number } = await commonService.putObjectData(
      'design',
      designId,
      'object',
      payload,
    );
    if (response.status !== 200) {
      console.error('Failed to save rectangle to database');
    }
  }

  const cancelRectangle = () => {
    cleanup();
    firstCorner = null;
  };

  const cleanup = () => {
    if (previewRectangle) {
      scene.remove(previewRectangle);
      if (previewRectangle.geometry) previewRectangle.geometry.dispose();
      if (previewRectangle.material instanceof THREE.Material) {
        previewRectangle.material.dispose();
      }
      previewRectangle = null;
    }
  };

  // Public API
  const activate = () => {
    state = RectangleCreationState.PLACING_FIRST_CORNER;
    document.body.style.cursor = 'crosshair';

    // Add event listeners
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('click', handleClick);
    renderer.domElement.addEventListener('contextmenu', handleRightClick);
    document.addEventListener('keydown', handleKeyDown);
  };

  const deactivate = () => {
    state = RectangleCreationState.INACTIVE;
    document.body.style.cursor = 'default';

    // Remove event listeners
    renderer.domElement.removeEventListener('mousemove', handleMouseMove);
    renderer.domElement.removeEventListener('click', handleClick);
    renderer.domElement.removeEventListener('contextmenu', handleRightClick);
    document.removeEventListener('keydown', handleKeyDown);

    // Clean up
    cleanup();
    firstCorner = null;
  };

  return {
    activate,
    deactivate,
    getState: () => state,
  };
}
