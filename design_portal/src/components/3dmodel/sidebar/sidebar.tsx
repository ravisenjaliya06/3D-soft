import down_arrow from '@/assets/3dmodel/sidebar/down-arrow.svg';
import up_arrow from '@/assets/3dmodel/sidebar/up-arrow.svg';
import navigationdetail from '@/assets/sidebar/navigationdetail.svg';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as THREE from 'three';
import { itemType } from '../design/interface';
import { updateObjectInScene } from '../handler/updateHandler';
import { MINIFIX_STANDARDS } from '../minifix/calculator';
import { RootState } from '../store';
import { Object3D } from '../store/interface';
import style from './sidebar.module.css';

const Sidebar: React.FC = () => {
  const [isBasicOpen, setIsBasicOpen] = useState(true);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [doorPosition, setDoorPosition] = useState('None');
  const [showAdvancedContent, setShowAdvancedContent] = useState(false);
  const [selectedHandle, setSelectedHandle] = useState<string | null>(null);
  const [isHandleDropdownOpen, setIsHandleDropdownOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNavOpen, setNavOpen] = useState(true);
  const [isSettingOpen, setSettingOpen] = useState(false);
  const [edgeBandingVisible, setEdgeBandingVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [depth, setDepth] = useState(0);
  const [rotationX, setRotationX] = useState(0);
  const [rotationY, setRotationY] = useState(0);
  const [rotationZ, setRotationZ] = useState(0);

  const dispatch = useDispatch();
  const selectedObjectId = useSelector(
    (state: RootState) => state.data.selectedObject,
  );
  const selectedChildObjectId = useSelector(
    (state: RootState) => state.data.selectedChildObject,
  );
  const objects = useSelector((state: RootState) => state.data.objects);
  const scene = useSelector((state: RootState) => state.scene.scene);
  const isQuickHideActive = useSelector(
    (state: RootState) => state.data.isQuickHideActive,
  );
  const isDisabled = isQuickHideActive;

  // Determine the selected object (prioritize child object if selected)
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
  const isHorizontalPlank =
    selectedObject?.name?.includes(itemType.HORIZONTAL_PLANK) ?? false;
  const isVerticalPlank =
    selectedObject?.name?.includes(itemType.VERTICAL_PLANK) ?? false;

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
      setWidth(selectedObject.width);
      setHeight(selectedObject.height);
      setDepth(selectedObject.depth);
      setRotationX(selectedObject.rotationX!);
      setRotationY(selectedObject.rotationY!);
      setRotationZ(selectedObject.rotationZ!);
    }
  }, [selectedObject]);

  useEffect(() => {
    const selected = scene.children.find(
      (child) => child.userData.objectId === selectedObject?.id,
    );
    if (selected && selected instanceof THREE.Mesh) {
      const edgeBandingChildren = selected?.children.filter((child) =>
        child.children.forEach((child) =>
          child.name.startsWith('edge_banding'),
        ),
      );
      const anyVisible = edgeBandingChildren?.some((child) => child.visible);
      setEdgeBandingVisible(anyVisible!);
    }
  }, [selectedObject]);

  useEffect(() => {
    if (isSidebarOpen) {
      setIsBasicOpen(true);
    }
  }, [isSidebarOpen]);

  useEffect(() => {
    if (isQuickHideActive) {
      setSettingOpen(false);
      setNavOpen(true);
    }
  }, [isQuickHideActive]);

  const handleSetting = () => {
    if (isQuickHideActive) return;
    setSettingOpen(true);
    setNavOpen(false);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleBasic = () => {
    setIsBasicOpen(!isBasicOpen);
  };
  const toggleAdvanced = () => {
    if (!isBasicOpen) {
      return;
    }
    const newState = !isAdvancedOpen;
    setIsAdvancedOpen(newState);

    if (newState) {
      setTimeout(() => {
        setShowAdvancedContent(true);
      }, 300);
      setShowAdvancedContent(false);
    }
  };

  const handleNavigation = () => {
    setSettingOpen(false);
    setNavOpen(true);
  };

  const validateNumericInput = (value: number): number | null =>
    isNaN(value) || value < 0 ? null : value;

  const handleEdgeBandingToggle = () => {
    const selected = scene.children.find(
      (child) => child.userData.objectId === selectedObject?.id,
    );

    const newVisibility = !edgeBandingVisible;

    selected?.children.forEach((child) => {
      child.children.forEach((edgeBandingChild) => {
        if (edgeBandingChild.name.startsWith('edge_banding')) {
          edgeBandingChild.visible = newVisibility;
        }
      });
    });

    setEdgeBandingVisible(newVisibility);
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWidth(Number(e.target.value));
  };
  const handleWidthKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && selectedObject && !isQuickHideActive) {
      const newWidth = validateNumericInput(width);
      if (newWidth !== null && newWidth >= 5) {
        updateObjectInScene(
          selectedObject.id,
          { width: newWidth },
          scene,
          dispatch,
          selectedObject,
        );
      }
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setHeight(Number(e.target.value));
  const handleHeightKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && selectedObject && !isQuickHideActive) {
      const newHeight = validateNumericInput(height);
      if (newHeight !== null && newHeight >= 5) {
        updateObjectInScene(
          selectedObject.id,
          { height: newHeight },
          scene,
          dispatch,
          selectedObject,
        );
      }
    }
  };

  const handleDepthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDepth(Number(e.target.value));
  };
  const handleDepthKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && selectedObject && !isQuickHideActive) {
      const newDepth = validateNumericInput(depth);
      if (newDepth !== null && newDepth >= 5) {
        updateObjectInScene(
          selectedObject.id,
          { depth: newDepth },
          scene,
          dispatch,
          selectedObject,
        );
      }
    }
  };

  const handleRotationXChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRotationX(Number(e.target.value));
  };
  const handleRotationXKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && selectedObject && !isQuickHideActive) {
      const newRotationX = validateNumericInput(rotationX);
      if (newRotationX !== null && newRotationX >= 0 && newRotationX <= 360) {
        updateObjectInScene(
          selectedObject.id,
          { rotationX: newRotationX },
          scene,
          dispatch,
          selectedObject,
        );
      }
    }
  };

  const handleRotationYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRotationY(Number(e.target.value));
  };
  const handleRotationYKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && selectedObject && !isQuickHideActive) {
      const newRotationY = validateNumericInput(rotationY);
      if (newRotationY !== null && newRotationY >= 0 && newRotationY <= 360) {
        updateObjectInScene(
          selectedObject.id,
          { rotationY: newRotationY },
          scene,
          dispatch,
          selectedObject,
        );
      }
    }
  };

  const handleRotationZChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRotationZ(Number(e.target.value));
  };
  const handleRotationZKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && selectedObject && !isQuickHideActive) {
      const newRotationZ = validateNumericInput(rotationZ);
      if (newRotationZ !== null && newRotationZ >= 0 && newRotationZ <= 360) {
        updateObjectInScene(
          selectedObject.id,
          { rotationZ: newRotationZ },
          scene,
          dispatch,
          selectedObject,
        );
      }
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value, min, max } = e.target;
    const partsValue = validateNumericInput(Number(value));

    if (!selectedObject || isQuickHideActive || partsValue === null) return;

    const minValue = min !== '' ? parseFloat(min) : -Infinity;
    const maxValue = max !== '' ? parseFloat(max) : Infinity;

    if (partsValue < minValue || partsValue > maxValue) return;

    updateObjectInScene(
      selectedObject.id,
      { [name]: partsValue },
      scene,
      dispatch,
      selectedObject,
    );
  };

  // Increment and decrement handlers
  const handleSubtractWidth = () => {
    if (!selectedObject || isQuickHideActive) return;
    const newWidth = (selectedObject.width || 0) - 1;
    if (newWidth >= 5) {
      updateObjectInScene(
        selectedObject.id,
        { width: newWidth },
        scene,
        dispatch,
        selectedObject,
      );
    }
  };

  const handleIncrementWidth = () => {
    if (!selectedObject || isQuickHideActive) return;
    const newWidth = (selectedObject.width || 0) + 1;
    updateObjectInScene(
      selectedObject.id,
      { width: newWidth },
      scene,
      dispatch,
      selectedObject,
    );
  };

  const handleSubtractHeight = () => {
    if (!selectedObject || isQuickHideActive) return;
    const newHeight = (selectedObject.height || 0) - 1;
    if (newHeight >= 5) {
      updateObjectInScene(
        selectedObject.id,
        { height: newHeight },
        scene,
        dispatch,
        selectedObject,
      );
    }
  };

  const handleIncrementHeight = () => {
    if (!selectedObject || isQuickHideActive) return;
    const newHeight = (selectedObject.height || 0) + 1;
    updateObjectInScene(
      selectedObject.id,
      { height: newHeight },
      scene,
      dispatch,
      selectedObject,
    );
  };

  const handleSubtractDepth = () => {
    if (!selectedObject || isQuickHideActive) return;
    const newDepth = (selectedObject.depth || 0) - 1;
    if (newDepth >= 5) {
      updateObjectInScene(
        selectedObject.id,
        { depth: newDepth },
        scene,
        dispatch,
        selectedObject,
      );
    }
  };

  const handleIncrementDepth = () => {
    if (!selectedObject || isQuickHideActive) return;
    const newDepth = (selectedObject.depth || 0) + 1;
    updateObjectInScene(
      selectedObject.id,
      { depth: newDepth },
      scene,
      dispatch,
      selectedObject,
    );
  };

  const handleSubtractX = () => {
    if (!selectedObject || isQuickHideActive) return;
    const newRotationX = (selectedObject.rotationX || 0) - 1;
    if (newRotationX >= 0) {
      updateObjectInScene(
        selectedObject.id,
        { rotationX: newRotationX },
        scene,
        dispatch,
        selectedObject,
      );
    }
  };

  const handleIncrementX = () => {
    if (!selectedObject || isQuickHideActive) return;
    const newRotationX = (selectedObject.rotationX || 0) + 1;
    if (newRotationX <= 360) {
      updateObjectInScene(
        selectedObject.id,
        { rotationX: newRotationX },
        scene,
        dispatch,
        selectedObject,
      );
    }
  };

  const handleSubtractY = () => {
    if (!selectedObject || isQuickHideActive) return;
    const newRotationY = (selectedObject.rotationY || 0) - 1;
    if (newRotationY >= 0) {
      updateObjectInScene(
        selectedObject.id,
        { rotationY: newRotationY },
        scene,
        dispatch,
        selectedObject,
      );
    }
  };

  const handleIncrementY = () => {
    if (!selectedObject || isQuickHideActive) return;
    const newRotationY = (selectedObject.rotationY || 0) + 1;
    if (newRotationY <= 360) {
      updateObjectInScene(
        selectedObject.id,
        { rotationY: newRotationY },
        scene,
        dispatch,
        selectedObject,
      );
    }
  };

  const handleSubtractZ = () => {
    if (!selectedObject || isQuickHideActive) return;
    const newRotationZ = (selectedObject.rotationZ || 0) - 1;
    if (newRotationZ >= 0) {
      updateObjectInScene(
        selectedObject.id,
        { rotationZ: newRotationZ },
        scene,
        dispatch,
        selectedObject,
      );
    }
  };

  const handleIncrementZ = () => {
    if (!selectedObject || isQuickHideActive) return;
    const newRotationZ = (selectedObject.rotationZ || 0) + 1;
    if (newRotationZ <= 360) {
      updateObjectInScene(
        selectedObject.id,
        { rotationZ: newRotationZ },
        scene,
        dispatch,
        selectedObject,
      );
    }
  };

  const handleSubtractMinifix = () => {
    if (!selectedObject || isQuickHideActive) return;
    const currentSpacing =
      selectedObject.minifixSpacing || MINIFIX_STANDARDS.SPACING;
    const newSpacing = Math.max(5, currentSpacing - 1);

    updateObjectInScene(
      selectedObject.id,
      { minifixSpacing: newSpacing },
      scene,
      dispatch,
      selectedObject,
    );
  };

  const handleIncrementMinifix = () => {
    if (!selectedObject || isQuickHideActive) return;
    const currentSpacing =
      selectedObject.minifixSpacing || MINIFIX_STANDARDS.SPACING;
    const newSpacing = currentSpacing + 1;

    updateObjectInScene(
      selectedObject.id,
      { minifixSpacing: newSpacing },
      scene,
      dispatch,
      selectedObject,
    );
  };

  const handleMinifixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedObject || isQuickHideActive) return;
    const newSpacing = validateNumericInput(Number(e.target.value));
    if (newSpacing !== null && newSpacing >= 5) {
      updateObjectInScene(
        selectedObject.id,
        { minifixSpacing: newSpacing },
        scene,
        dispatch,
        selectedObject,
      );
    }
  };

  const handleDoorPositionChange = (position: string) => {
    scene.traverse((child) => {
      if (child.userData.objectId === selectedObject?.id) {
        child.userData.openDirection = position.toLowerCase();
      }
    });
  };

  const handleHandlePositionChange = (position: string) => {
    console.warn('handleHandlePositionChange', position);
  };

  return (
    <div className={isSidebarOpen ? style.sidebar : style.sidebar_open}>
      <div
        className={
          isSidebarOpen ? style.sidebar_title : style.sidebar_close_title
        }
        onClick={toggleSidebar}
      >
        <p>Viewport Navigation</p>
        <img
          src={isSidebarOpen ? down_arrow.src : up_arrow.src}
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
            <button
              onClick={handleNavigation}
              className={isNavOpen ? style.btnactive : style.btn}
            >
              Navigation
            </button>
          </div>
          {isNavOpen && (
            <div>
              <div className={style.nav_div}>
                <img
                  src={navigationdetail.src}
                  alt=""
                  className={style.zoomoption_img}
                />
              </div>
            </div>
          )}
          {!isQuickHideActive && isSettingOpen && selectedObject && (
            <div className={style.field_main_div}>
              <div className={style.field_group_title_div}>
                <img
                  src={isBasicOpen ? up_arrow.src : down_arrow.src}
                  alt="toggle_arrow"
                  onClick={toggleBasic}
                  style={{ cursor: 'pointer' }}
                />
                <p className={style.field_group_title}>Basic</p>
              </div>
              {isBasicOpen && (
                <div className={style.field_group_div}>
                  <div className={style.field_group}>
                    <p>Width</p>
                    <button
                      onClick={handleSubtractWidth}
                      className={style.btn_incrdec}
                      disabled={isHorizontalPlank || isDisabled}
                    >
                      -
                    </button>
                    <input
                      // type="number"
                      name="width"
                      value={width}
                      onChange={handleWidthChange}
                      onKeyDown={handleWidthKeyDown}
                      onBlur={handleBlur}
                      min={5}
                      disabled={isHorizontalPlank || isDisabled}
                    />
                    <button
                      onClick={handleIncrementWidth}
                      className={style.btn_incrdec}
                      disabled={isHorizontalPlank || isDisabled}
                    >
                      +
                    </button>
                  </div>
                  <div className={style.field_group}>
                    <p>Height</p>
                    <button
                      onClick={handleSubtractHeight}
                      className={style.btn_incrdec}
                      disabled={isVerticalPlank || isDisabled}
                    >
                      -
                    </button>
                    <input
                      // type="number"
                      name="height"
                      value={height}
                      onChange={handleHeightChange}
                      onKeyDown={handleHeightKeyDown}
                      onBlur={handleBlur}
                      min={5}
                      disabled={isVerticalPlank || isDisabled}
                    />
                    <button
                      onClick={handleIncrementHeight}
                      className={style.btn_incrdec}
                      disabled={isVerticalPlank || isDisabled}
                    >
                      +
                    </button>
                  </div>
                  <div className={style.field_group}>
                    <p>Depth</p>
                    <button
                      onClick={handleSubtractDepth}
                      className={style.btn_incrdec}
                      disabled={isQuickHideActive}
                    >
                      -
                    </button>
                    <input
                      // type="number"
                      name="depth"
                      value={depth}
                      onChange={handleDepthChange}
                      onKeyDown={handleDepthKeyDown}
                      onBlur={handleBlur}
                      min={5}
                      max={parentObject?.depth}
                      disabled={isQuickHideActive}
                    />
                    <button
                      onClick={handleIncrementDepth}
                      className={style.btn_incrdec}
                      disabled={isQuickHideActive}
                    >
                      +
                    </button>
                  </div>
                  <div className={style.field_group1}>
                    <p>Rotate X:</p>
                    <button
                      onClick={handleSubtractX}
                      className={style.btn_incrdec}
                      disabled={isQuickHideActive}
                    >
                      -
                    </button>
                    <input
                      id="rotate-x"
                      name="rotationX"
                      min={0}
                      max={360}
                      // type="number"
                      value={rotationX}
                      onChange={handleRotationXChange}
                      onKeyDown={handleRotationXKeyDown}
                      onBlur={handleBlur}
                      disabled={isQuickHideActive}
                    />
                    <button
                      onClick={handleIncrementX}
                      className={style.btn_incrdec}
                      disabled={isQuickHideActive}
                    >
                      +
                    </button>
                  </div>
                  <div className={style.field_group1}>
                    <p>Rotate Y:</p>
                    <button
                      onClick={handleSubtractY}
                      className={style.btn_incrdec}
                      disabled={isQuickHideActive}
                    >
                      -
                    </button>
                    <input
                      id="rotate-y"
                      name="rotationY"
                      min={0}
                      max={360}
                      // type="number"
                      value={rotationY}
                      onChange={handleRotationYChange}
                      onKeyDown={handleRotationYKeyDown}
                      onBlur={handleBlur}
                      disabled={isQuickHideActive}
                    />

                    <button
                      onClick={handleIncrementY}
                      className={style.btn_incrdec}
                      disabled={isQuickHideActive}
                    >
                      +
                    </button>
                  </div>
                  <div className={style.field_group1}>
                    <p>Rotate Z:</p>
                    <button
                      onClick={handleSubtractZ}
                      className={style.btn_incrdec}
                      disabled={isQuickHideActive}
                    >
                      -
                    </button>
                    <input
                      id="rotate-z"
                      name="rotationZ"
                      min={0}
                      max={360}
                      // type="number"
                      value={rotationZ}
                      onChange={handleRotationZChange}
                      onKeyDown={handleRotationZKeyDown}
                      onBlur={handleBlur}
                      disabled={isQuickHideActive}
                    />

                    <button
                      onClick={handleIncrementZ}
                      className={style.btn_incrdec}
                      disabled={isQuickHideActive}
                    >
                      +
                    </button>
                  </div>
                  <div className={style.field_group1}>
                    <p>Edge Banding:</p>
                    <label className={style.toggleSwitch}>
                      <input
                        type="checkbox"
                        checked={edgeBandingVisible}
                        onChange={handleEdgeBandingToggle}
                      />
                      <span className={style.slider}></span>
                    </label>
                  </div>
                  <div className={style.field_group1}>
                    <p>Minifix Distance:</p>
                    <button
                      onClick={handleSubtractMinifix}
                      className={style.btn_incrdec}
                      disabled={isQuickHideActive}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="5"
                      value={
                        selectedObject?.minifixSpacing ||
                        MINIFIX_STANDARDS.SPACING
                      }
                      onChange={handleMinifixChange}
                      disabled={isQuickHideActive}
                    />
                    <button
                      onClick={handleIncrementMinifix}
                      className={style.btn_incrdec}
                      disabled={isQuickHideActive}
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
              {/* Advanced Section */}
              <div className={style.field_group_title_div}>
                <img
                  src={isAdvancedOpen ? up_arrow.src : down_arrow.src}
                  alt="toggle_arrow"
                  onClick={toggleAdvanced}
                  style={{ cursor: 'pointer' }}
                />
                <p className={style.field_group_title}>Advanced</p>
              </div>

              {!isQuickHideActive &&
                isSettingOpen &&
                isBasicOpen &&
                isAdvancedOpen &&
                showAdvancedContent && (
                  <div className={style.field_group_div}>
                    {/* Door Position */}
                    <div className={style.field_group}>
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

                    {/* Dropdown Handle 3x3 grid */}
                    {/* Dropdown Handle (click to open/close) */}
                    <div className={style.field_group}>
                      <p>Handle</p>
                      <div className={style.handle_dropdown_wrapper}>
                        <div
                          className={style.dropdown_like_select}
                          onClick={() =>
                            setIsHandleDropdownOpen((prev) => !prev)
                          }
                        >
                          {selectedHandle}
                          <span>{isHandleDropdownOpen ? '▲' : '▼'}</span>
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
                                      selectedObject,
                                    );
                                  }
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              {/* API Data Section */}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Sidebar;
