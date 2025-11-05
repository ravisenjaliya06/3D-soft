import { store } from '@/components/3dmodel/store';
import { updateShape } from '@/components/3dmodel/store/customDesignSlice';
import { updateObjectInDatabase } from '@/components/3dmodel/utils/objectUtils';
import * as THREE from 'three';
import { HandlerOptions } from '../interface';

export const createScaleHandler = (options: HandlerOptions) => {
  const { scene, camera, renderer, controls } = options;

  // State variables
  let active = false;
  let selectedObject: THREE.Object3D | null = null;
  let boundingBox: THREE.LineSegments | null = null;
  let controlPoints: THREE.Mesh[] = [];
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let isDragging = false;
  let selectedPoint: THREE.Mesh | null = null;
  const initialScale = new THREE.Vector3();
  const initialMousePosition = new THREE.Vector2();
  const initialObjectPosition = new THREE.Vector3();
  const dragDirection = new THREE.Vector3();
  const originalBoundingBoxSize = new THREE.Vector3();
  const initialQuaternion = new THREE.Quaternion(); // Store initial rotation

  // Constants
  const GRID_SIZE = 3; // 3x3 grid per face

  // Generate vertices for a bounding box with a 3x3 grid on each face
  const generateBoundingBoxVertices = (size: THREE.Vector3) => {
    const halfWidth = size.x / 2;
    const halfHeight = size.y / 2;
    const halfDepth = size.z / 2;
    const stepX = size.x / (GRID_SIZE - 1);
    const stepY = size.y / (GRID_SIZE - 1);
    const stepZ = size.z / (GRID_SIZE - 1);

    const vertices: {
      position: THREE.Vector3;
      name: string;
      direction: THREE.Vector3;
    }[] = [];

    // Generate all vertices
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let z = 0; z < GRID_SIZE; z++) {
          if (
            x === 0 ||
            x === GRID_SIZE - 1 ||
            y === 0 ||
            y === GRID_SIZE - 1 ||
            z === 0 ||
            z === GRID_SIZE - 1
          ) {
            const posX = -halfWidth + x * stepX;
            const posY = -halfHeight + y * stepY;
            const posZ = -halfDepth + z * stepZ;

            // Calculate scaling direction in local space
            const direction = new THREE.Vector3(
              x === 0 ? -1 : x === GRID_SIZE - 1 ? 1 : 0,
              y === 0 ? -1 : y === GRID_SIZE - 1 ? 1 : 0,
              z === 0 ? -1 : z === GRID_SIZE - 1 ? 1 : 0
            );

            vertices.push({
              position: new THREE.Vector3(posX, posY, posZ),
              name: `V${vertices.length}`,
              direction,
            });
          }
        }
      }
    }

    return vertices;
  };

  // Create bounding box lines
  const createBoundingBox = (object: THREE.Object3D) => {
    const bbox = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    originalBoundingBoxSize.copy(size);

    const vertices = generateBoundingBoxVertices(size);

    const positions: number[] = [];
    for (let i = 0; i < vertices.length; i++) {
      for (let j = i + 1; j < vertices.length; j++) {
        const v1 = vertices[i].position;
        const v2 = vertices[j].position;
        const dx = Math.abs(v1.x - v2.x);
        const dy = Math.abs(v1.y - v2.y);
        const dz = Math.abs(v1.z - v2.z);

        if (
          (dx < 0.001 && dy < 0.001 && dz <= size.z) ||
          (dx < 0.001 && dz < 0.001 && dy <= size.y) ||
          (dy < 0.001 && dz < 0.001 && dx <= size.x)
        ) {
          positions.push(v1.x, v1.y, v1.z);
          positions.push(v2.x, v2.y, v2.z);
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00faff,
      depthTest: false,
    });
    const box = new THREE.LineSegments(geometry, lineMaterial);

    const center = new THREE.Vector3();
    bbox.getCenter(center);
    box.position.copy(center);

    controlPoints = [];
    vertices.forEach((vertex) => {
      const markerGeometry = new THREE.SphereGeometry(0.03, 16, 16);
      const markerMaterial = new THREE.MeshBasicMaterial({
        color: 0x00faff,
        depthTest: false,
      });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.copy(vertex.position);
      marker.userData.direction = vertex.direction;
      marker.userData.name = vertex.name;
      box.add(marker);
      controlPoints.push(marker);
    });

    box.userData.originalSize = size.clone();
    box.userData.originalCenter = center.clone();
    box.renderOrder = 999;

    return box;
  };

  // Handle mouse down event
  const onMouseDown = (event: MouseEvent) => {
    if (!active || !selectedObject) return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(controlPoints);

    if (intersects.length > 0) {
      controls.enabled = false;
      isDragging = true;
      selectedPoint = intersects[0].object as THREE.Mesh;

      initialScale.copy(selectedObject.scale);
      initialMousePosition.set(mouse.x, mouse.y);
      initialObjectPosition.copy(selectedObject.position);

      // Transform drag direction to local space
      dragDirection.copy(selectedPoint.userData.direction);
      dragDirection.applyQuaternion(initialQuaternion.clone().invert());

      document.body.style.cursor = 'move';
      event.stopPropagation();
    }
  };

  // Handle mouse move event
  const onMouseMove = (event: MouseEvent) => {
    if (!active || !isDragging || !selectedPoint || !selectedObject || !boundingBox) return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const deltaX = mouse.x - initialMousePosition.x;
    const deltaY = mouse.y - initialMousePosition.y;
    const movementFactor = 2;

    const newScale = initialScale.clone();
    const direction = selectedPoint.userData.direction;

    // Calculate the total drag distance
    const dragDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const dragSign = Math.sign(deltaX + deltaY); // Determine if we're dragging inward or outward

    // Apply scaling based on the control point's direction
    if (direction.x !== 0) {
      newScale.x = Math.max(
        0.1,
        initialScale.x * (1 + dragDistance * movementFactor * dragSign * Math.abs(direction.x))
      );
    }
    if (direction.y !== 0) {
      newScale.y = Math.max(
        0.1,
        initialScale.y * (1 + dragDistance * movementFactor * dragSign * Math.abs(direction.y))
      );
    }
    if (direction.z !== 0) {
      newScale.z = Math.max(
        0.1,
        initialScale.z * (1 + dragDistance * movementFactor * dragSign * Math.abs(direction.z))
      );
    }

    selectedObject.scale.copy(newScale);

    const scaleRatio = new THREE.Vector3(
      newScale.x / initialScale.x,
      newScale.y / initialScale.y,
      newScale.z / initialScale.z
    );

    boundingBox.scale.copy(scaleRatio);

    const positions = [];
    for (let i = 0; i < controlPoints.length; i++) {
      for (let j = i + 1; j < controlPoints.length; j++) {
        const v1 = controlPoints[i].position;
        const v2 = controlPoints[j].position;
        const originalSize = boundingBox.userData.originalSize;
        const dx = Math.abs(v1.x / scaleRatio.x - v2.x / scaleRatio.x);
        const dy = Math.abs(v1.y / scaleRatio.y - v2.y / scaleRatio.y);
        const dz = Math.abs(v1.z / scaleRatio.z - v2.z / scaleRatio.z);

        if (
          (dx < 0.001 && dy < 0.001 && dz <= originalSize.z) ||
          (dx < 0.001 && dz < 0.001 && dy <= originalSize.y) ||
          (dy < 0.001 && dz < 0.001 && dx <= originalSize.x)
        ) {
          positions.push(v1.x, v1.y, v1.z);
          positions.push(v2.x, v2.y, v2.z);
        }
      }
    }

    if (boundingBox.geometry instanceof THREE.BufferGeometry) {
      const positionAttribute = boundingBox.geometry.getAttribute('position');
      for (let i = 0; i < positions.length && i < positionAttribute.count * 3; i++) {
        positionAttribute.array[i] = positions[i];
      }
      positionAttribute.needsUpdate = true;
    }
  };

  // Handle mouse up event
  const onMouseUp = () => {
    if (!active || !isDragging || !selectedObject) return;

    isDragging = false;
    selectedPoint = null;
    controls.enabled = true;
    document.body.style.cursor = 'crosshair';

    const objectId = selectedObject.userData.objectId;
    if (objectId) {
      const shapes = store.getState().customDesign.shapes;
      const shapeData = shapes.find((shape) => shape.id === objectId);

      if (shapeData) {
        store.dispatch(
          updateShape({
            id: objectId,
            updates: {
              scale: {
                x: selectedObject.scale.x,
                y: selectedObject.scale.y,
                z: selectedObject.scale.z,
              },
            },
          })
        );

        updateObjectInDatabase(shapeData, {
          scale: {
            x: selectedObject.scale.x,
            y: selectedObject.scale.y,
            z: selectedObject.scale.z,
          },
        });
      }
    }
  };

  // Activate the scale handler
  const activate = () => {
    if (active) return;

    active = true;
    document.body.style.cursor = 'crosshair';

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('click', selectObject);
  };

  // Deactivate the scale handler
  const deactivate = () => {
    if (!active) return;

    active = false;
    document.body.style.cursor = 'default';

    renderer.domElement.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    renderer.domElement.removeEventListener('click', selectObject);

    if (boundingBox) {
      scene.remove(boundingBox);
      boundingBox.geometry.dispose();
      if (boundingBox.material instanceof THREE.Material) {
        boundingBox.material.dispose();
      }
      boundingBox = null;
    }

    controlPoints = [];
    selectedObject = null;
  };

  // Select an object to scale
  const selectObject = (event: MouseEvent) => {
    if (!active || isDragging) return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const selectableObjects: THREE.Object3D[] = [];
    scene.traverse((object) => {
      if (
        object instanceof THREE.Mesh &&
        !object.name.includes('grid') &&
        !object.name.includes('helper') &&
        !object.name.includes('daysky') &&
        !object.name.includes('nightsky') &&
        !object.name.includes('floor') &&
        !object.name.includes('ground') &&
        !object.name.includes('plane') &&
        !object.name.includes('Grid') &&
        object.userData.objectId
      ) {
        selectableObjects.push(object);
      }
    });

    const intersects = raycaster.intersectObjects(selectableObjects, false);

    if (boundingBox) {
      scene.remove(boundingBox);
      boundingBox.geometry.dispose();
      if (boundingBox.material instanceof THREE.Material) {
        boundingBox.material.dispose();
      }
      boundingBox = null;
    }

    controlPoints = [];

    if (intersects.length > 0) {
      selectedObject = intersects[0].object;

      // Store initial rotation (quaternion)
      initialQuaternion.copy(selectedObject.quaternion);

      boundingBox = createBoundingBox(selectedObject);
      scene.add(boundingBox);

      const material = (selectedObject as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (material.emissive) {
        material.emissive.setHex(0x666666);
      }

      const objectId = selectedObject.userData.objectId;
      if (objectId) {
        store.dispatch({ type: 'customDesign/selectShape', payload: objectId });
      }
    } else {
      selectedObject = null;
      initialQuaternion.set(0, 0, 0, 1); // Reset quaternion
    }
  };

  return {
    activate,
    deactivate,
    isActive: () => active,
  };
};
