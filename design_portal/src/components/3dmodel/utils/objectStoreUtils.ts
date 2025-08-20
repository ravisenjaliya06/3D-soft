import {
  removeShape,
  selectShape,
  updateShape,
} from '@/components/3dmodel/store/customDesignSlice';
import * as THREE from 'three';
import { store } from '../store';

export const meshToReduxShape = (mesh: THREE.Mesh) => {
  let type = 'unknown';
  let dimensions: Record<string, number> = {};

  if (mesh.geometry instanceof THREE.BoxGeometry) {
    type = 'box';
    dimensions = {
      width: mesh.geometry.parameters.width,
      height: mesh.geometry.parameters.height,
      depth: mesh.geometry.parameters.depth,
    };
  } else if (mesh.geometry instanceof THREE.SphereGeometry) {
    type = 'sphere';
    dimensions = {
      radius: mesh.geometry.parameters.radius,
      segments: mesh.geometry.parameters.widthSegments,
    };
  } else if (mesh.geometry instanceof THREE.CylinderGeometry) {
    type = 'cylinder';
    dimensions = {
      radiusTop: mesh.geometry.parameters.radiusTop,
      radiusBottom: mesh.geometry.parameters.radiusBottom,
      height: mesh.geometry.parameters.height,
      segments: mesh.geometry.parameters.radialSegments,
    };
  } else if (mesh.geometry instanceof THREE.ConeGeometry) {
    type = 'cone';
    dimensions = {
      radius: mesh.geometry.parameters.radius,
      height: mesh.geometry.parameters.height,
      segments: mesh.geometry.parameters.radialSegments,
    };
  } else if (mesh.geometry instanceof THREE.TorusGeometry) {
    type = 'torus';
    dimensions = {
      radius: mesh.geometry.parameters.radius,
      tube: mesh.geometry.parameters.tube,
      segments: mesh.geometry.parameters.radialSegments,
    };
  } else if (mesh.geometry instanceof THREE.PlaneGeometry) {
    type = 'plane';
    dimensions = {
      width: mesh.geometry.parameters.width,
      height: mesh.geometry.parameters.height,
      segments: mesh.geometry.parameters.widthSegments,
    };
  } else if (mesh.geometry instanceof THREE.TetrahedronGeometry) {
    type = 'tetrahedron';
    dimensions = {
      radius: mesh.geometry.parameters.radius,
      segments: mesh.geometry.parameters.detail,
    };
  }

  // Extract material properties
  let color = 0x808080;
  if (mesh.material instanceof THREE.MeshStandardMaterial) {
    color = mesh.material.color.getHex();
  }

  return {
    id: mesh.uuid,
    type,
    properties: {
      dimensions,
      color,
    },
    position: {
      x: mesh.position.x,
      y: mesh.position.y,
      z: mesh.position.z,
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
};

export const updateObjectInRedux = (
  mesh: THREE.Mesh,
  previousPosition?: THREE.Vector3,
  previousRotation?: THREE.Euler,
  previousScale?: THREE.Vector3,
) => {
  const state = store.getState();
  const objectId = mesh.userData.objectId || mesh.uuid;
  const shape = state.customDesign.shapes.find((s) => s.id === objectId);

  if (!shape) {
    console.warn(`Shape not found in Redux store with ID: ${objectId}`);
    return;
  }

  const isImageObject =
    shape.type === 'image' ||
    (mesh.userData && mesh.userData.isImageMaterial) ||
    shape.properties.isImageMaterial;

  // Store current updates
  const updates = {
    position: {
      x: mesh.position.x,
      y: mesh.position.y,
      z: mesh.position.z,
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
    ...(isImageObject && {
      properties: {
        ...shape.properties,
        imageUrl: shape.properties.imageUrl,
        imageSize: shape.properties.imageSize,
        aspectRatio: shape.properties.aspectRatio,
        fileName: shape.properties.fileName,
        isImageMaterial: true,
      },
    }),
  };

  store.dispatch(
    updateShape({
      id: objectId,
      updates: updates,
    }),
  );

  if (previousPosition && previousRotation && previousScale) {
    const positionChanged =
      previousPosition.x !== mesh.position.x ||
      previousPosition.y !== mesh.position.y ||
      previousPosition.z !== mesh.position.z;

    const rotationChanged =
      previousRotation.x !== mesh.rotation.x ||
      previousRotation.y !== mesh.rotation.y ||
      previousRotation.z !== mesh.rotation.z;

    const scaleChanged =
      previousScale.x !== mesh.scale.x ||
      previousScale.y !== mesh.scale.y ||
      previousScale.z !== mesh.scale.z;

    if (positionChanged || rotationChanged || scaleChanged) {
      const propertyChanges = [];

      if (positionChanged) {
        propertyChanges.push({
          property: 'position',
          oldValue: {
            x: previousPosition.x,
            y: previousPosition.y,
            z: previousPosition.z,
          },
          newValue: updates.position,
        });
      }

      if (rotationChanged) {
        propertyChanges.push({
          property: 'rotation',
          oldValue: {
            x: previousRotation.x,
            y: previousRotation.y,
            z: previousRotation.z,
          },
          newValue: updates.rotation,
        });
      }

      if (scaleChanged) {
        propertyChanges.push({
          property: 'scale',
          oldValue: {
            x: previousScale.x,
            y: previousScale.y,
            z: previousScale.z,
          },
          newValue: updates.scale,
        });
      }

      store.dispatch({
        type: 'customDesignHistory/addToHistory',
        payload: {
          id: shape.id,
          type: 'PROPERTY_CHANGE',
          data: {
            shape,
            mesh,
            propertyChanges,
          },
        },
      });
    }
  }
};

export const selectObjectInRedux = (mesh: THREE.Mesh | null) => {
  if (mesh) {
    const objectId = mesh.userData.objectId || mesh.uuid;
    store.dispatch(selectShape(objectId));
  } else {
    store.dispatch(selectShape(''));
  }
};

export const removeObjectFromRedux = (mesh: THREE.Mesh) => {
  const state = store.getState();
  const objectId = mesh.userData.objectId || mesh.uuid;
  const shape = state.customDesign.shapes.find((s) => s.id === objectId);

  if (!shape) {
    return;
  }
  store.dispatch({
    type: 'customDesignHistory/addToHistory',
    payload: {
      id: shape.id,
      type: 'REMOVE',
      data: { shape, mesh },
    },
  });
  store.dispatch(removeShape(objectId));
};
