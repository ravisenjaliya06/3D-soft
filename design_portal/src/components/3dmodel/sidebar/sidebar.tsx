import { TEXTURE_MEDIA } from '@/components/3dmodel/handler/constant';
import { _3DMODEL, assets } from '@/svgPaths';
import Image from 'next/image';

import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as THREE from 'three';
import { itemType } from '../design/interface';
import { addSkirtingPlanks, removeSkirtingPlanks, updateDrawerType } from '../design/scene';
import { UpdateObjectInScene } from '../handler/updateHandler';
import { Dimensions } from '../interface';
import {
  DRAWER_PLANK_TYPES,
  DRAWER_TYPES,
  MeshObjectData,
  MeshObjectPatch,
  PART_TYPES,
} from '../sceneCreator/interface';
import { SyncManager } from '../sceneCreator/syncState';
import { CabinetMotionController } from '../sceneCreator/tools/openCloseTool';
import { RootState } from '../store';

import { Axis, Field, MATERIAL_TYPES } from './interface';
import { MaterialChangePopup } from './MaterialChangePopup';

//import style from './sidebar.module.css';

const Sidebar: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNavOpen, setNavOpen] = useState(true);
  const [isSettingOpen, setSettingOpen] = useState(false);
  const [doorPosition, setDoorPosition] = useState('None');
  const [showMaterialPopup, setShowMaterialPopup] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#392579');
  const [isTextureListOpen, setIsTextureListOpen] = useState(false);
  const [textureRotation, setTextureRotation] = useState(0);

  const [handlePos, setHandlePos] = useState({ x: 0, y: 0, z: 0 });
  const [handleRot, setHandleRot] = useState({ x: 0, y: 0, z: 0 });
  const [shelvesInnerDistance, setShelvesInnerDistance] = useState(0);

  // Anchor States for Directional Scaling
  const [widthSide, setWidthSide] = useState<'left' | 'right' | null>(null);
  const [heightSide, setHeightSide] = useState<'bottom' | 'top' | null>(null);
  const [depthSide, setDepthSide] = useState<'back' | 'front' | null>(null);

  const materialModal = [
    { option: 'material_0', name: 'Dark Brown', image: TEXTURE_MEDIA.WOOD },
    { option: 'material_1', name: 'Dark Brown', image: TEXTURE_MEDIA.WOOD_1 },
    { option: 'material_2', name: 'Light Wood', image: TEXTURE_MEDIA.WOOD_2 },
    { option: 'material_3', name: 'Off White', image: TEXTURE_MEDIA.WOOD_3 },
    { option: 'material_4', name: 'Glossy Brown', image: TEXTURE_MEDIA.WOOD_4 },
    { option: 'material_5', name: 'Light Brown', image: TEXTURE_MEDIA.WOOD_5 },
    { option: 'material_6', name: 'Wood', image: TEXTURE_MEDIA.WOOD_6 },
    { option: 'material_7', name: 'Wood', image: TEXTURE_MEDIA.WOOD_7 },
  ];

  const colorInputRef = useRef<HTMLInputElement>(null);
  const updateObjectRef = useRef<UpdateObjectInScene | null>(null);
  const isUpdatingTextureRotationRef = useRef(false);
  const isUpdatingShelvesDistanceRef = useRef(false);
  const previousPlankIdRef = useRef<string | null>(null);

  const dispatch = useDispatch();
  const selectedObjectId = useSelector((state: RootState) => state.data.selectedObject);
  const selectedChildObjectId = useSelector((state: RootState) => state.data.selectedChildObject);
  const selectedInvisibleBoxId = useSelector((state: RootState) => state.data.selectedInvisibleBox);
  const objects = useSelector((state: RootState) => state.data.objects);
  const scene = useSelector((state: RootState) => state.scene.scene);
  const isQuickHideActive = useSelector((state: RootState) => state.data.isQuickHideActive);
  const isDisabled = isQuickHideActive;

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

  useEffect(() => {
    if (selectedObjectId || selectedChildObjectId) {
      setSettingOpen(true);
      setNavOpen(false);
    } else {
      setSettingOpen(false);
      setNavOpen(true);
    }
  }, [selectedObjectId, selectedChildObjectId]);

  useEffect(() => {
    if (isQuickHideActive) {
      setSettingOpen(false);
      setNavOpen(true);
    }
  }, [isQuickHideActive]);

  useEffect(() => {
    if (colorInputRef.current) {
      colorInputRef.current.style.backgroundColor = selectedColor;
    }
  }, []);

  /** object updater ref */
  useEffect(() => {
    updateObjectRef.current = new UpdateObjectInScene(scene, dispatch);
  }, [scene, dispatch]);

  useEffect(() => {
    if (selectedObject && scene) {
      let targetMesh: THREE.Mesh | null = null;
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.userData.objectId === selectedObject?.id) {
          targetMesh = obj;
        }
      });
      if (targetMesh) {
        const hasSkirting = (targetMesh as THREE.Mesh).children.some(
          (child: THREE.Object3D) => child.name && child.name.includes('SKIRTING_PLANK')
        );
        setFrontpanelEnabled(hasSkirting);
      }
    }
  }, [selectedObject, scene]);

  const handleObject = objects.find((obj) => obj.parent === targetId && obj.type === 'handle');
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
    const roundedValue = Math.round(value);
    setHandlePos((prev) => ({ ...prev, [axis]: roundedValue }));

    if (handleObject) {
      updateObjectRef.current?.update(
        handleObject.id,
        { position: { [axis]: roundedValue } },
        handleObject
      );
    }
  };

  const updateHandleRotState = (axis: Axis, value: number) => {
    const roundedValue = Math.round(value);
    setHandleRot((prev) => ({ ...prev, [axis]: roundedValue }));

    if (handleObject) {
      updateObjectRef.current?.update(
        handleObject.id,
        { rotation: { [axis]: roundedValue } },
        handleObject
      );
    }
  };

  const handleOpenCloseChange = () => {
    if (!scene) return;

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

  console.log(selectedObject, 'selectedObject');

  function applyObjectUpdate(
    selectedObject: MeshObjectData | null | undefined,
    patch: MeshObjectPatch
  ): void {
    if (!selectedObject) return;
    const updatedObject: MeshObjectData = {
      ...selectedObject,

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
    };
    const syncManager = new SyncManager(updatedObject);
    syncManager.syncData();
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

  const handleNavigation = () => {
    /** Opens the navigation panel and closes settings if open. */

    setSettingOpen(false);
    setNavOpen(true);
  };

  // (Harsh): Temporary placement — will move to updateHandler once door selection is ready.
  const handleDoorPositionChange = (position: string) => {
    /** Updates the door’s open direction (left, right, top, bottom) in the 3D scene. */

    scene.traverse((child) => {
      if (child.userData.objectId === selectedObject?.id) {
        child.userData.openDirection = position.toLowerCase();
      }
    });
  };

  const handleMaterialChange = () => {
    /** Opens the material selection popup for the selected object. */
    console.log('function called');

    setShowMaterialPopup(true);
  };

  const applyColorToSelected = (value: string) => {
    setSelectedColor(value);
    if (colorInputRef.current) colorInputRef.current.style.backgroundColor = value;

    const targetId = selectedChildObjectId || selectedObjectId;
    if (!targetId || !scene) return;

    const obj = objects.find((o) => o.id === targetId);
    if (!obj) return;

    const name = obj.name?.toLowerCase() ?? '';
    if (name.includes('door') || name.includes('drawer')) return;

    applyObjectUpdate(obj, { material: { type: 'COLOR', value } });
  };

  const toggleTextureList = () => {
    /** Toggles the visibility of the texture selection list. */
    setIsTextureListOpen((prev) => !prev);
  };

  const handleDimensionChange = (field: Field, value: number) => {
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
      if (config.side === config.negative) {
        positionShift[config.axis] = -delta / 2;
      } else if (config.side === config.positive) {
        positionShift[config.axis] = delta / 2;
      }
    }

    const currentPos = selectedObject.position ?? { x: 0, y: 0, z: 0 };

    applyObjectUpdate(selectedObject, {
      dimensions: { [field]: roundedValue },
      position: {
        x: currentPos.x + positionShift.x,
        y: currentPos.y + positionShift.y,
        z: currentPos.z + positionShift.z,
      },
    });
  };

  const handleTextureSelect = (texturePath: string) => {
    if (!selectedObject) return;
    applyObjectUpdate(selectedObject, {
      material: {
        type: MATERIAL_TYPES.TEXTURE,
        value: texturePath,
      },
    });

    setIsTextureListOpen(false);
  };

  const handleTextureRotationChange = (value: number) => {
    if (!selectedObject || isDisabled) return;

    const clampedValue = Math.max(0, Math.min(180, value));
    if (isUpdatingTextureRotationRef.current) return;
    if (Math.abs(clampedValue - textureRotation) < 0.01) return;
    isUpdatingTextureRotationRef.current = true;
    setTextureRotation(clampedValue);

    if (selectedObject.material && selectedObject.material.type === MATERIAL_TYPES.TEXTURE) {
      applyObjectUpdate(selectedObject, {
        material: {
          ...selectedObject.material,
          rotation: clampedValue,
        },
      });
    }

    setTimeout(() => {
      isUpdatingTextureRotationRef.current = false;
    }, 100);
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
    width: Math.round(selectedObject?.dimensions?.width ?? 11),
    height: Math.round(selectedObject?.dimensions?.height ?? 0),
    depth: Math.round(selectedObject?.dimensions?.depth ?? 0),
  };

  const controlIconMap: Record<string, string[]> = {
    width: ['/icons/left.svg', '/icons/right.svg'],
    height: ['/icons/top.svg', '/icons/bottom.svg'],
    depth: ['/icons/front.svg', '/icons/back.svg'],
  };

  const sideBarMenuConfig = [
    {
      subMenu: 'layout',
      title: 'Layout',
      fields: [
        {
          label: 'Width',
          name: 'width',
          type: 'number',
          min: 1,
          value: dimensionsUI.width,
          disabled: isHorizontalPlank || isDisabled,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
            handleDimensionChange('width', Number(e.target.value)),
          controls: ['Left', 'Right'],
        },
        {
          label: 'Height',
          name: 'height',
          type: 'number',
          min: 1,
          value: dimensionsUI.height,
          disabled: isVerticalPlank || isDisabled,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
            handleDimensionChange('height', Number(e.target.value)),
          controls: ['Top', 'Bottom'],
        },
        {
          label: 'Depth',
          name: 'depth',
          type: 'number',
          min: 1,
          value: dimensionsUI.depth,
          disabled: isQuickHideActive,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
            handleDimensionChange('depth', Number(e.target.value)),
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
      disabled: isQuickHideActive,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        updateHandlePosState('y', Number(e.target.value)),
    },

    {
      label: 'Left',
      name: 'Left',
      type: 'number',
      icon: _3DMODEL.leftIcon,
      value: handlePos.x,
      disabled: isQuickHideActive,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        updateHandlePosState('x', Number(e.target.value)),
    },

    {
      label: 'Rotation',
      name: 'rotationZ',
      type: 'number',
      icon: _3DMODEL.rotateIcon,
      value: handleRot.z,
      disabled: isQuickHideActive,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        updateHandleRotState('z', Number(e.target.value)),
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
  selectedObject?.name?.toLowerCase().includes('planks');
  //TODO :- SMIT / HARSH :- Temporary create this for design parpose

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
    ].includes(selectedObject.type);
  //TODO :- SMIT / HARSH :- Temporary create this for design parpose

  const isFullCupboardorPlankSelected = isFullCupboard || isPlankSelected;
  //TODO :- SMIT / HARSH :- Temporary create this for design parpose

  const isDoorOrDrawerSelected = isDoorSelected || isDrawerSelected;

  // Check if invisible box is selected
  const isInvisibleBoxSelected =
    !!selectedInvisibleBoxId ||
    selectedObject?.type === 'INVISIBLEBOX' ||
    selectedObject?.name?.toLowerCase().includes('invisiblebox') ||
    selectedObject?.name?.toLowerCase().includes('invisible_box') ||
    selectedObject?.name?.toLowerCase().includes('invisible_full_compartment');

  // Disable texture change for cupboards and invisible boxes
  const isTextureChangeDisabled = isFullCupboard || isInvisibleBoxSelected || isQuickHideActive;

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
    } else {
      previousPlankIdRef.current = null;
    }
  }, [selectedObject?.id, isPlankSelected, objects]);

  const [edgeBandingEnabled, setEdgeBandingEnabled] = useState(true);
  const [edgeBandingDisabled, setEdgeBandingDisabled] = useState(false);
  const [minifixEnabled, setMinifixEnabled] = useState(true);
  const [minifixDisabled, setMinifixDisabled] = useState(false);
  const [groovingEnabled, setGroovingEnabled] = useState(true);
  const [groovingDisabled, setGroovingDisabled] = useState(false);
  const [topPlankEnabled, setTopPlankEnabled] = useState(true);
  const [topPlankDisabled, setTopPlankDisabled] = useState(false);
  const [baseheightEnabled, setBaseheightEnabled] = useState(true);
  const [baseheightDisabled, setBaseheightDisabled] = useState(false);
  const [frontpanelEnabled, setFrontpanelEnabled] = useState(true);
  const [frontpanelDisabled, setFrontpanelDisabled] = useState(false);
  //TODO :- SMIT / HARSH :- Temporary create this for design parpose

  const handleEdgeBandingToggle = () => {
    if (edgeBandingDisabled) return;
    setEdgeBandingEnabled((prev) => !prev);
  };
  //TODO :- SMIT / HARSH :- Temporary create this for design parpose

  const handleMinifixToggle = () => {
    if (minifixDisabled) return;
    setMinifixEnabled((prev) => !prev);
  };
  //TODO :- SMIT / HARSH :- Temporary create this for design parpose

  const handleGroovingToggle = () => {
    if (groovingDisabled) return;
    setGroovingEnabled((prev) => !prev);
  };

  //TODO :- SMIT / HARSH :- Temporary create this for design parpose
  useEffect(() => {
    setMinifixDisabled(false);
    setGroovingDisabled(false);
    setEdgeBandingDisabled(false);
    setTopPlankDisabled(false);
    setBaseheightDisabled(false);
    setFrontpanelDisabled(false);
  }, []);

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
    if (topPlankDisabled) return;

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

  const handleBaseheightToggle = () => {
    if (baseheightDisabled) return;
    setBaseheightEnabled((prev) => !prev);
  };

  const handleFrontpanelToggle = () => {
    if (frontpanelDisabled) return;

    const isEnabled = !frontpanelEnabled;
    setFrontpanelEnabled(isEnabled);

    if (!scene || !selectedObject) return;

    // Find the actual mesh in the scene
    let targetMesh: THREE.Mesh | null = null;
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData.objectId === selectedObject?.id) {
        targetMesh = obj;
      }
    });

    if (targetMesh) {
      if (isEnabled) {
        addSkirtingPlanks(targetMesh);
      } else {
        removeSkirtingPlanks(targetMesh);
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
    topPlank: false,
    base: false,
  });

  const toggleSection = (key: string) => {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div
      className={
        isSidebarOpen
          ? `absolute top-[3.7rem] right-[0] bottom-[0] z-[10] block h-[92vh] w-[15rem] overflow-x-hidden overflow-y-auto rounded-t-[0.6rem] bg-[var(--primary-white)] [&::-webkit-scrollbar]:w-[0.3rem] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[rgba(57,37,121,0.1)] hover:[&::-webkit-scrollbar-thumb]:bg-[rgba(57,37,121,0.25)] [&::-webkit-scrollbar-track]:bg-transparent`
          : `absolute top-[3.7rem] right-[0] bottom-[0] z-[10] block h-auto w-[15rem] overflow-y-auto rounded-t-[0.6rem] bg-transparent [&::-webkit-scrollbar]:w-[0.3rem] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[rgba(57,37,121,0.1)] hover:[&::-webkit-scrollbar-thumb]:bg-[rgba(57,37,121,0.25)] [&::-webkit-scrollbar-track]:bg-transparent`
      }
    >
      {/* ================= TITLE ================= */}
      <div
        onClick={toggleSidebar}
        className={`fixed right-[0] z-[20] flex h-[1.8rem] w-[15rem] items-center justify-around justify-center gap-[1rem] rounded-t-[0.6rem] bg-[var(--sidebarhadding-background-color)] ${isSidebarOpen ? 'top-[3.7rem] right-[0]' : 'right-[0] bottom-[0]'} `}
      >
        <p className="ml-[8] text-center text-[0.7rem] leading-[10px] font-[700] tracking-normal text-[white]">
          Viewport Navigation
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
            <button
              onClick={handleSetting}
              className={`w-[4rem] border-[0rem] p-[0rem] font-[poppins] text-[0.7rem] active:bg-[var(--toolbarhover-color)] ${
                isSettingOpen
                  ? 'rounded-[0.2rem] bg-[var(--toolbarhover-color)] px-4 py-2 text-[var(--primary-color)]'
                  : 'bg-transparent text-[rgba(160,174,192,1)] hover:text-[var(--primary-color)]'
              } `}
            >
              Setting
            </button>

            <button
              onClick={handleNavigation}
              className={`w-[4.5rem] border-[0rem] p-[0rem] font-[poppins] text-[0.7rem] active:bg-[var(--toolbarhover-color)] ${
                isNavOpen
                  ? 'rounded-[0.2rem] bg-[var(--toolbarhover-color)] px-4 py-2 text-[var(--primary-color)]'
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
              <img src={assets.navigationdetail} className="w-full" />
            </div>
          )}

          {/* ================= NO SELECTION ================= */}
          {isSettingOpen && !selectedObject && (
            <p className="mt-8 text-center text-[0.8rem] text-[#392579]">No Item Selected</p>
          )}

          {/* ================= INVISIBLE BOX SELECTED ================= */}
          {isSettingOpen && selectedObject && (
            <p className="mt-8 text-center text-[0.8rem] text-[#392579]">No Properties Available</p>
          )}

          {/* ================= SETTINGS ================= */}
          {isSettingOpen && selectedObject && (
            <>
              <div className="structure-only pointer-events-none opacity-50 blur-[0.01rem] select-none">
                {/* your existing code – NO CHANGES inside */}
                <div className="w-[15rem] bg-white p-3 shadow-sm">
                  {/* ================= Minifix & Grooving ================= */}
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
                                className={`relative h-[1rem] w-[2.25rem] cursor-pointer rounded-full border-[0.1rem] border-[var(--toggle-border-color)] p-[0rem] transition-colors duration-300 ${minifixEnabled ? 'bg-[var(--primary-color)]' : 'bg-[var(--primary-white)]'} ${minifixDisabled ? 'pointer-events-none opacity-50' : ''}`}
                              >
                                {/* Knob */}
                                <div
                                  className={`absolute top-[0.15rem] left-[0.1rem] h-[0.6rem] w-[0.6rem] rounded-full border-[0.1rem] border-[var(--toggle-button-border-color)] p-[0rem] ring-[0.1rem] transition-transform duration-300 ease-in-out ${
                                    minifixEnabled
                                      ? 'translate-x-[1.2rem] bg-[var(--primary-white)] ring-[var(--primary-color)]'
                                      : 'translate-x-0 bg-[var(--primary-color)] ring-[var(--primary-white)]'
                                  }`}
                                />
                              </div>
                              <p className="mb-[1remrem] text-[0.6rem] font-[500] text-[var(--primary-color)]">
                                Minifix
                              </p>
                            </div>

                            {/* Distance */}
                            <div className="mt-[0rem]">
                              <p className="mt-[0.2rem] mb-[0.2rem] text-[0.6rem] font-[500] text-[var(--primary-color)]">
                                Distance
                              </p>
                              <input
                                type="number"
                                value="128"
                                className="h-[1.2rem] w-[5rem] [appearance:textfield] appearance-none rounded-[0.2rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                            </div>

                            {/* Diameter Hole */}
                            <div className="">
                              <p className="mt-[0.8rem] mb-[0.2rem] text-[0.6rem] font-[500] text-[var(--primary-color)]">
                                Diameter Hole
                              </p>
                              <input
                                type="number"
                                value="8"
                                className="h-[1.2rem] w-[5rem] [appearance:textfield] appearance-none rounded-[0.2rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                            </div>
                          </div>

                          {/* -------- VERTICAL DIVIDER -------- */}
                          <hr className="mr-[0.3rem] ml-[0.2rem] h-[8rem] w-[0.2px] border-[0rem] bg-[var(--table-title-border-color)] p-[0rem]" />

                          {/* -------- RIGHT PART -------- */}
                          <div className="mr-[0.7rem] flex w-[6rem] flex-col">
                            {/* Toggle */}
                            <div className="flex items-center gap-[0.5rem]">
                              <div
                                onClick={handleGroovingToggle}
                                className={`relative h-[1rem] w-[2.25rem] cursor-pointer rounded-full border-[0.1rem] border-[var(--toggle-border-color)] p-[0rem] transition-colors duration-300 ${groovingEnabled ? 'bg-[var(--primary-color)]' : 'bg-[var(--primary-white)]'} ${groovingDisabled ? 'pointer-events-none opacity-50' : ''}`}
                              >
                                {/* Knob */}
                                <div
                                  className={`absolute top-[0.15rem] left-[0.1rem] h-[0.6rem] w-[0.6rem] rounded-full border-[0.1rem] border-[var(--border-color)] p-[0rem] ring-[0.1rem] transition-transform duration-300 ease-in-out ${
                                    groovingEnabled
                                      ? 'translate-x-[1.2rem] bg-[var(--primary-white)] ring-[var(--primary-color)]'
                                      : 'translate-x-0 bg-[var(--primary-color)] ring-[white]'
                                  }`}
                                />
                              </div>
                              <p className="mb-[1remrem] text-[0.6rem] font-[500] text-[var(--primary-color)]">
                                Grooving
                              </p>
                            </div>

                            {/* Inside */}
                            <div>
                              <p className="mt-[0.2rem] mb-[0.2rem] text-[0.6rem] font-[500] text-[var(--primary-color)]">
                                Inside
                              </p>
                              <input
                                type="number"
                                value="25"
                                className="h-[1.2rem] w-[5rem] [appearance:textfield] appearance-none rounded-[0.2rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                            </div>

                            {/* Edge to End */}
                            <div>
                              <p className="mt-[0.8rem] mb-[0.2rem] text-[0.6rem] font-[500] text-[var(--primary-color)]">
                                Edge to End
                              </p>
                              <input
                                type="number"
                                value="6"
                                className="h-[1.2rem] w-[5rem] [appearance:textfield] appearance-none rounded-[0.2rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
                    <div className="flex items-center justify-between">
                      <p className="mb-[0] flex text-[0.7rem] font-[700] text-[var(--primary-color)]">
                        Camlock Screw Hole
                      </p>
                      <button
                        onClick={() => toggleSection('camlock')}
                        className="boredr-[0rem] mr-[1rem] border-0 bg-[var(--primary-white)] text-[0.9rem] text-[var(--primary-color)]"
                      >
                        {collapsed.camlock ? '+' : '−'}
                      </button>
                    </div>
                    {!collapsed.camlock && (
                      <>
                        <div className="mt-[1rem] mb-[0rem] flex gap-[0.5rem] font-[500]">
                          <div>
                            <p className="mt-[0rem] mb-[0.2rem] text-[0.5rem] text-[var(--primary-color)]">
                              Diameter
                            </p>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                className="h-[1.2rem] w-[3.57rem] [appearance:textfield] appearance-none rounded-[0.2rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
                                className="h-[1.2rem] w-[3.57rem] [appearance:textfield] appearance-none rounded-[0.2rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
                                className="h-[1.2rem] w-[3.57rem] [appearance:textfield] appearance-none rounded-[0.2rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <hr className="mx-[0.2rem] my-[0.2rem] ml-[0rem] w-[15rem] pl-[0rem] opacity-20" />

                  <div className="mt-[0] mb-[0.7rem] ml-[1rem] flex flex-col gap-[0.5rem]">
                    <div className="flex items-center justify-between">
                      <p className="mb-[0] flex text-[0.7rem] font-[700] text-[var(--primary-color)]">
                        Edge Banding
                      </p>
                      <button
                        onClick={() => toggleSection('edgeBanding')}
                        className="boredr-[0rem] mr-[1rem] border-0 bg-[var(--primary-white)] text-[0.9rem] text-[var(--primary-color)]"
                      >
                        {collapsed.edgeBanding ? '+' : '−'}
                      </button>
                    </div>
                    {!collapsed.edgeBanding && (
                      <>
                        <div className="flex items-center gap-[1rem]">
                          <div
                            onClick={handleEdgeBandingToggle}
                            className={`relative h-[1rem] w-[2.25rem] cursor-pointer rounded-full border-[0.1rem] border-[var(--toggle-border-color)] p-[0rem] transition-colors duration-300 ${edgeBandingEnabled ? 'bg-[var(--primary-color)]' : 'bg-[white]'} ${edgeBandingDisabled ? 'pointer-events-none opacity-50' : ''}`}
                          >
                            {/* Knob */}
                            <div
                              className={`absolute top-[0.15rem] left-[0.1rem] h-[0.6rem] w-[0.6rem] rounded-full border-[0.1rem] border-[var(--toggle-border-color)] p-[0rem] ring-[0.1rem] transition-transform duration-300 ease-in-out ${
                                edgeBandingEnabled
                                  ? 'translate-x-[1.2rem] bg-[white] ring-[var(--primary-color)]'
                                  : 'translate-x-0 bg-[var(--primary-color)] ring-[white]'
                              }`}
                            />
                          </div>

                          <p className="mt-[0px] mb-[0px] text-[0.56rem] font-[500] text-[var(--primary-color)]">
                            Edge Banding
                          </p>
                          <div className="flex items-center gap-[2rem]">
                            <input
                              type="number"
                              className="h-[1.2rem] w-[4.2rem] [appearance:textfield] appearance-none rounded-[0.2rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <hr className="mx-[0.2rem] my-[0.2rem] ml-[0rem] w-[15rem] pl-[0rem] opacity-20" />
              {!isQuickHideActive && isSettingOpen && isPlankSelected && (
                <>
                  <div className="mt-[0] mb-[0.7rem] ml-[1rem] flex flex-col gap-[0.5rem]">
                    <div className="flex items-center justify-between">
                      <p className="mb-[0] flex text-[0.7rem] font-[700] text-[var(--primary-color)]">
                        Shelf
                      </p>
                      <button
                        onClick={() => toggleSection('shelf')}
                        className="boredr-[0rem] mr-[1rem] border-0 bg-[var(--primary-white)] text-[0.9rem] text-[var(--primary-color)]"
                      >
                        {collapsed.shelf ? '+' : '−'}
                      </button>
                    </div>
                    {!collapsed.shelf && (
                      <>
                        <div className="flex items-center gap-[1.8rem]">
                          <p className="mt-[0px] mb-[0px] text-[0.56rem] font-[500] text-[var(--primary-color)]">
                            Shelves Inner Distance
                          </p>
                          <div className="flex items-center gap-[2rem]">
                            <input
                              type="number"
                              min={0}
                              max={25}
                              value={shelvesInnerDistance}
                              onChange={(e) =>
                                handleShelvesInnerDistanceChange(Number(e.target.value))
                              }
                              disabled={isDisabled}
                              className="h-[1.2rem] w-[4.2rem] [appearance:textfield] appearance-none rounded-[0.2rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <hr className="mx-[0.2rem] my-[0.2rem] ml-[0rem] w-[15rem] pl-[0rem] opacity-20" />
                </>
              )}

              {!isQuickHideActive && isSettingOpen && isFullCupboardorPlankSelected && (
                <>
                  {sideBarMenuConfig.map((menu) => (
                    <div key={menu.subMenu}>
                      {/* HEADER */}
                      <div className="mb-[0rem] ml-[1rem] flex flex-col">
                        <div className="mb-[0rem] flex items-center justify-between">
                          <p className="text-[0.7rem] font-[700] text-[var(--primary-color)]">
                            {menu.title}
                          </p>
                          <button
                            onClick={() => toggleSection('layout')}
                            className="boredr-[0rem] mr-[1rem] border-0 bg-[var(--primary-white)] text-[0.9rem] text-[var(--primary-color)]"
                          >
                            {collapsed.layout ? '+' : '−'}
                          </button>
                        </div>
                        {!collapsed.layout && (
                          <>
                            {/* FIELDS */}
                            <div className="flex flex-col gap-[0.6rem]">
                              {menu.fields.map((field) => (
                                <div
                                  key={field.name}
                                  className="flex flex-row items-start justify-between gap-[0rem]"
                                >
                                  {/* LEFT SIDE */}
                                  <div className="flex items-center justify-between gap-[0rem]">
                                    {/* LEFT: LABEL */}
                                    <p className="w-[3.5rem] text-[0.6rem] font-[500] text-[var(--primary-color)]">
                                      {field.label}
                                    </p>

                                    {isPlankSelected && (
                                      <div className="ml-[0rem] flex gap-[0.65rem] rounded-[0.25rem] bg-[#f2f2f2] p-[0.15rem]">
                                        {controlIconMap[field.name].map((icon, idx) => {
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
                                              onClick={() => handleControlClick(field.name, idx)}
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
                                  <input
                                    type="number"
                                    min={field.min}
                                    step="1"
                                    value={field.value ?? ''}
                                    onChange={field.onChange}
                                    disabled={field.disabled}
                                    className="mt-[0.25rem] mr-[1rem] h-[1.2rem] w-[3.5rem] [appearance:textfield] items-center justify-between rounded-[0.2rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                  />
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      <hr className="my-[0.4rem] opacity-20" />
                    </div>
                  ))}
                </>
              )}
              {!isQuickHideActive && isSettingOpen && isPlankSelected && (
                <>
                  <div className="mb-[0.7rem] ml-[1rem] flex flex-col gap-[0.5rem]">
                    <div className="flex items-center justify-between">
                      {/* Title */}
                      <p className="mt-[0rem] mb-[0rem] text-[0.7rem] font-[700] text-[var(--primary-color)]">
                        Position Move
                      </p>
                      <button
                        onClick={() => toggleSection('positionMove')}
                        className="boredr-[0rem] mr-[1rem] border-0 bg-[var(--primary-white)] text-[0.9rem] text-[var(--primary-color)]"
                      >
                        {collapsed.positionMove ? '+' : '−'}
                      </button>
                    </div>
                    {!collapsed.positionMove && (
                      <>
                        <div className="grid grid-cols-2 gap-[0.4rem]">
                          {/* LEFT */}
                          <div className="flex flex-col items-start gap-[0.1rem]">
                            <p className="mt-[0rem] mb-[0rem] text-[0.5rem] font-[500] text-[var(--primary-color)]">
                              Left
                            </p>
                            <div className="flex h-[1.19rem] w-[4.61rem] items-center rounded-[0.2rem] border-[0.1rem] border-[var(--border-color)] bg-[rgba(242,242,242,1)] p-[0rem] px-[0.2rem]">
                              <img
                                src={assets.directionIcon}
                                className="h-[0.5rem] w-[0.5rem] rotate-[-90deg]"
                              />
                              <img
                                src={assets.vrLine}
                                className="ml-[0.3rem] h-[1rem] w-[0.5rem]"
                              />

                              <input
                                type="number"
                                className="ml-[0.4rem] h-full w-[3.1rem] border-0 bg-transparent text-[0.58rem] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                            </div>
                          </div>

                          {/* RIGHT */}
                          <div className="flex flex-col items-start gap-[0.1rem]">
                            <p className="mt-[0rem] mb-[0rem] text-[0.5rem] font-[500] text-[var(--primary-color)]">
                              Right
                            </p>
                            <div className="flex h-[1.19rem] w-[4.61rem] items-center rounded-[0.2rem] border-[0.1rem] border-[var(--border-color)] bg-[rgba(242,242,242,1)] p-[0rem] px-[0.2rem]">
                              <img
                                src={assets.directionIcon}
                                className="h-[0.5rem] w-[0.5rem] rotate-[90deg]"
                              />
                              <img
                                src={assets.vrLine}
                                className="ml-[0.3rem] h-[1rem] w-[0.5rem]"
                              />

                              <input
                                type="number"
                                className="ml-[0.4rem] h-full w-[3.1rem] border-0 bg-transparent text-[0.58rem] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                            </div>
                          </div>

                          {/* TOP */}
                          <div className="flex flex-col items-start gap-[0.1rem]">
                            <p className="mt-[0rem] mb-[0rem] text-[0.5rem] font-[500] text-[var(--primary-color)]">
                              Top
                            </p>
                            <div className="flex h-[1.19rem] w-[4.61rem] items-center rounded-[0.2rem] border-[0.1rem] border-[var(--border-color)] bg-[rgba(242,242,242,1)] p-[0rem] px-[0.2rem]">
                              <img src={assets.directionIcon} className="h-[0.5rem] w-[0.5rem]" />
                              <img
                                src={assets.vrLine}
                                className="ml-[0.3rem] h-[1rem] w-[0.5rem]"
                              />

                              <input
                                type="number"
                                className="ml-[0.4rem] h-full w-[3.1rem] border-0 bg-transparent text-[0.58rem] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                            </div>
                          </div>

                          {/* BOTTOM */}
                          <div className="flex flex-col items-start gap-[0rem]">
                            <p className="mt-[0rem] mb-[0rem] text-[0.5rem] font-[500] text-[var(--primary-color)]">
                              Bottom
                            </p>
                            <div className="flex h-[1.19rem] w-[4.61rem] items-center rounded-[0.2rem] border-[0.1rem] border-[var(--border-color)] bg-[rgba(242,242,242,1)] p-[0rem] px-[0.2rem]">
                              <img
                                src={assets.directionIcon}
                                className="h-[0.5rem] w-[0.5rem] rotate-[180deg]"
                              />
                              <img
                                src={assets.vrLine}
                                className="ml-[0.3rem] h-[1rem] w-[0.5rem]"
                              />

                              <input
                                type="number"
                                className="ml-[0.4rem] h-full w-[3.1rem] border-0 bg-transparent text-[0.58rem] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <hr className="mx-[0.2rem] my-[0.2rem] ml-[0rem] w-[15rem] pl-[0rem] opacity-20" />
                </>
              )}

              {/* ================= Top Plank ================= */}
              {!isQuickHideActive && isSettingOpen && isFullCupboard && (
                <>
                  <div className="mt-[0] mb-[0.7rem] ml-[1rem] flex flex-col gap-[0.5rem]">
                    <div className="flex items-center justify-between">
                      <p className="mb-[0] flex text-[0.7rem] font-[700] text-[var(--primary-color)]">
                        Top Plank
                      </p>
                      <button
                        onClick={() => toggleSection('topPlank')}
                        className="boredr-[0rem] mr-[1rem] border-0 bg-[var(--primary-white)] text-[0.9rem] text-[var(--primary-color)]"
                      >
                        {collapsed.topPlank ? '+' : '−'}
                      </button>
                    </div>
                    {!collapsed.topPlank && (
                      <>
                        <div className="flex items-center gap-[0.7rem]">
                          <div
                            onClick={handleTopPlankToggle}
                            className={`relative h-[1rem] w-[2.25rem] cursor-pointer rounded-full border-[0.1rem] border-[var(--toggle-border-color)] p-[0rem] transition-colors duration-300 ${topPlankEnabled ? 'bg-[var(--primary-color)]' : 'bg-[white]'} ${topPlankDisabled ? 'pointer-events-none opacity-50' : ''}`}
                          >
                            {/* Knob */}
                            <div
                              className={`absolute top-[0.16rem] left-[0.1rem] h-[0.6rem] w-[0.6rem] rounded-full border-[0.1rem] border-[var(--toggle-border-color)] p-[0rem] ring-[0.1rem] transition-transform duration-300 ease-in-out ${
                                topPlankEnabled
                                  ? 'translate-x-[1.2rem] bg-[white] ring-[var(--primary-color)]'
                                  : 'translate-x-0 bg-[var(--primary-color)] ring-[white]'
                              }`}
                            />
                          </div>

                          <p className="mt-[0px] mb-[0px] text-[0.56rem] font-[500] text-[var(--primary-color)]">
                            Top Plank Depth
                          </p>
                          <div className="flex items-center gap-[2rem]">
                            <input
                              type="number"
                              value={getTopPlank()?.dimensions?.depth ?? 0}
                              onChange={handleTopPlankDepthChange}
                              className="h-[1.2rem] w-[4.2rem] [appearance:textfield] appearance-none rounded-[0.2rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <hr className="mx-[0.2rem] my-[0.2rem] ml-[0rem] w-[15rem] pl-[0rem] opacity-20" />

                  {/* ================= Base ================= */}

                  <div className="mt-[0] mb-[0.7rem] ml-[1rem] flex flex-col gap-[0.5rem]">
                    <div className="flex items-center justify-between">
                      <p className="mb-[0] flex text-[0.7rem] font-[700] text-[var(--primary-color)]">
                        Base
                      </p>
                      <button
                        onClick={() => toggleSection('base')}
                        className="boredr-[0rem] mr-[1rem] border-0 bg-[var(--primary-white)] text-[0.9rem] text-[var(--primary-color)]"
                      >
                        {collapsed.base ? '+' : '−'}
                      </button>
                    </div>
                    {!collapsed.base && (
                      <>
                        <div className="flex items-center gap-[1.29rem]">
                          <div
                            onClick={handleBaseheightToggle}
                            className={`relative h-[1rem] w-[2.25rem] cursor-pointer rounded-full border border-[0.1rem] border-[var(--toggle-border-color)] p-[0rem] transition-colors duration-300 ${baseheightEnabled ? 'bg-[var(--primary-color)]' : 'bg-[white]'} ${baseheightDisabled ? 'pointer-events-none opacity-50' : ''}`}
                          >
                            {/* Knob */}
                            <div
                              className={`absolute top-[0.15rem] left-[0.1rem] h-[0.6rem] w-[0.6rem] rounded-full border-[0.1rem] border-[var(--toggle-border-color)] p-[0rem] ring-[0.1rem] transition-transform duration-300 ease-in-out ${
                                baseheightEnabled
                                  ? 'translate-x-[1.2rem] bg-[white] ring-[var(--primary-color)]'
                                  : 'translate-x-0 bg-[var(--primary-color)] ring-[white]'
                              }`}
                            />
                          </div>

                          <p className="mt-[0px] mb-[0px] text-[0.56rem] font-[500] text-[var(--primary-color)]">
                            Base Height
                          </p>
                          <div className="flex items-center gap-[2rem]">
                            <input
                              type="number"
                              className="h-[1.2rem] w-[4.2rem] [appearance:textfield] appearance-none rounded-[0.2rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-[0.35rem]">
                          <div
                            onClick={handleFrontpanelToggle}
                            className={`relative h-[1rem] w-[2.25rem] cursor-pointer rounded-full border-[0.1rem] border-[var(--toggle-border-color)] p-[0rem] transition-colors duration-300 ${frontpanelEnabled ? 'bg-[var(--primary-color)]' : 'bg-[white]'} ${frontpanelDisabled ? 'pointer-events-none opacity-50' : ''}`}
                          >
                            {/* Knob */}
                            <div
                              className={`absolute top-[0.16rem] left-[0.1rem] h-[0.6rem] w-[0.6rem] rounded-full border-[0.1rem] border-[var(--toggle-border-color)] p-[0rem] ring-[0.1rem] transition-transform duration-300 ease-in-out ${
                                frontpanelEnabled
                                  ? 'translate-x-[1.2rem] bg-[white] ring-[var(--primary-color)]'
                                  : 'translate-x-0 bg-[var(--primary-color)] ring-[white]'
                              }`}
                            />
                          </div>

                          <p className="mt-[0px] mb-[0px] text-[0.56rem] font-[500] text-[var(--primary-color)]">
                            Front & Back Panel
                          </p>
                          <div className="flex items-center gap-[2rem]">
                            <input
                              type="number"
                              className="h-[1.2rem] w-[4.2rem] [appearance:textfield] appearance-none rounded-[0.2rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </div>
                        </div>

                        <div className="mb-[0rem] ml-[0rem] flex flex-row gap-[0.5rem] pb-[0rem]">
                          <div className="mr-[1rem] px-3 py-2">
                            <p className="mt-[0px] mb-[0px] text-[0.56rem] font-[500] text-[var(--primary-color)]">
                              Back Panel
                            </p>
                            <input
                              type="number"
                              className="h-[1.2rem] w-[5.35rem] [appearance:textfield] appearance-none rounded-[0.2rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </div>
                          <div className="mr-[1rem] px-3 py-2">
                            <p className="mt-[0px] mb-[0px] text-[0.56rem] font-[500] text-[var(--primary-color)]">
                              Inward Size
                            </p>
                            <input
                              type="number"
                              className="h-[1.2rem] w-[5.35rem] [appearance:textfield] appearance-none rounded-[0.2rem] border-[0.1rem] border-[var(--border-color)] p-[0rem] pl-[0.3rem] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <hr className="mx-[0.2rem] my-[0.2rem] ml-[0rem] w-[15rem] pl-[0rem] opacity-20" />
                </>
              )}

              {/* ================= MATERIAL ================= */}
              <div className="mr-[1rem] px-3 py-2">
                <div className="flex items-center justify-between">
                  <p className="mb-2 ml-[1rem] text-[0.7rem] font-[700] text-[var(--primary-color)]">
                    Material
                  </p>
                  <button
                    onClick={() => toggleSection('material')}
                    className="boredr-[0rem] mr-[0rem] border-0 bg-[var(--primary-white)] text-[0.9rem] text-[var(--primary-color)]"
                  >
                    {collapsed.material ? '+' : '−'}
                  </button>
                </div>
                {!collapsed.material && (
                  <>
                    {/* Color */}
                    <div className="mb-[] ml-[1rem] flex items-center justify-between">
                      <p className="text-[0.6rem] font-[500] text-[var(--primary-color)]">Color</p>

                      <div className="flex w-[9.5rem] items-center gap-[0.3rem] rounded-[0.4rem] border-[0.1rem] border-[var(--border-color)] bg-[var(--primary-white)] p-[0rem] px-[0.3rem] py-[0.3rem]">
                        <input
                          type="color"
                          value={selectedColor}
                          onChange={(e) => applyColorToSelected(e.target.value)}
                          className="h-[1.6rem] w-[1.6rem] cursor-pointer border-[0rem] p-[0rem]"
                        />
                        <input
                          type="text"
                          value={selectedColor.toUpperCase()}
                          onChange={(e) => applyColorToSelected(e.target.value)}
                          className="w-[4rem] border-[0rem] bg-transparent text-[0.65rem] text-[var(--primary-color)] uppercase outline-none"
                        />
                      </div>
                    </div>

                    {/* Change Material */}
                    <div
                      onClick={handleMaterialChange}
                      className="mb-2 flex items-center justify-between gap-[0rem] py-[0rem] pr-[0.5rem] pr-[0rem]"
                    >
                      <p className="ml-[1rem] text-[0.6rem] font-[500] text-[var(--primary-color)]">
                        Change Material
                      </p>
                      <button
                        className="flex h-[1.2rem] w-[6.8rem] cursor-pointer appearance-none items-center justify-between rounded-[0.1rem] border-[0rem] bg-[var(--primary-color)] p-[0rem] px-[0.5rem] text-left font-[poppins] text-[0.6rem] font-extralight text-[var(--primary-white)] transition-colors duration-200 ease-in-out"
                        disabled={isQuickHideActive}
                      >
                        Press to Change
                        <img src={assets.swapHorizontalIcon} className="h-[0.8rem] w-[0.8rem]" />
                      </button>
                    </div>

                    {/* Texture */}

                    {/* ================= Change Texture ================= */}
                    <div className="ml-[1rem] flex flex-row items-center justify-between gap-[0.25rem]">
                      <p className="text-[0.6rem] font-[500] text-[var(--primary-color)]">
                        Change Texture
                      </p>

                      <button
                        onClick={toggleTextureList}
                        disabled={isTextureChangeDisabled}
                        className={`flex h-[1.2rem] w-[6.8rem] cursor-pointer appearance-none items-center justify-between rounded-[0.1rem] border-[0rem] bg-[var(--primary-color)] p-[0rem] px-[0.5rem] text-left font-[poppins] text-[0.6rem] font-[var(--font-family)] font-extralight text-[var(--primary-white)] transition-colors duration-200 ease-in-out ${
                          isTextureChangeDisabled ? 'cursor-not-allowed opacity-50' : ''
                        }`}
                      >
                        Select Texture
                        <img src={assets.down_arrow1} className="h-[0.6rem] w-[0.6rem]" />
                      </button>
                    </div>

                    {/* Texture List */}
                    {isTextureListOpen && (
                      <div className="absolute left-[14%] z-[100] mt-[0.25rem] flex max-h-[7rem] max-w-[8.5rem] flex-wrap gap-[0.1rem] overflow-y-auto rounded-[0.375rem] border border-[var(--border-color)] bg-[var(--primary-white)] p-[0.3rem] shadow-[0_0.25rem_0.5rem_rgba(0,0,0,0.1)] [&::-webkit-scrollbar]:w-[0.3rem] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[rgba(57,37,121,0.1)] hover:[&::-webkit-scrollbar-thumb]:bg-[rgba(57,37,121,0.25)] [&::-webkit-scrollbar-track]:bg-transparent">
                        {materialModal.map((m) => (
                          <div
                            key={m.option}
                            className="flex cursor-pointer flex-col items-center rounded border-[0.1rem] border-transparent p-[0rem] transition-all duration-200 ease-in-out hover:border-[var(--primary-color)] hover:shadow-[0_0_6px_rgba(0,0,0,0.25)]"
                            onClick={() => handleTextureSelect(m.image)}
                            title={m.name}
                          >
                            <img
                              src={m.image}
                              className="h-[2.5rem] w-[2.5rem] rounded-[0.125rem] object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ================= Texture Grain ================= */}
                    <div className="flex items-center justify-between gap-[0rem]">
                      <p className="ml-[1rem] text-[0.6rem] font-[500] text-[var(--primary-color)]">
                        Texture Grain
                      </p>

                      <div className="relative mr-[0rem] h-[1.2rem] w-[6.8rem] appearance-none rounded-[0.35rem] border-[0.1rem] border-[rgba(120,110,170,0.5)] p-[0rem]">
                        {/* Rotate Icon */}
                        <div>
                          <img
                            src={assets.rotateIcon}
                            alt="rotate"
                            className="pointer-events-none absolute top-[0.55rem] left-[0.35rem] h-[1rem] w-[1rem] -translate-y-[0.45rem] opacity-70"
                          />
                        </div>
                        <div className="absolute top-0 left-[1.5rem] flex h-full w-[4.8rem] items-center justify-center">
                          {/* Input */}
                          <input
                            type="number"
                            min={0}
                            max={180}
                            value={textureRotation}
                            onChange={(e) => handleTextureRotationChange(Number(e.target.value))}
                            disabled={
                              isDisabled ||
                              selectedObject?.material?.type !== MATERIAL_TYPES.TEXTURE
                            }
                            className="h-[0.7rem] w-full border-[0rem] p-[0rem] pr-[0rem] pl-[0.3rem] pl-[0rem] text-[0.7rem] font-[500] text-[var(--primary-color)] focus:border-[var(--primary-color)] focus:outline-none disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Door Position */}
                    {!isQuickHideActive && isSettingOpen && isDoorOrDrawerSelected && (
                      <div className={'ml-[0rem] flex flex-col gap-[0rem] py-[0rem] pr-[0rem]'}>
                        <div className={'relative flex items-center justify-between'}>
                          <p className="m-0 pl-[1rem] font-[poppins] text-[0.6rem] font-[var(--font-family)] text-[var(--primary-color)]">
                            Door Position
                          </p>
                          <select
                            className="flex h-[1.2rem] w-[6.8rem] cursor-pointer appearance-none items-center justify-between rounded-[0.1rem] border-[0rem] bg-[var(--primary-color)] p-[0rem] px-[0.5rem] text-left font-[poppins] text-[0.6rem] font-[var(--font-family)] font-extralight text-[var(--primary-white)] transition-colors duration-200 ease-in-out"
                            value={doorPosition}
                            onChange={(e) => {
                              const value = e.target.value;
                              setDoorPosition(value);
                              handleDoorPositionChange(value);
                            }}
                            disabled={isQuickHideActive}
                          >
                            <option value="None">None</option>
                            <option value="Left">Left</option>
                            <option value="Right">Right</option>
                            <option value="Top">Top</option>
                            <option value="Bottom">Bottom</option>
                          </select>
                        </div>

                        <div className="relative flex items-center justify-between pl-[1rem]">
                          <p className="m-0 font-[poppins] text-[0.6rem] font-[var(--font-family)] text-[var(--primary-color)]">
                            Open/Close
                          </p>
                          <button
                            className="flex h-[1.2rem] w-[6.8rem] cursor-pointer appearance-none items-center justify-between rounded-[0.1rem] border-[0rem] bg-[var(--primary-color)] p-[0rem] px-[0.5rem] text-left font-[poppins] text-[0.6rem] font-[var(--font-family)] font-extralight text-[var(--primary-white)] transition-colors duration-200 ease-in-out"
                            disabled={isQuickHideActive}
                            onClick={handleOpenCloseChange}
                          >
                            Open/Close
                          </button>
                        </div>
                        <div className="relative flex items-center justify-between pl-[1rem]">
                          <p className="m-0 font-[poppins] text-[0.6rem] font-[var(--font-family)] text-[var(--primary-color)]">
                            Drawer Type
                          </p>
                          <select
                            className="flex h-[1.2rem] w-[6.8rem] cursor-pointer appearance-none items-center justify-between rounded-[0.1rem] border-0 bg-[var(--primary-color)] px-[0.5rem] text-left font-[poppins] text-[0.6rem] font-extralight text-[var(--primary-white)] transition-colors duration-200 ease-in-out"
                            disabled={isQuickHideActive}
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
                        <>
                          <hr className="mx-[0.2rem] my-[0.2rem] ml-[0rem] w-[15rem] pl-[0rem] opacity-20" />

                          <div className="mt-[0rem] ml-[1rem] flex flex-col items-start">
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
                                    className={`flex h-[1.9rem] w-[3.2rem] items-center gap-[0.1rem] rounded-[0.35rem] border-[0.1rem] border-[var(--border-color)] bg-white p-0 p-[0rem] px-[0.35rem] focus-within:border-[var(--primary-color)]`}
                                  >
                                    {/* IMAGE ICON */}
                                    <Image
                                      src={field.icon}
                                      alt={field.label}
                                      width={19}
                                      height={19}
                                      className="h-[0.8rem] w-[0.8rem] object-contain opacity-70"
                                    />

                                    <img
                                      src={assets.vrLine}
                                      className="ml-[0.1rem] h-[1.5rem] w-[0.5rem]"
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
                      </div>
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
          onClose={() => setShowMaterialPopup(false)}
          onSave={(selectedMaterials) => {
            if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
              console.log('Selected materials:', selectedMaterials);
            }
            setShowMaterialPopup(false);
          }}
        />
      )}
    </div>
  );
};

export default Sidebar;
