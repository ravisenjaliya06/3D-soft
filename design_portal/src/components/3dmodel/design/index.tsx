import { useRouter } from 'next/router';
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { MoveHandler } from '../handler/moveHandler';
import { useAppDispatch, useAppSelector } from '../hooks';
import { FloorManager } from '../sceneCreator/floorManager';
import { SaveToLibraryPopup } from '../sceneCreator/popup/SaveToLibraryPopup';
import HelperTool from '../sceneCreator/tools/HelperTool';
import { ObjectsSaver } from '../sceneCreator/tools/objectSaver';
import { OutlineManager } from '../sceneCreator/tools/quickHideTool';
import { deleteObject } from '../sceneCreator/utils';
import { store } from '../store';
import { setHoverdMesh, updateObject } from '../store/dataSlice';
import { setScene } from '../store/sceneSlice';
import { isPlankObjectFindByName } from '../utils/objectTypes';
import { DistanceTool } from './distance/distance';
import { DesignProps, ThreeDView } from './interface';
import MeasurementTool from './MeasurementTool';
import { getOrCreateThreeDView } from './sceneSingleton';
import { MATERIAL_TYPES } from '../sceneCreator/interface';

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
  const router = useRouter();
  const designId = (router.query.designid as string) ?? gettingDesignID() ?? '';
  const dispatch = useAppDispatch();
  const sceneFromState = useAppSelector((state) => state.scene.scene);
  const isQuickHideActive = useAppSelector((state) => state.data.isQuickHideActive);
  const isMeasurementActive = useAppSelector((state) => state.data.isMeasurementActive);
  const currentUnitType = useAppSelector((state) => state.data.currentUnitType);
  const objects = useAppSelector((state) => state.data.objects);
  const mountRef = useRef<HTMLDivElement>(null);
  const [design3D, setLocalDesign3D] = useState<ThreeDView | null>(null);
  const [selectedObject, setSelectedObject] = useState<THREE.Mesh | null>(null);
  const [helperToolObject, setHelperToolObject] = useState<THREE.Mesh | null>(null);

  const [outline, setOutline] = useState<THREE.Object3D | null>(null);
  const [moveHandler, setMoveHandler] = useState<MoveHandler | null>(null);
  const hoverOutlineRef = useRef<THREE.LineSegments | null>(null);
  const lastHoveredObjectRef = useRef<THREE.Mesh | null>(null);
  const outlineRef = useRef<OutlineManager | null>(null);
  const dimToolRef = useRef<DistanceTool | null>(null);
  const [showSavePopup, setShowSavePopup] = React.useState(false);
  const [catalogName, setCatalogName] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    if (!mountRef.current || !designId) return;

    // Clear full store so new design starts fresh (scene, data, catalog, history, etc.)
    // i commented this line because i want to use the same store for multiple designs
    // dispatch(resetStoreForNewDesign());

    // Get or create scene for this design (each design has its own scene)
    const threeDView = getOrCreateThreeDView(mountRef.current, designId);

    setLocalDesign3D(threeDView);
    setDesign3D(threeDView);
    dispatch(setScene(threeDView.scene));

    const dimTool = new DistanceTool(threeDView.scene);
    dimTool.enableEditing(threeDView, (mesh, newPos) => {
      const objectId = mesh.userData?.objectId;
      if (!objectId) return;

      dispatch(
        updateObject({
          id: objectId,
          position: {
            x: newPos.x,
            y: newPos.y,
            z: newPos.z,
          },
        })
      );
    });

    dimToolRef.current = dimTool;

    const handler = new MoveHandler({
      scene: threeDView.scene,
      camera: threeDView.camera as THREE.PerspectiveCamera,
      renderer: threeDView.renderer,
      movableObjects: [],
    });
    setMoveHandler(handler);

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

    return () => {
      if (mountRef.current && threeDView.renderer?.domElement?.parentNode === mountRef.current) {
        try {
          mountRef.current.removeChild(threeDView.renderer.domElement);
        } catch {
          // ignore
        }
      }
      setLocalDesign3D(null);
      setDesign3D(null);
      setMoveHandler(null);
      setSelectedObject(null);
      setHelperToolObject(null);
    };
  }, [designId]);

  useEffect(() => {
    if (!design3D) return;
    if (!outlineRef.current) {
      outlineRef.current = new OutlineManager();
    }
  }, [design3D]);

  useEffect(() => {
    if (design3D && sceneFromState && sceneFromState === design3D.scene) {
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
      // 1. Clear old dimensions globally
      dimToolRef.current?.clearAllDistances();
      // 2. If it's a plank, show dimensions
      if (isPlankObjectFindByName(selectedObject)) {
        dimToolRef.current?.showDistances(selectedObject);
      }
      // NOTE: Outline creation is now handled by the SelectTool logic that triggered this selection.
      setOutline(null); // Clear any local outline reference we might have had
    } else {
      // If nothing selected or selection cleared
      if (design3D && design3D.scene) {
        dimToolRef.current?.clearAllDistances();
      }
    }
  }, [design3D, selectedObject]);

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
    'FLOOR',
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

    selector.onShowHelperTool = (mesh) => {
      setHelperToolObject(mesh);
    };
  }, [design3D]);

  useEffect(() => {
    if (!design3D || !design3D.transformControls) return;

    const transformControls = design3D.transformControls;

    if (selectedObject && selectedObject.userData && selectedObject.userData.isGLB) {
      if (transformControls.attach) {
        transformControls.attach(selectedObject);
      }
    } else {
      if (transformControls.detach) {
        transformControls.detach();
      }
    }

    const onTransformChange = () => {
      if (!selectedObject) return;

      const objectId = selectedObject.userData.objectId;
      if (!objectId) return;

      // Update Redux store with new position/rotation/scale
      dispatch(
        updateObject({
          id: objectId,
          position: {
            x: selectedObject.position.x,
            y: selectedObject.position.y,
            z: selectedObject.position.z,
          },
          rotation: {
            x: selectedObject.rotation.x,
            y: selectedObject.rotation.y,
            z: selectedObject.rotation.z,
          },
          scale: {
            x: selectedObject.scale.x,
            y: selectedObject.scale.y,
            z: selectedObject.scale.z,
          },
        })
      );
    };

    transformControls.addEventListener('mouseUp', onTransformChange);

    return () => {
      transformControls.removeEventListener('mouseUp', onTransformChange);
    };
  }, [design3D, selectedObject, dispatch]);

  const handleKeyboardEvents = (event: KeyboardEvent) => {
    if (event.key === 'Delete') {
      deleteObject();
    }

    if (design3D && design3D.transformControls) {
      if (event.key.toLowerCase() === 'g') {
        design3D.transformControls.setMode('translate');
      } else if (event.key.toLowerCase() === 'r') {
        design3D.transformControls.setMode('scale');
      } else if (event.key.toLowerCase() === 'e') {
        design3D.transformControls.setMode('rotate');
      }
    }

    if (event.key === 'Escape') {
      if (design3D && design3D.selector) {
        design3D.selector.deselect();
        setSelectedObject(null);
      }
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardEvents);
    return () => {
      window.removeEventListener('keydown', handleKeyboardEvents);
    };
  }, [selectedObject, design3D, moveHandler, isSelectableMesh]);

  // Sync floor from Redux data.objects to 3D scene
  // FloorManager creates the initial floor geometry
  // MeshBuilder handles texture updates for existing floor meshes
  useEffect(() => {
    if (!design3D?.scene) return;

    // Filter floor objects from data.objects array
    const floorObjects = objects.filter((obj) => obj.type === 'floor');

    if (floorObjects.length === 0) return;

    // Convert MeshObjectData back to Floor format for FloorManager
    const floorData = floorObjects.map((obj) => {
      // Extract texture URL from floor material
      let textureUrl = '/textures/wood_7.jpg'; // Default
      if (obj.material && Array.isArray(obj.material)) {
        const floorMaterial = obj.material.find((mat) => mat.type === MATERIAL_TYPES.MISCELLANEOUS);
        if (floorMaterial?.textures && floorMaterial.textures.length > 0) {
          const textureDetail = floorMaterial.textures[0].textureDetail;
          if (textureDetail?.image) {
            // Add API base URL prefix if texture path starts with /media
            if (textureDetail.image.startsWith('/media')) {
              textureUrl = `${process.env.NEXT_PUBLIC_PUBLIC_API}${textureDetail.image}`;
            } else {
              textureUrl = textureDetail.image;
            }
          }
        }
      }

      return {
        id: obj.id,
        points: obj.floorData?.points || [],
        walls: obj.floorData?.walls || [],
        textureUrl: textureUrl,
      };
    });

    const floorManager = new FloorManager(design3D.scene, floorData);
    floorManager.syncData();
  }, [design3D, objects]);

  const handleConfirmSave = () => {
    if (!catalogName.trim()) {
      setError('Library name is required');
      return;
    }

    const saver = new ObjectsSaver();
    saver.saveObject(catalogName.trim());
    setShowSavePopup(false);
  };

  return (
    <div style={{ position: 'absolute', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }}></div>
      {design3D && (
        <>
          <MeasurementTool
            design3D={design3D}
            isActive={isMeasurementActive}
            unitType={currentUnitType}
            onComplete={() => {}}
          />
          <HelperTool
            design3D={design3D}
            selectedObject={helperToolObject}
            moveHandler={moveHandler}
            setShowSavePopup={setShowSavePopup}
            setCatalogName={setCatalogName}
            setError={setError}
          />
        </>
      )}
      {showSavePopup && (
        <SaveToLibraryPopup
          catalogName={catalogName}
          error={error}
          onCatalogNameChange={(name) => {
            setCatalogName(name);
            setError(null);
          }}
          onSave={handleConfirmSave}
          onClose={() => setShowSavePopup(false)}
        />
      )}
    </div>
  );
};

export default Design;
