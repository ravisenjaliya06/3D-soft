import { store } from '@/components/3dmodel/store';
import { addShape } from '@/components/3dmodel/store/customDesignSlice';
import commonService from '@/services/CommonService';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { createCustomWireframe, getDesignId } from './objectCreator';

export enum PolygonCreationState {
  INACTIVE = 0,
  PLACING_CENTER = 1,
  ADJUSTING_RADIUS = 2,
}

export function createPolygonCreator(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
  renderer: THREE.WebGLRenderer,
) {
  // State variables
  let state: PolygonCreationState = PolygonCreationState.INACTIVE;
  let centerPoint: THREE.Vector3 | null = null;
  let previewPolygon: THREE.Mesh | null = null;
  let sides = 5; // Default pentagon
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // XZ plane

  // Event handlers
  const handleMouseMove = (event: MouseEvent) => {
    if (state === PolygonCreationState.INACTIVE) return;

    // Calculate mouse position in normalized device coordinates
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update raycaster
    raycaster.setFromCamera(mouse, camera);

    // Find intersection with plane
    const intersectionPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, intersectionPoint)) {
      if (state === PolygonCreationState.ADJUSTING_RADIUS && centerPoint) {
        // Calculate radius based on distance from center
        const radius = centerPoint.distanceTo(intersectionPoint);
        updatePreviewPolygon(radius);
      }
    }
  };

  const handleClick = (event: MouseEvent) => {
    if (state === PolygonCreationState.INACTIVE || event.button !== 0) return;

    // Calculate mouse position
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update raycaster
    raycaster.setFromCamera(mouse, camera);

    // Find intersection with plane
    const intersectionPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, intersectionPoint)) {
      if (state === PolygonCreationState.PLACING_CENTER) {
        centerPoint = intersectionPoint.clone();
        createPreviewPolygon(0.1); // Start with small radius
        state = PolygonCreationState.ADJUSTING_RADIUS;
      } else if (
        state === PolygonCreationState.ADJUSTING_RADIUS &&
        centerPoint
      ) {
        const radius = centerPoint.distanceTo(intersectionPoint);
        finalizePolygon(radius);
        state = PolygonCreationState.INACTIVE;
        deactivate();
      }
    }
  };

  const handleRightClick = (event: MouseEvent) => {
    if (state === PolygonCreationState.INACTIVE) return;
    event.preventDefault();

    // Cancel polygon creation
    cancelPolygon();
    state = PolygonCreationState.INACTIVE;
    deactivate();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (state === PolygonCreationState.INACTIVE) return;

    if (event.key === 'Escape') {
      cancelPolygon();
      state = PolygonCreationState.INACTIVE;
      deactivate();
    } else if (event.key === 'ArrowUp') {
      // Increase number of sides
      sides = Math.min(sides + 1, 12);
      if (centerPoint && state === PolygonCreationState.ADJUSTING_RADIUS) {
        // Update preview with new sides count
        const intersectionPoint = new THREE.Vector3();
        raycaster.setFromCamera(mouse, camera);
        if (raycaster.ray.intersectPlane(plane, intersectionPoint)) {
          const radius = centerPoint.distanceTo(intersectionPoint);
          updatePreviewPolygon(radius);
        }
      }
    } else if (event.key === 'ArrowDown') {
      // Decrease number of sides (minimum 3)
      sides = Math.max(sides - 1, 3);
      if (centerPoint && state === PolygonCreationState.ADJUSTING_RADIUS) {
        // Update preview with new sides count
        const intersectionPoint = new THREE.Vector3();
        raycaster.setFromCamera(mouse, camera);
        if (raycaster.ray.intersectPlane(plane, intersectionPoint)) {
          const radius = centerPoint.distanceTo(intersectionPoint);
          updatePreviewPolygon(radius);
        }
      }
    }
  };

  // Helper functions
  const createPreviewPolygon = (radius: number) => {
    if (previewPolygon) {
      scene.remove(previewPolygon);
      if (previewPolygon.geometry) previewPolygon.geometry.dispose();
      if (previewPolygon.material instanceof THREE.Material) {
        previewPolygon.material.dispose();
      }
    }

    // Create polygon shape
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

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshStandardMaterial({
      color: 0x2ecc71,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });

    previewPolygon = new THREE.Mesh(geometry, material);
    previewPolygon.position.copy(centerPoint!);
    previewPolygon.position.y = 0.01; // Slight Y offset
    previewPolygon.rotation.x = -Math.PI / 2; // Align with XZ plane

    scene.add(previewPolygon);
  };

  const updatePreviewPolygon = (radius: number) => {
    if (!centerPoint) return;
    createPreviewPolygon(radius);
  };

  const finalizePolygon = (radius: number) => {
    if (!centerPoint) {
      cancelPolygon();
      return;
    }

    // Create polygon shape
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

    // Create geometry and mesh
    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshStandardMaterial({
      color: 0xd3d3d3,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);

    // Position and rotate
    mesh.position.copy(centerPoint);
    mesh.position.y = 0.01; // Slight Y offset
    mesh.rotation.x = -Math.PI / 2; // Align with XZ plane

    // Add wireframe lines
    const wireframeLines = createCustomWireframe(geometry, 'polygon');
    if (wireframeLines) {
      mesh.add(wireframeLines);
    }

    // Store polygon data in userData
    mesh.userData.isPolygon = true;
    mesh.userData.radius = radius;
    mesh.userData.sides = sides;
    mesh.userData.center = centerPoint.clone();

    // Add to scene
    scene.add(mesh);

    // Assign unique ID
    const objectId = uuidv4();
    mesh.userData.objectId = objectId;
    mesh.name = `polygon-${sides}-${objectId}`;

    // Save to database
    savePolygonToDatabase(
      objectId,
      radius,
      sides,
      centerPoint,
      mesh.position,
      mesh.rotation,
      mesh.scale,
    );

    // Create polygon data for Redux store
    const polygonData = {
      id: objectId,
      type: 'polygon',
      position: {
        x: mesh.position.x,
        y: mesh.position.y,
        z: mesh.position.z,
      },
      properties: {
        dimensions: {
          radius: radius,
          sides: sides,
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
    store.dispatch(addShape(polygonData));

    // Clean up
    cancelPolygon();
  };

  async function savePolygonToDatabase(
    objectId: string,
    radius: number,
    sides: number,
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
      radius: radius,
      sides: sides,
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
          name: 'polygon',
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
    if (response.status === 200) {
      console.log('Polygon saved to database:', objectId);
    } else {
      console.error('Failed to save polygon to database');
    }
  }

  const cancelPolygon = () => {
    cleanup();
    centerPoint = null;
  };

  const cleanup = () => {
    if (previewPolygon) {
      scene.remove(previewPolygon);
      if (previewPolygon.geometry) previewPolygon.geometry.dispose();
      if (previewPolygon.material instanceof THREE.Material) {
        previewPolygon.material.dispose();
      }
      previewPolygon = null;
    }
  };

  // Public API
  const activate = () => {
    state = PolygonCreationState.PLACING_CENTER;
    document.body.style.cursor = 'crosshair';

    // Add event listeners
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('click', handleClick);
    renderer.domElement.addEventListener('contextmenu', handleRightClick);
    document.addEventListener('keydown', handleKeyDown);
  };

  const deactivate = () => {
    state = PolygonCreationState.INACTIVE;
    document.body.style.cursor = 'default';

    // Remove event listeners
    renderer.domElement.removeEventListener('mousemove', handleMouseMove);
    renderer.domElement.removeEventListener('click', handleClick);
    renderer.domElement.removeEventListener('contextmenu', handleRightClick);
    document.removeEventListener('keydown', handleKeyDown);

    // Clean up
    cleanup();
    centerPoint = null;
  };

  return {
    activate,
    deactivate,
    getState: () => state,
    setSides: (newSides: number) => {
      sides = Math.max(3, Math.min(newSides, 12));
      return sides;
    },
    getSides: () => sides,
  };
}
