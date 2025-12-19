import { TEXTURE_MEDIA } from '@/components/3dmodel/handler/constant';
import { assets } from '@/svgPaths';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as THREE from 'three';
import { itemType } from '../design/interface';
import { UpdateObjectInScene } from '../handler/updateHandler';
import { Dimensions } from '../interface';
import { MeshObjectData } from '../sceneCreator/interface';
import { RootState } from '../store';
import { Position, Rotation } from '../store/interface';
import { Axis, Field, MATERIAL_TYPES } from './interface';
import { MaterialChangePopup } from './MaterialChangePopup';

//import style from './sidebar.module.css';

const Sidebar: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNavOpen, setNavOpen] = useState(true);
  const [isSettingOpen, setSettingOpen] = useState(false);
  const [doorPosition, setDoorPosition] = useState('None');
  const [selectedHandle, setSelectedHandle] = useState<string | null>(null);
  const [isHandleDropdownOpen, setIsHandleDropdownOpen] = useState(false);
  const [showMaterialPopup, setShowMaterialPopup] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#392579');
  const [isTextureListOpen, setIsTextureListOpen] = useState(false);

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
  let doorMesh: THREE.Mesh | null = null;
  let handleMesh: THREE.Mesh | null = null;
  const updateObjectRef = useRef<UpdateObjectInScene | null>(null);

  const dispatch = useDispatch();
  const selectedObjectId = useSelector((state: RootState) => state.data.selectedObject);
  const selectedChildObjectId = useSelector((state: RootState) => state.data.selectedChildObject);
  const objects = useSelector((state: RootState) => state.data.objects);
  const scene = useSelector((state: RootState) => state.scene.scene);
  const isQuickHideActive = useSelector((state: RootState) => state.data.isQuickHideActive);
  const isDisabled = isQuickHideActive;

  let selectedObject: MeshObjectData | null | undefined;

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

  // (Harsh): Temporary placement — will move to updateHandler once door selection is ready.
  const handleHandlePositionChange = (position: string) => {
    /** Repositions the handle on a door mesh according to the selected position label. */

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

    updateObjectRef.current?.update(obj.id, { material: { type: 'COLOR', value } }, obj);
  };

  const toggleTextureList = () => {
    /** Toggles the visibility of the texture selection list. */

    setIsTextureListOpen((prev) => !prev);
  };

  const handleDimensionChange = (field: Field, value: number) => {
    if (!selectedObject || isDisabled) return;

    const updates = {
      dimensions: {
        [field]: value,
      },
    };
    updateObjectRef.current?.update(selectedObject.id, updates, selectedObject);
  };

  const handlePositionChange = (axis: Axis, value: number) => {
    if (!selectedObject || isDisabled) return;

    updateObjectRef.current?.update(
      selectedObject.id,
      {
        position: { [axis]: value },
      },
      selectedObject
    );
  };

  const handleRotationChange = (axis: Axis, value: number) => {
    if (!selectedObject || isDisabled) return;

    updateObjectRef.current?.update(
      selectedObject.id,
      {
        rotation: { [axis]: value },
      },
      selectedObject
    );
  };

  const handleTextureSelect = (texturePath: string) => {
    if (!selectedObject) return;

    updateObjectRef.current?.update(
      selectedObject.id,
      {
        material: { type: MATERIAL_TYPES.TEXTURE, value: texturePath },
      },
      selectedObject
    );

    setIsTextureListOpen(false);
  };

  const dimensionsUI: Dimensions = {
    width: selectedObject?.dimensions?.width ?? 11,
    height: selectedObject?.dimensions?.height ?? 0,
    depth: selectedObject?.dimensions?.depth ?? 0,
  };

  const positionUI: Position = {
    x: selectedObject?.position?.x ?? 0,
    y: selectedObject?.position?.y ?? 0,
    z: selectedObject?.position?.z ?? 0,
  };

  const rotationUI: Rotation = {
    x: selectedObject?.rotation?.x ?? 0,
    y: selectedObject?.rotation?.y ?? 0,
    z: selectedObject?.rotation?.z ?? 0,
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
          value: rotationUI.x,
          disabled: isQuickHideActive,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
            handleRotationChange('x', Number(e.target.value)),
        },
        {
          label: 'Rotate Y ',
          name: 'rotationY',
          type: 'number',
          value: rotationUI.y,
          disabled: isQuickHideActive,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
            handleRotationChange('y', Number(e.target.value)),
        },
        {
          label: 'Rotate Z ',
          name: 'rotationZ',
          type: 'number',
          value: rotationUI.z,
          disabled: isQuickHideActive,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
            handleRotationChange('z', Number(e.target.value)),
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
          value: positionUI.x,
          disabled: isQuickHideActive,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
            handlePositionChange('x', Number(e.target.value)),
        },
        {
          label: 'Position Y',
          name: 'positionY',
          type: 'number',
          value: positionUI.y,
          disabled: isQuickHideActive,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
            handlePositionChange('y', Number(e.target.value)),
        },
        {
          label: 'Position Z',
          name: 'positionZ',
          type: 'number',
          value: positionUI.z,
          disabled: isQuickHideActive,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
            handlePositionChange('z', Number(e.target.value)),
        },
      ],
    },
  ];

  return (
    <div
      className={
        isSidebarOpen
          ? 'absolute top-[4rem] right-[0] bottom-[0] z-[10] block h-[92vh] w-[14rem] overflow-y-auto rounded-t-[0.6rem] bg-[var(--primary-white)]'
          : 'absolute top-[4rem] right-[0] bottom-[0] z-[10] block h-auto w-[14rem] overflow-y-auto rounded-t-[0.6rem] bg-transparent'
      }
    >
      {/* ================= TITLE ================= */}
      <div
        onClick={toggleSidebar}
        className={`fixed right-[0] z-[20] flex h-[1.8rem] w-[14rem] items-center justify-around justify-center gap-[1rem] rounded-t-[0.6rem] bg-[var(--secondry-background-color)] ${isSidebarOpen ? 'top-[4rem] right-[0]' : 'right-[0] bottom-[0]'} `}
      >
        <p className="ml-[8] text-center text-[0.7rem] leading-[10px] font-[700] tracking-normal text-[var(--primary-color)]">
          Viewport Navigation
        </p>

        <img
          src={isSidebarOpen ? assets.down_arrow : assets.up_arrow}
          className="relative right-2 h-[1.2rem] w-[1.2rem]"
        />
      </div>

      {!isSidebarOpen && null}

      {isSidebarOpen && (
        <>
          {/* ================= SWITCH ================= */}
          <div className="mt-[2.1rem] ml-[0.8rem] flex h-[1.5rem] gap-[1rem]">
            <button
              onClick={handleSetting}
              className={`border-0 font-[poppins] text-[0.7rem] active:bg-[var(--toolbarhover-color)] ${
                isSettingOpen
                  ? 'rounded-[0.2rem] bg-[var(--toolbarhover-color)] px-4 py-2 text-[var(--primary-color)]'
                  : 'bg-transparent text-[rgba(160,174,192,1)] hover:text-[var(--primary-color)]'
              } `}
            >
              Setting
            </button>

            <button
              onClick={handleNavigation}
              className={`border-0 font-[poppins] text-[0.7rem] active:bg-[var(--toolbarhover-color)] ${
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

          {/* ================= SETTINGS ================= */}
          {isSettingOpen && selectedObject && (
            <>
              {sideBarMenuConfig.map((menu) => (
                <div key={menu.subMenu}>
                  <div className="mt-[0] mb-[0.7rem] ml-[1rem] flex flex-col">
                    <p className="mb-[1] flex text-[0.7rem] font-[700] text-[var(--primary-color)]">
                      {menu.title}
                    </p>

                    <div className="mt-[1] flex gap-[0.5rem]">
                      {menu.fields.map((field, i) => (
                        <div key={i} className="flex flex-col">
                          <p className="mt-[0px] mb-[0px] text-[0.5rem] text-[var(--primary-color)]">
                            {field.label}
                          </p>

                          <input
                            type={field.type}
                            value={field.value ?? ''}
                            onChange={field.onChange}
                            className="h-[1.2rem] w-[3.2rem] [appearance:textfield] appearance-none rounded-[0.2rem] border border-[var(--border-color)] text-[0.58rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <hr className="my-[2] opacity-20" />
                </div>
              ))}

              {/* ================= MATERIAL ================= */}
              <div className="px-3 py-2">
                <p className="mb-2 ml-[1rem] text-[0.7rem] font-[700] text-[var(--primary-color)]">
                  Material
                </p>

                {/* Color */}
                <div className="mb-2 ml-[1rem] flex items-center justify-between pr-[0.5rem]">
                  <p className="text-[0.6rem] text-[var(--primary-color)]">Color</p>
                  <div className="flex w-[9.5rem] items-center gap-[0.3rem] rounded-[0.4rem] border border-[0.1rem] border-[var(--border-color)] bg-[var(--primary-white)] px-[0.3rem] py-[0.2rem]">
                    <input
                      type="color"
                      value={selectedColor}
                      onChange={(e) => applyColorToSelected(e.target.value)}
                      className="h-[1.3rem] w-[1.3rem] cursor-pointer appearance-none rounded-[0.25rem] border-0 p-0"
                    />
                    <input
                      type="text"
                      value={selectedColor.toUpperCase()}
                      onChange={(e) => applyColorToSelected(e.target.value)}
                      className="w-[4rem] border-0 bg-transparent text-[0.65rem] text-[var(--primary-color)] uppercase outline-none"
                    />
                  </div>
                </div>

                {/* Change Material */}
                <div
                  onClick={handleMaterialChange}
                  className="mb-2 flex items-center justify-between pr-[0.5rem]"
                >
                  <p className="ml-[1rem] text-[0.6rem] text-[var(--primary-color)]">
                    Change Material
                  </p>
                  <button
                    className="flex h-[1.2rem] w-[6.8rem] cursor-pointer appearance-none items-center justify-between rounded-[0.1rem] border-0 bg-[var(--button-soft-grey)] px-[0.5rem] text-left font-[poppins] text-[0.6rem] font-extralight text-[var(--primary-white)] transition-colors duration-200 ease-in-out"
                    disabled={isQuickHideActive}
                  >
                    Press to Change
                  </button>
                </div>

                {/* Texture */}
                <div className="relative flex items-center justify-between pr-[0.5rem]">
                  <p className="ml-[1rem] text-[0.6rem] text-[0.7rem] font-[var(--font-family)] text-[var(--primary-color)]">
                    Change Texture
                  </p>
                  <button
                    onClick={toggleTextureList}
                    className="flex h-[1.2rem] w-[6.8rem] cursor-pointer appearance-none items-center justify-between rounded-[0.1rem] border-0 bg-[var(--button-soft-grey)] px-[0.5rem] text-left font-[poppins] text-[0.6rem] font-[var(--font-family)] font-extralight text-[var(--primary-white)] transition-colors duration-200 ease-in-out"
                  >
                    Select Texture
                  </button>
                </div>

                {/* Texture List */}
                {isTextureListOpen && (
                  <div className="absolute left-[14%] z-[100] mt-[0.25rem] flex max-h-[6rem] max-w-[10.4rem] flex-wrap gap-[0.1rem] overflow-y-auto rounded-[0.375rem] border border-[var(--border-color)] bg-[var(--primary-white)] p-[0.3rem] shadow-[0_0.25rem_0.5rem_rgba(0,0,0,0.1)]">
                    {materialModal.map((m) => (
                      <div
                        key={m.option}
                        className={
                          'flex cursor-pointer flex-col items-center rounded border border-transparent transition-all duration-200 ease-in-out hover:border-[var(--primary-color)] hover:shadow-[0_0_6px_rgba(0,0,0,0.25)]'
                        }
                        onClick={() => handleTextureSelect(m.image)}
                        title={m.name}
                      >
                        <img
                          key={m.option}
                          src={m.image}
                          onClick={() => handleTextureSelect(m.image)}
                          className="h-[2.5rem] w-[2.5rem] rounded-[0.125rem] object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Door Position */}
                {!isQuickHideActive && isSettingOpen && itemType.DOOR && (
                  <div
                    className={
                      'ml-[0rem] flex flex-col gap-[0.7rem] py-[0.5rem] pr-[0.5rem] pl-[1rem]'
                    }
                  >
                    <div className={'relative flex items-center justify-between'}>
                      <p className="m-0 font-[poppins] text-[0.7rem] font-[var(--font-family)] text-[var(--primary-color)]">
                        Door Position
                      </p>
                      <select
                        className="flex h-[1.2rem] w-[6.8rem] cursor-pointer appearance-none items-center justify-between rounded-[0.1rem] border-0 bg-[var(--button-soft-grey)] px-[0.5rem] text-left font-[poppins] text-[0.6rem] font-[var(--font-family)] font-extralight text-[var(--primary-white)] transition-colors duration-200 ease-in-out"
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
                    <div className={'relative flex items-center justify-between'}>
                      <p className="m-0 flex text-[0.7rem] font-[var(--font-family)] text-[var(--primary-color)]">
                        Handle
                      </p>
                      <div
                        className={
                          'flex h-[1.2rem] w-[5.8rem] cursor-pointer appearance-none items-center justify-between rounded-[0.1rem] border-0 bg-[var(--button-soft-grey)] px-[0.5rem] text-left text-[0.53rem] font-extralight text-[var(--primary-white)] transition-colors duration-200 ease-in-out'
                        }
                        onClick={() => setIsHandleDropdownOpen((prev) => !prev)}
                      >
                        {selectedHandle ? selectedHandle : 'Select Position'}
                        <img
                          src={isHandleDropdownOpen ? assets.menu_up : assets.menu_down}
                          alt="dropdown arrow"
                        />
                      </div>
                      {isHandleDropdownOpen && (
                        <div
                          className={
                            'absolute top-full left-[40%] z-100 mt-[0.25rem] grid w-max grid-cols-3 grid-rows-3 gap-[0.3125rem] rounded-[0.375rem] border border-[var(--primary-white)] bg-[var(--primary-white)] p-[0.5rem] shadow-[0_0.25rem_0.5rem_rgba(0,0,0,0.15)]'
                          }
                        >
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
                              className={`${'h-[1.875rem] w-[1.875rem] cursor-pointer border border-[var(--border-color)] bg-[var(--background-color)] transition-colors duration-200 ease-in-out hover:bg-[var(--button-color)]'} ${selectedHandle === label ? 'border-[0.125rem] border-[var(--border-color)] bg-[var(--primary-color)]' : ''}`}
                              onClick={() => {
                                setSelectedHandle(label);
                                setIsHandleDropdownOpen(false);
                                handleHandlePositionChange(label);
                                if (selectedObject && !isQuickHideActive) {
                                  // TODO (harsh): This line is commented out temporarily. Remove when no longer needed.
                                  // updateObjectInScene(
                                  //   selectedObject.id,
                                  //   { handlePosition: label },
                                  //   scene,
                                  //   dispatch,
                                  //   selectedObject
                                  // );
                                }
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
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
          // rules={selectedObject?.catalog_rules || []}
        />
      )}
    </div>
  );
};

export default Sidebar;
