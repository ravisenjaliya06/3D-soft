import { _3DMODEL, assets } from '@/svgPaths';
import gsap from 'gsap';
import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import * as THREE from 'three';
import { itemType } from '../design/interface';
import {
  addLShapeToDrawersAndDoors,
  addNailers,
  addSkirtingPlanks,
  applyNoBase,
  hasExtendedSidePlanks,
  removeLShapeObjects,
  removeNailers,
  removeSkirtingPlanks,
  updateDoorType,
  updateDrawerType,
} from '../design/scene';
import { generateCompartmentsFromMesh, updateMinifixesForCupboard } from '../handler/items';
import { UpdateObjectInScene } from '../handler/updateHandler';
import { Dimensions } from '../interface';
import {
  DOOR_TYPES,
  DOUBLE_DOOR_PLANK_TYPES,
  DRAWER_PLANK_TYPES,
  DRAWER_TYPES,
  FLOOR_PLAN_TYPES,
  INVISIBLE_BOXES,
  Material,
  MeshObjectData,
  MeshObjectPatch,
  OBJECT_TYPES,
  PART_TYPES,
  MATERIAL_TYPES as SCENE_MATERIAL_TYPES,
  TextureDetails,
} from '../sceneCreator/interface';

import { SyncManager } from '../sceneCreator/syncState';
import { CabinetMotionController } from '../sceneCreator/tools/openCloseTool';
import { RootState } from '../store';
import {
  clearActiveItemOverrides,
  setActiveItemCamDepth,
  setActiveItemCamDiameter,
  setActiveItemCamHeight,
  setActiveItemMinifixDiameterHole,
  setActiveItemMinifixDistance,
} from '../store/activeItemSlice';
import { updateObject } from '../store/dataSlice';
import {
  selectIsLatestVersion,
  selectResolvedCamDepth,
  selectResolvedCamDiameter,
  selectResolvedCamHeight,
  selectResolvedMinifixDiameterHole,
  selectResolvedMinifixDistance,
} from '../store/selectors';
import { CustomToast } from '../utils/CustomToast';

import { API_ENDPOINT } from '@/services/ApiEndPoints';
import commonService from '@/services/CommonService';
import { DistanceTool } from '../design/distance/distance';
import { getActiveUnit, unitToMeters } from '../handler/unitConversion';
import { LOAD_MORE_INCREMENT } from '../sceneCreator/constants';
import { BandingTool } from '../sceneCreator/tools/bandingTool';
import { findMesh, formatEnumLabel } from '../sceneCreator/utils';
import { DistanceInput } from './DistanceInput';
import { Axis, Field, TextureGrain } from './interface';
import { MaterialChangePopup } from './MaterialChangePopup';
import SidebarInput from './SidebarInput';

const Sidebar: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNavOpen, setNavOpen] = useState(true);
  const [isSettingOpen, setSettingOpen] = useState(false);
  const [doorPosition, setDoorPosition] = useState('None');
  const [showMaterialPopup, setShowMaterialPopup] = useState(false);
  const [isTextureListOpen, setIsTextureListOpen] = useState(false);
  const [textureGrain, setTextureGrain] = useState<TextureGrain>('None');
  const [handlePos, setHandlePos] = useState({ x: 0, y: 0, z: 0 });
  const [handleRot, setHandleRot] = useState({ x: 0, y: 0, z: 0 });
  const [shelvesInnerDistance, setShelvesInnerDistance] = useState(0);
  const [handleMode, setHandleMode] = useState<'handle' | 'handleless'>('handle');
  const [positionDistances, setPositionDistances] = useState({
    left: null as number | null,
    right: null as number | null,
    top: null as number | null,
    bottom: null as number | null,
  });

  // Anchor States for Directional Scaling
  const [widthSide, setWidthSide] = useState<'left' | 'right' | null>(null);
  const [heightSide, setHeightSide] = useState<'bottom' | 'top' | null>(null);
  const [depthSide, setDepthSide] = useState<'back' | 'front' | null>(null);
  const [isInvisibleBox, setIsIncisibleBox] = useState<boolean>(false);
  const [textureData, setTextureData] = useState<any[]>([]);
  const [visibleCount, setVisibleCount] = useState(40);
  const [textureSearchQuery, setTextureSearchQuery] = useState('');
  const [isMainObject, setIsMainObject] = useState<boolean>(false);

  const updateObjectRef = useRef<UpdateObjectInScene | null>(null);
  const bandingToolRef = useRef<BandingTool | null>(null);
  const distanceToolRef = useRef<DistanceTool | null>(null);
  const isUpdatingShelvesDistanceRef = useRef(false);
  const previousPlankIdRef = useRef<string | null>(null);
  const isUpdatingPositionRef = useRef(false);
  //temporarily disabled
  const sidebarRef = useRef<HTMLDivElement | null>(null);

  const dispatch = useDispatch();
  const selectedObjectId = useSelector((state: RootState) => state.data.selectedObject);
  const selectedChildObjectId = useSelector((state: RootState) => state.data.selectedChildObject);
  const objects = useSelector((state: RootState) => state.data.objects);
  const scene = useSelector((state: RootState) => state.scene.scene);
  const isQuickHideActive = useSelector((state: RootState) => state.data.isQuickHideActive);

  // Get resolved values from Redux (with three-layer fallback)
  const resolvedMinifixDistance = useSelector(selectResolvedMinifixDistance);
  const resolvedMinifixDiameterHole = useSelector(selectResolvedMinifixDiameterHole);
  const resolvedCamDepth = useSelector(selectResolvedCamDepth);
  const resolvedCamDiameter = useSelector(selectResolvedCamDiameter);
  const resolvedCamHeight = useSelector(selectResolvedCamHeight);
  const isLatestVersion = useSelector(selectIsLatestVersion);
  const isDisabled = isQuickHideActive || !isLatestVersion;

  let selectedObject: MeshObjectData | null | undefined;
  const targetId = selectedChildObjectId || selectedObjectId;

  if (selectedChildObjectId) {
    selectedObject = objects.find((obj) => obj.id === selectedChildObjectId);
  } else if (selectedObjectId) {
    selectedObject = objects.find((obj) => obj.id === selectedObjectId);
  } else {
    selectedObject = null;
  }

  const isHorizontalPlank = selectedObject?.name?.includes(itemType.HORIZONTAL_PLANK) ?? false;
  const isVerticalPlank = selectedObject?.name?.includes(itemType.VERTICAL_PLANK) ?? false;
  // const isDoorSelected = selectedObject?.type === PART_TYPES.DOOR;
  // const isDrawerSelected = selectedObject?.type === PART_TYPES.DRAWER || selectedObject?.name === 'Drawer';

  useEffect(() => {
    if (selectedObjectId || selectedChildObjectId) {
      if (selectedObject?.type === OBJECT_TYPES.MODEL) {
        setSettingOpen(false);
        setNavOpen(true);
      } else {
        setSettingOpen(true);
        setNavOpen(false);
      }

      scene.traverse((child) => {
        if (child instanceof THREE.Mesh || child.userData.type === INVISIBLE_BOXES.INVISIBLE_BOX) {
          setIsIncisibleBox(true);
        } else {
          setIsIncisibleBox(false);
        }
      });
    } else {
      setSettingOpen(false);
      setNavOpen(true);
    }

    if (selectedObject && selectedObject.type === PART_TYPES.DOOR) {
      if (selectedObject.openDirection) {
        const dir = selectedObject.openDirection;
        setDoorPosition(dir.charAt(0).toUpperCase() + dir.slice(1).toLowerCase());
      } else {
        setDoorPosition('None');
      }
    }

    if (selectedObject) {
      // @ts-ignore
      setTextureGrain(
        (selectedObject.textureGrain as 'None' | 'Horizontal' | 'Vertical') || 'None'
      );
    } else {
      setTextureGrain('None');
    }

    setWidthSide(null);
    setHeightSide(null);
    setDepthSide(null);
  }, [selectedObjectId, selectedChildObjectId, isLatestVersion]);

  useEffect(() => {
    if (isQuickHideActive) {
      setSettingOpen(false);
      setNavOpen(true);
    }
  }, [isQuickHideActive]);

  //temporarily disabled
  // Prevent double-click events in sidebar from propagating to window (which would affect 3D scene)
  useEffect(() => {
    const handleDoubleClick = (e: MouseEvent) => {
      e.stopPropagation();
    };

    const sidebarElement = sidebarRef.current;
    if (sidebarElement) {
      sidebarElement.addEventListener('dblclick', handleDoubleClick);
    }

    return () => {
      if (sidebarElement) {
        sidebarElement.removeEventListener('dblclick', handleDoubleClick);
      }
    };
  }, []);

  /** object updater ref */
  useEffect(() => {
    updateObjectRef.current = new UpdateObjectInScene(scene, dispatch);
  }, [scene, dispatch]);

  /** banding tool ref */
  useEffect(() => {
    if (scene) {
      bandingToolRef.current = new BandingTool(scene);
    }
  }, [scene]);

  /** distance tool ref */
  useEffect(() => {
    if (scene) {
      distanceToolRef.current = new DistanceTool(scene);
    }
  }, [scene]);

  useEffect(() => {
    if (selectedObject && scene) {
      if (isUpdatingPositionRef.current) return;
      let targetMesh: THREE.Mesh | null = null;
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.userData.objectId === selectedObject?.id) {
          targetMesh = obj;
        }
      });
      if (targetMesh) {
        setIsMainObject(selectedObject.isMain === true ? true : false);

        if (
          selectedObject.type === OBJECT_TYPES.CUPBOARD &&
          selectedObject.noBaseEnabled === undefined
        ) {
          if (!hasExtendedSidePlanks(targetMesh)) {
            applyObjectUpdate(selectedObject, { noBaseEnabled: true });
          }
        }

        // Disable front panel toggle if there are natively no extended side planks
        // OR if "No Base" is enabled
        // OR if "Nailer" is enabled
        // legacy front panel disable/enabled no longer used in UI

        // Calculate distances for position fields
        if (distanceToolRef.current) {
          const distances = distanceToolRef.current.getDistances(targetMesh);
          setPositionDistances(distances);
        }
      } else {
        setIsMainObject(false);
        setPositionDistances({ left: null, right: null, top: null, bottom: null });
      }
    } else {
      setIsMainObject(false);
      setPositionDistances({ left: null, right: null, top: null, bottom: null });
    }
  }, [selectedObject, scene]);

  const getTextures = async () => {
    const response = await commonService.get(API_ENDPOINT.GET_TEXTURES);
    if (response.status === 200) {
      setTextureData(response.data);
    }
  };

  useEffect(() => {
    getTextures();
  }, []);

  // let handleObject = objects.find((obj) => obj.id === targetId);
  const handleObject = findMesh(scene, targetId ? targetId : '', true);
  useEffect(() => {
    if (!handleObject) return;

    setHandlePos({
      x: Math.round(handleObject.position.x),
      y: Math.round(handleObject.position.y),
      z: Math.round(handleObject.position.z),
    });

    setHandleRot({
      x: Math.round(handleObject.rotation.x),
      y: Math.round(handleObject.rotation.y),
      z: Math.round(handleObject.rotation.z),
    });
  }, [handleObject]);

  const updateHandlePosState = (axis: Axis, value: number) => {
    if (!selectedObject || !handleObject) return;

    const roundedValue = Math.round(value);

    // 1️⃣ Update local UI state
    setHandlePos((prev) => ({ ...prev, [axis]: roundedValue }));

    // 2️⃣ Update handle mesh position in scene
    updateObjectRef.current?.update(
      handleObject.userData.objectId,
      { position: { [axis]: roundedValue } },
      undefined,
      handleObject
    );

    // 3️⃣ Map axis → material inset
    let materialPatch: Record<string, number> = {};

    if (axis === 'x') {
      materialPatch.horizontalInset = roundedValue;
    }

    if (axis === 'y') {
      materialPatch.verticalInset = roundedValue;
    }

    const material = selectedObject.material;
    const materialArray = Array.isArray(material) ? material : [material];

    //@ts-ignore
    const updatedMaterials: Material[] = materialArray.map((mat) => {
      if (mat?.type !== SCENE_MATERIAL_TYPES.PULL) return mat;

      return {
        ...mat,
        properties: {
          ...mat.properties,
          ...materialPatch,
        },
      };
    });

    // 5️⃣ Sync object data
    applyObjectUpdate(selectedObject, {
      //@ts-ignore
      material: Array.isArray(material) ? updatedMaterials : updatedMaterials[0],
    });
  };

  // Filter textures based on search query
  const filteredTextures = textureData.filter((texture) => {
    if (!textureSearchQuery.trim()) return true;
    const query = textureSearchQuery.toLowerCase();
    return (
      texture.name?.toLowerCase().includes(query) || texture.option?.toLowerCase().includes(query)
    );
  });

  const handleLoadMore = () => {
    setVisibleCount((prev) => {
      const newCount = prev + LOAD_MORE_INCREMENT;
      return Math.min(newCount, filteredTextures.length);
    });
  };

  // Check if there are more textures to load
  const hasMoreTextures = visibleCount < filteredTextures.length;

  // Reset visible count when search query changes
  useEffect(() => {
    setVisibleCount(LOAD_MORE_INCREMENT);
  }, [textureSearchQuery]);

  const updateHandleRotState = (axis: Axis, value: number) => {
    if (!selectedObject || !handleObject) return;

    const roundedValue = Math.round(value);

    setHandleRot((prev) => ({ ...prev, [axis]: roundedValue }));

    // Update mesh rotation
    updateObjectRef.current?.update(
      handleObject.userData.objectId,
      { rotation: { [axis]: roundedValue } },
      undefined,
      handleObject
    );

    // Update material rotation
    const material = selectedObject.material;
    const materialArray = Array.isArray(material) ? material : [material];

    //@ts-ignore
    const updatedMaterials: Material[] = materialArray.map((mat) => {
      if (mat?.type !== SCENE_MATERIAL_TYPES.PULL) return mat;

      return {
        ...mat,
        properties: {
          ...mat.properties,
          rotation: roundedValue,
        },
      };
    });

    applyObjectUpdate(selectedObject, {
      //@ts-ignore
      material: Array.isArray(material) ? updatedMaterials : updatedMaterials[0],
    });
  };

  const handleOpenCloseChange = () => {
    if (!scene || !isLatestVersion) return;

    const targetId = selectedChildObjectId ?? selectedObjectId;
    if (!targetId) return;

    const controller = new CabinetMotionController();

    scene.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;

      const { objectId, type } = node.userData;
      if (objectId !== targetId) return;

      if (type === PART_TYPES.DOOR) {
        controller.toggleDoor(node);
        return;
      }

      if (type === PART_TYPES.DRAWER) {
        controller.toggleDrawer(node);
      }
    });
  };

  const handleHandleModeChange = async (mode: 'handle' | 'handleless') => {
    if (!scene || !selectedObject || !isLatestVersion) return;

    setHandleMode(mode);

    // Find the cupboard mesh
    let cupboardMesh: THREE.Mesh | null = null;
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData.objectId === selectedObject.id) {
        cupboardMesh = obj;
      }
    });

    if (!cupboardMesh) return;

    if (mode === 'handleless') {
      // Handleless mode: add l-shape objects for visualization only (no modifications to drawer/door sizes)
      await addLShapeToDrawersAndDoors(scene, cupboardMesh);
      // Hide handles
      scene.traverse((obj: THREE.Object3D) => {
        if (obj instanceof THREE.Mesh && obj.userData.objectId === selectedObject.id) {
          obj.traverse((child: THREE.Object3D) => {
            if (child.userData.type === 'handle') {
              child.visible = false;
            }
          });
        }
      });
    } else {
      // Handle mode: remove l-shape objects and restore original heights, show handles
      await removeLShapeObjects(cupboardMesh);
      // Show handles
      scene.traverse((obj: THREE.Object3D) => {
        if (obj instanceof THREE.Mesh && obj.userData.objectId === selectedObject.id) {
          obj.traverse((child: THREE.Object3D) => {
            if (child.userData.type === 'handle') {
              child.visible = true;
            }
          });
        }
      });
    }
  };

  async function applyObjectUpdate(
    selectedObject: MeshObjectData | null | undefined,
    patch: MeshObjectPatch
  ): Promise<void> {
    if (!selectedObject) return;

    const updatedObject: MeshObjectData = {
      ...selectedObject,
      ...patch,

      dimensions: patch.dimensions
        ? { ...selectedObject.dimensions, ...patch.dimensions }
        : selectedObject.dimensions,

      position: patch.position
        ? { ...selectedObject.position, ...patch.position }
        : selectedObject.position,

      rotation: patch.rotation
        ? { ...selectedObject.rotation, ...patch.rotation }
        : selectedObject.rotation,

      material: patch.material ?? selectedObject.material,

      edgeBanding: patch.edgeBanding
        ? { ...selectedObject.edgeBanding, ...patch.edgeBanding }
        : selectedObject.edgeBanding,
    };

    // 2. Use SyncManager for 3D scene synchronization
    const syncManager = new SyncManager(updatedObject);
    await syncManager.syncData();
  }

  const handleSetting = () => {
    /** Opens the object settings sidebar, closing navigation if active. */

    if (isQuickHideActive) return;
    setSettingOpen(true);
    setNavOpen(false);
  };

  const toggleSidebar = () => {
    /** Toggles the visibility of the right-hand settings sidebar. */

    setIsSidebarOpen(!isSidebarOpen);
  };

  const getSidebarTitle = (): string =>
    isDisabled
      ? 'Viewport Navigation'
      : `${'Adjustable ' + formatEnumLabel(selectedObject?.name || 'Settings')}`;

  const handleNavigation = () => {
    /** Opens the navigation panel and closes settings if open. */

    setSettingOpen(false);
    setNavOpen(true);
  };

  const handleDoorPositionChange = (position: string) => {
    /** Updates the door’s open direction (left, right, top, bottom) in the 3D scene. */

    if (selectedObject && isLatestVersion) {
      const newPos = position.toLowerCase();
      const materialArray = Array.isArray(selectedObject.material)
        ? [...selectedObject.material]
        : selectedObject.material
          ? [selectedObject.material]
          : [];

      const updatedMaterials = materialArray.map((mat) => {
        if (mat?.type !== SCENE_MATERIAL_TYPES.PULL) return mat;

        let h = mat.properties?.horizontalInset ?? 50;
        let v = mat.properties?.verticalInset ?? 50;
        let r = mat.properties?.rotation ?? 90;

        if (newPos === 'left') {
          h = 90;
          v = 50;
          r = 90;
        } else if (newPos === 'right') {
          h = 10;
          v = 50;
          r = 90;
        } else if (newPos === 'top') {
          h = 50;
          v = 90;
          r = 0;
        } else if (newPos === 'bottom') {
          h = 50;
          v = 10;
          r = 0;
        }

        return {
          ...mat,
          properties: {
            ...mat.properties,
            horizontalInset: h,
            verticalInset: v,
            rotation: r,
          },
        };
      });

      // Close the door BEFORE updating the object so MeshBuilder calculations use closed coordinates
      let wasOpen = false;
      scene.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        if (child.userData.objectId === selectedObject.id) {
          wasOpen = child.userData.isClosed === false;
          if (wasOpen) {
            const controller = new CabinetMotionController();
            controller.toggleDoor(child);
            const pivotGroup = child.parent;
            if (pivotGroup?.userData.isPivotGroup) {
              gsap.killTweensOf(pivotGroup.rotation);
              pivotGroup.rotation.set(0, 0, 0);
              pivotGroup.updateMatrixWorld(true);
            }
          }
        }
      });

      if (updateObjectRef.current) {
        updateObjectRef.current.update(
          selectedObject.id,
          {
            openDirection: position.toLowerCase(),
            material: updatedMaterials as any,
          },
          selectedObject
        );
      }

      scene.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        if (child.userData.objectId === selectedObject.id) {
          child.userData.openDirection = position.toLowerCase();

          // for re-open
          if (wasOpen) {
            const controller = new CabinetMotionController();
            controller.toggleDoor(child);
          }
        }
      });
    }
  };

  const handlePositionDistanceChange = async (side: string, value: number) => {
    if (
      !selectedObject ||
      !scene ||
      isUpdatingPositionRef.current ||
      !distanceToolRef.current ||
      !isLatestVersion
    )
      return;

    isUpdatingPositionRef.current = true;

    let targetMesh: THREE.Mesh | null = null;
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData.objectId === selectedObject?.id) {
        targetMesh = obj;
      }
    });

    if (!targetMesh) {
      isUpdatingPositionRef.current = false;
      return;
    }

    // Get current distances
    const currentDistances = distanceToolRef.current.getDistances(targetMesh);
    const unit = getActiveUnit();

    // Convert new value to meters
    const newDistanceM = unitToMeters(value, unit);

    // Get current distance for this side
    let currentDistanceM = 0;
    let axis: 'x' | 'y' | 'z' = 'x';

    const tMesh = targetMesh as THREE.Mesh;
    const isThinZ = distanceToolRef.current?.analyzePlankGeometry(tMesh).isThinZ;

    if (side === 'left' && currentDistances.left !== null) {
      currentDistanceM = currentDistances.left;
      axis = isThinZ ? 'z' : 'x';
    } else if (side === 'right' && currentDistances.right !== null) {
      currentDistanceM = currentDistances.right;
      axis = isThinZ ? 'z' : 'x';
    } else if (side === 'top' && currentDistances.top !== null) {
      currentDistanceM = currentDistances.top;
      axis = 'y';
    } else if (side === 'bottom' && currentDistances.bottom !== null) {
      currentDistanceM = currentDistances.bottom;
      axis = 'y';
    } else {
      isUpdatingPositionRef.current = false;
      return;
    }

    // Calculate delta (how much to move)
    let delta = 0;
    if (side === 'left' || side === 'bottom') {
      delta = newDistanceM - currentDistanceM;
    } else if (side === 'right' || side === 'top') {
      delta = currentDistanceM - newDistanceM;
    }

    // Apply position change using DistanceTool's method
    distanceToolRef.current.applyPositionDelta(tMesh, axis, delta);

    // Regenerate internal logic
    if (typeof generateCompartmentsFromMesh === 'function' && tMesh.parent instanceof THREE.Mesh) {
      generateCompartmentsFromMesh(tMesh.parent);
    }
    if (tMesh.parent instanceof THREE.Mesh) {
      updateMinifixesForCupboard(tMesh.parent);
    }

    // Update Redux store
    const newPosition = {
      x: tMesh.position.x,
      y: tMesh.position.y,
      z: tMesh.position.z,
    };

    dispatch(
      updateObject({
        id: selectedObject.id,
        position: newPosition,
      })
    );

    // Sync to scene
    if (updateObjectRef.current) {
      await new SyncManager(
        {
          ...selectedObject,
          position: newPosition,
        },
        undefined
      ).syncData();
    }

    // Recalculate distances after position change
    const updatedDistances = distanceToolRef.current.getDistances(tMesh);
    setPositionDistances(updatedDistances);

    // Also redraw the visual 3D distance lines
    distanceToolRef.current.showDistances(tMesh);

    isUpdatingPositionRef.current = false;
  };

  const handleMainObjectPositionChange = (axis: 'x' | 'y' | 'z', value: number) => {
    if (!selectedObject || isDisabled || isUpdatingPositionRef.current) return;

    isUpdatingPositionRef.current = true;
    const currentPos = selectedObject.position ?? { x: 0, y: 0, z: 0 };
    const newPosition = { ...currentPos, [axis]: value };

    dispatch(
      updateObject({
        id: selectedObject.id,
        position: newPosition,
      })
    );

    if (updateObjectRef.current) {
      updateObjectRef.current.update(selectedObject.id, { position: newPosition }, selectedObject);
    }

    setTimeout(() => {
      isUpdatingPositionRef.current = false;
    }, 100);
  };

  const handleMaterialChange = () => {
    /** Opens the material selection popup for the selected object. */
    if (!isLatestVersion) return;
    setShowMaterialPopup(true);
  };

  // Helper function to check if material has texture
  const hasTextureMaterial = (materialArray?: Material[]): boolean => {
    if (!materialArray || !Array.isArray(materialArray)) return false;
    // Support both Panel Stock and Floor material types
    const material = materialArray.find(
      (mat) => mat.type === 'Panel Stock' || mat.type === 'Floor'
    );
    return !!(material?.textures && material.textures.length > 0);
  };

  const toggleTextureList = () => {
    /** Toggles the visibility of the texture selection list. */
    setIsTextureListOpen((prev) => {
      if (!prev) {
        // Reset visible count when opening texture list
        setVisibleCount(LOAD_MORE_INCREMENT);
      }
      return !prev;
    });
  };
  const handleDimensionChange = async (field: Field, value: number) => {
    if (!selectedObject || isDisabled) return;

    // Round the value to ensure it's a whole number
    const roundedValue = Math.round(value);
    const oldValue = selectedObject.dimensions?.[field] ?? 0;
    const delta = roundedValue - oldValue;

    // Stores positional offset caused by directional resizing.
    // Initialized to zero so unaffected axes remain unchanged.
    const positionShift = { x: 0, y: 0, z: 0 };

    const axisConfig = {
      width: {
        axis: 'x',
        side: widthSide,
        negative: 'left',
        positive: 'right',
      },
      height: {
        axis: 'y',
        side: heightSide,
        negative: 'bottom',
        positive: 'top',
      },
      depth: {
        axis: 'z',
        side: depthSide,
        negative: 'back',
        positive: 'front',
      },
    } as const;

    const config = axisConfig[field];

    if (config) {
      const scaleValue = selectedObject.scale?.[config.axis] ?? 1;
      let side = config.side;

      // Force walls to only grow "upward" (maintaining the bottom at floor level)
      if (selectedObject.type === FLOOR_PLAN_TYPES.WALL && field === 'height') {
        side = config.positive; // 'top'
      }

      if (side === config.negative) {
        positionShift[config.axis] = -(delta / 2) * scaleValue;
      } else if (side === config.positive) {
        positionShift[config.axis] = (delta / 2) * scaleValue;
      }
    }

    const currentPos = selectedObject.position ?? { x: 0, y: 0, z: 0 };
    const currentRot = selectedObject.rotation ?? { x: 0, y: 0, z: 0 };

    // Apply rotation to the shift vector to ensure it moves along the local axis
    const shiftVector = new THREE.Vector3(positionShift.x, positionShift.y, positionShift.z);
    const euler = new THREE.Euler(currentRot.x, currentRot.y, currentRot.z);
    shiftVector.applyEuler(euler);

    await applyObjectUpdate(selectedObject, {
      dimensions: { [field]: roundedValue },
      position: {
        x: currentPos.x + shiftVector.x,
        y: currentPos.y + shiftVector.y,
        z: currentPos.z + shiftVector.z,
      },
    });

    // Mark the mesh as edited so SnapManager preserves dimensions on re-snap
    if (selectedObject.type === OBJECT_TYPES.PLATFORM && scene) {
      scene.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh && child.userData.objectId === selectedObject.id) {
          child.userData.isEdited = true;
        }
      });
    }

    // Regenerate minifixes
    if (scene) {
      requestAnimationFrame(() => {
        let cupboardMesh: THREE.Mesh | null = null;
        if (isFullCupboard) {
          cupboardMesh = findMesh(scene, selectedObject.id);
        } else if (selectedObject.parent) {
          // If it's a child (plank), find the parent cupboard
          cupboardMesh = findMesh(scene, selectedObject.parent);
        }

        if (cupboardMesh && cupboardMesh.userData.isMain) {
          updateMinifixesForCupboard(cupboardMesh);
          generateCompartmentsFromMesh(cupboardMesh);
        }
      });
    }
  };

  const handleTextureSelect = (textureData: TextureDetails) => {
    if (!selectedObject) return;

    // Helper to create updated material
    const getUpdatedMaterial = (material: Material | Material[], textureData: TextureDetails) => {
      const materialArray = Array.isArray(material) ? material : [material];

      //@ts-ignore
      const updatedMaterials: Material[] = materialArray.map((mat) => {
        // Support both Panel Stock (for cupboards/planks) and Floor (for floor objects) and Wall
        if (
          mat?.type === SCENE_MATERIAL_TYPES.PANEL_STOCK ||
          mat?.type === SCENE_MATERIAL_TYPES.MISCELLANEOUS ||
          mat?.type === SCENE_MATERIAL_TYPES.WALL
        ) {
          return {
            ...mat,
            textures: [
              {
                id: mat?.textures?.[0]?.id || crypto.randomUUID(),
                name: mat?.textures?.[0]?.name || 'Texture',
                texture: textureData.id,
                textureDetail: textureData,
              },
            ],
          };
        }
        return mat;
      });
      return Array.isArray(material) ? updatedMaterials : updatedMaterials[0];
    };

    // Update selected Object
    applyObjectUpdate(selectedObject, {
      //@ts-ignore
      material: getUpdatedMaterial(selectedObject.material, textureData),
    });

    if (isFullCupboard) {
      // Find all child planks that should share the texture
      const childPlanks = objects.filter((obj) => {
        if (obj.parent !== selectedObject.id) return false;

        if (
          selectedObject.type === PART_TYPES.DOUBLE_DOOR ||
          selectedObject.name === 'DOUBLE_DOOR'
        ) {
          return (
            obj.type === PART_TYPES.DOOR ||
            obj.type === PART_TYPES.DOUBLE_DOOR ||
            obj.name === DOUBLE_DOOR_PLANK_TYPES.LEFT_PLANK ||
            obj.name === DOUBLE_DOOR_PLANK_TYPES.RIGHT_PLANK
          );
        }

        // Check if it's a plank type
        return (
          obj.type === PART_TYPES.PLANK ||
          obj.type === PART_TYPES.VERTICAL_PLANK ||
          obj.type === PART_TYPES.HORIZONTAL_PLANK ||
          obj.type === PART_TYPES.BACK_PLANK
        );
      });

      childPlanks.forEach((child) => {
        applyObjectUpdate(child, {
          //@ts-ignore
          material: getUpdatedMaterial(child.material, textureData),
        });
      });
    }

    setIsTextureListOpen(false);
  };

  const handleTextureGrainChange = (value: TextureGrain) => {
    if (!selectedObject || isDisabled) return;
    const typedValue = value;
    if (textureGrain === typedValue) return;
    setTextureGrain(typedValue);

    if (updateObjectRef.current) {
      // Pass selectedObject as currentObject so updateRedux is triggered and Redux is updated
      updateObjectRef.current.update(
        selectedObject.id,
        { textureGrain: typedValue },
        selectedObject
      );
    }
  };

  const handleShelvesInnerDistanceChange = (value: number) => {
    if (!selectedObject || isDisabled || !isPlankSelected) return;

    const parentCupboard = selectedObject.parent
      ? objects.find((obj) => obj.id === selectedObject?.parent)
      : null;

    if (!parentCupboard) return;
    const cupboardDepth = parentCupboard.dimensions?.depth ?? 0;

    const clampedValue = Math.max(0, Math.min(25, value));
    if (Math.abs(clampedValue - shelvesInnerDistance) < 0.01) return;
    isUpdatingShelvesDistanceRef.current = true;
    setShelvesInnerDistance(clampedValue);
    const newPlankDepth = cupboardDepth - clampedValue;
    if (newPlankDepth > 0) {
      applyObjectUpdate(selectedObject, {
        dimensions: { depth: newPlankDepth },
      });
    }
    setTimeout(() => {
      isUpdatingShelvesDistanceRef.current = false;
    }, 100);
  };

  const dimensionsUI: Dimensions = {
    width: Math.round(selectedObject?.dimensions?.width ?? 0),
    height: Math.round(selectedObject?.dimensions?.height ?? 0),
    depth: Math.round(selectedObject?.dimensions?.depth ?? 0),
  };

  const controlIconMap: Record<string, string[]> = {
    width: ['/icons/left.svg', '/icons/right.svg'],
    height: ['/icons/top.svg', '/icons/bottom.svg'],
    depth: ['/icons/front.svg', '/icons/back.svg'],
  };

  const isPlatformSelected = selectedObject?.type === OBJECT_TYPES.PLATFORM;

  const sideBarMenuConfig = [
    {
      subMenu: 'layout',
      title: 'Layout',
      fields: [
        {
          label: isVerticalPlank ? 'Thickness' : 'Width',
          name: 'width',
          type: 'number',
          options: isVerticalPlank ? [8, 10, 12, 18] : undefined,
          min: 1,
          value: dimensionsUI.width,
          disabled: true,
          onValueChange: (value: number) => handleDimensionChange('width', value),
          controls: isVerticalPlank ? null : ['Left', 'Right'],
        },
        {
          label: isHorizontalPlank ? 'Thickness' : 'Height',
          name: 'height',
          type: 'number',
          options: isHorizontalPlank ? [8, 10, 12, 18] : undefined,
          min: 1,
          value: dimensionsUI.height,
          disabled: true,
          onValueChange: (value: number) => handleDimensionChange('height', value),
          controls: isHorizontalPlank ? null : ['Top', 'Bottom'],
        },
        {
          label: 'Depth',
          name: 'depth',
          type: 'number',
          min: 1,
          value: dimensionsUI.depth,
          disabled: isQuickHideActive,
          onValueChange: (value: number) => handleDimensionChange('depth', value),
          controls: ['Front', 'Back'],
        },
      ],
    },
  ];

  const handlePositionInputFlid = [
    {
      label: 'Top',
      name: 'Top',
      type: 'number',
      icon: _3DMODEL.topIcon,
      value: handlePos.y,
      disabled: isDisabled,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        updateHandlePosState('y', Number(e.target.value)),
    },

    {
      label: 'Left',
      name: 'Left',
      type: 'number',
      icon: _3DMODEL.leftIcon,
      value: handlePos.x,
      disabled: isDisabled,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        updateHandlePosState('x', Number(e.target.value)),
    },

    {
      label: 'Rotation',
      name: 'rotationZ',
      type: 'number',
      icon: _3DMODEL.rotateIcon,
      value: handleRot.y,
      disabled: isDisabled,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        updateHandleRotState('y', Number(e.target.value)),
    },
  ];

  //TODO :- SMIT / HARSH :- Temporary create this for design parpose

  const isDoorSelected =
    selectedObject?.type === PART_TYPES.DOOR ||
    selectedObject?.name?.toLowerCase().includes('door');

  //TODO :- SMIT / HARSH :- Temporary create this for design parpose
  const isDrawerSelected =
    selectedObject?.type === PART_TYPES.DRAWER ||
    selectedObject?.name?.toLowerCase().includes('drawer');

  //TODO :- SMIT / HARSH :- Temporary create this for design parpose
  const isPlankSelected =
    selectedObject?.type === PART_TYPES.PLANK ||
    selectedObject?.type === PART_TYPES.VERTICAL_PLANK ||
    selectedObject?.type === PART_TYPES.HORIZONTAL_PLANK ||
    selectedObject?.type === PART_TYPES.BACK_PLANK ||
    Object.values(DRAWER_PLANK_TYPES).includes(selectedObject?.type || '');

  const getTopPlank = () => {
    if (!selectedObject) return undefined;
    const children = objects.filter((obj) => obj.parent === selectedObject?.id);
    const planks = children.filter(
      (obj) =>
        obj.type === PART_TYPES.HORIZONTAL_PLANK ||
        obj.type === PART_TYPES.PLANK ||
        obj.name.toLowerCase().includes('top')
    );
    planks.sort((a, b) => (b.position?.y ?? 0) - (a.position?.y ?? 0));
    return planks[0];
  };

  const isFullCupboard =
    !!selectedObject &&
    ![
      PART_TYPES.PLANK,
      PART_TYPES.BACK_PLANK,
      PART_TYPES.DRAWER,
      PART_TYPES.DOOR,
      PART_TYPES.VERTICAL_PLANK,
      PART_TYPES.HORIZONTAL_PLANK,
      ...Object.values(DRAWER_PLANK_TYPES),
      'floor',
      FLOOR_PLAN_TYPES.WALL,
      FLOOR_PLAN_TYPES.CWALL,
    ].includes(selectedObject.type);
  //TODO :- SMIT / HARSH :- Temporary create this for design parpose

  const isFullCupboardorPlankSelected = isFullCupboard || isPlankSelected || isPlatformSelected;
  //TODO :- SMIT / HARSH :- Temporary create this for design parpose

  const isDoorOrDrawerSelected = isDoorSelected || isDrawerSelected;

  // Check if invisible box is selected
  const isInvisibleBoxSelected =
    selectedObject?.type === 'INVISIBLEBOX' ||
    selectedObject?.name?.toLowerCase().includes('invisiblebox') ||
    selectedObject?.name?.toLowerCase().includes('invisible_box') ||
    selectedObject?.name?.toLowerCase().includes('invisible_full_compartment');

  // Wall selected flag
  const isWallSelected = selectedObject?.type === FLOOR_PLAN_TYPES.WALL;

  // Disable texture change for invisible boxes (unless it's a plank which is handled separately)
  // We allow Full Cupboards to change texture now.
  const isTextureChangeDisabled = (isInvisibleBoxSelected && !isPlankSelected) || isDisabled;

  useEffect(() => {
    if (isUpdatingShelvesDistanceRef.current) return;

    if (isPlankSelected && selectedObject) {
      const currentPlankId = selectedObject.id;

      if (previousPlankIdRef.current === currentPlankId) {
        return;
      }

      previousPlankIdRef.current = currentPlankId;

      const parentCupboard = selectedObject.parent
        ? objects.find((obj) => obj.id === selectedObject.parent)
        : null;

      if (parentCupboard) {
        const cupboardDepth = parentCupboard.dimensions?.depth ?? 0;
        const plankDepth = selectedObject.dimensions?.depth ?? 0;
        const calculatedDistance = Math.max(0, cupboardDepth - plankDepth);
        setShelvesInnerDistance(calculatedDistance);
      } else {
        setShelvesInnerDistance(0);
      }

      // Load banding state - first check Redux, then check scene for existing banding
      let bandingState = selectedObject.edgeBanding;

      // If no banding state in Redux, detect from scene meshes using BandingTool
      if (!bandingState && scene && bandingToolRef.current) {
        let foundMesh: THREE.Mesh | null = null;
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh && obj.userData.objectId === selectedObject.id) {
            foundMesh = obj;
          }
        });

        if (foundMesh) {
          // Use BandingTool to detect existing banding
          const detectedBanding = bandingToolRef.current.detectBandingState(foundMesh);

          // If we found banding in scene, update Redux state
          if (Object.keys(detectedBanding).length > 0) {
            bandingState = detectedBanding;
            // Update Redux to sync state
            applyObjectUpdate(selectedObject, {
              edgeBanding: detectedBanding,
            });
          }
        }
      }

      // Set checkbox states
      if (bandingState) {
        setBandingTop(bandingState.top ?? false);
        setBandingBottom(bandingState.bottom ?? false);
        setBandingLeft(bandingState.left ?? false);
        setBandingRight(bandingState.right ?? false);
        setBandingFront(bandingState.front ?? false);
        setBandingBack(bandingState.back ?? false);
      } else {
        setBandingTop(false);
        setBandingBottom(false);
        setBandingLeft(false);
        setBandingRight(false);
        setBandingFront(false);
        setBandingBack(false);
      }
    } else {
      previousPlankIdRef.current = null;
    }
  }, [selectedObject?.id, isPlankSelected, objects, scene]);

  // Edge banding state for planks
  const [bandingTop, setBandingTop] = useState(false);
  const [bandingBottom, setBandingBottom] = useState(false);
  const [bandingLeft, setBandingLeft] = useState(false);
  const [bandingRight, setBandingRight] = useState(false);
  const [bandingFront, setBandingFront] = useState(false);
  const [bandingBack, setBandingBack] = useState(false);
  const [minifixEnabled, setMinifixEnabled] = useState(false);
  const [minifixDisabled, setMinifixDisabled] = useState(false);
  const [topPlankEnabled, setTopPlankEnabled] = useState(true);
  const [topPlankDisabled, setTopPlankDisabled] = useState(false);
  // legacy front panel state removed

  // Local state for minifix settings inputs
  const [minifixDistanceInput, setMinifixDistanceInput] = useState(resolvedMinifixDistance);
  const [minifixDiameterHoleInput, setMinifixDiameterHoleInput] = useState(
    resolvedMinifixDiameterHole
  );
  const [camDepthInput, setCamDepthInput] = useState(resolvedCamDepth);
  const [camDiameterInput, setCamDiameterInput] = useState(resolvedCamDiameter);
  const [camHeightInput, setCamHeightInput] = useState(resolvedCamHeight);

  //TODO :- SMIT / HARSH :- Temporary create this for design parpose

  const handleMinifixToggle = () => {
    if (minifixDisabled || !isLatestVersion) return;
    setMinifixEnabled((prev) => !prev);
  };
  //TODO :- SMIT / HARSH :- Temporary create this for design parpose

  // NOTE: Open this for grooving
  // const handleGroovingToggle = () => {
  //   if (groovingDisabled) return;
  //   setGroovingEnabled((prev) => !prev);
  // };

  //TODO :- SMIT / HARSH :- Temporary create this for design parpose
  useEffect(() => {
    setMinifixDisabled(false);
    setTopPlankDisabled(false);
  }, []);

  // Load cupboard-specific minifix values when object is selected
  useEffect(() => {
    if (selectedObject && isFullCupboard) {
      // Load from cupboard's own stored values, or fall back to resolved values
      setMinifixDistanceInput(selectedObject.minifixDistance ?? resolvedMinifixDistance);
      setMinifixDiameterHoleInput(
        selectedObject.minifixDiameterHole ?? resolvedMinifixDiameterHole
      );
      setCamDepthInput(selectedObject.camDepth ?? resolvedCamDepth);
      setCamDiameterInput(selectedObject.camDiameter ?? resolvedCamDiameter);
      setCamHeightInput(selectedObject.camHeight ?? resolvedCamHeight);
    } else {
      // For non-cupboards, use resolved values
      setMinifixDistanceInput(resolvedMinifixDistance);
      setMinifixDiameterHoleInput(resolvedMinifixDiameterHole);
      setCamDepthInput(resolvedCamDepth);
      setCamDiameterInput(resolvedCamDiameter);
      setCamHeightInput(resolvedCamHeight);
    }
  }, [
    selectedObject,
    isFullCupboard,
    resolvedMinifixDistance,
    resolvedMinifixDiameterHole,
    resolvedCamDepth,
    resolvedCamDiameter,
    resolvedCamHeight,
  ]);

  // Clear activeItem overrides when object is deselected
  useEffect(() => {
    if (!selectedObjectId && !selectedChildObjectId) {
      dispatch(clearActiveItemOverrides());
    }
  }, [selectedObjectId, selectedChildObjectId, dispatch]);

  // Track previous inputs to prevent infinite loops
  const previousInputsRef = useRef({
    distance: resolvedMinifixDistance,
    diameterHole: resolvedMinifixDiameterHole,
    camDepth: resolvedCamDepth,
    camDiameter: resolvedCamDiameter,
    camHeight: resolvedCamHeight,
  });

  // Update minifix in 3D scene when minifix settings change (debounced)
  useEffect(() => {
    if (!scene || !selectedObject) return;

    // Only regenerate for full cupboards
    if (!isFullCupboard) return;

    // Prevent infinite loop: only update if value actually changed
    const prev = previousInputsRef.current;

    // Fix for update issue:
    // If the local input value (which might be valid) hasn't synced to the Redux object yet,
    // we should wait for the Redux update before regenerating the scene.
    // This prevents the scene generation from using stale data (old object state)
    // and incorrectly updating the 'prev' ref, which would cause the subsequent
    // correct update (from Redux sync) to be skipped.
    const currentMinifixDistance = selectedObject.minifixDistance ?? resolvedMinifixDistance;
    if (currentMinifixDistance !== minifixDistanceInput) {
      return;
    }

    if (
      prev.distance === minifixDistanceInput &&
      prev.diameterHole === minifixDiameterHoleInput &&
      prev.camDepth === camDepthInput &&
      prev.camDiameter === camDiameterInput &&
      prev.camHeight === camHeightInput
    ) {
      return;
    }

    // Update the ref
    previousInputsRef.current = {
      distance: minifixDistanceInput,
      diameterHole: minifixDiameterHoleInput,
      camDepth: camDepthInput,
      camDiameter: camDiameterInput,
      camHeight: camHeightInput,
    };

    // Find the cupboard mesh using utility function
    const cupboardMesh = findMesh(scene, selectedObject.id);

    // Regenerate minifixes with the new settings
    if (cupboardMesh && cupboardMesh.userData.isMain) {
      updateMinifixesForCupboard(cupboardMesh);
    }
  }, [
    minifixDistanceInput,
    minifixDiameterHoleInput,
    camDepthInput,
    camDiameterInput,
    camHeightInput,
    scene,
    selectedObject,
    isFullCupboard,
  ]);

  useEffect(() => {
    if (isFullCupboard && !isQuickHideActive) {
      const topPlank = getTopPlank();
      if (topPlank && selectedObject) {
        // Find a vertical plank (side panel) to serve as reference depth
        const siblings = objects.filter((obj) => obj.parent === selectedObject?.id);
        const sidePanel = siblings.find((obj) => obj.type === PART_TYPES.VERTICAL_PLANK);
        // If no side panel, fallback to cupboard depth
        const referenceDepth =
          sidePanel?.dimensions?.depth ?? selectedObject.dimensions?.depth ?? 0;

        const plankDepth = topPlank.dimensions?.depth || 0;
        setTopPlankEnabled(plankDepth > referenceDepth + 1);
      }
    }
  }, [selectedObject, objects, isFullCupboard, isQuickHideActive]);

  const handleTopPlankToggle = () => {
    if (topPlankDisabled || !isLatestVersion) return;

    const topPlank = getTopPlank();
    if (!topPlank) return;

    const isEnabled = !topPlankEnabled;
    setTopPlankEnabled(isEnabled);

    const currentDepth = topPlank.dimensions?.depth || 0;
    // If enabling, add 20. If disabling, remove 20.
    const delta = isEnabled ? 20 : -20;
    const newDepth = currentDepth + delta;

    applyObjectUpdate(topPlank, {
      dimensions: { depth: newDepth },
      // Shift Z by half of delta to grow/shrink from front (assuming +Z is front)
      // If we want it to grow "outward" (usually front), and center shifts by +10.
      position: { z: (topPlank.position?.z || 0) + delta / 2 },
    });
  };

  const handleTopPlankDepthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const topPlank = getTopPlank();
    if (!topPlank) return;

    const newDepth = parseFloat(e.target.value);
    const currentDepth = topPlank.dimensions?.depth || 0;
    const delta = newDepth - currentDepth;

    applyObjectUpdate(topPlank, {
      dimensions: { depth: newDepth },
      position: { z: (topPlank.position?.z || 0) + delta / 2 },
    });
  };

  const handleSkirtingToggle = async () => {
    if (!selectedObject || !scene || isDisabled || !isLatestVersion) return;

    let targetMesh: THREE.Mesh | null = null;
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData.objectId === selectedObject.id) {
        targetMesh = obj;
      }
    });

    if (!targetMesh) return;

    try {
      const isEnabled = !selectedObject.skirtingEnabled;
      const defaultOffset = selectedObject.skirtingOffset ?? 10;
      const defaultHeight = selectedObject.skirtingHeight ?? 75;
      const updatePatch: any = {
        skirtingEnabled: isEnabled,
        skirtingOffset: defaultOffset,
        skirtingHeight: defaultHeight,
      };

      if (isEnabled) {
        // Turning skirting ON
        // Automatically turn off Nailer if it was on
        if (selectedObject.nailerEnabled) {
          updatePatch.nailerEnabled = false;
          await removeNailers(scene, targetMesh);
        }

        // We use 'No Base' (flush sides) as the foundation for skirting
        if (!selectedObject.noBaseEnabled) {
          await applyNoBase(scene, targetMesh, true);
        }

        await applyObjectUpdate(selectedObject, updatePatch);
        addSkirtingPlanks(targetMesh, { height: defaultHeight, offset: defaultOffset });
      } else {
        // Turning skirting OFF
        removeSkirtingPlanks(targetMesh);

        // If we want the normal extended base back
        if (!selectedObject.noBaseEnabled) {
          await applyNoBase(scene, targetMesh, false);
        }

        await applyObjectUpdate(selectedObject, updatePatch);
      }
    } catch (error) {
      console.error('Error toggling skirting:', error);
    }
  };

  // Skirting dynamic inputs
  const handleSkirtingOffsetChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedObject || !scene || !selectedObject.skirtingEnabled || isDisabled) return;
    const value = Number(e.target.value);
    if (Number.isNaN(value)) return;

    let targetMesh: THREE.Mesh | null = null;
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData.objectId === selectedObject.id) {
        targetMesh = obj;
      }
    });
    if (!targetMesh) return;

    const newOffset = value;
    const newHeight = selectedObject.skirtingHeight ?? 75;

    // Persist to store first
    await applyObjectUpdate(selectedObject, {
      skirtingOffset: newOffset,
      skirtingHeight: newHeight,
    });

    // Rebuild skirting
    removeSkirtingPlanks(targetMesh);
    addSkirtingPlanks(targetMesh, { height: newHeight, offset: newOffset });
  };

  const handleSkirtingHeightChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedObject || !scene || !selectedObject.skirtingEnabled || isDisabled) return;
    const value = Number(e.target.value);
    if (Number.isNaN(value)) return;

    let targetMesh: THREE.Mesh | null = null;
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData.objectId === selectedObject.id) {
        targetMesh = obj;
      }
    });
    if (!targetMesh) return;

    const newHeight = value;
    const newOffset = selectedObject.skirtingOffset ?? 10;

    // Persist to store first
    await applyObjectUpdate(selectedObject, {
      skirtingOffset: newOffset,
      skirtingHeight: newHeight,
    });

    // Rebuild skirting
    removeSkirtingPlanks(targetMesh);
    addSkirtingPlanks(targetMesh, { height: newHeight, offset: newOffset });
  };

  const handleNailerToggle = async () => {
    if (!isFullCupboard || isQuickHideActive || !selectedObject || !scene || !isLatestVersion)
      return;

    let targetMesh: THREE.Mesh | null = null;
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData.objectId === selectedObject.id) {
        targetMesh = obj;
      }
    });

    if (!targetMesh) return;

    try {
      const isEnabled = !selectedObject.nailerEnabled;
      const updatePatch: any = { nailerEnabled: isEnabled };

      if (isEnabled) {
        // Turning nailer ON -> automatically remove skirting planks.
        removeSkirtingPlanks(targetMesh);
        updatePatch.skirtingEnabled = false;
      }

      if (isEnabled && selectedObject.noBaseEnabled) {
        // If turning nailer ON, we must turn off "No Base".
        updatePatch.noBaseEnabled = false;
      } else if (!isEnabled) {
        // If turning nailer OFF, revert to "No Base" automatically if there are no extended side planks
        if (!hasExtendedSidePlanks(targetMesh)) {
          updatePatch.noBaseEnabled = true;
        }
      }

      await applyObjectUpdate(selectedObject, updatePatch);

      // Now conditionally execute 3D logic
      if (updatePatch.noBaseEnabled === false) {
        await applyNoBase(scene, targetMesh, false);
      } else if (updatePatch.noBaseEnabled === true) {
        await applyNoBase(scene, targetMesh, true);
      }

      if (isEnabled) {
        const defaultModel = selectedObject.nailerModel || 'stand_1';
        await addNailers(scene, targetMesh, defaultModel);
      } else {
        await removeNailers(scene, targetMesh);
      }
    } catch (error) {
      console.error('Error toggling nailer:', error);
    }
  };

  const handleNoBaseToggle = async () => {
    if (!isFullCupboard || isDisabled || !selectedObject || !scene) return;

    let targetMesh: THREE.Mesh | null = null;
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData.objectId === selectedObject.id) {
        targetMesh = obj;
      }
    });

    if (!targetMesh) return;

    try {
      const isEnabled = !selectedObject.noBaseEnabled;

      // We will batch the patch update for boolean changes
      const updatePatch: any = { noBaseEnabled: isEnabled };

      if (isEnabled) {
        // Remove skirting planks immediately
        removeSkirtingPlanks(targetMesh);
        updatePatch.skirtingEnabled = false;

        // Turn off Nailer if it was on
        if (selectedObject.nailerEnabled) {
          updatePatch.nailerEnabled = false;
        }
      }

      // Apply boolean toggles to Redux FIRST so it doesn't overwrite coordinate shifts
      await applyObjectUpdate(selectedObject, updatePatch);

      // THEN apply transformations that will shift the cupboard and update position coordinates
      if (isEnabled && selectedObject.nailerEnabled) {
        await removeNailers(scene, targetMesh);
      }

      // Execute side plank height adjustments based on no base status
      await applyNoBase(scene, targetMesh, isEnabled);
    } catch (error) {
      console.error('Error toggling no base:', error);
    }
  };

  const handleNailerModelChange = async (model: string) => {
    if (!scene || !selectedObject || !isFullCupboard || !isLatestVersion) return;

    let targetMesh: THREE.Mesh | null = null;
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData.objectId === selectedObject.id) {
        targetMesh = obj;
      }
    });

    if (targetMesh && selectedObject.nailerEnabled) {
      await addNailers(scene, targetMesh, model);
    }
  };

  // Determine which edges are valid for banding based on plank dimensions
  const getValidBandingEdges = (): Set<string> => {
    if (!selectedObject || !isPlankSelected || !scene || !bandingToolRef.current) {
      return new Set(['top', 'bottom', 'left', 'right', 'front', 'back']); // All enabled if no dimensions
    }

    // Find the mesh in the scene
    let targetMesh: THREE.Mesh | null = null;
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData.objectId === selectedObject.id) {
        targetMesh = obj;
      }
    });

    if (targetMesh) {
      return bandingToolRef.current.getValidBandingEdges(targetMesh);
    }

    return new Set(['top', 'bottom', 'left', 'right', 'front', 'back']);
  };

  const handleBandingToggle = async (
    edge: 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back',
    enabled: boolean
  ) => {
    if (!selectedObject || isDisabled || !isPlankSelected || !scene || !bandingToolRef.current)
      return;

    // Check if this edge is valid for banding based on plank dimensions
    const validEdges = getValidBandingEdges();
    if (!validEdges.has(edge)) {
      // Edge is not valid for this plank orientation, don't allow toggling
      return;
    }

    // Update local state
    const edgeStateSetters: Record<string, (val: boolean) => void> = {
      top: setBandingTop,
      bottom: setBandingBottom,
      left: setBandingLeft,
      right: setBandingRight,
      front: setBandingFront,
      back: setBandingBack,
    };
    edgeStateSetters[edge]?.(enabled);

    // Update Redux state
    const currentBanding = selectedObject.edgeBanding || {};
    const newBandingState = {
      ...currentBanding,
      [edge]: enabled,
    };

    // Update object in Redux
    applyObjectUpdate(selectedObject, {
      edgeBanding: newBandingState,
    });

    // Update 3D scene
    let targetMesh: THREE.Mesh | null = null;
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData.objectId === selectedObject.id) {
        targetMesh = obj;
      }
    });

    if (targetMesh) {
      // Find parent mesh
      let parentMesh: THREE.Mesh | null = null;
      if (selectedObject.parent) {
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh && obj.userData.objectId === selectedObject.parent) {
            parentMesh = obj;
          }
        });
      }

      // Get banding material
      const bandingMaterial = bandingToolRef.current.getBandingMaterial(
        targetMesh,
        { material: selectedObject.material, parent: selectedObject.parent },
        objects.map((obj) => ({ id: obj.id, material: obj.material }))
      );

      if (bandingMaterial) {
        // Use BandingTool to apply banding
        await bandingToolRef.current.applyBandingFromState(
          targetMesh,
          newBandingState,
          bandingMaterial,
          parentMesh,
          { material: selectedObject.material, id: selectedObject.id },
          objects.map((obj) => ({ id: obj.id, material: obj.material }))
        );
      } else if (!enabled) {
        // If no banding material but we're removing, just remove the edge
        const bandingThickness = 1.5; // Default thickness
        bandingToolRef.current.removeBandingOnEdge(
          targetMesh,
          edge,
          bandingThickness,
          selectedObject.id
        );
      } else {
        // If enabling but no banding material found, log warning
        console.warn('No banding material found for plank. Cannot add banding.');
      }
    }
  };

  const handleControlClick = (fieldName: string, idx: number) => {
    // Helper to toggle state: if same side clicked, turn off (null); otherwise set new side.
    const toggle = <T,>(current: T | null, target: T): T | null => {
      return current === target ? null : target;
    };
    if (fieldName === 'width') {
      // Index 0 -> 'left', Index 1 -> 'right'
      const target = idx === 0 ? 'left' : 'right';
      setWidthSide((prev) => toggle(prev, target));
    } else if (fieldName === 'height') {
      // Index 0 -> 'top', Index 1 -> 'bottom'
      const target = idx === 0 ? 'top' : 'bottom';
      setHeightSide((prev) => toggle(prev, target));
    } else if (fieldName === 'depth') {
      // Index 0 -> 'front', Index 1 -> 'back'
      const target = idx === 0 ? 'front' : 'back';
      setDepthSide((prev) => toggle(prev, target));
    }
  };

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    minifix: false,
    camlock: false,
    edgeBanding: false,
    material: false,
    layout: false,
    shelfs: false,
    positionMove: false,
    mainPosition: false,
    topPlank: false,
    base: false,
    plankBanding: false,
  });

  const validBandingEdges = getValidBandingEdges();

  const edgeBandingOptions = [
    [
      { key: 'top', label: 'Top', checked: bandingTop, disabled: !validBandingEdges.has('top') },
      {
        key: 'bottom',
        label: 'Bottom',
        checked: bandingBottom,
        disabled: !validBandingEdges.has('bottom'),
      },
      {
        key: 'left',
        label: 'Left',
        checked: bandingLeft,
        disabled: !validBandingEdges.has('left'),
      },
    ],
    [
      {
        key: 'right',
        label: 'Right',
        checked: bandingRight,
        disabled: !validBandingEdges.has('right'),
      },
      {
        key: 'front',
        label: 'Front',
        checked: bandingFront,
        disabled: !validBandingEdges.has('front'),
      },
      {
        key: 'back',
        label: 'Back',
        checked: bandingBack,
        disabled: !validBandingEdges.has('back'),
      },
    ],
  ];

  const toggleSection = (key: string) => {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const positionFields = [
    {
      label: 'Left',
      direction: 'left',
      rotate: 'rotate-[-90deg]',
      width: 'w-[5.1rem]',
      value: positionDistances.left,
      disabled: isDisabled,
      onChange: handlePositionDistanceChange,
    },
    {
      label: 'Right',
      direction: 'right',
      rotate: 'rotate-[-90deg]',
      width: 'w-[5.1rem]',
      value: positionDistances.right,
      disabled: isDisabled,
      onChange: handlePositionDistanceChange,
    },
    {
      label: 'Top',
      direction: 'top',
      rotate: '',
      width: 'w-[5.1rem]',
      value: positionDistances.top,
      disabled: isDisabled,
      onChange: handlePositionDistanceChange,
    },
    {
      label: 'Bottom',
      direction: 'bottom',
      rotate: 'rotate-[180deg]',
      width: 'w-[5.1rem]',
      value: positionDistances.bottom,
      disabled: isDisabled,
      onChange: handlePositionDistanceChange,
    },
  ];

  return (
    <div
      ref={sidebarRef}
      className={
        isSidebarOpen
          ? `absolute top-[3.7rem] right-[0] bottom-[0] z-[10] mt-[0.3rem] block h-[91vh] w-[15rem] overflow-x-hidden overflow-y-auto rounded-t-[0.6rem] bg-[var(--primary-white)] pb-[0.5rem] [&::-webkit-scrollbar]:w-[0.3rem] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[rgba(57,37,121,0)] hover:[&::-webkit-scrollbar-thumb]:bg-[rgba(57,37,121,0.25)] [&::-webkit-scrollbar-track]:bg-transparent`
          : `absolute top-[3.7rem] right-[0] bottom-[0] z-[10] mt-[0.3rem] block h-auto w-[15rem] overflow-y-auto rounded-t-[0.6rem] bg-transparent [&::-webkit-scrollbar]:w-[0.3rem] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[rgba(57,37,121,0)] hover:[&::-webkit-scrollbar-thumb]:bg-[rgba(57,37,121,0.25)] [&::-webkit-scrollbar-track]:bg-transparent`
      }
    >
      {/* ================= TITLE ================= */}
      <div
        onClick={toggleSidebar}
        className={`fixed right-[0] z-[20] mt-[0.3rem] flex h-[1.8rem] w-[15rem] cursor-pointer items-center justify-around gap-[1rem] rounded-t-[0.6rem] bg-[var(--primary-color)] ${isSidebarOpen ? 'top-[3.7rem] right-[0]' : 'right-[0] bottom-[0]'} `}
      >
        <p className="ml-[0rem] text-center text-[0.7rem] leading-[10px] font-[700] tracking-normal text-[var(--primary-white)]">
          {getSidebarTitle()}
        </p>

        <img
          src={assets.up_arrow}
          className={`h-[1rem] w-[1rem] transition-transform duration-200 ${isSidebarOpen ? 'rotate-180' : 'rotate-0'} `}
          alt="Toggle sidebar"
        />
      </div>

      {!isSidebarOpen && null}

      {isSidebarOpen && (
        <>
          {/* ================= SWITCH ================= */}
          <div className="mt-[2.1rem] ml-[0.8rem] flex h-[1.5rem] gap-[0.5rem]">
            {selectedObject?.type !== OBJECT_TYPES.MODEL && (
              <button
                onClick={handleSetting}
                className={`w-[4rem] border-[0rem] p-[0rem] font-[comfortaa] text-[0.7rem] active:bg-[var(--toolbarhover-color)] ${
                  isSettingOpen
                    ? 'rounded-[0.1rem] bg-[var(--toolbarhover-color)] px-4 py-2 text-[var(--primary-color)]'
                    : 'bg-transparent text-[rgba(160,174,192,1)] hover:text-[var(--primary-color)]'
                } `}
              >
                Setting
              </button>
            )}

            <button
              onClick={handleNavigation}
              className={`w-[4.5rem] border-[0rem] p-[0rem] font-[poppins] text-[0.7rem] active:bg-[var(--toolbarhover-color)] ${
                isNavOpen
                  ? 'rounded-[0.1rem] bg-[var(--toolbarhover-color)] px-4 py-2 text-[var(--primary-color)]'
                  : 'bg-transparent text-[rgba(160,174,192,1)] hover:text-[var(--primary-color)]'
              } `}
            >
              Navigation
            </button>
          </div>

          <hr className="my-[0.2rem] opacity-20" />

          {/* ================= NAV IMAGE ================= */}
          {isNavOpen && (
            <div className="mx-auto mt-4 w-[12rem]">
              {selectedObject?.type === OBJECT_TYPES.MODEL ? (
                <div className="rounded-[0.4rem] border-[0.1rem] border-[var(--primary-color)] bg-[var(--primary-white)] p-[0.6rem] shadow-sm">
                  <p className="mb-[0.6rem] text-center text-[0.75rem] font-[700] text-[var(--primary-color)]">
                    Model Tools
                  </p>
                  <ul className="space-y-[0.4rem] pl-[0.3rem] text-[0.65rem] text-[var(--primary-color)]">
                    <li className="flex gap-[0.4rem]">
                      <b className="w-[3.5rem] text-right">Ctrl + G</b> <span>Position</span>
                    </li>
                    <li className="flex gap-[0.4rem]">
                      <b className="w-[3.5rem] text-right">Ctrl + E</b> <span>Rotation</span>
                    </li>
                    <li className="flex gap-[0.4rem]">
                      <b className="w-[3.5rem] text-right">Ctrl + S</b> <span>Scale</span>
                    </li>
                  </ul>
                </div>
              ) : (
                <img src={assets.navigationdetail} className="w-full" />
              )}
            </div>
          )}

          {/* ================= NO SELECTION ================= */}
          {isSettingOpen && !selectedObject && !isInvisibleBox && (
            <p className="mt-8 text-center text-[0.8rem] text-[#392579]">No Item Selected</p>
          )}

          {/* ================= INVISIBLE BOX ================= */}
          {isSettingOpen && isInvisibleBox && (
            <p className="mt-8 text-center text-[0.8rem] text-[#392579]">
              Add parts to see properties
            </p>
          )}

          {/* ================= SETTINGS ================= */}
          {isSettingOpen && selectedObject && (
            <>
              {/* your existing code – NO CHANGES inside */}
              <div className="w-[15rem] bg-white p-3 shadow-sm">
                {/* ================= WALL PROPERTIES ================= */}
                {isWallSelected && (
                  <>
                    {/* Wall – Layout (Dimensions) */}
                    <div className="mb-[0rem] ml-[1rem] pb-[0rem]">
                      <div className="mb-[0rem] flex items-center justify-between">
                        <p className="text-[0.7rem] font-[700] text-[var(--primary-color)]">
                          Wall Layout
                        </p>
                        <button
                          onClick={() => toggleSection('layout')}
                          className="mr-[0.75rem] flex h-[0.8rem] w-[0.8rem] flex-shrink-0 items-center justify-center border-0 bg-[var(--primary-white)] p-0"
                        >
                          <img
                            src={collapsed.layout ? assets.plusIcon : assets.minusIcon}
                            alt={collapsed.layout ? 'Expand' : 'Collapse'}
                            className="h-[0.8rem] w-[0.8rem]"
                          />
                        </button>
                      </div>

                      {!collapsed.layout && (
                        <div className="mt-[0rem] mr-[0rem] grid grid-cols-2 gap-[0.4rem]">
                          {/* Height only for wall */}
                          <div className="flex flex-col gap-[0.2rem]">
                            <p className="mb-[0rem] text-[0.6rem] font-[700] text-[var(--primary-color)]">
                              Height
                            </p>
                            <SidebarInput
                              min={1}
                              step="1"
                              value={dimensionsUI.height ?? ''}
                              onUpdate={(val) => handleDimensionChange('height', Math.max(1, val))}
                              disabled={isDisabled}
                              className="h-[1.2rem] w-[5rem] [appearance:textfield] rounded-[0.1rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <hr className="mx-[0.2rem] my-[0.3rem] ml-[0rem] w-[15rem] pl-[0rem] opacity-20" />

                    {/* Wall – Texture */}
                    <div className="mr-[0rem] ml-[1rem] flex flex-col gap-[0rem]">
                      <div className="mt-[0rem] flex gap-[0rem]">
                        <div className="flex-1">
                          <p className="m-[0.5rem] ml-[0rem] text-[0.6rem] font-[700] text-[var(--primary-color)]">
                            Wall Texture
                          </p>
                        </div>
                      </div>

                      <div className="mt-[0rem] flex gap-[1rem]">
                        {/* Select Texture Button */}
                        <button
                          onClick={toggleTextureList}
                          disabled={isDisabled}
                          className={`flex h-[1.3rem] w-[5rem] flex-1 cursor-pointer appearance-none items-center justify-between rounded-[0.1rem] border-[0rem] bg-[var(--primary-color)] p-[0rem] px-[0.2rem] text-left font-[comfortaa] text-[0.5rem] font-[var(--font-family)] font-extralight text-[var(--primary-white)] transition-colors duration-200 ease-in-out ${
                            isDisabled ? 'cursor-not-allowed opacity-50' : ''
                          }`}
                        >
                          Select Texture
                          <img src={assets.down_arrow1} className="h-[0.6rem] w-[0.6rem]" />
                        </button>
                      </div>
                    </div>

                    <hr className="mx-[0.2rem] my-[0.3rem] ml-[0rem] w-[15rem] pl-[0rem] opacity-20" />
                  </>
                )}
                {/* ================= Minifix & Grooving ================= */}
                {!isWallSelected && (
                  <>
                    <div className="mb-[0rem] ml-[1rem] pb-[0rem]">
                      {/* Header */}
                      <div className="mb-[0rem] flex items-center justify-between">
                        <p className="text-[0.7rem] font-[600] text-[var(--primary-color)]">
                          Minifix & Grooving
                        </p>
                        <button
                          onClick={() => toggleSection('minifix')}
                          className="boredr-[0rem] mr-[1rem] border-0 bg-[var(--primary-white)] text-[0.9rem] text-[var(--primary-color)]"
                        >
                          {collapsed.minifix ? '+' : '−'}
                        </button>
                      </div>
                      {!collapsed.minifix && (
                        <>
                          {/* ================= Split Inputs ================= */}
                          <div className="flex gap-[0.75rem]">
                            {/* -------- LEFT PART -------- */}
                            <div className="flex w-[6rem] flex-col">
                              {/* Toggle */}
                              <div className="ml-[0rem] flex items-center gap-[1rem]">
                                <div
                                  onClick={handleMinifixToggle}
                                  className={`relative h-[1rem] w-[2rem] cursor-pointer rounded-full border-[0.1rem] border-[var(--toggle-border-color)] p-[0rem] transition-colors duration-300 ${minifixEnabled ? 'bg-[var(--primary-color)]' : 'bg-[var(--primary-white)]'} ${minifixDisabled ? 'pointer-events-none opacity-50' : ''}`}
                                >
                                  {/* Knob */}
                                  <div
                                    className={`absolute top-[0.15rem] left-[0.1rem] h-[0.6rem] w-[0.6rem] rounded-full border-[0.1rem] border-[var(--toggle-button-border-color)] p-[0rem] ring-[0.1rem] transition-transform duration-300 ease-in-out ${
                                      minifixEnabled
                                        ? 'translate-x-[1rem] bg-[var(--primary-white)] ring-[var(--primary-color)]'
                                        : 'translate-x-0 bg-[var(--primary-color)] ring-[var(--primary-white)]'
                                    }`}
                                  />
                                </div>
                                <p className="mb-[1remrem] text-[0.6rem] font-[700] text-[var(--primary-color)]">
                                  Minifix
                                </p>
                              </div>

                              {/* Distance */}
                              <div className="mt-[0rem]">
                                <p className="mt-[0.2rem] mb-[0.2rem] text-[0.6rem] font-[700] text-[var(--primary-color)]">
                                  Distance
                                </p>
                                <input
                                  type="number"
                                  disabled={isDisabled}
                                  value={minifixDistanceInput}
                                  onChange={(e) => {
                                    const value = Number(e.target.value);
                                    setMinifixDistanceInput(value);

                                    if (value % 32 !== 0) {
                                      toast(
                                        ({ closeToast }) => (
                                          <CustomToast
                                            appearance="error"
                                            message="Distance must be in multiple of 32"
                                            closeToast={closeToast}
                                          />
                                        ),
                                        {
                                          position: 'top-center',
                                          autoClose: 3000,
                                          hideProgressBar: true, // as per user pref or default
                                          closeButton: false,
                                          icon: false,
                                          className:
                                            '!overflow-hidden !rounded-[0.75rem] !border !border-[var(--primary-color)] !bg-white !p-0',
                                          style: { padding: 0, minHeight: 'auto' },
                                        }
                                      );
                                      return;
                                    }

                                    // Save to cupboard object if it's a full cupboard
                                    if (selectedObject && isFullCupboard) {
                                      dispatch(
                                        updateObject({
                                          id: selectedObject.id,
                                          minifixDistance: value,
                                        })
                                      );
                                    } else {
                                      dispatch(setActiveItemMinifixDistance(value));
                                    }
                                  }}
                                  className="h-[1.2rem] w-[5rem] [appearance:textfield] appearance-none rounded-[0.1rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                                <p className="mt-[0rem] items-center text-center text-[0.4rem] font-[700] text-[var(--primary-color)]">
                                  in multiple of 32
                                </p>
                              </div>

                              {/* Diameter Hole */}
                              <div className="">
                                <p className="mt-[0rem] mb-[0.2rem] text-[0.6rem] font-[700] text-[var(--primary-color)]">
                                  Diameter Hole
                                </p>
                                <input
                                  type="number"
                                  disabled={!minifixEnabled || isDisabled}
                                  value={minifixDiameterHoleInput}
                                  onChange={(e) => {
                                    const value = Number(e.target.value);
                                    setMinifixDiameterHoleInput(value);
                                    // Save to cupboard object if it's a full cupboard
                                    if (selectedObject && isFullCupboard) {
                                      dispatch(
                                        updateObject({
                                          id: selectedObject.id,
                                          minifixDiameterHole: value,
                                        })
                                      );
                                    } else {
                                      dispatch(setActiveItemMinifixDiameterHole(value));
                                    }
                                  }}
                                  className="h-[1.2rem] w-[5rem] [appearance:textfield] appearance-none rounded-[0.1rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                              </div>
                            </div>

                            {/* -------- VERTICAL DIVIDER -------- */}
                            <hr className="mr-[0.3rem] ml-[0.2rem] h-[7rem] w-[0.2px] border-[0rem] bg-[var(--table-title-border-color)] p-[0rem]" />

                            {/* -------- RIGHT PART -------- */}
                            <div className="disabled mr-[0.7rem] flex w-[6rem] flex-col">
                              {/* Toggle */}
                              <div className="flex items-center gap-[0.5rem]">
                                <div
                                  className={`pointer-events-none relative h-[1rem] w-[2rem] cursor-not-allowed rounded-full border-[0.1rem] border-[var(--toggle-border-color)] bg-[var(--primary-white)] opacity-50`}
                                >
                                  {/* Knob */}
                                  <div className="absolute top-[0.15rem] left-[0.1rem] h-[0.6rem] w-[0.6rem] rounded-full border-[0.1rem] border-[var(--border-color)] bg-[var(--primary-color)]" />
                                </div>

                                <p className="text-[0.6rem] font-[700] text-[var(--primary-color)] opacity-50">
                                  Grooving
                                </p>
                              </div>

                              {/* Inside */}
                              <div>
                                <p className="mt-[0.2rem] mb-[0.2rem] text-[0.6rem] font-[700] text-[var(--primary-color)]">
                                  Inside
                                </p>
                                <input
                                  type="number"
                                  disabled={true}
                                  // value={inside}
                                  // onChange={(e) => setInside(Number(e.target.value))}
                                  className="h-[1.2rem] w-[5rem] [appearance:textfield] appearance-none rounded-[0.1rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                              </div>

                              {/* Edge to End */}
                              <div>
                                <p className="mt-[0.8rem] mb-[0.2rem] text-[0.6rem] font-[500] text-[var(--primary-color)]">
                                  Edge to End
                                </p>
                                <input
                                  type="number"
                                  disabled={true}
                                  // value={edgeToEnd}
                                  // onChange={(e) => setEdgeToEnd(Number(e.target.value))}
                                  className="h-[1.2rem] w-[5rem] [appearance:textfield] appearance-none rounded-[0.1rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <hr className="mx-[0.2rem] my-[0.2rem] ml-[0rem] w-[15rem] pl-[0rem] opacity-20" />

                    {/* ================= Camlock Screw Hole ================= */}
                    <div className="mt-[0] mb-[0.7rem] ml-[1rem] flex flex-col">
                      <div className="flex items-center justify-between gap-[0.5rem]">
                        <p className="mb-[0] flex flex-1 text-[0.7rem] font-[700] text-[var(--primary-color)]">
                          Camlock Screw Hole
                        </p>
                        <button
                          onClick={() => toggleSection('camlock')}
                          className="mr-[1rem] flex h-[0.8rem] w-[0.8rem] flex-shrink-0 items-center justify-center border-0 bg-[var(--primary-white)] p-0"
                        >
                          <img
                            src={collapsed.camlock ? assets.plusIcon : assets.minusIcon}
                            alt={collapsed.camlock ? 'Expand' : 'Collapse'}
                            className="h-[0.8rem] w-[0.8rem]"
                          />
                        </button>
                      </div>
                      {!collapsed.camlock && (
                        <>
                          <div className="mt-[1rem] mb-[0rem] flex gap-[0.5rem] font-[700]">
                            <div>
                              <p className="mt-[0rem] mb-[0.2rem] text-[0.5rem] text-[var(--primary-color)]">
                                Diameter
                              </p>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  disabled={!minifixEnabled || isDisabled}
                                  value={camDiameterInput}
                                  onChange={(e) => {
                                    const value = Number(e.target.value);
                                    setCamDiameterInput(value);
                                    // Save to cupboard object if it's a full cupboard
                                    if (selectedObject && isFullCupboard) {
                                      dispatch(
                                        updateObject({ id: selectedObject.id, camDiameter: value })
                                      );
                                    } else {
                                      dispatch(setActiveItemCamDiameter(value));
                                    }
                                  }}
                                  className="h-[1.2rem] w-[3.57rem] [appearance:textfield] appearance-none rounded-[0.1rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                              </div>
                            </div>

                            <div>
                              <p className="mt-[0rem] mb-[0.2rem] text-[0.5rem] text-[var(--primary-color)]">
                                Depth
                              </p>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  disabled={!minifixEnabled || isDisabled}
                                  value={camDepthInput}
                                  onChange={(e) => {
                                    const value = Number(e.target.value);
                                    setCamDepthInput(value);
                                    // Save to cupboard object if it's a full cupboard
                                    if (selectedObject && isFullCupboard) {
                                      dispatch(
                                        updateObject({ id: selectedObject.id, camDepth: value })
                                      );
                                    } else {
                                      dispatch(setActiveItemCamDepth(value));
                                    }
                                  }}
                                  className="h-[1.2rem] w-[3.57rem] [appearance:textfield] appearance-none rounded-[0.1rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                              </div>
                            </div>

                            <div>
                              <p className="mt-[0rem] mb-[0.2rem] text-[0.5rem] text-[var(--primary-color)]">
                                Height
                              </p>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  disabled={!minifixEnabled || isDisabled}
                                  value={camHeightInput}
                                  onChange={(e) => {
                                    const value = Number(e.target.value);
                                    setCamHeightInput(value);
                                    // Save to cupboard object if it's a full cupboard
                                    if (selectedObject && isFullCupboard) {
                                      dispatch(
                                        updateObject({ id: selectedObject.id, camHeight: value })
                                      );
                                    } else {
                                      dispatch(setActiveItemCamHeight(value));
                                    }
                                  }}
                                  className="h-[1.2rem] w-[3.57rem] [appearance:textfield] appearance-none rounded-[0.1rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
              {!isQuickHideActive && isSettingOpen && isPlankSelected && !isWallSelected && (
                <>
                  <div className="mt-[0] mb-[0.7rem] ml-[1rem] flex flex-col gap-[0.5rem]">
                    <div className="flex items-center justify-between gap-[0.5rem]">
                      <p className="mb-[0] flex flex-1 text-[0.7rem] font-[700] text-[var(--primary-color)]">
                        Shelf
                      </p>
                      <button
                        onClick={() => toggleSection('shelf')}
                        className="mr-[0.75rem] flex h-[0.8rem] w-[0.8rem] flex-shrink-0 items-center justify-center border-0 bg-[var(--primary-white)] p-0"
                      >
                        <img
                          src={collapsed.shelf ? assets.plusIcon : assets.minusIcon}
                          alt={collapsed.shelf ? 'Expand' : 'Collapse'}
                          className="h-[0.8rem] w-[0.8rem]"
                        />
                      </button>
                    </div>
                    {!collapsed.shelf && (
                      <>
                        <div className="flex items-center gap-[1.8rem]">
                          <p className="mt-[0px] mb-[0px] text-[0.56rem] font-[700] text-[var(--primary-color)]">
                            Shelves Inner Distance
                          </p>
                          <div className="flex items-center gap-[1rem]">
                            <input
                              type="number"
                              min={0}
                              max={25}
                              value={shelvesInnerDistance.toFixed(2)}
                              onChange={(e) =>
                                handleShelvesInnerDistanceChange(Number(e.target.value))
                              }
                              disabled={isDisabled}
                              className="h-[1.2rem] w-[4rem] [appearance:textfield] appearance-none rounded-[0.1rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <hr className="mx-[0.2rem] my-[0.2rem] ml-[0rem] w-[15rem] pl-[0rem] opacity-20" />
                </>
              )}

              {/* Edge Banding Controls for Planks */}
              {!isQuickHideActive && isSettingOpen && isPlankSelected && !isWallSelected && (
                <>
                  <div className="mt-[0] mb-[0.7rem] ml-[1rem] flex flex-col gap-[0.5rem]">
                    <div className="flex items-center justify-between gap-[0.5rem]">
                      <p className="mb-[0] flex flex-1 text-[0.7rem] font-[700] text-[var(--primary-color)]">
                        Edge Banding
                      </p>
                      <button
                        onClick={() => toggleSection('plankBanding')}
                        className="mr-[0.75rem] flex h-[0.8rem] w-[0.8rem] flex-shrink-0 items-center justify-center border-0 bg-[var(--primary-white)] p-0"
                      >
                        <img
                          src={collapsed.plankBanding ? assets.plusIcon : assets.minusIcon}
                          alt={collapsed.plankBanding ? 'Expand' : 'Collapse'}
                          className="h-[0.8rem] w-[0.8rem]"
                        />
                      </button>
                    </div>
                    {!collapsed.plankBanding && (
                      <>
                        <div className="flex flex-col gap-[0.4rem]">
                          {edgeBandingOptions.map((row, rowIndex) => (
                            <div key={rowIndex} className="flex items-center justify-between">
                              {row.map((item) => (
                                <div
                                  key={item.key}
                                  className="flex w-[4rem] items-center gap-[0.1rem]"
                                >
                                  <input
                                    type="checkbox"
                                    checked={item.checked}
                                    onChange={(e) =>
                                      handleBandingToggle(
                                        item.key as
                                          | 'top'
                                          | 'bottom'
                                          | 'left'
                                          | 'right'
                                          | 'front'
                                          | 'back',
                                        e.target.checked
                                      )
                                    }
                                    disabled={isDisabled || item.disabled}
                                    className="h-[0.9rem] w-[0.9rem] cursor-pointer rounded border-[0.1rem] border-[var(--border-color)] accent-[var(--primary-color)] disabled:opacity-50"
                                  />
                                  <p
                                    className={`text-[0.6rem] font-[700] ${item.disabled ? 'text-[var(--border-color)] opacity-50' : 'text-[var(--primary-color)]'}`}
                                  >
                                    {item.label}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <hr className="mx-[0.2rem] my-[0.2rem] ml-[0rem] w-[15rem] pl-[0rem] opacity-20" />
                </>
              )}

              {!isQuickHideActive &&
                isSettingOpen &&
                isFullCupboardorPlankSelected &&
                !isWallSelected && (
                  <>
                    {sideBarMenuConfig.map((menu) => (
                      <div key={menu.subMenu}>
                        {/* HEADER */}
                        <div className="mb-[0rem] ml-[1rem] flex flex-col">
                          <div className="mb-[0rem] flex items-center justify-between gap-[0.5rem]">
                            <p className="flex-1 text-[0.7rem] font-[700] text-[var(--primary-color)]">
                              {menu.title}
                            </p>
                            <button
                              onClick={() => toggleSection('layout')}
                              className="mr-[0.75rem] flex h-[0.8rem] w-[0.8rem] flex-shrink-0 items-center justify-center border-0 bg-[var(--primary-white)] p-0"
                            >
                              <img
                                src={collapsed.layout ? assets.plusIcon : assets.minusIcon}
                                alt={collapsed.layout ? 'Expand' : 'Collapse'}
                                className="h-[0.8rem] w-[0.8rem]"
                              />
                            </button>
                          </div>
                          {!collapsed.layout && (
                            <>
                              {/* PLANK LAYOUT - STACKED WITH CONTROLS */}
                              {(isPlankSelected || isPlatformSelected) && (
                                <div className="flex flex-col gap-[0.6rem]">
                                  {menu.fields.map((field) => (
                                    <div
                                      key={field.name}
                                      className="flex flex-row items-start justify-between gap-[0rem]"
                                    >
                                      {/* LEFT SIDE */}
                                      <div className="flex items-center justify-between gap-[0rem]">
                                        {/* LEFT: LABEL */}
                                        <p className="w-[3.5rem] text-[0.6rem] font-[700] text-[var(--primary-color)]">
                                          {field.label}
                                        </p>

                                        {field.controls && (
                                          <div className="ml-[0rem] flex gap-[0.65rem] rounded-[0.25rem] bg-[#f2f2f2] p-[0.15rem]">
                                            {controlIconMap[field.name]?.map((icon, idx) => {
                                              let isActive = false;
                                              if (field.name === 'width') {
                                                isActive =
                                                  (idx === 0 && widthSide === 'left') ||
                                                  (idx === 1 && widthSide === 'right');
                                              } else if (field.name === 'height') {
                                                isActive =
                                                  (idx === 0 && heightSide === 'top') ||
                                                  (idx === 1 && heightSide === 'bottom');
                                              } else if (field.name === 'depth') {
                                                isActive =
                                                  (idx === 0 && depthSide === 'front') ||
                                                  (idx === 1 && depthSide === 'back');
                                              }

                                              return (
                                                <button
                                                  key={idx}
                                                  type="button"
                                                  onClick={() =>
                                                    handleControlClick(field.name, idx)
                                                  }
                                                  className={`bg-[rgba(242, 242, 242, 1)] flex h-[1.2rem] w-[1.2rem] items-center justify-center rounded-[0.15rem] border-[0.1rem] p-[0rem] transition-all duration-150 ${
                                                    isActive
                                                      ? 'border-[0rem] border-[var(--border-color)] bg-[white]'
                                                      : 'bg-[rgba(242, 242, 242, 1)] border-[0rem] border-transparent hover:bg-[#eaeaea]'
                                                  } `}
                                                >
                                                  <img
                                                    src={icon}
                                                    alt="control"
                                                    className="h-[0.55rem] w-[0.55rem] cursor-pointer object-contain"
                                                  />
                                                </button>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>

                                      {/* RIGHT SIDE INPUT */}
                                      {field.type === 'select' ? (
                                        <select
                                          value={field.value ?? ''}
                                          onChange={(e) =>
                                            field.onValueChange(Number(e.target.value))
                                          }
                                          disabled={field.disabled}
                                          className="mt-[0.25rem] mr-[1rem] h-[1.2rem] w-[3.5rem] cursor-pointer rounded-[0.1rem] border-[0.1rem] border-[var(--border-color)] bg-white p-[0rem] pl-[0.1rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none"
                                        >
                                          {field.options?.map((opt) => (
                                            <option key={opt} value={opt}>
                                              {opt}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <SidebarInput
                                          min={field.min}
                                          step={1}
                                          value={field.value ?? ''}
                                          onUpdate={field.onValueChange}
                                          disabled={field.disabled}
                                          className="mt-[0.25rem] mr-[1rem] h-[1.2rem] w-[3.5rem] [appearance:textfield] items-center justify-between rounded-[0.1rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                        />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* CUPBOARD LAYOUT - 2x2 GRID */}
                              {!isPlankSelected && !isPlatformSelected && (
                                <div className="mt-[0rem] mr-[0rem] grid grid-cols-2 gap-[0rem]">
                                  {/* Width */}
                                  <div className="flex flex-col gap-[0.2rem]">
                                    <p className="mb-[0rem] text-[0.6rem] font-[700] text-[var(--primary-color)]">
                                      Width
                                    </p>
                                    <SidebarInput
                                      min={1}
                                      step="1"
                                      value={dimensionsUI.width ?? ''}
                                      onUpdate={(val) =>
                                        handleDimensionChange('width', Math.max(1, val))
                                      }
                                      disabled={isHorizontalPlank || isDisabled}
                                      className="h-[1.2rem] w-[5rem] [appearance:textfield] rounded-[0.1rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    />
                                  </div>

                                  {/* Height */}
                                  <div className="flex flex-col gap-[0.2rem]">
                                    <p className="mb-[0rem] text-[0.6rem] font-[700] text-[var(--primary-color)]">
                                      Height
                                    </p>
                                    <SidebarInput
                                      min={1}
                                      step="1"
                                      value={dimensionsUI.height ?? ''}
                                      onUpdate={(val) =>
                                        handleDimensionChange('height', Math.max(1, val))
                                      }
                                      disabled={isVerticalPlank || isDisabled}
                                      className="h-[1.2rem] w-[5rem] [appearance:textfield] rounded-[0.1rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    />
                                  </div>

                                  {/* Depth */}
                                  <div className="flex flex-col gap-[0.2rem]">
                                    <p className="mb-[0rem] text-[0.6rem] font-[700] text-[var(--primary-color)]">
                                      Depth
                                    </p>
                                    <SidebarInput
                                      min={1}
                                      step="1"
                                      value={dimensionsUI.depth ?? ''}
                                      onUpdate={(val) =>
                                        handleDimensionChange('depth', Math.max(1, val))
                                      }
                                      disabled={isQuickHideActive}
                                      className="h-[1.2rem] w-[5rem] [appearance:textfield] rounded-[0.1rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    />
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        <hr className="my-[0.4rem] opacity-20" />
                      </div>
                    ))}
                  </>
                )}
              {!isQuickHideActive && isSettingOpen && isPlankSelected && !isWallSelected && (
                <>
                  <div className="mb-[0.7rem] ml-[1rem] flex flex-col gap-[0.5rem]">
                    <div className="flex items-center justify-between gap-[0.5rem]">
                      {/* Title */}
                      <p className="mt-[0rem] mb-[0rem] flex-1 text-[0.7rem] font-[700] text-[var(--primary-color)]">
                        Position Move
                      </p>
                      <button
                        onClick={() => toggleSection('positionMove')}
                        className="mr-[0.75rem] flex h-[0.8rem] w-[0.8rem] flex-shrink-0 items-center justify-center border-0 bg-[var(--primary-white)] p-0"
                      >
                        <img
                          src={collapsed.positionMove ? assets.plusIcon : assets.minusIcon}
                          alt={collapsed.positionMove ? 'Expand' : 'Collapse'}
                          className="h-[0.8rem] w-[0.8rem]"
                        />
                      </button>
                    </div>
                    {!collapsed.positionMove && (
                      <>
                        <div className="grid grid-cols-2 gap-[0.4rem]">
                          {positionFields.map((field) => (
                            <DistanceInput
                              label={field.label}
                              direction={field.direction}
                              rotate={field.rotate}
                              width={field.width}
                              value={field.value}
                              disabled={field.disabled}
                              onChange={handlePositionDistanceChange}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <hr className="mx-[0.2rem] my-[0.2rem] ml-[0rem] w-[15rem] pl-[0rem] opacity-20" />
                </>
              )}

              {/* ================= Main Object Position ================= */}
              {!isQuickHideActive && isSettingOpen && isMainObject && (
                <>
                  <div className="mb-[0.7rem] ml-[1rem] flex flex-col gap-[0.5rem]">
                    <div className="flex items-center justify-between gap-[0.5rem]">
                      {/* Title */}
                      <p className="mt-[0rem] mb-[0rem] flex-1 text-[0.7rem] font-[700] text-[var(--primary-color)]">
                        Position
                      </p>
                      <button
                        onClick={() => toggleSection('mainPosition')}
                        className="mr-[0.75rem] flex h-[0.8rem] w-[0.8rem] flex-shrink-0 items-center justify-center border-0 bg-[var(--primary-white)] p-0"
                      >
                        <img
                          src={collapsed.mainPosition ? assets.plusIcon : assets.minusIcon}
                          alt={collapsed.mainPosition ? 'Expand' : 'Collapse'}
                          className="h-[0.8rem] w-[0.8rem]"
                        />
                      </button>
                    </div>
                    {!collapsed.mainPosition && (
                      <div className="grid grid-cols-2 gap-[0.4rem]">
                        {['x', 'y', 'z'].map((axis) => (
                          <div key={axis} className="flex flex-col gap-[0.2rem]">
                            <p className="mb-[0rem] text-[0.6rem] font-[700] text-[var(--primary-color)] uppercase">
                              {axis}
                            </p>
                            <input
                              type="number"
                              step="0.01"
                              value={Number(
                                selectedObject?.position?.[axis as 'x' | 'y' | 'z'] ?? 0
                              ).toFixed(2)}
                              onChange={(e) =>
                                handleMainObjectPositionChange(
                                  axis as 'x' | 'y' | 'z',
                                  Number(e.target.value)
                                )
                              }
                              disabled={isDisabled}
                              className="h-[1.2rem] w-[5rem] [appearance:textfield] rounded-[0.1rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <hr className="mx-[0.2rem] my-[0.2rem] ml-[0rem] w-[15rem] pl-[0rem] opacity-20" />
                </>
              )}

              {/* ================= Handle/Handleless Selector ================= */}
              {!isQuickHideActive && isSettingOpen && isFullCupboard && (
                <>
                  <div className="mt-[0] mb-[0.7rem] ml-[1rem] flex items-center gap-[4rem]">
                    <div className="flex items-center justify-between">
                      <p className="mt-[0.4rem] mb-[0] flex text-[0.7rem] font-[700] text-[var(--primary-color)]">
                        Handle Mode
                      </p>
                    </div>
                    <div className="flex items-center gap-[0.5rem]">
                      <select
                        className="mt-[0.5rem] flex h-[1.3rem] w-[3.8rem] cursor-pointer appearance-none items-center justify-between rounded-[0.1rem] border-[0rem] bg-[var(--primary-color)] p-[0rem] px-[0.5rem] text-left font-[comfortaa] font-[poppins] text-[0.6rem] font-[var(--font-family)] font-extralight text-[var(--primary-white)] transition-colors duration-200 ease-in-out"
                        value={handleMode}
                        onChange={(e) => {
                          const value = e.target.value as 'handle' | 'handleless';
                          handleHandleModeChange(value);
                        }}
                        disabled={isDisabled}
                      >
                        <option value="handle">Handle</option>
                        <option value="handleless">Handleless</option>
                      </select>
                    </div>
                  </div>
                  <hr className="mx-[0.2rem] my-[0.2rem] ml-[0rem] w-[15rem] pl-[0rem] opacity-20" />
                </>
              )}

              {/* ================= Top Plank ================= */}
              {!isQuickHideActive && isSettingOpen && isFullCupboard && (
                <>
                  <div className="mt-[0] mb-[0.7rem] ml-[1rem] flex flex-col gap-[0.5rem]">
                    <div className="flex items-center justify-between gap-[0.5rem]">
                      <p className="mb-[0] flex flex-1 text-[0.7rem] font-[700] text-[var(--primary-color)]">
                        Top Plank
                      </p>
                      <button
                        onClick={() => toggleSection('topPlank')}
                        className="mr-[0.75rem] flex h-[0.8rem] w-[0.8rem] flex-shrink-0 items-center justify-center border-0 bg-[var(--primary-white)] p-0"
                      >
                        <img
                          src={collapsed.topPlank ? assets.plusIcon : assets.minusIcon}
                          alt={collapsed.topPlank ? 'Expand' : 'Collapse'}
                          className="h-[0.8rem] w-[0.8rem]"
                        />
                      </button>
                    </div>
                    {!collapsed.topPlank && (
                      <>
                        <div className="flex items-center gap-[0rem]">
                          <div
                            onClick={handleTopPlankToggle}
                            className={`relative h-[1rem] w-[2rem] cursor-pointer rounded-full border-[0.1rem] border-[var(--toggle-border-color)] p-[0rem] transition-colors duration-300 ${topPlankEnabled ? 'bg-[var(--primary-color)]' : 'bg-[white]'} ${topPlankDisabled || isDisabled ? 'pointer-events-none opacity-50' : ''}`}
                          >
                            {/* Knob */}
                            <div
                              className={`absolute top-[0.16rem] left-[0.1rem] h-[0.6rem] w-[0.6rem] rounded-full border-[0.1rem] border-[var(--toggle-border-color)] p-[0rem] ring-[0.1rem] transition-transform duration-300 ease-in-out ${
                                topPlankEnabled
                                  ? 'translate-x-[1rem] bg-[white] ring-[var(--primary-color)]'
                                  : 'translate-x-0 bg-[var(--primary-color)] ring-[white]'
                              }`}
                            />
                          </div>

                          <p className="mt-[0px] mb-[0px] ml-[0.5rem] text-[0.56rem] font-[700] text-[var(--primary-color)]">
                            Top Plank Depth
                          </p>
                          <div className="flex items-center gap-[0rem]">
                            <input
                              type="number"
                              value={Number(getTopPlank()?.dimensions?.depth ?? 0).toFixed(2)}
                              onChange={handleTopPlankDepthChange}
                              disabled={isDisabled || topPlankDisabled}
                              className="ml-[1.3rem] h-[1.2rem] w-[3.8rem] [appearance:textfield] appearance-none rounded-[0.1rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <hr className="mx-[0.2rem] my-[0.2rem] ml-[0rem] w-[15rem] pl-[0rem] opacity-20" />

                  {/* ================= Base ================= */}

                  <div className="mt-[0] mb-[0.7rem] ml-[1rem] flex flex-col gap-[0.5rem]">
                    <div className="flex items-center justify-between gap-[0.5rem]">
                      <p className="mb-[0] flex flex-1 text-[0.7rem] font-[700] text-[var(--primary-color)]">
                        Base
                      </p>
                      <button
                        onClick={() => toggleSection('base')}
                        className="mr-[0.75rem] flex h-[0.8rem] w-[0.8rem] flex-shrink-0 items-center justify-center border-0 bg-[var(--primary-white)] p-0"
                      >
                        <img
                          src={collapsed.base ? assets.plusIcon : assets.minusIcon}
                          alt={collapsed.base ? 'Expand' : 'Collapse'}
                          className="h-[0.8rem] w-[0.8rem]"
                        />
                      </button>
                    </div>
                    {!collapsed.base && (
                      <>
                        <div className="mt-[0.5rem] mb-[0.2rem] flex items-center gap-[0rem]">
                          <div
                            onClick={handleNoBaseToggle}
                            className={`relative h-[1rem] w-[2rem] cursor-pointer rounded-full border-[0.1rem] border-[var(--toggle-border-color)] p-[0rem] transition-colors duration-300 ${selectedObject?.noBaseEnabled ? 'bg-[var(--primary-color)]' : 'bg-[white]'} ${isDisabled ? 'pointer-events-none opacity-50' : ''}`}
                          >
                            <div
                              className={`absolute top-[0.16rem] left-[0.1rem] h-[0.6rem] w-[0.6rem] rounded-full border-[0.1rem] border-[var(--toggle-border-color)] p-[0rem] ring-[0.1rem] transition-transform duration-300 ease-in-out ${
                                selectedObject?.noBaseEnabled
                                  ? 'translate-x-[1rem] bg-[white] ring-[var(--primary-color)]'
                                  : 'translate-x-0 bg-[var(--primary-color)] ring-[white]'
                              }`}
                            />
                          </div>

                          <p className="mt-[0px] mb-[0px] ml-[0.5rem] text-[0.6rem] font-[800] text-[var(--primary-color)]">
                            No Base
                          </p>
                        </div>
                        <div className="mt-[0.5rem] mb-[0.2rem] flex items-center gap-[0rem]">
                          <div
                            onClick={handleNailerToggle}
                            className={`relative h-[1rem] w-[2rem] cursor-pointer rounded-full border-[0.1rem] border-[var(--toggle-border-color)] p-[0rem] transition-colors duration-300 ${selectedObject?.nailerEnabled ? 'bg-[var(--primary-color)]' : 'bg-[white]'} ${isDisabled ? 'pointer-events-none opacity-50' : ''}`}
                          >
                            <div
                              className={`absolute top-[0.16rem] left-[0.1rem] h-[0.6rem] w-[0.6rem] rounded-full border-[0.1rem] border-[var(--toggle-border-color)] p-[0rem] ring-[0.1rem] transition-transform duration-300 ease-in-out ${
                                selectedObject?.nailerEnabled
                                  ? 'translate-x-[1rem] bg-[white] ring-[var(--primary-color)]'
                                  : 'translate-x-0 bg-[var(--primary-color)] ring-[white]'
                              }`}
                            />
                          </div>

                          <p className="mt-[0px] mb-[0px] ml-[0.5rem] text-[0.6rem] font-[800] text-[var(--primary-color)]">
                            Nailer
                          </p>
                          {selectedObject?.nailerEnabled && (
                            <div className="ml-[3.4rem] flex items-center gap-[0rem]">
                              <select
                                value={selectedObject?.nailerModel || 'stand_1'}
                                onChange={(e) => handleNailerModelChange(e.target.value)}
                                disabled={isDisabled}
                                className="mt-[0.5rem] ml-[0.65rem] flex h-[1.3rem] w-[4.25rem] cursor-pointer appearance-none items-center justify-between rounded-[0.1rem] border-[0rem] bg-[var(--primary-color)] p-[0rem] px-[0.5rem] text-left font-[comfortaa] font-[poppins] text-[0.6rem] font-[var(--font-family)] font-extralight text-[var(--primary-white)] transition-colors duration-200 ease-in-out"
                              >
                                <option value="stand_1">Stand 1</option>
                                <option value="stand_2">Stand 2</option>
                              </select>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-[0rem]">
                          <div
                            onClick={handleSkirtingToggle}
                            className={`relative h-[1rem] w-[2rem] cursor-pointer rounded-full border-[0.1rem] border-[var(--toggle-border-color)] p-[0rem] transition-colors duration-300 ${selectedObject?.skirtingEnabled ? 'bg-[var(--primary-color)]' : 'bg-[white]'} ${isDisabled ? 'pointer-events-none opacity-50' : ''}`}
                          >
                            {/* Knob */}
                            <div
                              className={`absolute top-[0.16rem] left-[0.1rem] h-[0.6rem] w-[0.6rem] rounded-full border-[0.1rem] border-[var(--toggle-border-color)] p-[0rem] ring-[0.1rem] transition-transform duration-300 ease-in-out ${
                                selectedObject?.skirtingEnabled
                                  ? 'translate-x-[1rem] bg-[white] ring-[var(--primary-color)]'
                                  : 'translate-x-0 bg-[var(--primary-color)] ring-[white]'
                              }`}
                            />
                          </div>

                          <p
                            className={`mt-[0px] mb-[0px] ml-[0.5rem] text-[0.56rem] font-[700] text-[var(--primary-color)]`}
                          >
                            Skirting
                          </p>
                        </div>

                        <div className={`mb-[0rem] ml-[0rem] flex flex-row gap-[0.8rem] pb-[0rem]`}>
                          <div className="mr-[1rem] px-3 py-2">
                            <p
                              className={`mt-[0px] mb-[0px] text-[0.56rem] font-[700] ${!selectedObject?.skirtingEnabled || isDisabled ? 'text-[var(--border-color)] opacity-50' : 'text-[var(--primary-color)]'}`}
                            >
                              Offset
                            </p>
                            <input
                              type="number"
                              value={selectedObject?.skirtingOffset ?? 10}
                              onChange={handleSkirtingOffsetChange}
                              disabled={!selectedObject?.skirtingEnabled || isDisabled}
                              className="h-[1.2rem] w-[5rem] [appearance:textfield] appearance-none rounded-[0.1rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </div>
                          <div className="mr-[0.5rem] px-[3] py-[2]">
                            <p
                              className={`mt-[0px] mb-[0px] text-[0.56rem] font-[700] ${!selectedObject?.skirtingEnabled || isDisabled ? 'text-[var(--border-color)] opacity-50' : 'text-[var(--primary-color)]'}`}
                            >
                              Height
                            </p>
                            <input
                              type="number"
                              value={selectedObject?.skirtingHeight ?? 75}
                              onChange={handleSkirtingHeightChange}
                              disabled={!selectedObject?.skirtingEnabled || isDisabled}
                              className="h-[1.2rem] w-[5rem] [appearance:textfield] appearance-none rounded-[0.1rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <hr className="mx-[0.2rem] my-[0.2rem] ml-[0rem] w-[15rem] pl-[0rem] opacity-20" />
                </>
              )}

              {!isQuickHideActive && isSettingOpen && isDoorSelected && (
                <>
                  <div className="mt-[0] mb-[0.7rem] ml-[1rem] flex flex-col gap-[0rem]">
                    <div className="flex items-center justify-between gap-[0.5rem]">
                      <p className="mb-[0] flex flex-1 text-[0.7rem] font-[700] text-[var(--primary-color)]">
                        Door
                      </p>
                      <button
                        onClick={() => toggleSection('shelf')}
                        className="mr-[0.75rem] flex h-[0.8rem] w-[0.8rem] flex-shrink-0 items-center justify-center border-0 bg-[var(--primary-white)] p-0"
                      >
                        <img
                          src={collapsed.shelf ? assets.plusIcon : assets.minusIcon}
                          alt={collapsed.shelf ? 'Expand' : 'Collapse'}
                          className="h-[0.8rem] w-[0.8rem]"
                        />
                      </button>
                    </div>
                    {!collapsed.shelf && (
                      <>
                        <div className={'relative flex items-center justify-between'}>
                          <p className="m-0 pl-[0rem] font-[comfortaa] text-[0.6rem] font-[var(--font-family)] text-[var(--primary-color)]">
                            Door Position
                          </p>
                          <select
                            className="mr-[1.5rem] flex h-[1.2rem] w-[6.8rem] cursor-pointer appearance-none items-center justify-between rounded-[0.1rem] border-[0rem] bg-[var(--primary-color)] p-[0rem] px-[0.5rem] text-left font-[comfortaa] text-[0.6rem] font-[var(--font-family)] font-extralight text-[var(--primary-white)] transition-colors duration-200 ease-in-out"
                            value={doorPosition}
                            onChange={(e) => {
                              const value = e.target.value;
                              setDoorPosition(value);
                              handleDoorPositionChange(value);
                            }}
                            disabled={isDisabled}
                          >
                            <option value="None">None</option>
                            <option value="Left">Left</option>
                            <option value="Right">Right</option>
                            <option value="Top">Top</option>
                            <option value="Bottom">Bottom</option>
                          </select>
                        </div>

                        <div className="relative flex items-center justify-between pl-[0rem]">
                          <p className="m-0 font-[comfortaa] text-[0.6rem] font-[var(--font-family)] text-[var(--primary-color)]">
                            Open/Close
                          </p>
                          <button
                            className="mr-[1.5rem] flex h-[1.2rem] w-[6.8rem] cursor-pointer appearance-none items-center justify-between rounded-[0.1rem] border-[0rem] bg-[var(--primary-color)] p-[0rem] px-[0.5rem] text-left font-[comfortaa] text-[0.6rem] font-[var(--font-family)] font-extralight text-[var(--primary-white)] transition-colors duration-200 ease-in-out"
                            disabled={isDisabled}
                            onClick={handleOpenCloseChange}
                          >
                            Open/Close
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <hr className="mx-[0.2rem] my-[0.2rem] ml-[0rem] w-[15rem] pl-[0rem] opacity-20" />
                </>
              )}

              {!isQuickHideActive && isSettingOpen && isDoorSelected && (
                <>
                  <div className="mt-[0] mb-[0.7rem] ml-[1rem] flex flex-col gap-[0rem]">
                    <div className="flex items-center justify-between gap-[0.5rem]">
                      <p className="mb-[0] flex flex-1 text-[0.7rem] font-[700] text-[var(--primary-color)]">
                        Door
                      </p>
                      <button
                        onClick={() => toggleSection('layout')}
                        className="mr-[0.75rem] flex h-[0.8rem] w-[0.8rem] flex-shrink-0 items-center justify-center border-0 bg-[var(--primary-white)] p-0"
                      >
                        <img
                          src={collapsed.layout ? assets.plusIcon : assets.minusIcon}
                          alt={collapsed.layout ? 'Expand' : 'Collapse'}
                          className="h-[0.8rem] w-[0.8rem]"
                        />
                      </button>
                    </div>
                    {!collapsed.layout && (
                      <>
                        <div className="relative flex items-center justify-between pl-[0rem]">
                          <p className="m-0 font-[comfortaa] text-[0.6rem] font-[var(--font-family)] text-[var(--primary-color)]">
                            Door Type
                          </p>
                          <select
                            className="mr-[1.5rem] flex h-[1.2rem] w-[6.8rem] cursor-pointer appearance-none items-center justify-between rounded-[0.1rem] border-[0rem] bg-[var(--primary-color)] px-[0.5rem] text-left font-[comfortaa] text-[0.6rem] font-extralight text-[var(--primary-white)] transition-colors duration-200 ease-in-out"
                            disabled={isDisabled}
                            value={
                              selectedObject?.doorType === DOOR_TYPES.INSET
                                ? DOOR_TYPES.INSET
                                : DOOR_TYPES.OVERLAY
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              if (selectedObject?.id) {
                                updateDoorType(scene, selectedObject.id, value);
                              }
                            }}
                          >
                            <option value={DOOR_TYPES.INSET}>In to In</option>
                            <option value={DOOR_TYPES.OVERLAY}>Out to Out</option>
                          </select>
                        </div>

                        <div className="relative flex items-center justify-between pl-[0rem]">
                          <p className="m-0 font-[comfortaa] text-[0.6rem] font-[var(--font-family)] text-[var(--primary-color)]">
                            Open/Close
                          </p>
                          <button
                            className="mr-[1.5rem] flex h-[1.2rem] w-[6.8rem] cursor-pointer appearance-none items-center justify-between rounded-[0.1rem] border-[0rem] bg-[var(--primary-color)] p-[0rem] px-[0.5rem] text-left font-[comfortaa] text-[0.6rem] font-[var(--font-family)] font-extralight text-[var(--primary-white)] transition-colors duration-200 ease-in-out"
                            disabled={isDisabled}
                            onClick={handleOpenCloseChange}
                          >
                            Open/Close
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <hr className="mx-[0.2rem] my-[0.2rem] ml-[0rem] w-[15rem] pl-[0rem] opacity-20" />
                </>
              )}

              {!isQuickHideActive && isSettingOpen && isDrawerSelected && (
                <>
                  <div className="mt-[0] mb-[0.7rem] ml-[1rem] flex flex-col gap-[0rem]">
                    <div className="flex items-center justify-between gap-[0.5rem]">
                      <p className="mb-[0] flex flex-1 text-[0.7rem] font-[700] text-[var(--primary-color)]">
                        Drawer
                      </p>
                      <button
                        onClick={() => toggleSection('shelf')}
                        className="mr-[0.75rem] flex h-[0.8rem] w-[0.8rem] flex-shrink-0 items-center justify-center border-0 bg-[var(--primary-white)] p-0"
                      >
                        <img
                          src={collapsed.shelf ? assets.plusIcon : assets.minusIcon}
                          alt={collapsed.shelf ? 'Expand' : 'Collapse'}
                          className="h-[0.8rem] w-[0.8rem]"
                        />
                      </button>
                    </div>
                    {!collapsed.shelf && (
                      <>
                        <div className="relative flex items-center justify-between pl-[0rem]">
                          <p className="m-0 font-[comfortaa] text-[0.6rem] font-[var(--font-family)] text-[var(--primary-color)]">
                            Drawer Type
                          </p>
                          <select
                            className="mr-[1.5rem] flex h-[1.2rem] w-[6.8rem] cursor-pointer appearance-none items-center justify-between rounded-[0.1rem] border-[0rem] bg-[var(--primary-color)] px-[0.5rem] text-left font-[comfortaa] text-[0.6rem] font-extralight text-[var(--primary-white)] transition-colors duration-200 ease-in-out"
                            disabled={isDisabled}
                            value={
                              selectedObject?.drawerType === DRAWER_TYPES.OVERLAY
                                ? DRAWER_TYPES.OVERLAY
                                : DRAWER_TYPES.INSET
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              if (selectedObject?.id) {
                                updateDrawerType(scene, selectedObject.id, value);
                              }
                            }}
                          >
                            <option value={DRAWER_TYPES.INSET}>In to In</option>
                            <option value={DRAWER_TYPES.OVERLAY}>Out to Out</option>
                          </select>
                        </div>

                        <div className="relative flex items-center justify-between pl-[0rem]">
                          <p className="m-0 font-[comfortaa] text-[0.6rem] font-[var(--font-family)] text-[var(--primary-color)]">
                            Open/Close
                          </p>
                          <button
                            className="mr-[1.5rem] flex h-[1.2rem] w-[6.8rem] cursor-pointer appearance-none items-center justify-between rounded-[0.1rem] border-[0rem] bg-[var(--primary-color)] p-[0rem] px-[0.5rem] text-left font-[comfortaa] text-[0.6rem] font-[var(--font-family)] font-extralight text-[var(--primary-white)] transition-colors duration-200 ease-in-out"
                            disabled={isDisabled}
                            onClick={handleOpenCloseChange}
                          >
                            Open/Close
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <hr className="mx-[0.2rem] my-[0.2rem] ml-[0rem] w-[15rem] pl-[0rem] opacity-20" />
                </>
              )}

              {/* ================= MATERIAL ================= */}
              <div className="flex items-center justify-between gap-[0.5rem]">
                <p className="mb-2 ml-[1rem] flex-1 text-[0.7rem] font-[700] text-[var(--primary-color)]">
                  Material
                </p>
                <button
                  onClick={() => toggleSection('material')}
                  className="mr-[0.75rem] flex h-[0.8rem] w-[0.8rem] flex-shrink-0 items-center justify-center border-0 bg-[var(--primary-white)] p-0"
                >
                  <img
                    src={collapsed.material ? assets.plusIcon : assets.minusIcon}
                    alt={collapsed.material ? 'Expand' : 'Collapse'}
                    className="h-[0.8rem] w-[0.8rem]"
                  />
                </button>
              </div>
              <div className="mr-[1rem] px-[3] py-[2]">
                {!collapsed.material && (
                  <>
                    {/* Color */}
                    {/* <div className="pointer-events-none mb-[0rem] ml-[1rem] flex items-center justify-between opacity-40">
                      <p className="text-[0.6rem] font-[700] text-[var(--primary-color)]">Color</p>

                      <div className="flex h-[1.5rem] w-[8rem] items-center gap-[0.3rem] rounded-[0.1rem] bg-[var(--primary-light-grey)] px-[0.3rem] py-[0.3rem]">
                        <div
                          style={{
                            position: 'relative',
                            width: '1.3rem',
                            height: '1.3rem',
                            overflow: 'hidden',
                            borderRadius: '0.1rem',
                          }}
                        >
                          <input
                            type="color"
                            disabled
                            style={{
                              position: 'absolute',
                              width: '200%',
                              height: '200%',
                              border: 'none',
                              padding: '0',
                              cursor: 'not-allowed',
                              left: '-25%',
                              top: '-25%',
                            }}
                          />
                        </div>

                        <input
                          type="text"
                          disabled
                          className="w-[5rem] cursor-not-allowed bg-[var(--primary-light-grey)] text-[0.65rem] text-[var(--primary-color)] uppercase outline-none"
                        />
                      </div>
                    </div> */}

                    {/* Change Material */}
                    <div
                      onClick={handleMaterialChange}
                      className="mb-2 flex items-center justify-between gap-[0rem] py-[0rem] pr-[0.5rem] pr-[0rem]"
                    >
                      <p className="ml-[1rem] text-[0.6rem] font-[700] text-[var(--primary-color)]">
                        Change Material
                      </p>
                      <button
                        className="flex h-[1.3rem] w-[6.8rem] cursor-pointer appearance-none items-center justify-between justify-center rounded-[0.1rem] border-[0rem] bg-[var(--primary-color)] p-[0rem] px-[0.5rem] text-center font-[comfortaa] text-[0.5rem] font-extralight text-[var(--primary-white)] transition-colors duration-200 ease-in-out"
                        disabled={isDisabled}
                      >
                        <p className="items-center text-center text-[0.55rem] font-[700]">
                          Press to Change
                        </p>
                      </button>
                    </div>

                    {/* Texture */}

                    {/* ================= Change Texture ================= */}
                    <div className="mr-[0rem] ml-[1rem] flex flex-col gap-[0rem]">
                      <div className="mt-[0rem] flex gap-[0rem]">
                        <div className="flex-1">
                          <p className="m-[0.5rem] ml-[0rem] text-[0.6rem] font-[700] text-[var(--primary-color)]">
                            Change Texture
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="m-[0.5rem] ml-[0.5rem] text-[0.6rem] font-[700] text-[var(--primary-color)]">
                            Texture Grain
                          </p>
                        </div>
                      </div>

                      {/* Controls Row */}
                      <div className="mt-[0rem] flex gap-[1rem]">
                        {/* Change Texture Button */}
                        <button
                          onClick={toggleTextureList}
                          disabled={isTextureChangeDisabled}
                          className={`flex h-[1.3rem] w-[5rem] flex-1 cursor-pointer appearance-none items-center justify-between rounded-[0.1rem] border-[0rem] bg-[var(--primary-color)] p-[0rem] px-[0.2rem] text-left font-[comfortaa] text-[0.5rem] font-[var(--font-family)] font-extralight text-[var(--primary-white)] transition-colors duration-200 ease-in-out ${
                            isTextureChangeDisabled ? 'cursor-not-allowed opacity-50' : ''
                          }`}
                        >
                          Select Texture
                          <img src={assets.down_arrow1} className="h-[0.6rem] w-[0.6rem]" />
                        </button>

                        {/* Texture Grain Input */}
                        <div className="relative flex h-[1.2rem] w-[4.5rem] flex-1 appearance-none items-center rounded-[0.1rem] border-[0.1rem] border-[rgba(120,110,170,0.5)] bg-[white] p-[0rem]">
                          <select
                            value={textureGrain}
                            onChange={(e) =>
                              handleTextureGrainChange(e.target.value as TextureGrain)
                            }
                            disabled={isDisabled || !hasTextureMaterial(selectedObject?.material)}
                            className="h-[1rem] w-full border-[0rem] pl-[0.2rem] text-[0.6rem] font-[700] text-[var(--primary-color)] focus:border-[var(--primary-color)] focus:outline-none disabled:opacity-50"
                          >
                            <option value="None">None</option>
                            <option value="Horizontal">Horizontal</option>
                            <option value="Vertical">Vertical</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Texture List */}
                    {isTextureListOpen && (
                      <div className="fixed top-[3.7rem] right-[15rem] z-[100] flex h-[85.1vh] w-[11.5rem] flex-col rounded-[0.6rem] border border-[var(--border-color)] bg-[var(--primary-white)] shadow-[-4px_0_10px_rgba(0,0,0,0.05)]">
                        {/* Search Field */}
                        <div className="border-b border-[rgba(57,37,121,0.1)] p-[0.6rem]">
                          <input
                            type="text"
                            placeholder="Search textures..."
                            value={textureSearchQuery}
                            onChange={(e) => setTextureSearchQuery(e.target.value)}
                            className="w-[9.2rem] rounded-full border border-[rgba(57,37,121,0.2)] px-[0.5rem] py-[0.4rem] font-[comfortaa] text-[0.65rem] font-[500] text-[var(--primary-color)] placeholder:text-[rgba(57,37,121,0.4)] focus:border-[var(--primary-color)] focus:outline-none"
                          />
                          {textureSearchQuery && (
                            <div className="mt-[0.3rem] text-[0.55rem] font-[500] text-[rgba(57,37,121,0.6)]">
                              {filteredTextures.length} result
                              {filteredTextures.length !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                        {/* Scrollable grid area */}
                        <div
                          className={`flex-1 ${visibleCount > LOAD_MORE_INCREMENT ? 'overflow-y-auto' : 'overflow-y-auto'} p-[0.6rem] [&::-webkit-scrollbar]:w-[0.3rem] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[rgba(57,37,121,0.1)] hover:[&::-webkit-scrollbar-thumb]:bg-[rgba(57,37,121,0.25)] [&::-webkit-scrollbar-track]:bg-transparent`}
                        >
                          <div className="grid grid-cols-3 gap-[0.2rem] p-[0rem]">
                            {/* Add New Texture Button */}
                            <div className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-[0rem] bg-[var(--primary-color)] transition-transform active:scale-[0.95]">
                              <button className="flex cursor-pointer flex-col items-center justify-center gap-[0.1rem] border-[0rem] bg-transparent p-[0rem]">
                                <div className="flex h-[1rem] w-[1rem] items-center justify-center rounded border-[0rem]">
                                  <img
                                    src={assets.plusIcon}
                                    alt="Add New Texture"
                                    className="h-[0.8rem] w-[0.8rem] invert"
                                  />
                                </div>

                                <span className="px-[0.13rem] text-center font-[comfortaa] text-[0.5rem] leading-none font-bold tracking-tighter whitespace-normal text-[white]">
                                  Add New Texture
                                </span>
                              </button>
                            </div>

                            {filteredTextures.length === 0 ? (
                              <div className="col-span-3 flex flex-col items-center justify-center py-[2rem] text-center">
                                <span className="text-[0.7rem] font-[500] text-[rgba(57,37,121,0.6)]">
                                  No textures found
                                </span>
                                <span className="mt-[0.3rem] text-[0.6rem] font-[400] text-[rgba(57,37,121,0.4)]">
                                  Try a different search term
                                </span>
                              </div>
                            ) : (
                              filteredTextures.slice(0, visibleCount).map((m, idx) => (
                                <div
                                  key={`${m.option}-${idx}`}
                                  className="group relative flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden text-center active:scale-[0.95]"
                                  onClick={() => handleTextureSelect(m)}
                                >
                                  <img
                                    src={`${process.env.NEXT_PUBLIC_PUBLIC_API}/${m.image}`}
                                    alt={m.name}
                                    className="h-full w-full object-cover transition-all duration-200 ease-in-out group-hover:brightness-75"
                                  />

                                  <div className="absolute inset-0 bg-black opacity-0 transition-opacity duration-200 ease-in-out group-hover:opacity-60" />

                                  <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/80 to-transparent px-1 py-1 opacity-0 transition-opacity duration-200 ease-in-out group-hover:opacity-100">
                                    <span className="text-[0.5rem] font-semibold text-white">
                                      {m.name}
                                    </span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                          {hasMoreTextures && (
                            <div className="flex justify-center rounded-b-[0.6rem] border-t border-[rgba(57,37,121,0.1)] bg-white p-[0.3rem]">
                              <button
                                className="flex cursor-pointer items-center gap-[0.4rem] border-[0rem] border-[var(--primary-color)] bg-transparent font-[comfortaa] text-[0.7rem] font-[700] text-[var(--primary-color)] transition-colors hover:text-[var(--primary-color)]"
                                onClick={handleLoadMore}
                              >
                                Load More
                                <div className="flex h-[0.5rem] w-[0.5rem] items-center justify-center p-[0rem]">
                                  <img
                                    className="h-[0.8rem] w-[0.8rem]"
                                    src={assets.loadMore}
                                    alt="Load More"
                                  />
                                </div>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Load More Button at bottom */}
                      </div>
                    )}

                    {/* Door Position */}
                    {!isQuickHideActive && isSettingOpen && isDoorOrDrawerSelected && (
                      <>
                        <hr className="mx-[0.2rem] my-[0.2rem] ml-[0rem] w-[15rem] pl-[0rem] opacity-20" />

                        <div className="mt-[0rem] ml-[1rem] flex flex-col items-start gap-[0.5rem]">
                          <p className="mb-[1] flex text-[0.7rem] font-[700] text-[var(--primary-color)]">
                            Handle Position
                          </p>
                          <div className="mb-[0rem] flex w-[13rem] justify-center gap-[0.5rem]">
                            {handlePositionInputFlid.map((field) => (
                              <div key={field.name} className="mt-[0rem]">
                                <p className="m-[0] w-[3.9rem] text-[0.56rem] font-[200] font-[var(--font-family)] tracking-[0.04rem] text-[var(--primary-color)]">
                                  {field.label}
                                </p>
                                <div
                                  className={`mt-2 flex h-[1.3rem] w-[3rem] items-center gap-[0.1rem] rounded-[0.1rem] border-[0.1rem] border-[var(--border-color)] bg-white p-0 p-[0rem] px-[0.35rem] focus-within:border-[var(--primary-color)]`}
                                >
                                  {/* IMAGE ICON */}
                                  <Image
                                    src={field.icon}
                                    alt={field.label}
                                    width={19}
                                    height={19}
                                    className="h-[0.7rem] w-[0.7rem] object-contain opacity-70"
                                  />

                                  <img
                                    src={assets.vrLine}
                                    className="ml-[0.1rem] h-[0.9rem] w-[0.5rem]"
                                  />

                                  {/* Input */}
                                  <input
                                    id={field.name}
                                    name={field.name}
                                    type={field.type}
                                    value={field.value ?? ''}
                                    onChange={field.onChange}
                                    className="ml-[0rem] w-[1.9rem] [appearance:textfield] border-[0rem] bg-transparent p-[0rem] text-[0.7rem] font-[600] text-[var(--primary-color)] outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <hr className="mx-[0.2rem] my-[0.2rem] ml-[0rem] w-[15rem] pl-[0rem] opacity-20" />
                      </>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </>
      )}
      {showMaterialPopup && (
        <MaterialChangePopup
          selectedObject={selectedObject}
          onClose={() => setShowMaterialPopup(false)}
        />
      )}
    </div>
  );
};

export default Sidebar;
