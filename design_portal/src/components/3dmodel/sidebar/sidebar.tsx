import { TEXTURE_MEDIA } from '@/components/3dmodel/handler/constant';
import { assets } from '@/svgPaths';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as THREE from 'three';
import { itemType } from '../design/interface';
import {
  UNIT_OPTIONS,
  Unit,
  convertFromMM,
  convertToMM,
  metersToMM,
} from '../handler/unitConversion';
import { updateObjectInScene } from '../handler/updateHandler';
import { RootState } from '../store';
import { Object3D } from '../store/interface';
import { setUnitType } from '../store/measurementSlice';
import { MaterialChangePopup } from './MaterialChangePopup';
import style from './sidebar.module.css';

const Sidebar: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNavOpen, setNavOpen] = useState(true);
  const [isSettingOpen, setSettingOpen] = useState(false);
  const [, setSubMenu] = useState<string | null>('layout');
  const [doorPosition, setDoorPosition] = useState('None');
  const [selectedHandle, setSelectedHandle] = useState<string | null>(null);
  const [isHandleDropdownOpen, setIsHandleDropdownOpen] = useState(false);
  const [showMaterialPopup, setShowMaterialPopup] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#392579');
  const [, setSelectedTexture] = useState<string | null>(null);
  const [isTextureListOpen, setIsTextureListOpen] = useState(false);
  const [displayUnit, setDisplayUnit] = useState<Unit>('mm');
  const [displayedDimensions, setDisplayedDimensions] = useState({
    width: 0,
    height: 0,
    depth: 0,
  });
  const [rotations, setRotations] = useState({ x: 0, y: 0, z: 0 });
  const [displayedPositions, setDisplayedPositions] = useState({
    x: 0,
    y: 0,
    z: 0,
  });
  const colorInputRef = useRef<HTMLInputElement>(null);
  let targetMesh: THREE.Mesh | null = null;
  let doorMesh: THREE.Mesh | null = null;
  let handleMesh: THREE.Mesh | null = null;

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

  const dispatch = useDispatch();
  const selectedObjectId = useSelector((state: RootState) => state.data.selectedObject);
  const selectedChildObjectId = useSelector((state: RootState) => state.data.selectedChildObject);
  const objects = useSelector((state: RootState) => state.data.objects);
  const scene = useSelector((state: RootState) => state.scene.scene);
  const isQuickHideActive = useSelector((state: RootState) => state.data.isQuickHideActive);
  const isDisabled = isQuickHideActive;

  let selectedObject: Object3D | null | undefined;
  if (selectedChildObjectId) {
    selectedObject = objects.find((obj) => obj.id === selectedChildObjectId);
  } else if (selectedObjectId) {
    selectedObject = objects.find((obj) => obj.id === selectedObjectId);
  } else {
    selectedObject = null;
  }

  const parentObject = selectedObject?.parent
    ? objects.find((obj) => obj.id === selectedObject.parent)
    : null;
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
    if (selectedObject) {
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      }
      const w = convertFromMM(selectedObject.width, displayUnit);
      const h = convertFromMM(selectedObject.height, displayUnit);
      const d = convertFromMM(selectedObject.depth, displayUnit);
      setDisplayedDimensions({
        width: w,
        height: h,
        depth: d,
      });
      const px = convertFromMM(selectedObject.position?.x ?? 0, displayUnit);
      const py = convertFromMM(selectedObject.position?.y ?? 0, displayUnit);
      const pz = convertFromMM(selectedObject.position?.z ?? 0, displayUnit);
      setDisplayedPositions({
        x: px,
        y: py,
        z: pz,
      });
      setRotations({
        x: selectedObject.rotationX!,
        y: selectedObject.rotationY!,
        z: selectedObject.rotationZ!,
      });
    }
  }, [selectedObject, displayUnit]);

  useEffect(() => {
    if (isSidebarOpen) {
      setSubMenu('layout');
    }
  }, [isSidebarOpen]);

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

  const validateNumericInput = (
    value: number,
    min: number = 0,
    max: number = Infinity
  ): number | null => {
    return isNaN(value) || value < min || value > max ? null : value;
  };

  const updateObject = (updates: Partial<Object3D>) => {
    if (!selectedObject || isQuickHideActive) return;
    updateObjectInScene(selectedObject.id, updates, scene, dispatch, selectedObject);
    tryRebuildInvisibleBoxesForCabinet(selectedObject.id);
  };

  const handleDimensionChange =
    (dim: 'width' | 'height' | 'depth') => (e: React.ChangeEvent<HTMLInputElement>) => {
      setDisplayedDimensions((prev) => ({
        ...prev,
        [dim]: Number(e.target.value),
      }));
    };
  const handleDimensionCommit = (dim: 'width' | 'height' | 'depth', displayedValue: number) => {
    const mmValue = convertToMM(displayedValue, displayUnit);
    const minMM = dim === 'width' ? 0 : 5;
    const maxMM = dim === 'depth' && parentObject?.depth ? parentObject.depth : Infinity;
    const validated = validateNumericInput(mmValue, minMM, maxMM);
    if (validated !== null) {
      updateObject({ [dim]: validated });
    } else {
      // Reset to original value if invalid
      setDisplayedDimensions((prev) => ({
        ...prev,
        [dim]: convertFromMM(selectedObject?.[dim] ?? prev[dim], displayUnit),
      }));
    }
  };

  const handleDimensionKeyDown =
    (dim: 'width' | 'height' | 'depth') => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleDimensionCommit(dim, displayedDimensions[dim]);
      }
    };

  const handleDimensionBlur = (dim: 'width' | 'height' | 'depth') => () => {
    handleDimensionCommit(dim, displayedDimensions[dim]);
  };

  const handleRotationChange =
    (axis: 'x' | 'y' | 'z') => (e: React.ChangeEvent<HTMLInputElement>) => {
      setRotations((prev) => ({ ...prev, [axis]: Number(e.target.value) }));
    };

  const handleRotationCommit = (axis: 'x' | 'y' | 'z', value: number) => {
    const validated = validateNumericInput(value, 0, 360);
    if (validated !== null) {
      updateObject({ [`rotation${axis.toUpperCase()}`]: validated });
    }
  };

  const handleRotationKeyDown =
    (axis: 'x' | 'y' | 'z') => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleRotationCommit(axis, rotations[axis]);
      }
    };

  const handleRotationBlur = (axis: 'x' | 'y' | 'z') => () => {
    handleRotationCommit(axis, rotations[axis]);
  };

  const handlePositionChange =
    (axis: 'x' | 'y' | 'z') => (e: React.ChangeEvent<HTMLInputElement>) => {
      setDisplayedPositions((prev) => ({
        ...prev,
        [axis]: Number(e.target.value),
      }));
    };

  const handlePositionCommit = (axis: 'x' | 'y' | 'z', displayedValue: number) => {
    if (!selectedObject || isQuickHideActive) return;
    const mmValue = convertToMM(displayedValue, displayUnit);
    if (isNaN(mmValue)) return;
    const newPosition = { ...selectedObject.position, [axis]: mmValue };
    updateObject({ position: newPosition });
  };

  const handlePositionKeyDown =
    (axis: 'x' | 'y' | 'z') => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handlePositionCommit(axis, displayedPositions[axis]);
      }
    };

  const handlePositionBlur = (axis: 'x' | 'y' | 'z') => () => {
    handlePositionCommit(axis, displayedPositions[axis]);
  };

  const tryRebuildInvisibleBoxesForCabinet = (objectId: string) => {
    if (!scene) return;
    try {
      rescaleByObjectId(scene, objectId);
    } catch {}
    scene.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        !targetMesh &&
        child?.isMesh &&
        child?.userData?.objectId === objectId
      ) {
        targetMesh = child;
      }
    });
    if (!targetMesh) return;
    const mesh: THREE.Mesh = targetMesh;
    if (mesh.name !== 'SimpleCabinet') return;
    const params = (mesh.geometry as THREE.BoxGeometry).parameters;
    const width = metersToMM(params.width);
    const height = metersToMM(params.height);
    const depth = metersToMM(params.depth);
    const thickness = 18;
    const existing = mesh.children.find((c) => c && c.name === 'invisibleBox_cabinet') || null;
    if (existing) {
      mesh.remove(existing);
      (existing as THREE.Mesh).geometry?.dispose?.();
    }
    const invMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    });
    const innerW = Math.max(width - thickness * 2, 20);
    const innerH = Math.max(height - thickness * 2, 20);
    const innerD = Math.max(depth - thickness * 2, 20);
    const invCab = new THREE.Mesh(
      new THREE.BoxGeometry(innerW / 1000, innerH / 1000, innerD / 1000),
      invMat
    );
    invCab.name = 'invisibleBox_cabinet';
    invCab.userData.isInvisibleBox = true;
    invCab.position.set(0, 0, 0);
    mesh.add(invCab);
  };

  const handleTextureSelect = (texturePath: string) => {
    setSelectedTexture(texturePath);
    applyTextureToSelected(texturePath, 'updateTexture');
    setIsTextureListOpen(false);
  };

  const handleSetting = () => {
    if (isQuickHideActive) return;
    setSettingOpen(true);
    setNavOpen(false);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleNavigation = () => {
    setSettingOpen(false);
    setNavOpen(true);
  };

  const handleDoorPositionChange = (position: string) => {
    scene.traverse((child) => {
      if (child.userData.objectId === selectedObject?.id) {
        child.userData.openDirection = position.toLowerCase();
      }
    });
  };

  const handleHandlePositionChange = (position: string) => {
    if (!scene) return;
    const targetId = selectedChildObjectId || selectedObjectId;

    if (!targetId) return;

    scene.traverse((node) => {
      if (node instanceof THREE.Mesh && !doorMesh && node.userData?.objectId === targetId) {
        if (node.parent instanceof THREE.Mesh && node.parent.name.includes('DoorGroup')) {
          doorMesh = node.parent;
        } else {
          doorMesh = node;
        }
      }
    });

    if (!doorMesh) {
      console.warn('No door mesh found for target ID:', targetId);
      return;
    }

    (doorMesh as THREE.Mesh).traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const name = (child?.name || '').toLowerCase();
        if (!handleMesh && (name.includes('handle') || name.includes('knob'))) {
          handleMesh = child;
        }
      }
    });

    if (!handleMesh) return;
    const currentZ = handleMesh.position.z;
    const doorPosition = doorMesh.position.clone();

    const box = new THREE.Box3().setFromObject(doorMesh);
    const min = box.min.clone();
    const max = box.max.clone();
    const mid = new THREE.Vector3((min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2);
    doorMesh.position.copy(doorPosition);

    const padding = 0.12;

    const pickX = (label: string) => {
      if (label.endsWith('Left')) return min.x + padding;
      if (label.endsWith('Right')) return max.x - padding;
      return mid.x;
    };
    const pickY = (label: string) => {
      if (label.startsWith('Top')) return max.y - padding;
      if (label.startsWith('Bottom')) return min.y + padding;
      return mid.y;
    };
    const label = position as string;
    const targetWorld = new THREE.Vector3(pickX(label), pickY(label), mid.z);
    const targetLocal = doorMesh.worldToLocal(targetWorld.clone());

    // Only update X and Y original Z position
    handleMesh.position.x = targetLocal.x;
    handleMesh.position.y = targetLocal.y;
    handleMesh.position.z = currentZ;

    if (label.startsWith('Top') || label.startsWith('Bottom')) {
      handleMesh.rotation.x = -(Math.PI / 2);
      handleMesh.rotation.y = 0;
      handleMesh.rotation.z = Math.PI / 2;
    } else if (label.endsWith('Left') || label.endsWith('Right')) {
      handleMesh.rotation.x = 0;
      handleMesh.rotation.y = Math.PI / 2;
      handleMesh.rotation.z = 0;
    }

    if (handleMesh.updateMatrixWorld) handleMesh.updateMatrixWorld(true);
  };

  const handleMaterialChange = () => {
    setShowMaterialPopup(true);
  };

  const applyColorToSelected = (value: string, update?: string) => {
    setSelectedColor(value);
    if (colorInputRef.current) {
      colorInputRef.current.style.backgroundColor = value;
    }
    if (!scene) return;
    const targetId = selectedChildObjectId || selectedObjectId;
    if (!targetId) return;
    const obj = selectedChildObjectId
      ? objects.find((o) => o.id === selectedChildObjectId)
      : objects.find((o) => o.id === selectedObjectId!);
    const nameLower = (obj?.name || '').toLowerCase();
    if (nameLower.includes('door') || nameLower.includes('drawer')) return;
    scene.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        !targetMesh &&
        child?.isMesh &&
        child?.userData?.objectId === targetId
      ) {
        targetMesh = child;
      }
    });

    if (!targetMesh) return;
    const color = new THREE.Color(value);
    if (
      targetMesh.material instanceof THREE.MeshPhongMaterial &&
      Array.isArray(targetMesh?.material)
    ) {
      targetMesh.material = targetMesh.material.map((m) => {
        if (m && typeof m.clone === 'function') {
          const cloned = m.clone();
          if (cloned.map) cloned.map = null;
          if (cloned.color) cloned.color.set(color);
          return cloned;
        }
        return new THREE.MeshPhongMaterial({ color });
      });
    } else if (targetMesh?.material instanceof THREE.MeshPhongMaterial) {
      if (targetMesh.material.color) {
        if (targetMesh.material.map) targetMesh.material.map = null;
        targetMesh.material.color.set(color);
        targetMesh.material.needsUpdate = true;
      } else {
        targetMesh.material = new THREE.MeshPhongMaterial({ color });
      }
    } else {
      targetMesh.material = new THREE.MeshPhongMaterial({ color });
    }
    if (obj && update) {
      updateObjectInScene(obj.id, { material: { type: 'COLOR', value } }, scene, dispatch, obj);
    }
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const u = e.target.value as Unit;
    setDisplayUnit(u);

    try {
      dispatch(setUnitType(u === 'inch' ? 'in' : u === 'feet' ? 'ft' : u));
    } catch (err) {
      console.error('Failed to set unit type:', err);
    }
  };

  const applyTextureToSelected = (texturePath: string, update?: string) => {
    if (!scene) return;
    const targetId = selectedChildObjectId || selectedObjectId;
    if (!targetId) return;
    const obj = selectedChildObjectId
      ? objects.find((o) => o.id === selectedChildObjectId)
      : objects.find((o) => o.id === selectedObjectId!);
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && !targetMesh && child?.userData?.objectId === targetId) {
        targetMesh = child;
      }
    });
    if (!targetMesh) return;
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(texturePath, () => {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(2, 1);
      texture.needsUpdate = true;
      targetMesh?.traverse((child) => {
        if (child instanceof THREE.Mesh && child.isMesh) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map((m) => {
              if (m && typeof m.clone === 'function') {
                const cloned = m.clone();
                cloned.map = texture;
                cloned.roughness = 0.6;
                cloned.metalness = 0.0;
                cloned.needsUpdate = true;
                return cloned;
              }
              return new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 0.6,
                metalness: 0.0,
              });
            });
          } else if (child.material) {
            child.material.map = texture;
            child.material.roughness = 0.6;
            child.material.metalness = 0.0;
            child.material.needsUpdate = true;
          } else {
            child.material = new THREE.MeshStandardMaterial({
              map: texture,
              roughness: 0.6,
              metalness: 0.0,
            });
          }
        }
      });
      if (obj && update) {
        updateObjectInScene(
          obj.id,
          { material: { type: 'TEXTURE', value: texturePath } },
          scene,
          dispatch,
          obj
        );
      }
    });
  };

  const toggleTextureList = () => {
    setIsTextureListOpen((prev) => !prev);
  };

  // Proportionally rescale and reposition children of a container when its geometry changes
  function rescaleChildrenForContainer(container: THREE.Mesh) {
    const params = (container.geometry as THREE.BoxGeometry).parameters;
    const newDims = {
      width: params.width,
      height: params.height,
      depth: params.depth,
    };
    const userData = container.userData || {};
    const last = userData.lastDims || newDims;
    const sx = (newDims.width || 1) / (last.width || 1);
    const sy = (newDims.height || 1) / (last.height || 1);
    const sz = (newDims.depth || 1) / (last.depth || 1);

    if (Math.abs(sx - 1) < 1e-6 && Math.abs(sy - 1) < 1e-6 && Math.abs(sz - 1) < 1e-6) {
      return;
    }

    container.children.forEach((child) => {
      // Only scale real meshes; skip invisible helper boxes so they can be rebuilt precisely
      const isMesh = child instanceof THREE.Mesh;
      if (!isMesh) return;
      const name = (child.name || '').toLowerCase();
      if (name.startsWith('invisiblebox')) return;

      // Scale local position
      child.position.set(child.position.x * sx, child.position.y * sy, child.position.z * sz);
      // Scale mesh uniformly per axis (relative to previous scale)
      const m = child as THREE.Mesh;
      m.scale.set(m.scale.x * sx, m.scale.y * sy, m.scale.z * sz);
    });

    // Update lastDims to current
    container.userData = {
      ...userData,
      lastDims: { ...newDims },
    };
  }

  // Find container by objectId and rescale its children proportionally
  function rescaleByObjectId(scene: THREE.Scene, objectId: string) {
    let container: THREE.Mesh | null = null;
    scene.traverse((o) => {
      if (container) return;
      if (o instanceof THREE.Mesh && o.isMesh && o.userData && o.userData.objectId === objectId) {
        const n = (o.name || '').toLowerCase();
        if (n === 'simplecabinet'.toLowerCase() || n === 'simpletable'.toLowerCase()) {
          container = o as THREE.Mesh;
        }
      }
    });
    if (!container) return;
    rescaleChildrenForContainer(container);
  }
  const sideBarMenuConfig = [
    {
      subMenu: 'layout',
      title: 'Layout',
      fields: [
        {
          label: 'Width',
          name: 'width',
          type: 'number',
          value: displayedDimensions.width,
          min: convertFromMM(0, displayUnit),
          disabled: isHorizontalPlank || isDisabled,
          onChange: handleDimensionChange('width'),
          onKeyDown: handleDimensionKeyDown('width'),
          onBlur: handleDimensionBlur('width'),
        },
        {
          label: 'Height',
          name: 'height',
          type: 'number',
          value: displayedDimensions.height,
          min: convertFromMM(5, displayUnit),
          disabled: isVerticalPlank || isDisabled,
          onChange: handleDimensionChange('height'),
          onKeyDown: handleDimensionKeyDown('height'),
          onBlur: handleDimensionBlur('height'),
        },
        {
          label: 'Depth',
          name: 'depth',
          type: 'number',
          value: displayedDimensions.depth,
          min: convertFromMM(5, displayUnit),
          max: parentObject?.depth ? convertFromMM(parentObject.depth, displayUnit) : undefined,
          disabled: isQuickHideActive,
          onChange: handleDimensionChange('depth'),
          onKeyDown: handleDimensionKeyDown('depth'),
          onBlur: handleDimensionBlur('depth'),
        },
      ],
    },
    {
      subMenu: 'rotation',
      title: 'Rotation',
      fields: [
        {
          label: 'Rotate X ',
          name: 'rotationX',
          type: 'number',
          value: rotations.x,
          min: 0,
          max: 360,
          disabled: isQuickHideActive,
          onChange: handleRotationChange('x'),
          onKeyDown: handleRotationKeyDown('x'),
          onBlur: handleRotationBlur('x'),
        },
        {
          label: 'Rotate Y ',
          name: 'rotationY',
          type: 'number',
          value: rotations.y,
          min: 0,
          max: 360,
          disabled: isQuickHideActive,
          onChange: handleRotationChange('y'),
          onKeyDown: handleRotationKeyDown('y'),
          onBlur: handleRotationBlur('y'),
        },
        {
          label: 'Rotate Z ',
          name: 'rotationZ',
          type: 'number',
          value: rotations.z,
          min: 0,
          max: 360,
          disabled: isQuickHideActive,
          onChange: handleRotationChange('z'),
          onKeyDown: handleRotationKeyDown('z'),
          onBlur: handleRotationBlur('z'),
        },
      ],
    },
    {
      subMenu: 'position',
      title: 'Position',
      fields: [
        {
          label: 'Position X',
          name: 'positionX',
          type: 'number',
          value: displayedPositions.x,
          disabled: isQuickHideActive,
          onChange: handlePositionChange('x'),
          onKeyDown: handlePositionKeyDown('x'),
          onBlur: handlePositionBlur('x'),
        },
        {
          label: 'Position Y',
          name: 'positionY',
          type: 'number',
          value: displayedPositions.y,
          disabled: isQuickHideActive,
          onChange: handlePositionChange('y'),
          onKeyDown: handlePositionKeyDown('y'),
          onBlur: handlePositionBlur('y'),
        },
        {
          label: 'Position Z',
          name: 'positionZ',
          type: 'number',
          value: displayedPositions.z,
          disabled: isQuickHideActive,
          onChange: handlePositionChange('z'),
          onKeyDown: handlePositionKeyDown('z'),
          onBlur: handlePositionBlur('z'),
        },
      ],
    },
  ];

  return (
    <div className={isSidebarOpen ? style.sidebar : style.sidebar_open}>
      <div
        className={isSidebarOpen ? style.sidebar_title : style.sidebar_close_title}
        onClick={toggleSidebar}
      >
        <p>Viewport Navigation</p>
        <img
          src={isSidebarOpen ? assets.down_arrow : assets.up_arrow}
          alt="toggle_arrow"
          style={{ cursor: 'pointer' }}
        />
      </div>
      {isSidebarOpen && (
        <>
          <div className={style.switch_div}>
            <button
              onClick={handleSetting}
              className={isSettingOpen ? style.btnactive : style.btn}
              disabled={isQuickHideActive}
            >
              Setting
            </button>
            <button onClick={handleNavigation} className={isNavOpen ? style.btnactive : style.btn}>
              Navigation
            </button>
          </div>
          <hr></hr>
          {isNavOpen && (
            <div>
              <div className={style.nav_div}>
                <img src={assets.navigationdetail} alt="" className={style.zoomoption_img} />
              </div>
            </div>
          )}
          {isSettingOpen && !selectedObject && (
            <p
              style={{
                margin: '1rem',
                textAlign: 'center',
                color: '#392579',
                marginTop: '2rem',
                fontSize: '0.8rem',
              }}
            >
              No Item Selected
            </p>
          )}
          {isSettingOpen && selectedObject && (
            <>
              <div className={style.field_main_div}>
                <div className={style.field_group_unitdiv}>
                  <p>Unit</p>
                  <select
                    value={displayUnit}
                    onChange={handleUnitChange}
                    disabled={isQuickHideActive}
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <hr></hr>
                {sideBarMenuConfig.map((menu) => (
                  <div key={menu.subMenu}>
                    <div className={style.field_group_title_div}>
                      <p className={style.field_group_title}>{menu.title}</p>
                      <div className={style.field_group_div}>
                        {menu.fields.map((field, index) => (
                          <div key={index} className={style.field_group1}>
                            <p>{field.label}</p>
                            <div className={style.input_with_unit}>
                              <input
                                id={field.name}
                                name={field.name}
                                type={field.type}
                                value={field.value}
                                disabled={field.disabled}
                                onChange={field.onChange}
                                onKeyDown={field.onKeyDown}
                                onBlur={field.onBlur}
                                className={style.number_input}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <hr></hr>
                  </div>
                ))}
                <div className={style.field_group_title_div}>
                  <p className={style.field_group_title}>Material</p>
                </div>
                <div className={style.field_group_div_material}>
                  <div className={style.field_group_color_row}>
                    <p>Color</p>

                    <div className={style.color_preview_wrapper}>
                      <input
                        type="color"
                        value={selectedColor}
                        onChange={(e) => applyColorToSelected(e.target.value)}
                        className={style.color_input_box}
                      />
                      <input
                        type="text"
                        value={selectedColor.toUpperCase()}
                        onChange={(e) => applyColorToSelected(e.target.value)}
                        className={style.color_hex_input}
                      />
                    </div>
                  </div>
                  <div
                    className={style.field_group_div_material_change}
                    onClick={handleMaterialChange}
                  >
                    <p>Change Material</p>
                    <button className={style.btn_material_change} disabled={isQuickHideActive}>
                      Press to Change
                    </button>
                  </div>
                </div>
                {!isQuickHideActive && isSettingOpen && itemType.DOOR && (
                  <div className={style.field_group_div_door}>
                    <div className={style.field_group_div_material_change}>
                      <p>Door Position</p>
                      <select
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
                    <div className={style.field_group_div_material_change}>
                      <p>Handle</p>
                      <div
                        className={style.dropdown_like_select}
                        onClick={() => setIsHandleDropdownOpen((prev) => !prev)}
                      >
                        {selectedHandle ? selectedHandle : 'Select Position'}
                        <img
                          src={isHandleDropdownOpen ? assets.menu_up : assets.menu_down}
                          alt="dropdown arrow"
                        />
                      </div>
                      {isHandleDropdownOpen && (
                        <div className={style.dropdown_grid}>
                          {[
                            'Top-Left',
                            'Top-Center',
                            'Top-Right',
                            'Middle-Left',
                            'Center',
                            'Middle-Right',
                            'Bottom-Left',
                            'Bottom-Center',
                            'Bottom-Right',
                          ].map((label, index) => (
                            <div
                              key={index}
                              className={`${style.grid_square} ${selectedHandle === label ? style.active_square : ''}`}
                              onClick={() => {
                                setSelectedHandle(label);
                                setIsHandleDropdownOpen(false);
                                handleHandlePositionChange(label);
                                if (selectedObject && !isQuickHideActive) {
                                  updateObjectInScene(
                                    selectedObject.id,
                                    { handlePosition: label },
                                    scene,
                                    dispatch,
                                    selectedObject
                                  );
                                }
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className={style.field_group_div_material_change}>
                      <p>Texture</p>
                      <button
                        className={style.btn_material_change}
                        onClick={toggleTextureList}
                        disabled={isQuickHideActive}
                      >
                        Select Texture
                      </button>
                    </div>
                    <div>
                      {isTextureListOpen && (
                        <div className={style.texture_list}>
                          {materialModal.map((material) => (
                            <div
                              key={material.option}
                              className={style.texture_item}
                              onClick={() => handleTextureSelect(material.image)}
                              title={material.name}
                            >
                              <img
                                src={material.image}
                                alt={material.name}
                                className={style.texture_thumbnail}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <hr></hr>
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
          rules={selectedObject?.catalog_rules || []}
        />
      )}
    </div>
  );
};

export default Sidebar;
