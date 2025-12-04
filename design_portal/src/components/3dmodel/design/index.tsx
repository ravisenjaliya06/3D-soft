import { API_ENDPOINT } from '@/services/ApiEndPoints';
import commonService from '@/services/CommonService';
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { loadDesignObjects } from '../handler/items';
import { MoveHandler } from '../handler/moveHandler';
import { useAppDispatch, useAppSelector } from '../hooks';
import { ResponseStatus } from '../interface';
import { SceneBuilder } from '../sceneCreator/sceneBuilder';
import { OutlineManager } from '../sceneCreator/tools/quickHideTool';
import { store } from '../store';
import { addObjects, removeObjectWithHistory, setHoverdMesh } from '../store/dataSlice';
import { setScene } from '../store/sceneSlice';
import { DesignProps, ThreeDView } from './interface';
import MeasurementTool from './MeasurementTool';
import { enablePlankDimensionEditing } from './scene';

export const gettingDesignID = () => {
  /** Retrieves the current design ID from the URL path. */

  const designID = window.location.pathname.split('/')[2];
  return designID;
};

export function removeExistingLines() {
  /** Removes all existing outline line objects from the 3D scene. */

  const design3D = store.getState().scene.scene;

  const toRemove: THREE.Object3D[] = [];

  design3D.traverse((child) => {
    if (child.name.includes('outline')) {
      toRemove.push(child);
    }
  });

  toRemove.forEach((obj) => {
    if (obj.parent) {
      obj.parent.remove(obj);
    }
  });
}

export function createOutlineForObject(mesh: THREE.Mesh): THREE.LineSegments | null {
  /** Creates a yellow outline (edge highlight) for the given 3D mesh object. */

  if (!mesh.geometry) return null;

  const edges = new THREE.EdgesGeometry(mesh.geometry);
  const outlineMaterial = new THREE.LineBasicMaterial({
    color: 0xffff00,
    linewidth: 2,
    depthTest: false,
  });
  const outlineLines = new THREE.LineSegments(edges, outlineMaterial);

  // Compute world position, rotation, scale
  mesh.updateWorldMatrix(true, false);
  const worldPosition = new THREE.Vector3();
  const worldQuaternion = new THREE.Quaternion();
  const worldScale = new THREE.Vector3();
  mesh.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);

  outlineLines.position.copy(worldPosition);
  outlineLines.quaternion.copy(worldQuaternion);
  outlineLines.scale.copy(worldScale);

  outlineLines.name = `outline-${mesh.userData.objectId}`;
  outlineLines.userData.isOutline = true;
  outlineLines.userData.outlineFor = mesh.userData.objectId;

  return outlineLines;
}

const Design: React.FC<DesignProps> = ({ setDesign3D }) => {
  const dispatch = useAppDispatch();
  const sceneFromState = useAppSelector((state) => state.scene.scene);
  const isQuickHideActive = useAppSelector((state) => state.data.isQuickHideActive);
  const isMeasurementActive = useAppSelector((state) => state.data.isMeasurementActive);
  const currentUnitType = useAppSelector((state) => state.data.currentUnitType);
  const mountRef = useRef<HTMLDivElement>(null);
  const [design3D, setLocalDesign3D] = useState<ThreeDView | null>(null);
  const [selectedObject, setSelectedObject] = useState<THREE.Mesh | null>(null);

  const [outline, setOutline] = useState<THREE.Object3D | null>(null);
  const [moveHandler, setMoveHandler] = useState<MoveHandler | null>(null);
  const hoverOutlineRef = useRef<THREE.LineSegments | null>(null);
  const lastHoveredObjectRef = useRef<THREE.Mesh | null>(null);
  const outlineRef = useRef<OutlineManager | null>(null);

  useEffect(() => {
    if (mountRef.current && !design3D) {
      const initializeScene = async () => {
        if (!mountRef.current) return;

        const builder = new SceneBuilder({
          mount: mountRef.current,
        });
        const threeDView = builder.build();
        setLocalDesign3D(threeDView);
        setDesign3D(threeDView);
        dispatch(setScene(threeDView.scene));
        enablePlankDimensionEditing(threeDView);
        const handler = new MoveHandler({
          scene: threeDView.scene,
          camera: threeDView.camera as THREE.PerspectiveCamera,
          renderer: threeDView.renderer,
          movableObjects: [],
        });
        setMoveHandler(handler);

        const designId = gettingDesignID();
        if (designId) {
          try {
            const loadedObjects = await loadDesignObjects(designId, threeDView.scene);
            if (loadedObjects) {
              dispatch(addObjects(loadedObjects));
            }
          } catch (error) {
            console.error('Failed to load design objects:', error);
          }
        } else {
          console.warn('No designId found in URL');
        }

        threeDView.scene.traverse((object) => {
          if (
            object.name === 'grid' ||
            object instanceof THREE.GridHelper ||
            object.name === 'floor' ||
            object.name === 'Sky'
          ) {
            object.raycast = () => [];
          }
        });
      };

      initializeScene();

      return () => {
        if (design3D) {
          setDesign3D(null);
          setLocalDesign3D(null);
          if (moveHandler) {
            moveHandler.disableDragging();
          }
        }
      };
    }
  }, [design3D, setDesign3D, dispatch, moveHandler]);

  useEffect(() => {
    if (!design3D) return;
    if (!outlineRef.current) {
      outlineRef.current = new OutlineManager();
    }
  }, [design3D]);

  useEffect(() => {
    if (design3D && sceneFromState) {
      sceneFromState.children.forEach((child) => {
        if (!design3D.scene.getObjectById(child.id)) {
          design3D.scene.add(child.clone());
        }
      });
      design3D.renderer.render(design3D.scene, design3D.camera);
    }
  }, [sceneFromState, design3D]);

  useEffect(() => {
    if (!design3D) return;
    outlineRef.current?.setQuickHide(isQuickHideActive);
    outlineRef.current?.toggle();
  }, [isQuickHideActive]);

  const createSelectionOutline = (mesh: THREE.Mesh) => {
    /** Creates a yellow outline around a selected 3D mesh for visual selection indication. */

    if (!mesh.geometry) return null;

    const edges = new THREE.EdgesGeometry(mesh.geometry);
    const outlineMaterial = new THREE.LineBasicMaterial({
      color: 0xffff00,
      linewidth: 2,
      depthTest: false,
    });
    const outlineLines = new THREE.LineSegments(edges, outlineMaterial);

    outlineLines.position.copy(mesh.position);
    outlineLines.rotation.copy(mesh.rotation);
    outlineLines.scale.copy(mesh.scale);
    outlineLines.name = 'selected_outline';
    outlineLines.userData.isOutline = true;
    outlineLines.userData.outlineFor = mesh.userData.objectId;

    return outlineLines;
  };

  useEffect(() => {
    if (!design3D) return;

    if (outline) {
      design3D.scene.remove(outline);
      if (outline instanceof THREE.LineSegments) {
        outline.geometry?.dispose();
        if (outline.material instanceof THREE.Material) {
          outline.material.dispose();
        } else if (Array.isArray(outline.material)) {
          outline.material.forEach((material) => material.dispose());
        }
      }
      setOutline(null);
    }

    if (selectedObject instanceof THREE.Mesh) {
      const selectedObjectId = store.getState().data.selectedObject;
      const scene = store.getState().scene.scene;
      const newOutline = createSelectionOutline(selectedObject);
      if (newOutline) {
        scene.children.forEach((child) => {
          if (child.children.length > 0) {
            child.children.forEach((grandChild) => {
              if (grandChild.name === 'selected_outline') {
                child.remove(grandChild);
              }
            });
          }
        });
        if (selectedObject.parent?.userData.objectId === selectedObjectId) {
          selectedObject.parent?.add(newOutline);
        } else {
          design3D.scene.add(newOutline);
        }
        setOutline(newOutline);
      }
    }
  }, [design3D]);

  const SELECTABLE_KEYS = [
    'PLANK',
    'DOOR',
    'DRAWER',
    'INVISIBLEBOX',
    'WALL',
    'CABINET',
    'CUPBOARD',
    'TABLE',
    'PLATFORM',
  ];
  const isSelectableMesh = (obj: THREE.Object3D) =>
    obj instanceof THREE.Mesh &&
    SELECTABLE_KEYS.some((key) => obj.name.toUpperCase().includes(key));

  useEffect(() => {
    if (isMeasurementActive && design3D && hoverOutlineRef.current) {
      design3D.scene.remove(hoverOutlineRef.current);
      if (hoverOutlineRef.current.geometry) {
        hoverOutlineRef.current.geometry.dispose();
      }
      if (hoverOutlineRef.current.material instanceof THREE.Material) {
        hoverOutlineRef.current.material.dispose();
      }
      hoverOutlineRef.current = null;
      lastHoveredObjectRef.current = null;
    }
  }, [isMeasurementActive, design3D, hoverOutlineRef]);

  useEffect(() => {
    if (!design3D) return;

    const selector = design3D.selector;
    if (!selector) return;

    selector.onHover = (mesh) => {
      dispatch(setHoverdMesh(mesh));
    };

    selector.onSelect = (mesh) => {
      setSelectedObject(mesh);
    };
  }, [design3D]);

  const deleteObject = async () => {
    /** Deletes the currently selected 3D object from both the scene and backend database. */

    removeExistingLines();
    return new Promise<void>(async (reject) => {
      if (!selectedObject || !selectedObject.userData.objectId) {
        reject(console.error('No selected object or missing object ID'));
        return;
      }

      const formData = new FormData();
      formData.append('catalog_ids[]', selectedObject.userData.objectId);

      const response = (await commonService.delete(
        API_ENDPOINT.DELETE_ALL_OBJECTS(gettingDesignID()),
        formData
      )) as ResponseStatus;

      if (response && response.status === 200) {
        removeExistingLines();
        removeObjectAndChildrenFromScene(selectedObject);
        dispatch(removeObjectWithHistory(selectedObject.userData.objectId, selectedObject));
      } else {
        console.error('Failed to delete object from backend');
      }
    });
  };

  const removeObjectAndChildrenFromScene = (parentObject: THREE.Object3D) => {
    /** Removes a 3D object and all its children from the scene hierarchy. */

    if (!design3D || !parentObject) return;

    parentObject.children.forEach((child) => {
      child.parent?.remove(child);
    });

    parentObject.parent?.remove(parentObject);
  };

  const handleKeyboardEvents = (event: KeyboardEvent) => {
    if (event.key === 'Delete') {
      if (selectedObject?.userData.objectId) {
        deleteObject()
          .then(() => {
            removeObjectAndChildrenFromScene(selectedObject);
            setSelectedObject(null);
          })
          .catch((error) => {
            console.error('Error during object deletion:', error);
          });
      }
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardEvents);
    return () => {
      window.removeEventListener('keydown', handleKeyboardEvents);
    };
  }, [selectedObject, design3D, moveHandler, isSelectableMesh]);

  return (
    <div style={{ position: 'absolute', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }}></div>
      {design3D && (
        <MeasurementTool
          design3D={design3D}
          isActive={isMeasurementActive}
          unitType={currentUnitType}
          onComplete={() => {}}
        />
      )}
    </div>
  );
};

export default Design;
