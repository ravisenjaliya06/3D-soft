import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as THREE from 'three';
import { Shape } from '../customDesign/interface';
import { AppThunk, store } from '../store';
import {
  ImageDataMap,
  ImageDimensions,
  ImageMetadata,
  Position,
  PropertyChange,
} from './interface';

export interface ImageShapesMap {
  [id: string]: Shape;
}

export interface CustomHistoryAction {
  id: string;
  type: 'ADD' | 'REMOVE' | 'UPDATE' | 'PROPERTY_CHANGE' | 'CLEAR';
  data: {
    shape?: Shape;
    previousState?: Shape;
    mesh?: THREE.Mesh;
    shapes?: Shape[];
    meshes?: THREE.Mesh[];
    propertyChanges?: PropertyChange[];
    childShapes?: Shape[];
    // Image-specific data for better restoration
    imageData?: ImageMetadata | Record<string, ImageMetadata>;
    imageShapes?: Shape[];
    isImage?: boolean;
  };
}
export interface CustomHistoryState {
  past: CustomHistoryAction[];
  future: CustomHistoryAction[];
}

const initialState: CustomHistoryState = {
  past: [],
  future: [],
};

const customHistorySlice = createSlice({
  name: 'customHistorySlice',
  initialState,
  reducers: {
    undo: (state) => {
      if (state.past.length > 0) {
        const lastAction = state.past[state.past.length - 1];
        state.past = state.past.slice(0, -1);
        state.future = [lastAction, ...state.future];
      }
    },
    redo: (state) => {
      if (state.future.length > 0) {
        const nextAction = state.future[0];
        state.future = state.future.slice(1);
        state.past = [...state.past, nextAction];
      }
    },
    addToHistory: (state, action: PayloadAction<CustomHistoryAction>) => {
      state.past = [...state.past, action.payload];
      state.future = [];
    },
    clearHistory: (state) => {
      state.past = [];
      state.future = [];
    },
    moveToPresent: (state, action: PayloadAction<CustomHistoryAction>) => {
      // Remove from future and add to past
      state.future = state.future.filter((a) => a.id !== action.payload.id);
      state.past = [...state.past, action.payload];
    },
  },
});

export const { undo, redo, addToHistory, clearHistory, moveToPresent } =
  customHistorySlice.actions;

export default customHistorySlice.reducer;

export const addShapeToHistory =
  (shape: Shape, mesh?: THREE.Mesh): AppThunk =>
  (dispatch) => {
    const isImage =
      shape.type === 'image' ||
      shape.properties?.isImageMaterial === true ||
      !!shape.properties?.dimensions?.imageUrl;
    let imageData: ImageMetadata | undefined = undefined;
    if (isImage) {
      // Extract image metadata from different possible sources
      const dimensions = shape.properties.dimensions || {};
      imageData = {
        url: dimensions?.imageUrl || shape.properties?.imageUrl || '',
        fileName: dimensions?.fileName || 'image.png',
        aspectRatio: dimensions?.aspectRatio || 1,
        size: dimensions?.imageSize || {
          width: 100,
          height: 100,
        },
      };
    }

    const action: CustomHistoryAction = {
      id: shape.id,
      type: 'ADD',
      data: {
        shape: JSON.parse(JSON.stringify(shape)),
        mesh,
        isImage,
        imageData,
      },
    };
    dispatch(addToHistory(action));
  };

export const updateShapeInHistory =
  (shape: Shape, previousState: Shape, mesh?: THREE.Mesh): AppThunk =>
  (dispatch) => {
    const isImage =
      shape.type === 'image' ||
      shape.properties?.isImageMaterial === true ||
      !!(shape.properties?.dimensions as ImageDimensions)?.imageUrl;
    let imageData: ImageMetadata | undefined = undefined;
    if (isImage) {
      // Extract image metadata from different possible sources
      const dimensions = shape.properties.dimensions || {};
      imageData = {
        url: dimensions?.imageUrl || shape.properties?.imageUrl || '',
        fileName: dimensions?.fileName || 'image.png',
        aspectRatio: dimensions?.aspectRatio || 1,
        size: dimensions?.imageSize || {
          width: 100,
          height: 100,
        },
      };
    }

    const action: CustomHistoryAction = {
      id: shape.id,
      type: 'UPDATE',
      data: {
        shape: JSON.parse(JSON.stringify(shape)),
        previousState: JSON.parse(JSON.stringify(previousState)),
        mesh,
        isImage,
        imageData,
      },
    };
    dispatch(addToHistory(action));
  };

export const removeShapeFromHistory =
  (shape: Shape, mesh?: THREE.Mesh): AppThunk =>
  (dispatch) => {
    const isImage = !!(
      shape.type === 'image' ||
      shape.properties?.isImageMaterial === true ||
      shape.properties?.dimensions?.imageUrl
    );

    // Create action payload
    const action: CustomHistoryAction = {
      id: shape.id,
      type: 'REMOVE',
      data: {
        shape: JSON.parse(JSON.stringify(shape)),
        mesh,
        isImage,
      },
    };
    dispatch(addToHistory(action));
  };

export const trackShapePropertyChange =
  (
    shape: Shape,
    property: string,
    oldValue: number | { x: number; y: number; z: number } | string,
    newValue: number | { x: number; y: number; z: number } | string,
    isRecursive = false,
    childShapes?: Shape[],
  ): AppThunk =>
  (dispatch) => {
    const action: CustomHistoryAction = {
      id:
        (isRecursive ? 'recursive-' : '') +
        shape.id +
        '-' +
        Date.now().toString(),
      type: 'PROPERTY_CHANGE',
      data: {
        shape: JSON.parse(JSON.stringify(shape)),
        propertyChanges: [
          {
            property,
            oldValue,
            newValue,
          },
        ],
        childShapes: childShapes
          ? childShapes.map((shape) => JSON.parse(JSON.stringify(shape)))
          : undefined,
      },
    };
    dispatch(addToHistory(action));
  };

// Track when all shapes are cleared from the scene
export const trackClearAllShapes =
  (shapes: Shape[], meshes?: THREE.Mesh[]): AppThunk =>
  (dispatch) => {
    // Process images separately for better recovery
    const imageShapes: ImageShapesMap = {};
    const imageData: ImageDataMap = {};

    // Identify all image shapes
    shapes.forEach((shape) => {
      // Check if this is an image
      const isImage =
        shape.type === 'image' ||
        shape.properties?.isImageMaterial === true ||
        (shape.properties?.dimensions as ImageDimensions)?.imageUrl;

      if (isImage) {
        // Store the image shape for recovery
        imageShapes[shape.id] = JSON.parse(JSON.stringify(shape));

        // Extract image metadata for recovery
        const dimensions = shape.properties.dimensions || {};
        imageData[shape.id] = {
          url: dimensions?.imageUrl || shape.properties?.imageUrl || '',
          fileName: dimensions?.fileName || 'image.png',
          aspectRatio: dimensions?.aspectRatio || 1,
          size: dimensions?.imageSize || {
            width: 100,
            height: 100,
          },
        };
      }
    });

    const action: CustomHistoryAction = {
      id: 'clear-all-' + Date.now().toString(),
      type: 'CLEAR',
      data: {
        shapes: shapes.map((shape) => JSON.parse(JSON.stringify(shape))),
        meshes,
        // Include image-specific recovery data
        imageShapes: Object.values(imageShapes),
        imageData,
      },
    };
    dispatch(addToHistory(action));
  };

export const undoCustomAction = (): AppThunk => (dispatch, getState) => {
  const state = getState();
  const history = state.customDesignHistory;
  const scene = state.customDesign.sceneState.scene;

  if (history.past.length > 0) {
    const lastAction = history.past[history.past.length - 1];

    switch (lastAction.type) {
      case 'ADD':
        if (lastAction.data.shape && scene) {
          dispatch({
            type: 'customDesign/removeShape',
            payload: lastAction.data.shape.id,
          });

          const objectToRemove = scene.getObjectByName(
            lastAction.data.shape.id,
          );
          if (objectToRemove && objectToRemove.parent) {
            objectToRemove.parent.remove(objectToRemove);
          }

          // Check if this was a child object and update parent's children list
          if (lastAction.data.shape.parentId) {
            dispatch({
              type: 'customDesign/removeChildFromParent',
              payload: {
                parentId: lastAction.data.shape.parentId,
                childId: lastAction.data.shape.id,
              },
            });
          }
        }
        break;

      case 'REMOVE':
        if (lastAction.data.shape && scene) {
          dispatch({
            type: 'customDesign/addShape',
            payload: lastAction.data.shape,
          });

          // Special handling for image types
          if (
            lastAction.data.isImage ||
            lastAction.data.shape.type === 'image' ||
            lastAction.data.shape.properties?.isImageMaterial
          ) {
            recreateImageFromShape(
              lastAction.data.shape,
              scene,
              lastAction.data.imageData as ImageMetadata,
            );
          } else {
            // Standard object recreation
            recreateObjectFromShape(lastAction.data.shape, scene);
          }

          // Check if this was a child object and update parent's children list
          if (lastAction.data.shape.parentId) {
            dispatch({
              type: 'customDesign/addChildToParent',
              payload: {
                parentId: lastAction.data.shape.parentId,
                childId: lastAction.data.shape.id,
              },
            });
          }
        }
        break;

      case 'UPDATE':
        if (lastAction.data.previousState && scene) {
          // Update Redux store
          dispatch({
            type: 'customDesign/updateShape',
            payload: lastAction.data.previousState,
          });

          // Remove existing object
          const objectToRemove = scene.getObjectByName(
            lastAction.data.previousState.id,
          );
          if (objectToRemove && objectToRemove.parent) {
            objectToRemove.parent.remove(objectToRemove);
          }

          // Recreate object with previous state
          if (
            lastAction.data.isImage ||
            lastAction.data.previousState.type === 'image' ||
            lastAction.data.previousState.properties?.isImageMaterial
          ) {
            recreateImageFromShape(
              lastAction.data.previousState,
              scene,
              lastAction.data.imageData as ImageMetadata,
            );
          } else {
            // Standard object recreation
            recreateObjectFromShape(lastAction.data.previousState, scene);
          }
        }
        break;

      case 'PROPERTY_CHANGE':
        const shape = lastAction.data.shape;
        const changes = lastAction.data.propertyChanges;

        if (shape && changes && changes.length > 0) {
          const change = changes[0]; // We only handle one property change for now

          // Get updated shape from store
          const storeShape = store
            .getState()
            .customDesign.shapes.find((s) => s.id === shape.id);

          if (!storeShape) {
            break;
          }

          const updatedShape = JSON.parse(JSON.stringify(storeShape));

          // Update the property with old value
          if (
            typeof change.oldValue === 'object' &&
            change.oldValue !== null &&
            'x' in change.oldValue
          ) {
            // Handle coordinate-based properties
            updatedShape[change.property] = { ...change.oldValue };
          } else {
            // Handle simple value properties
            updatedShape[change.property] = change.oldValue;
          }

          // Update Redux store
          dispatch({
            type: 'customDesign/updateShape',
            payload: updatedShape,
          });

          // Find the object in the scene and update its properties
          if (scene) {
            const obj = scene.getObjectByName(updatedShape.id);
            if (obj) {
              const newValue = change.oldValue as Position;
              if (change.property === 'position') {
                obj.position.set(newValue.x, newValue.y, newValue.z);
              } else if (change.property === 'rotation') {
                obj.rotation.set(newValue.x, newValue.y, newValue.z);
              } else if (change.property === 'scale') {
                obj.scale.set(newValue.x, newValue.y, newValue.z);
              }
              // Add more properties as needed
            }
          }

          // Handle recursive property changes to child shapes
          if (lastAction.data.childShapes) {
            lastAction.data.childShapes.forEach((childShape) => {
              const childId = childShape.id;
              const childObj = scene?.getObjectByName(childId);

              if (childObj) {
                const newValue = change.oldValue as Position;
                if (change.property === 'position') {
                  childObj.position.set(newValue.x, newValue.y, newValue.z);
                } else if (change.property === 'rotation') {
                  childObj.rotation.set(newValue.x, newValue.y, newValue.z);
                } else if (change.property === 'scale') {
                  childObj.scale.set(newValue.x, newValue.y, newValue.z);
                }
                // Add more properties as needed
              }

              // Update the child shape in Redux too
              const storeChildShape = store
                .getState()
                .customDesign.shapes.find((s) => s.id === childId);
              if (storeChildShape) {
                const updatedChildShape = JSON.parse(
                  JSON.stringify(storeChildShape),
                );
                if (
                  typeof change.oldValue === 'object' &&
                  change.oldValue !== null &&
                  'x' in change.oldValue
                ) {
                  // For position, we keep the relative position the same
                  if (change.property !== 'position') {
                    updatedChildShape[change.property] = { ...change.oldValue };
                  }
                } else {
                  updatedChildShape[change.property] = change.oldValue;
                }

                dispatch({
                  type: 'customDesign/updateShape',
                  payload: updatedChildShape,
                });
              }
            });
          }
        }
        break;

      case 'CLEAR':
        if (lastAction.data.shapes && Array.isArray(lastAction.data.shapes)) {
          // First, check for image-specific data from our enhanced format
          const imageShapesMap: ImageShapesMap = {};
          const imageDataMap: ImageDataMap = {};

          // Build image maps for quick lookups
          if (
            lastAction.data.imageShapes &&
            Array.isArray(lastAction.data.imageShapes)
          ) {
            lastAction.data.imageShapes.forEach((shape) => {
              if (shape && shape.id) {
                imageShapesMap[shape.id] = shape;
              }
            });
          }

          if (
            lastAction.data.imageData &&
            typeof lastAction.data.imageData === 'object'
          ) {
            if (!Array.isArray(lastAction.data.imageData)) {
              const imageDataObj = lastAction.data.imageData as Record<
                string,
                ImageMetadata
              >;
              Object.keys(imageDataObj).forEach((id) => {
                imageDataMap[id] = imageDataObj[id];
              });
            }
          }

          lastAction.data.shapes.forEach((shape) => {
            if (shape) {
              const shapeId = shape.id;

              // Check if this is an image
              const isImage =
                shape.type === 'image' ||
                imageShapesMap[shapeId] ||
                shape.properties?.isImageMaterial === true ||
                shape.properties?.dimensions?.imageUrl ||
                shape.properties?.imageUrl;

              // Add shape to Redux store first
              dispatch({
                type: 'customDesign/addShape',
                payload: shape,
              });

              if (scene) {
                if (isImage) {
                  const imageMetadata = imageDataMap[shapeId] || undefined;
                  recreateImageFromShape(shape, scene, imageMetadata);
                } else {
                  recreateObjectFromShape(shape, scene);
                }
              }
            }
          });
        }
        break;

      default:
        break;
    }

    dispatch(undo());
  } else {
  }
};

function recreateObjectFromShape(
  shape: Shape,
  scene: THREE.Scene,
): THREE.Mesh | null {
  if (shape.type === 'image') {
    return recreateImageFromShape(shape, scene);
  }

  const geometryData = {
    type: shape.type as GeometryData['type'],
    dimensions: shape.properties.dimensions as GeometryData['dimensions'],
    color: shape.properties.color as number | undefined,
    position: shape.position,
  };

  let geometry;
  const dimensions = geometryData.dimensions || {};

  switch (geometryData.type) {
    case 'box':
      geometry = new THREE.BoxGeometry(
        dimensions.width || 1,
        dimensions.height || 1,
        dimensions.depth || 1,
      );
      break;
    case 'sphere':
      geometry = new THREE.SphereGeometry(dimensions.radius || 0.5, 32, 16);
      break;
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(
        dimensions.radiusTop || 0.5,
        dimensions.radiusBottom || 0.5,
        dimensions.height || 1,
        32,
      );
      break;
    case 'cone':
      geometry = new THREE.ConeGeometry(
        dimensions.radius || 0.5,
        dimensions.height || 1,
        32,
      );
      break;
    case 'torus':
      geometry = new THREE.TorusGeometry(
        dimensions.radius || 0.5,
        dimensions.tube || 0.2,
        16,
        100,
      );
      break;
    case 'plane':
      geometry = new THREE.PlaneGeometry(
        dimensions.width || 1,
        dimensions.height || 1,
      );
      break;
    // Add more geometry types as needed
    default:
      return null;
  }

  const material = new THREE.MeshStandardMaterial({
    color: geometryData.color || 0xbbbbbb,
    transparent: shape.properties?.transparent || false,
    opacity:
      shape.properties?.opacity !== undefined ? shape.properties.opacity : 1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = shape.id;
  mesh.position.set(shape.position.x, shape.position.y, shape.position.z);
  mesh.rotation.set(shape.rotation.x, shape.rotation.y, shape.rotation.z);
  mesh.scale.set(shape.scale.x, shape.scale.y, shape.scale.z);

  // Store object data for event handling
  mesh.userData = {
    objectId: shape.id,
    type: shape.type,
    isCustomObject: true,
  };

  // Add to scene
  scene.add(mesh);
  return mesh;
}

// Helper function specifically for recreating images with texture restoration
function recreateImageFromShape(
  shape: Shape,
  scene: THREE.Scene,
  imageData?: ImageMetadata,
): THREE.Mesh | null {
  try {
    // Get dimensions and properties from shape
    const dimensions = shape.properties.dimensions || {};
    let width = dimensions.width || 1;
    let height = dimensions.height || 1;
    let imageUrl: string | undefined;

    // Check if image URL exists in multiple possible locations
    if (shape.properties.dimensions) {
      imageUrl = shape.properties.dimensions?.imageUrl;
    } else if (shape.properties.imageUrl) {
      imageUrl = shape.properties.imageUrl;
    } else if (imageData?.url) {
      // Use the image data from history action if available
      imageUrl = imageData.url;

      // If we have image dimensions, use them
      if (imageData.size) {
        width = shape.properties.width || imageData.size.width;
        height = shape.properties.height || imageData.size.height;
      }
    }

    if (!imageUrl) {
      return null;
    }

    // Create geometry and material
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      side: THREE.DoubleSide,
    });

    // Create the mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = shape.id;

    // Set position, rotation, and scale from the stored shape data
    mesh.position.set(shape.position.x, shape.position.y, shape.position.z);
    mesh.rotation.set(shape.rotation.x, shape.rotation.y, shape.rotation.z);
    mesh.scale.set(shape.scale.x, shape.scale.y, shape.scale.z);

    // Create a base color until texture loads
    material.color = new THREE.Color(0xcccccc); // Light gray

    // Define texture loading function
    const loadTexture = (url: string): Promise<THREE.Texture> => {
      return new Promise((resolve, reject) => {
        // Create a new texture loader
        const loader = new THREE.TextureLoader();

        // Load the image
        loader.load(
          url,
          (texture) => {
            texture.needsUpdate = true;
            texture.flipY = false;
            texture.colorSpace = THREE.SRGBColorSpace;

            // Try to use anisotropic filtering for better quality
            try {
              const renderer = new THREE.WebGLRenderer();
              texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
              renderer.dispose();
            } catch (e) {
              console.warn('Could not set anisotropic filtering:', e);
            }

            resolve(texture);
          },
          undefined,
          (error) => {
            reject(error);
          },
        );
      });
    };

    // Immediately start texture loading
    loadTexture(imageUrl)
      .then((texture) => {
        // Apply the loaded texture to the material
        material.map = texture;
        material.needsUpdate = true;

        // Force a render update to show the texture
        if (scene.userData && scene.userData.forceUpdate) {
          scene.userData.forceUpdate();
        }
      })
      .catch((error) => {
        console.error('Failed to load image texture:', error);
      });

    // Store important data in userData for future operations
    mesh.userData = {
      objectId: shape.id,
      type: 'image',
      isImage: true,
      isCustomObject: true,
      isImageMesh: true,
      originalImageUrl: imageUrl,
      fileName: imageData?.fileName || 'restored-image.png',
    };

    // Add the mesh to the scene
    scene.add(mesh);

    const wireframeMaterial = new THREE.LineBasicMaterial({
      color: 0x3366ff, // Blue border for visibility
      linewidth: 2, // Thicker line
    });

    // Get geometry edges for the wireframe
    const wireframeGeometry = new THREE.EdgesGeometry(geometry);
    const wireframe = new THREE.LineSegments(
      wireframeGeometry,
      wireframeMaterial,
    );

    // Name it so we can find it later
    wireframe.name = 'image-wireframe-' + shape.id;

    // Add this wireframe to the mesh
    mesh.add(wireframe);

    return mesh;
  } catch (error) {
    console.error('Failed to restore image mesh:', error);
    return null;
  }
}

interface GeometryData {
  type:
    | 'box'
    | 'sphere'
    | 'cylinder'
    | 'cone'
    | 'torus'
    | 'plane'
    | 'tetrahedron'
    | 'circle';
  dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
    radius?: number;
    radiusTop?: number;
    radiusBottom?: number;
    tube?: number;
    segments?: number;
  };
  color?: number;
  position?: { x: number; y: number; z: number };
}

export const redoCustomAction = (): AppThunk => (dispatch, getState) => {
  const state = getState();
  const history = state.customDesignHistory;
  const scene = state.customDesign.sceneState.scene;

  if (history.future.length === 0) {
    return;
  }

  const nextAction = history.future[0];

  // Store the action data for debugging
  if (!scene) {
    console.error('Scene not available for redo action');
    return;
  }

  // Process action based on type
  switch (nextAction.type) {
    case 'ADD':
      if (nextAction.data.shape) {
        dispatch({
          type: 'customDesign/addShape',
          payload: nextAction.data.shape,
        });

        // Check if this was an image and recreate properly
        if (
          nextAction.data.isImage ||
          nextAction.data.shape.type === 'image' ||
          nextAction.data.shape.properties?.isImageMaterial
        ) {
          recreateImageFromShape(
            nextAction.data.shape,
            scene,
            nextAction.data.imageData as ImageMetadata,
          );
        } else {
          recreateObjectFromShape(nextAction.data.shape, scene);
        }

        // Check if this was a child object and update parent's children list
        if (nextAction.data.shape.parentId) {
          dispatch({
            type: 'customDesign/addChildToParent',
            payload: {
              parentId: nextAction.data.shape.parentId,
              childId: nextAction.data.shape.id,
            },
          });
        }
      }
      break;

    case 'REMOVE':
      if (nextAction.data.shape && nextAction.data.shape.id) {
        // Remove from Redux
        dispatch({
          type: 'customDesign/removeShape',
          payload: nextAction.data.shape.id,
        });

        // Remove from scene
        const objectToRemove = scene.getObjectByName(nextAction.data.shape.id);
        if (objectToRemove && objectToRemove.parent) {
          objectToRemove.parent.remove(objectToRemove);
        }

        // Check if this was a child object and update parent's children list
        if (nextAction.data.shape.parentId) {
          dispatch({
            type: 'customDesign/removeChildFromParent',
            payload: {
              parentId: nextAction.data.shape.parentId,
              childId: nextAction.data.shape.id,
            },
          });
        }
      }
      break;

    case 'UPDATE':
      if (nextAction.data.shape) {
        // Update Redux store
        dispatch({
          type: 'customDesign/updateShape',
          payload: nextAction.data.shape,
        });

        // Remove existing object
        const objectToRemove = scene.getObjectByName(nextAction.data.shape.id);
        if (objectToRemove && objectToRemove.parent) {
          objectToRemove.parent.remove(objectToRemove);
        }

        // Recreate object with new state
        if (
          nextAction.data.isImage ||
          nextAction.data.shape.type === 'image' ||
          nextAction.data.shape.properties?.isImageMaterial
        ) {
          recreateImageFromShape(
            nextAction.data.shape,
            scene,
            nextAction.data.imageData as ImageMetadata,
          );
        } else {
          recreateObjectFromShape(nextAction.data.shape, scene);
        }
      }
      break;

    case 'PROPERTY_CHANGE':
      const shape = nextAction.data.shape;
      const changes = nextAction.data.propertyChanges;

      if (shape && changes && changes.length > 0) {
        const change = changes[0]; // We only handle one property change for now

        // Get latest shape from store
        const storeShape = getState().customDesign.shapes.find(
          (s) => s.id === shape.id,
        );

        if (!storeShape) {
          console.warn(
            'Cannot redo property change - shape not found in store',
          );
          break;
        }

        const updatedShape = JSON.parse(JSON.stringify(storeShape));

        // Update the property with new value
        if (
          typeof change.newValue === 'object' &&
          change.newValue !== null &&
          'x' in change.newValue
        ) {
          // Handle coordinate-based properties
          updatedShape[change.property] = { ...change.newValue };
        } else {
          // Handle simple value properties
          updatedShape[change.property] = change.newValue;
        }

        // Update Redux store
        dispatch({
          type: 'customDesign/updateShape',
          payload: updatedShape,
        });

        // Find the object in the scene and update its properties
        const obj = scene.getObjectByName(updatedShape.id);
        if (obj) {
          const newValue = change.newValue as Position;
          // Update properties based on property name
          if (change.property === 'position') {
            obj.position.set(newValue.x, newValue.y, newValue.z);
          } else if (change.property === 'rotation') {
            obj.rotation.set(newValue.x, newValue.y, newValue.z);
          } else if (change.property === 'scale') {
            obj.scale.set(newValue.x, newValue.y, newValue.z);
          }
          // Add more properties as needed
        }

        // Handle recursive property changes to child shapes
        if (nextAction.data.childShapes) {
          nextAction.data.childShapes.forEach((childShape) => {
            const childId = childShape.id;
            const childObj = scene.getObjectByName(childId);

            if (childObj) {
              const newValue = change.newValue as Position;
              // Update the same property on each child
              if (change.property === 'position') {
                childObj.position.set(newValue.x, newValue.y, newValue.z);
              } else if (change.property === 'rotation') {
                childObj.rotation.set(newValue.x, newValue.y, newValue.z);
              } else if (change.property === 'scale') {
                childObj.scale.set(newValue.x, newValue.y, newValue.z);
              }
              // Add more properties as needed
            }

            // Update the child shape in Redux too
            const storeChildShape = getState().customDesign.shapes.find(
              (s) => s.id === childId,
            );
            if (storeChildShape) {
              const updatedChildShape = JSON.parse(
                JSON.stringify(storeChildShape),
              );
              if (
                typeof change.newValue === 'object' &&
                change.newValue !== null &&
                'x' in change.newValue
              ) {
                // For position, we keep the relative position the same
                if (change.property !== 'position') {
                  updatedChildShape[change.property] = { ...change.newValue };
                }
              } else {
                updatedChildShape[change.property] = change.newValue;
              }

              dispatch({
                type: 'customDesign/updateShape',
                payload: updatedChildShape,
              });
            }
          });
        }
      }
      break;

    case 'CLEAR':
      if (nextAction.data.shapes && Array.isArray(nextAction.data.shapes)) {
        const shapesToRemove = nextAction.data.shapes.map((shape) => shape.id);
        dispatch({ type: 'customDesign/clearShapes' });

        if (scene) {
          const meshesToRemove = scene.children.filter((child) => {
            const objectId = child.userData.objectId;
            return (
              objectId &&
              shapesToRemove.includes(objectId) &&
              child instanceof THREE.Mesh
            );
          });
          if (meshesToRemove.length > 0) {
            meshesToRemove.forEach((mesh) => {
              if (mesh.parent) {
                mesh.parent.remove(mesh);
              }
            });
          }
        }
      }
      break;

    default:
      break;
  }
  dispatch(redo());
};
