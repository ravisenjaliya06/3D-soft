import InputField from '@/components/inputfields/InputField';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import commonService from '@/services/CommonService';
import { assets } from '@/svgPaths';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as THREE from 'three';
import { removeExistingLines } from '../design/index';
import {
  addDoorOnInvisibleBox,
  addDrawersOnInvisibleBox,
  addHorizontalPlanksInsideBox,
  addLShapeObjectToBox,
  addVerticalPlanksToBox,
} from '../design/scene';
import { useAppDispatch } from '../hooks';
import { ToolbarProps } from '../interface';
import {
  GEOMETRY,
  INVISIBLE_BOXES,
  MeshObjectData,
  OBJECT_TYPES,
  PART_TYPES,
} from '../sceneCreator/interface';
import { SyncManager } from '../sceneCreator/syncState';
import { formatEnumLabel } from '../sceneCreator/utils';
import { store } from '../store';
import {
  setHoverdMesh,
  setSelectedChildObject,
  toggleMeasurement,
  toggleQuickHide,
  toggleWallDrawing,
} from '../store/dataSlice';
import { Datastate, IconMap } from './interface';
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
  const [cabinetItems, setCabinetItems] = useState<MeshObjectData[][]>([]);
  const [addPartPopup, setAddPartPopup] = useState(false);
  const [selectedCabinetItem, setSelectedCabinetItem] = useState<MeshObjectData | null>(null);
  const [quantityValue, setQuantityValue] = useState(1);
  const [selectedFurnitureCategory, setSelectedFurnitureCategory] = useState<string | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  /** Change the active toolbar option and open its tools */
  const handleOptionClick = (option: string, name: string) => {
    setIsToolOpen(true);
    setActiveOptionName(name);
    setActiveOption(option);
  };

  const CustomToast = ({
    appearance,
    message,
  }: {
    appearance: string;
    message: string;
    closeToast: () => void;
  }) => {
    const isError = appearance === 'error';

    return (
      <div className="relative flex h-[1rem] items-center gap-[0.75rem] px-[1rem] py-[0.6rem]">
        {/* Icon */}
        <div
          className={`flex h-[1.5rem] w-[1.5rem] items-center justify-center rounded-full ${
            isError ? 'bg-[#D32F2F]' : 'bg-[#FFA000]'
          }`}
        >
          <span className="text-[0.85rem] font-bold text-white select-none">!</span>
        </div>

        {/* Message */}
        <p className="flex-1 truncate font-[poppins] text-[0.9rem] leading-[1.2rem] text-white">
          {message}
        </p>
      </div>
    );
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

  const options = [
    { option: 'Home', name: 'Home', icon: assets.img1 },
    { option: 'View', name: 'View', icon: assets.img2 },
  ];

  /** Fetch cabinet items from API and update setCabinetItems state */
  const fetchCabinetItem = async () => {
    const cabinetResponse: { status: number; data: MeshObjectData[][] } = await commonService.get(
      API_ENDPOINT.GET_CATALOG_ITEMS
    );
    if (cabinetResponse.status === 200 && Array.isArray(cabinetResponse.data)) {
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        console.log(cabinetResponse.data, 'cabinetResponse.data');
      }
      setCabinetItems(cabinetResponse.data);
    }
  };

  const regenerateGroupIds = (group: MeshObjectData[]): MeshObjectData[] => {
    const idMap = new Map<string, string>();

    return group.map((item) => {
      const newId = crypto.randomUUID();
      idMap.set(item.id, newId);

      return {
        ...item,
        id: newId,
        parent:
          item.parent !== null
            ? (idMap.get(item.parent ? item.parent : '') ?? item.parent)
            : undefined,
      };
    });
  };

  /** Handle selection of a cabinet item from toolbar submenu */
  const handleCabinetItemSelect = async (event: React.MouseEvent, item: MeshObjectData) => {
    if (Object.values(OBJECT_TYPES).includes(item.type)) {
      const fullGroup = cabinetItems.find((group) => group.some((g) => g.id === item.id));

      if (fullGroup) {
        const clonedGroupWithNewIds = regenerateGroupIds(fullGroup);
        const syncManager = new SyncManager(clonedGroupWithNewIds, threeDView);
        await syncManager.syncData();
      } else if (item.type === OBJECT_TYPES.PLATFORM) {
        const newId = crypto.randomUUID();
        const platformItem: MeshObjectData = {
          ...item,
          id: newId,
          position: { x: 0, y: 0.9144, z: 0 }, // Default height (3 feet)
          dimensions: { width: 100, height: 5, depth: 60 }, // Default dimensions (CM)
          scale: { x: 0.01, y: 0.01, z: 0.01 },
        };
        const syncManager = new SyncManager(platformItem, threeDView);
        await syncManager.syncData();
      } else if (item.type === OBJECT_TYPES.SINK) {
        const newId = crypto.randomUUID();
        const sinkItem: MeshObjectData = {
          ...item,
          id: newId,
          position: { x: 0, y: 0.965, z: 0 }, // Slightly above default platform height
          dimensions: { width: 60, height: 20, depth: 40 }, // Default dimensions (CM)
          scale: { x: 0.01, y: 0.01, z: 0.01 },
        };
        const syncManager = new SyncManager(sinkItem, threeDView);
        await syncManager.syncData();
      }
    } else if (['door', 'Sliding Door'].includes(item.type)) {
      // For doors, directly add without asking for quantity
      setSelectedCabinetItem(item);
      setQuantityValue(1);
      // Directly call onAddItems without showing popup
      const scene = threeDView!.scene;
      let targetBox: THREE.Mesh | null = null;
      const selectedChildObject = store.getState().data.selectedChildObject;

      scene.traverse((obj) => {
        if (obj.userData.objectId === selectedChildObject) {
          targetBox = obj as THREE.Mesh;
        }
      });

      if (!targetBox) {
        toast(
          ({ closeToast }) => (
            <CustomToast
              appearance="error"
              message="Target box not found!"
              closeToast={closeToast}
            />
          ),
          {
            position: 'top-right',
            autoClose: 5000,
            hideProgressBar: false,
            closeButton: false,
            icon: false,
            className: '!p-0 !bg-black !shadow-none !min-h-0 !mb-4',
            progressClassName: '!bg-[#D32F2F] !h-[4px] !top-auto !top-0 !left-0 !opacity-100',
          }
        );
        return;
      }

      await addDoorOnInvisibleBox(scene, targetBox, item);
      dispatch(setSelectedChildObject(null));
      dispatch(setHoverdMesh(null));
      removeExistingLines();
    } else {
      setSelectedCabinetItem(item);
      setQuantityValue(1);
      setAddPartPopup(true);
      handleSubmenuClick(event);
    }
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

    const showErrorToast = (message: string) => {
      toast(
        ({ closeToast }) => (
          <CustomToast appearance="error" message={message} closeToast={closeToast} />
        ),
        {
          position: 'top-right',
          autoClose: 5000,
          hideProgressBar: false,
          closeButton: false,
          icon: false,
          className: '!p-0 !bg-black !shadow-none !mb-4',
          progressClassName: '!bg-[#D32F2F] !h-[3px]',
        }
      );
    };

    if ((targetBox! as THREE.Mesh)?.userData.type !== INVISIBLE_BOXES.INVISIBLE_BOX) {
      showErrorToast('Please select a blank box');
      return;
    }

    if (!targetBox) {
      showErrorToast('Target box not found!');
      return;
    }

    if (['door', 'Sliding Door'].includes(itemType)) {
      await addDoorOnInvisibleBox(scene, targetBox, selectedCabinetItem);
    } else if (itemType === 'drawer') {
      const fullGroup = cabinetItems.find((group) =>
        group.some((g) => g.id === selectedCabinetItem.id)
      );
      await addDrawersOnInvisibleBox(scene, targetBox, num, fullGroup ? fullGroup : []);
    } else if (itemType === 'plank') {
      const nameLower = (itemName || '').toLowerCase();
      if (nameLower.includes('vertical')) {
        await addVerticalPlanksToBox(scene, targetBox, num, selectedCabinetItem);
      } else if (nameLower.includes('horizontal')) {
        await addHorizontalPlanksInsideBox(scene, targetBox, num, selectedCabinetItem);
      }
    } else if (
      itemType === PART_TYPES.L_SHAPE_OBJECT ||
      (itemName || '').toLowerCase().includes('l-shape')
    ) {
      await addLShapeObjectToBox(scene, targetBox, selectedCabinetItem);
    }

    setAddPartPopup(false);
    setSelectedCabinetItem(null);
    setQuantityValue(1);
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
      icon: assets.wall,
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
    { option: 'Kitchen', icon: assets.kitchen },
    { option: 'Cabinet', icon: assets.cabinet_svg },
    { option: 'Parts', icon: assets.part_icon },
  ];

  const getFilteredCabinetItems = (category: string) => {
    const categoryFilters: Record<string, string[]> = {
      Parts: Object.values(PART_TYPES),
      Cabinet: Object.values(OBJECT_TYPES),
      Kitchen: [OBJECT_TYPES.PLATFORM],
    };
    const allowedTypes = categoryFilters[category] || [];
    if (category === 'Kitchen') {
      return [
        {
          id: 'platform-default',
          name: 'Platform',
          type: OBJECT_TYPES.PLATFORM,
          geometryType: GEOMETRY.BOX_GEOMETRY,
          dimensions: { width: 100, height: 5, depth: 60 },
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 0.01, y: 0.01, z: 0.01 },
          material: [
            {
              id: 'platform-mat',
              name: 'Platform Material',
              type: 'Panel Stock',
            },
          ],
        },
        {
          id: 'sink-default',
          name: 'Sink',
          type: OBJECT_TYPES.SINK,
          geometryType: GEOMETRY.BOX_GEOMETRY,
          dimensions: { width: 60, height: 20, depth: 40 },
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 0.01, y: 0.01, z: 0.01 },
          material: [
            {
              id: 'sink-mat',
              name: 'Sink Material',
              type: 'Laminate',
            },
          ],
        },
      ];
    }
    return cabinetItems
      .map((item: any) => item[0])
      .filter((item: any) => allowedTypes.includes(item.type));
  };

  /** Open the Second Popup for selected furniture category */
  const handleFurnitureCategoryClick = (category: string) => {
    setSelectedFurnitureCategory(category === selectedFurnitureCategory ? null : category);
    setAddPartPopup(false);
    setSelectedCabinetItem(null);
    setQuantityValue(1);
  };

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

  const iconMap: IconMap = {
    drawer: assets.drawer,
    'Sliding Door': assets.door,
    door: assets.door_icon,
    'Horizontal Plank': assets.horizontal,
    'Vertical Plank': assets.vertical,
    plank: assets.vertical,
    Cabinet: assets.cabinet,
    cupboard: assets.cabinet,
    platform: assets.platform_icon,
    sink: assets.sink_icon,
    'L-Shape Object': assets.vertical, // Using vertical icon as placeholder
    lShapeObject: assets.vertical,
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
                      className={`${styles.furnitureItemslist} ${selectedFurnitureCategory === option ? styles.activeItem : ''}`}
                      onClick={() => handleFurnitureCategoryClick(option)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className={styles.activegroup_tools}>
                        <img src={icon} alt={`${option} Icon`} />
                      </div>

                      <span>{option}</span>

                      <img
                        src={assets.left_arrow}
                        alt=""
                        className={styles.arrow}
                        style={{
                          transform:
                            selectedFurnitureCategory === option
                              ? 'rotate(180deg)'
                              : 'rotate(0deg)',
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
              <img
                src={assets.tool_part_line}
                className={styles.active_tool_part_liness}
                alt="active group"
              />
            </div>
            <div className={styles.submenuContent}>
              {getFilteredCabinetItems(selectedFurnitureCategory).map((item) => (
                <div
                  key={item.id}
                  className={styles.submenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCabinetItemSelect(e, item);
                  }}
                  title={item.description || item.name}
                >
                  <img
                    src={
                      iconMap[
                        item.type === PART_TYPES.PLANK ? formatEnumLabel(item.name) : item.type
                      ]
                    }
                    alt={item.name}
                  />
                  <span>{formatEnumLabel(item.name)}</span>
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
            <h2>Add {formatEnumLabel(selectedCabinetItem.name)}</h2>
            <img
              src={assets.close || '/placeholder.svg'}
              className={styles.createclose}
              alt="close"
              onClick={closePopup}
            />
            <div className={styles.create_right_side}>
              <p>Enter the number of {formatEnumLabel(selectedCabinetItem.name)} to add.</p>
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
                    label={`Quantity for ${formatEnumLabel(selectedCabinetItem.name)}`}
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
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        closeButton={false}
        icon={false}
        toastClassName="!relative !flex !p-0 !mb-2 !bg-transparent !shadow-none !overflow-visible"
      />
    </>
  );
};

export default Toolbar;
