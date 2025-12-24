import { TEXTURE_MEDIA } from '@/components/3dmodel/handler/constant';
import { assets } from '@/svgPaths';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as THREE from 'three';
import { itemType } from '../design/interface';
import { UpdateObjectInScene } from '../handler/updateHandler';
import { Dimensions } from '../interface';
import { MeshObjectData, PART_TYPES } from '../sceneCreator/interface';
import { CabinetMotionController } from '../sceneCreator/tools/openCloseTool';
import { RootState } from '../store';
import { Position, Rotation } from '../store/interface';
import { Axis, Field, MATERIAL_TYPES } from './interface';
import { MaterialChangePopup } from './MaterialChangePopup';
import style from './sidebar.module.css';

const Sidebar: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNavOpen, setNavOpen] = useState(true);
  const [isSettingOpen, setSettingOpen] = useState(false);
  const [doorPosition, setDoorPosition] = useState('None');
  const [showMaterialPopup, setShowMaterialPopup] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#392579');
  const [isTextureListOpen, setIsTextureListOpen] = useState(false);
  const [handlePos, setHandlePos] = useState({ x: 0, y: 0, z: 0 });
  const [handleRot, setHandleRot] = useState({ x: 0, y: 0, z: 0 });

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

  const dispatch = useDispatch();
  const selectedObjectId = useSelector((state: RootState) => state.data.selectedObject);
  const selectedChildObjectId = useSelector((state: RootState) => state.data.selectedChildObject);
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

  const handleObject = objects.find((obj) => obj.parent === targetId && obj.type === 'handle');
  useEffect(() => {
    if (!handleObject) return;

    setHandlePos({
      x: handleObject.position.x,
      y: handleObject.position.y,
      z: handleObject.position.z,
    });

    setHandleRot({
      x: handleObject.rotation.x,
      y: handleObject.rotation.y,
      z: handleObject.rotation.z,
    });
  }, [handleObject]);

  const updateHandlePosState = (axis: Axis, value: number) => {
    setHandlePos((prev) => ({ ...prev, [axis]: value }));

    if (handleObject) {
      updateObjectRef.current?.update(
        handleObject.id,
        { position: { [axis]: value } },
        handleObject
      );
    }
  };

  const updateHandleRotState = (axis: Axis, value: number) => {
    setHandleRot((prev) => ({ ...prev, [axis]: value }));

    if (handleObject) {
      updateObjectRef.current?.update(
        handleObject.id,
        { rotation: { [axis]: value } },
        handleObject
      );
    }
  };

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


  const dimensionsUI: Dimensions = {
    width: selectedObject?.dimensions?.width ?? 0,
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

  const handlePositionInputFlid = [
    {
      label: 'Position X',
      name: 'positionX',
      type: 'number',
      value: handlePos.x,
      disabled: isQuickHideActive,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        updateHandlePosState('x', Number(e.target.value)),
    },
    {
      label: 'Position Y',
      name: 'positionY',
      type: 'number',
      value: handlePos.y,
      disabled: isQuickHideActive,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        updateHandlePosState('y', Number(e.target.value)),
    },
  ];

  const handleRotationInputFlid = [
    {
      label: 'Rotation X',
      name: 'rotationX',
      type: 'number',
      value: handleRot.x,
      disabled: isQuickHideActive,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        updateHandleRotState('x', Number(e.target.value)),
    },
    {
      label: 'Rotation Y',
      name: 'rotationY',
      type: 'number',
      value: handleRot.y,
      disabled: isQuickHideActive,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        updateHandleRotState('y', Number(e.target.value)),
    },
    {
      label: 'Rotation Z',
      name: 'rotationZ',
      type: 'number',
      value: handleRot.z,
      disabled: isQuickHideActive,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        updateHandleRotState('z', Number(e.target.value)),
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
                                value={field.value ?? ''}
                                disabled={field.disabled}
                                className={style.number_input}
                                onChange={field.onChange}
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
                {!isQuickHideActive && isSettingOpen && itemType.DOOR && (
                  <div className={style.field_group_div_door}>
                    <div className={style.field_group_div_material_change}>
                      <p>Open/Close</p>
                      <button
                        className={style.btn_material_change}
                        disabled={isQuickHideActive}
                        onClick={handleOpenCloseChange}
                      >
                        Open/Close
                      </button>
                    </div>
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

                    <div className="flex flex-col items-start">
                      <p className="m-0 text-[0.7rem] font-[var(--font-family)] font-bold text-[var(--primary-color)]">
                        Handle Position
                      </p>
                      <div className="flex w-auto justify-center gap-[0.5rem]">
                        {handlePositionInputFlid.map((field) => (
                          <div key={field.name} className="mt-[0.3rem]">
                            <p className="m-0 w-[3.9rem] text-[0.54rem] font-[var(--font-family)] font-normal tracking-[0.04rem] text-[var(--primary-color)]">
                              {field.label}
                            </p>
                            <div>
                              <input
                                id={field.name}
                                name={field.name}
                                type={field.type}
                                value={field.value ?? ''}
                                disabled={field.disabled}
                                className="h-[1.2rem] w-[3.2rem] [appearance:textfield] rounded-[0.2rem] border-[0.02rem] border-[var(--border-color)] pl-[0.3rem] text-[0.58rem] font-[var(--font-family)] focus:border-[0.063rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                onChange={field.onChange}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-start">
                      <p>Handle Rotation</p>
                      <div className="flex w-auto justify-center gap-[0.5rem]">
                        {handleRotationInputFlid.map((field) => (
                          <div key={field.name} className="mt-[0.3rem]">
                            <p className="m-0 w-[3.9rem] text-[0.54rem] font-[var(--font-family)] font-normal tracking-[0.04rem] text-[var(--primary-color)]">
                              {field.label}
                            </p>
                            <div>
                              <input
                                id={field.name}
                                name={field.name}
                                type={field.type}
                                value={field.value ?? ''}
                                disabled={field.disabled}
                                className="h-[1.2rem] w-[3.2rem] [appearance:textfield] rounded-[0.2rem] border-[0.02rem] border-[var(--border-color)] pl-[0.3rem] text-[0.58rem] font-[var(--font-family)] focus:border-[0.063rem] focus:border-[var(--primary-color)] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                onChange={field.onChange}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
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
        />
      )}
    </div>
  );
};

export default Sidebar;
