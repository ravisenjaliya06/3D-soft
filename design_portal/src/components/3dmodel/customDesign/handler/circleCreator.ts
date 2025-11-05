import { store } from '@/components/3dmodel/store';
import { addShape } from '@/components/3dmodel/store/customDesignSlice';
import commonService from '@/services/CommonService';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { createCustomWireframe, getDesignId } from './objectCreator';

export enum CircleCreationState {
  INACTIVE = 0,
  PLACING_CENTER = 1,
  ADJUSTING_RADIUS = 2,
}

export function createCircleCreator(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera
) {
  // State variables
  let state: CircleCreationState = CircleCreationState.INACTIVE;
  let centerPosition: THREE.Vector3 | null = null;
  let previewCircle: THREE.Mesh | null = null;
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // XZ plane

  // Event handlers
  const handleMouseMove = (event: MouseEvent) => {
    if (state === CircleCreationState.INACTIVE) return;

    // Calculate mouse position in normalized device coordinates
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update raycaster
    raycaster.setFromCamera(mouse, camera);

    // Find intersection with plane
    const intersectionPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, intersectionPoint)) {
      if (state === CircleCreationState.ADJUSTING_RADIUS && centerPosition) {
        // Update preview circle radius
        const radius = centerPosition.distanceTo(intersectionPoint);
        updatePreviewCircle(radius);
      }
    }
  };

  const handleClick = (event: MouseEvent) => {
    if (state === CircleCreationState.INACTIVE || event.button !== 0) return;

    // Calculate mouse position
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update raycaster
    raycaster.setFromCamera(mouse, camera);

    // Find intersection with plane
    const intersectionPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, intersectionPoint)) {
      if (state === CircleCreationState.PLACING_CENTER) {
        centerPosition = intersectionPoint.clone();
        createPreviewCircle(0.1); // Start with small radius
        state = CircleCreationState.ADJUSTING_RADIUS;
      } else if (state === CircleCreationState.ADJUSTING_RADIUS && centerPosition) {
        const radius = centerPosition.distanceTo(intersectionPoint);
        finalizeCircle(radius);
        state = CircleCreationState.INACTIVE;
        deactivate();
      }
    }
  };

  const handleRightClick = (event: MouseEvent) => {
    if (state === CircleCreationState.INACTIVE) return;
    event.preventDefault();

    // Cancel circle creation
    cancelCircle();
    state = CircleCreationState.INACTIVE;
    deactivate();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (state === CircleCreationState.INACTIVE) return;

    if (event.key === 'Escape') {
      cancelCircle();
      state = CircleCreationState.INACTIVE;
      deactivate();
    }
  };

  // Helper functions
  const createPreviewCircle = (radius: number) => {
    if (previewCircle) {
      scene.remove(previewCircle);
      if (previewCircle.geometry) previewCircle.geometry.dispose();
      if (previewCircle.material instanceof THREE.Material) {
        previewCircle.material.dispose();
      }
    }

    // Create circle shape
    const shape = new THREE.Shape();
    const segments = 32;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
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

    previewCircle = new THREE.Mesh(geometry, material);
    previewCircle.position.copy(centerPosition!);
    previewCircle.position.y = 0.01; // Slight Y offset
    previewCircle.rotation.x = -Math.PI / 2; // Align with XZ plane

    scene.add(previewCircle);
  };

  const updatePreviewCircle = (radius: number) => {
    if (!centerPosition) return;
    createPreviewCircle(radius);
  };

  const finalizeCircle = (radius: number) => {
    if (!centerPosition) {
      cancelCircle();
      return;
    }

    // Create circle shape
    const shape = new THREE.Shape();
    const segments = 32;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
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
    mesh.position.copy(centerPosition);
    mesh.position.y = 0.01; // Slight Y offset
    mesh.rotation.x = -Math.PI / 2; // Align with XZ plane

    // Add wireframe lines
    const wireframeLines = createCustomWireframe(geometry, 'circle');
    if (wireframeLines) {
      mesh.add(wireframeLines);
    }

    // Store circle data in userData
    mesh.userData.isCircle = true;
    mesh.userData.radius = radius;
    mesh.userData.center = centerPosition.clone();

    // Add to scene
    scene.add(mesh);

    // Assign unique ID
    const objectId = uuidv4();
    mesh.userData.objectId = objectId;
    mesh.name = `circle-${objectId}`;

    // Save to database
    saveCircleToDatabase(
      objectId,
      radius,
      centerPosition,
      mesh.position,
      mesh.rotation,
      mesh.scale
    );

    // Create circle data for Redux store
    const circleData = {
      id: objectId,
      type: 'circle',
      position: {
        x: mesh.position.x,
        y: mesh.position.y,
        z: mesh.position.z,
      },
      properties: {
        dimensions: {
          radius: radius,
          segments: segments,
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
    store.dispatch(addShape(circleData));

    // Clean up
    cancelCircle();
  };

  async function saveCircleToDatabase(
    objectId: string,
    radius: number,
    center: THREE.Vector3,
    position: THREE.Vector3,
    rotation: THREE.Euler,
    scale: THREE.Vector3
  ) {
    const designId = getDesignId();
    if (!designId) {
      console.error('No design ID found in URL');
      return;
    }

    const mainDataObject = {
      radius: radius,
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
          name: 'circle',
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
      payload
    );
    if (response.status === 200) {
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        console.log('Circle saved to database:', objectId);
      }
    } else {
      console.error('Failed to save circle to database');
    }
  }

  const cancelCircle = () => {
    cleanup();
    centerPosition = null;
  };

  const cleanup = () => {
    if (previewCircle) {
      scene.remove(previewCircle);
      if (previewCircle.geometry) previewCircle.geometry.dispose();
      if (previewCircle.material instanceof THREE.Material) {
        previewCircle.material.dispose();
      }
      previewCircle = null;
    }
  };

  // Public API
  const activate = () => {
    state = CircleCreationState.PLACING_CENTER;
    document.body.style.cursor = 'crosshair';

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);
    document.addEventListener('contextmenu', handleRightClick);
    document.addEventListener('keydown', handleKeyDown);
  };

  const deactivate = () => {
    state = CircleCreationState.INACTIVE;
    document.body.style.cursor = 'default';

    // Remove event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('click', handleClick);
    document.removeEventListener('contextmenu', handleRightClick);
    document.removeEventListener('keydown', handleKeyDown);

    // Clean up
    cleanup();
    centerPosition = null;
  };

  return {
    activate,
    deactivate,
    getState: () => state,
  };
}
