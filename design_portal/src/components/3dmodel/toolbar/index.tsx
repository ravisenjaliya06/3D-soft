import InputField from '@/components/inputfields/InputField';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import commonService from '@/services/CommonService';
import { assets } from '@/svgPaths';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import * as THREE from 'three';
import { removeExistingLines } from '../design/index';
import {
  addDoorOnInvisibleBox,
  addDrawersOnInvisibleBox,
  addHorizontalPlanksInsideBox,
  addPlatformOnWall,
  addSimpleCabinet1,
  addVerticalPlanksToBox,
} from '../design/scene';
import { RulePart } from '../handler/interface';
import { addCabinetItemToDesign } from '../handler/items';
import { metersToMM } from '../handler/unitConversion';
import { useAppDispatch } from '../hooks';
import { ToolbarProps } from '../interface';
import { store } from '../store';
import {
  addObjects,
  setHoverdMesh,
  setSelectedChildObject,
  setobjectSelected,
  toggleMeasurement,
  toggleQuickHide,
  toggleWallDrawing,
} from '../store/dataSlice';
import {
  CabinetItem,
  Datastate,
  IconMap,
  PlatformReturn,
  ResultType,
  SelectedCabinetItem,
  platformData,
} from './interface';
import styles from './toolbar.module.css';

const Toolbar: React.FC<ToolbarProps> = ({ threeDView, onViewModeChange }) => {
  const dispatch = useAppDispatch();
  const state = useSelector((state: { data: Datastate }) => state.data);
  const isQuickHideActive = state.isQuickHideActive;
  const isMeasurementActive = state.isMeasurementActive;
  const isWallDrawingActive = state.isWallDrawingActive;
  const [activeOption, setActiveOption] = useState('Home');
  const [isToolOpen, setIsToolOpen] = useState(true);
  const [activeOptionName, setActiveOptionName] = useState('Home');
  const [catalogMenu, setcatalogMenu] = useState(false);
  const [isExlightActive, setIsExlightActive] = useState(false);
  const [cabinetItems, setCabinetItems] = useState<CabinetItem[]>([]);
  const [addPartPopup, setAddPartPopup] = useState(false);
  const [selectedCabinetItem, setSelectedCabinetItem] = useState<SelectedCabinetItem | null>(null);
  const [quantityValue, setQuantityValue] = useState(1);
  const [selectedFurnitureCategory, setSelectedFurnitureCategory] = useState<string | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  /** Change the active toolbar option and open its tools */
  const handleOptionClick = (option: string, name: string) => {
    setIsToolOpen(true);
    setActiveOptionName(name);
    setActiveOption(option);
  };

  /** Set popup position based on submenu button click */
  const handleSubmenuClick = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPopupPosition({ x: rect.right + 12, y: rect.top + 55 });
  };

  /** Close the all popup which is open in toolbar */
  const closePopup = () => {
    setAddPartPopup(false);
    setSelectedCabinetItem(null);
    setQuantityValue(1);
  };

  /** Add platform on the selected wall and create API entry */
  const handleToAddPlatform = async (catalogId: string) => {
    const textureLoader = new THREE.TextureLoader();
    const counterTexture = textureLoader.load('/img14_64.jpg');
    counterTexture.wrapS = counterTexture.wrapT = THREE.RepeatWrapping;
    counterTexture.repeat.set(10, 1);

    const scene = threeDView!.scene;
    let wallFromSelection: THREE.Mesh | null = null;

    const outline = scene.children.find((o) => o.name.startsWith('outline-')) as
      | THREE.Object3D
      | undefined;
    if (outline) {
      const outlineCenter = outline.position.clone();
      const walls: THREE.Mesh[] = [];
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh && ['Center Wall', 'Left Wall', 'Right Wall'].includes(o.name))
          walls.push(o);
      });
      for (const w of walls) {
        const box = new THREE.Box3().setFromObject(w);
        const center = new THREE.Vector3();
        box.getCenter(center);
        if (center.distanceTo(outlineCenter) < 1e-3) {
          wallFromSelection = w;
          break;
        }
      }
    }

    const hovered = store.getState().data.hoverdMesh as THREE.Mesh | null;
    const targetWall =
      wallFromSelection ||
      (hovered && ['Center Wall', 'Left Wall', 'Right Wall'].includes(hovered.name)
        ? hovered
        : null);

    let platformData: platformData[] = [];
    let platFormGroup;
    if (targetWall) {
      const platform = (await addPlatformOnWall(
        scene,
        targetWall,
        counterTexture
      )) as PlatformReturn;
      platformData = platform.addedMeshes;
      platFormGroup = platform.platformGroup;
    }
    // Add platform data to API payload
    for (const pdata of platformData) {
      try {
        const designId = window.location.pathname.split('/')[2];
        const apiResponse = await addCabinetItemToDesign(catalogId, {
          type: 'Platform',
          name: pdata.name,
          width: pdata.width,
          height: pdata.height,
          depth: pdata.depth,
          position: pdata.position,
          additional_data: pdata.data,
          design_id: designId,
          description: '',
        });
        if (apiResponse) {
          dispatch(addObjects([apiResponse]));
          if (apiResponse.id) dispatch(setobjectSelected(apiResponse.id));
          if (platFormGroup) {
            platFormGroup.userData.objectId = apiResponse.id;
          }
        }
      } catch (e) {
        console.error('Platform API failed', e);
      }
    }
  };

  const options = [
    { option: 'Home', name: 'Home', icon: assets.img1 },
    { option: 'View', name: 'View', icon: assets.img2 },
  ];

  /** Fetch cabinet items from API and update setCabinetItems state */
  const fetchCabinetItem = async () => {
    const cabinetResponse: { status: number; data: CabinetItem[] } = await commonService.get(
      API_ENDPOINT.GET_CATALOG_ITEMS
    );
    if (cabinetResponse.status === 200 && Array.isArray(cabinetResponse.data)) {
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        console.log(cabinetResponse.data, 'cabinetResponse.data');
      }
      setCabinetItems(cabinetResponse.data);
    }
  };

  /** Handle selection of a cabinet item from toolbar submenu */
  const handleCabinetItemSelect = async (item: ResultType) => {
    if (item.type === 'Platform') {
      handleToAddPlatform(item.id);
      return;
    }

    // For Cabinet items: no quantity popup, no target selection; create via API and add directly
    if (item?.type === 'Cabinet') {
      try {
        const scene = threeDView!.scene;
        const designId = window.location.pathname.split('/')[2];
        const catalogId = item.id;

        // Get actual dimensions from the created object instead of static values
        let createdObject: THREE.Object3D | null = null;

        // Add to scene first to get actual dimensions
        if (typeof threeDView!.addSimpleCabinet === 'function') {
          threeDView!.addSimpleCabinet();
          // Find the created cabinet (get the last one added)
          const cabinets: THREE.Object3D[] = [];
          scene.traverse((obj) => {
            if (obj.name === 'SimpleCabinet') {
              cabinets.push(obj);
            }
          });
          createdObject = cabinets[cabinets.length - 1] || null;
        }

        if (!createdObject) {
          console.error('Failed to create or find the cabinet object');
          return;
        }

        // Convert to mm for storage (meters * 1000 = mm)
        const mesh = createdObject as THREE.Mesh<THREE.BoxGeometry>;
        const width = metersToMM(mesh.geometry.parameters.width);
        const height = metersToMM(mesh.geometry.parameters.height);
        const depth = metersToMM(mesh.geometry.parameters.depth);

        const position = {
          x: metersToMM(createdObject.position.x),
          y: metersToMM(createdObject.position.y),
          z: metersToMM(createdObject.position.z),
        };

        const ruleParts: RulePart[] = [];

        createdObject.traverse((child) => {
          if (child instanceof THREE.Mesh && child.name.includes('PLANK')) {
            const formattedName = child.name
              .replace(/PLANK/gi, 'Panel')
              .replace(/_/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .toLowerCase()
              .replace(/\b\w/g, (char) => char.toUpperCase());

            ruleParts.push({
              id: '',
              name: formattedName,
              width: metersToMM(child.geometry.parameters.width),
              height: metersToMM(child.geometry.parameters.height),
              depth: metersToMM(child.geometry.parameters.depth),
              thickness: null,
              position: {
                x: metersToMM(child.position.x),
                y: metersToMM(child.position.y),
                z: metersToMM(child.position.z),
              },
              handle_position: null,
              additional_data: {
                texture: '/textures/light_wood.jpg',
              },
            });
          }
        });

        const parts = [
          {
            name: 'Panel',
            rule_parts: ruleParts,
          },
        ];

        let apiResponse = null;
        try {
          apiResponse = await addCabinetItemToDesign(catalogId, {
            type: item.type,
            name: item.name,
            description: item.description || `${item.name} description`,
            design_id: designId,
            width,
            height,
            depth,
            position,
            additional_data: {
              texture: '/textures/light_wood.jpg',
            },
            parts,
          });
          if (apiResponse) {
            dispatch(addObjects([apiResponse]));
            if (apiResponse.id) {
              dispatch(setobjectSelected(apiResponse.id));
            }
          }
        } catch (apiErr) {
          console.error('Cabinet create API failed', apiErr);
        }

        // Annotate the newly created container with API metadata
        if (createdObject && apiResponse) {
          createdObject.userData = {
            ...(createdObject.userData || {}),
            objectId: apiResponse.id,
            apiData: apiResponse,
          };
        }
      } catch (e) {
        console.error('Failed to add cabinet directly to scene', e);
      }
      return;
    }

    // Default flow (non-cabinet): add directly with quantity 1 (no popup)
    setSelectedCabinetItem(item);
    setQuantityValue(1);
    setAddPartPopup(true);
  };

  /** Add selected furniture parts (door/drawer/plank) to the chosen cabinet box */
  const onAddItems = async () => {
    if (!selectedCabinetItem) {
      console.error('No cabinet item selected');
      return;
    }
    setAddPartPopup(false);
    const num = parseInt(quantityValue.toString(), 10);
    if (!Number.isFinite(num) || num <= 0) {
      return;
    }

    const scene = threeDView!.scene;
    let targetBox: THREE.Mesh | null = null;
    const selectedChildObject = store.getState().data.selectedChildObject;

    scene.traverse((obj) => {
      if (obj.userData.objectId === selectedChildObject) {
        targetBox = obj as THREE.Mesh;
      }
    });

    const itemType = selectedCabinetItem.type;
    const itemName = selectedCabinetItem.name;

    if (!targetBox) {
      alert('❌ Target box not found!');
      return;
    }

    if (['Door', 'Sliding Door'].includes(itemType)) {
      await addDoorOnInvisibleBox(scene, targetBox);
    } else if (itemType === 'Drawer') {
      await addDrawersOnInvisibleBox(scene, targetBox, num);
    } else if (itemType === 'Plank') {
      const nameLower = (itemName || '').toLowerCase();
      if (nameLower.includes('vertical')) {
        await addVerticalPlanksToBox(scene, targetBox, num, selectedCabinetItem);
      } else if (nameLower.includes('horizontal')) {
        await addHorizontalPlanksInsideBox(scene, targetBox, num, selectedCabinetItem);
      }
    }

    setAddPartPopup(false);
    setSelectedCabinetItem(null);
    setQuantityValue(1);
    dispatch(setobjectSelected(null));
    dispatch(setSelectedChildObject(null));
    dispatch(setHoverdMesh(null));
    removeExistingLines();
  };

  const homeTools = [
    {
      option: 'Furniture',
      icon: assets.homefurniture,
      onClick: () => {
        if (activeOption !== 'Furniture') {
          setActiveOption('Furniture');
          setActiveOptionName('Furniture');
          if (onViewModeChange) {
            onViewModeChange('3d');
          }
          fetchCabinetItem();
        }
      },
      isActive: catalogMenu,
      disabled: false,
    },
    {
      option: 'Quick Hide',
      icon: assets.quickhide,
      onClick: () => {
        dispatch(toggleQuickHide(!isQuickHideActive));
        setcatalogMenu(false);
      },
      isActive: isQuickHideActive,
      disabled: false,
    },
    {
      option: 'Measure',
      icon: assets.mesurment,
      onClick: () => {
        dispatch(toggleMeasurement(!isMeasurementActive));
        setcatalogMenu(false);
      },
      isActive: isMeasurementActive,
      disabled: false,
    },
    {
      option: 'Wall',
      icon: assets.mesurment,
      onClick: () => {
        dispatch(toggleWallDrawing(!isWallDrawingActive));
        if (onViewModeChange && !isWallDrawingActive) {
          onViewModeChange('2d');
        }
        setcatalogMenu(false);
      },
      isActive: isWallDrawingActive,
      disabled: false,
    },
  ];

  const viewTools = [
    {
      option: 'Exlight',
      icon: assets.exlight,
      onClick: () => {
        if (threeDView) {
          threeDView.toggleSky();
          setIsExlightActive((prev) => !prev);
        }
      },
      disabled: false,
      isActive: isExlightActive,
    },
  ];
  const furnitureTools = [
    // { option: 'Kitchen', icon: assets.kitchen_svg },
    { option: 'Cabinet', icon: assets.cabinet_svg },
  ];

  /** Return filtered cabinet items based on selected category */
  const getFilteredCabinetItems = (category: string) => {
    // Define what types should appear for each category
    const categoryFilters: Record<string, string[]> = {
      Kitchen: ['Platform', 'Vertical Plank', 'Horizontal Plank', 'Drawer', 'Door'],
      Cabinet: ['Simple Cabinet', 'Vertical Plank', 'Horizontal Plank', 'Drawer', 'Door'],
    };

    const allowedTypes = categoryFilters[category] || [];
    let result: ResultType[] = [];
    // For Kitchen, add alwaysFields items first
    if (category === 'Cabinet') {
      result = alwaysFields.map((field) => ({
        id: `always-${field.option}`,
        name: field.option,
        type: 'Special',
        icon: field.icon,
        onClick: field.onClick,
        isAlwaysField: true,
      }));
    }

    // Then add filtered API items
    if (cabinetItems && cabinetItems.length > 0) {
      const filtered = cabinetItems.filter((item) => {
        // Check if item type or name matches allowed types
        return allowedTypes.some((type) => {
          const itemNameLower = (item.name || '').toLowerCase();
          const itemTypeLower = (item.type || '').toLowerCase();
          const typeLower = type.toLowerCase();

          return (
            item.type === type ||
            item.name === type ||
            itemNameLower === typeLower ||
            itemTypeLower === typeLower ||
            // Match planks
            (type.includes('Plank') &&
              item.type === 'Plank' &&
              item.name.includes(type.split(' ')[0])) ||
            // Match Simple Cabinet
            (type === 'Simple Cabinet' &&
              itemNameLower.includes('simple') &&
              itemNameLower.includes('cabinet'))
          );
        });
      });

      // Remove duplicates from filtered results
      const uniqueFiltered = filtered.reduce((acc: CabinetItem[], item) => {
        const key = `${item.type}-${item.name}`;
        const exists = acc.find((i) => `${i.type}-${i.name}` === key);
        if (!exists) {
          acc.push(item);
        }
        return acc;
      }, []);

      result = [...result, ...uniqueFiltered];
    }

    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.log(`Filtered items for ${category}:`, result);
    }

    return result;
  };

  /** Open the Second Popup for selected furniture category */
  const handleFurnitureCategoryClick = (category: string) => {
    setSelectedFurnitureCategory(category === selectedFurnitureCategory ? null : category);
    setAddPartPopup(false);
    setSelectedCabinetItem(null);
    setQuantityValue(1);
  };

  const alwaysFields = [
    {
      option: 'Load Sink GLB',
      icon: assets.sink,
      onClick: () => {
        if (threeDView && typeof threeDView.loadSinkModel === 'function') {
          threeDView.loadSinkModel('/glb/sink.glb');
        }
      },
      isActive: false,
    },
    {
      option: 'cu',
      icon: assets.sink,
      onClick: () => {
        addSimpleCabinet1(threeDView?.scene!);
      },
      isActive: false,
    },
  ];

  /** Reset toolbar to Home option and clear selected states */
  const handleback = () => {
    setActiveOption('Home');
    setActiveOptionName('Home');
    setSelectedFurnitureCategory(null);
    setcatalogMenu(false);
    setAddPartPopup(false);
    setSelectedCabinetItem(null);
    setQuantityValue(1);
  };

  /* Map item types/names to their respective icons */
  const iconMap: IconMap = {
    Drawer: assets.drawer,
    'Sliding Door': assets.door,
    Door: assets.door_icon,
    'Horizontal Plank': assets.horizontal,
    'Vertical Plank': assets.vertical,
    Plank: assets.vertical,
    Cabinet: assets.cabinet,
    Platform: assets.platform,
  };

  return (
    <>
      {/* Toolbar Container */}
      <aside className={styles.aside}>
        <div style={{ flexDirection: 'column', display: 'flex' }}>
          <div className={styles.group}>
            <img
              src={assets.headerbraventologo}
              className={styles.projectLogo}
              alt="Toolbar Logo"
            />
          </div>
          <div className={styles.partLineGroup}>
            <img src={assets.tool_part_line} className={styles.partLine} alt="Toolbar Logo" />
          </div>
          <div className={styles.icon_style}>
            {options.map(({ option, name, icon }) => (
              <div
                key={option}
                onClick={() => handleOptionClick(option, name)}
                className={activeOption === option ? styles.icon_active : styles.icon}
              >
                <img src={icon} alt={`${option} Icon`} />
              </div>
            ))}
          </div>
        </div>

        {isToolOpen && (
          <div className={styles.activegroup_tools_container}>
            <div className={styles.activegroup}>
              {activeOption !== 'furniture' && (
                <div
                  className={`${styles.activegroup_header} ${
                    options.some((item) => item.option === activeOption) ? styles.no_arrow : ''
                  }`}
                >
                  {!options.some((item) => item.option === activeOption) && (
                    <img src={assets.back} onClick={handleback} alt="Back" />
                  )}
                  <p>{activeOptionName}</p>
                </div>
              )}
              <img
                src={assets.tool_part_line}
                className={styles.active_tool_part_line}
                alt="active group"
              />
              {activeOption === 'Home' && (
                <div className={styles.activegroup_tools_group}>
                  {homeTools.map(({ option, icon, onClick, isActive, disabled }) => (
                    <div
                      key={option}
                      className={styles.toollistbox}
                      onClick={!disabled ? onClick : undefined}
                      style={{
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.3 : 1,
                      }}
                      title={disabled ? 'Coming Soon' : option}
                    >
                      <div
                        className={`${styles.activegroup_tools} ${
                          isActive ? styles.activegroup_tools_selected : ''
                        }`}
                      >
                        <img src={icon} alt={`${option} Icon`} />
                      </div>
                      <span>{option}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeOption === 'View' && (
                <div className={styles.activegroup_tools_group}>
                  {viewTools.map(({ option, icon, onClick, disabled }) => (
                    <div
                      key={option}
                      className={styles.toollistbox}
                      style={{
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.3 : 1,
                      }}
                      onClick={onClick}
                      title={disabled ? 'Coming Soon' : option}
                    >
                      <img src={icon} alt={`${option} Icon`} />
                      <span>{option}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeOption === 'Furniture' && (
                <div className={styles.activegroup_tools_group}>
                  {furnitureTools.map(({ option, icon }) => (
                    <div
                      key={option}
                      className={styles.furnitureItemslist}
                      onClick={() => handleFurnitureCategoryClick(option)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className={styles.activegroup_tools}>
                        <img src={icon} alt={`${option} Icon`} />
                      </div>
                      <span>{option}</span>
                      <img
                        src={assets.down_arrow}
                        alt=""
                        style={{
                          transform:
                            selectedFurnitureCategory === option
                              ? 'rotate(90deg)'
                              : 'rotate(270deg)',
                          transition: 'transform 0.3s ease',
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submenu Panel */}

        {selectedFurnitureCategory && isToolOpen && (
          <div className={styles.submenuPanel}>
            <div className={styles.submenuHeader}>
              <div className={styles.submenuHeaderTitle}>
                <h3 className={styles.headerTitle}>{selectedFurnitureCategory}</h3>
                <img
                  src={assets.close}
                  alt="close"
                  className={styles.closeIcon}
                  onClick={() => setSelectedFurnitureCategory(null)}
                />
              </div>
              <img
                src={assets.tool_part_line}
                className={styles.active_tool_part_line}
                alt="active group"
              />
              <div className={styles.searchWrapper}>
                <img src={assets.searchIcon} alt="search" className={styles.searchIcon} />
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="search items..."
                  onChange={(e) => {
                    console.log(e.target.value);
                  }}
                />
              </div>
            </div>
            <div className={styles.submenuContent}>
              {getFilteredCabinetItems(selectedFurnitureCategory).map((item) => (
                <div
                  key={item.id}
                  className={styles.submenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSubmenuClick(e);
                    if (item.isAlwaysField) {
                      // For alwaysFields items, call their onClick directly
                      item?.onClick?.();
                    } else {
                      // For API items, use handleCabinetItemSelect
                      handleCabinetItemSelect(item);
                    }
                  }}
                  title={item.description || item.name}
                >
                  <img
                    src={
                      item.isAlwaysField
                        ? item.icon
                        : iconMap[item.name] || iconMap[item.type] || assets.drawer
                    }
                    alt={item.name}
                  />
                  <span>{item.name}</span>
                </div>
              ))}
              {getFilteredCabinetItems(selectedFurnitureCategory).length === 0 && (
                <div className={styles.noItems}>
                  No items available for {selectedFurnitureCategory}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {addPartPopup && selectedCabinetItem && (
        <div
          className={styles.createpopupOverlay}
          style={{ top: popupPosition.y, left: popupPosition.x }}
        >
          <div className={styles.createpopup}>
            <img
              src={assets.createicon || '/placeholder.svg'}
              className={styles.createicon}
              alt="createicon"
            />
            <h2>Add {selectedCabinetItem.name}</h2>
            <img
              src={assets.close || '/placeholder.svg'}
              className={styles.createclose}
              alt="close"
              onClick={closePopup}
            />
            <div className={styles.create_right_side}>
              <p>Enter the number of {selectedCabinetItem.name} to add.</p>
              <form
                className={styles.form}
                onSubmit={(e) => {
                  e.preventDefault();
                  onAddItems();
                }}
              >
                <div className={styles.createinputGroup}>
                  <InputField
                    smallField={true}
                    className={styles.inputField}
                    borderColor="var(--primary-color-grey-2)"
                    value={quantityValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setQuantityValue(Number(e.target.value))
                    }
                    placeholder="Enter quantity"
                    label={`Quantity for ${selectedCabinetItem.name}`}
                    error={undefined}
                  />
                </div>
              </form>
            </div>
            <div className={styles.createButtonGrop}>
              <button className={styles.createcontinueButton} onClick={onAddItems}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Toolbar;
