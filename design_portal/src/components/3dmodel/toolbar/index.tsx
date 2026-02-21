import InputField from '@/components/inputfields/InputField';
import {
  CENTER_STUDY_TABLE,
  DINNER_TABLE,
  FLOWER,
  FRIDGE,
  MICROWAVE,
  SOFA,
  STOVE,
  TV,
} from '@/glbPaths';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import commonService from '@/services/CommonService';
import { assets } from '@/svgPaths';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as THREE from 'three';
import { removeExistingLines } from '../design/index';
import {
  addDoorOnInvisibleBox,
  addDoubleDoorOnInvisibleBox,
  addDrawersOnInvisibleBox,
  addHorizontalPlanksInsideBox,
  addLShapeObjectToBox,
  addSideObjectToCupboard,
  addVerticalPlanksToBox,
} from '../design/scene';
import { hideFullScreenLoader, showFullScreenLoader } from '../handler/items';
import { GLBLoader, prefetchGLB } from '../helper/glbLoader';
import { useAppDispatch } from '../hooks';
import { ToolbarProps } from '../interface';
import {
  DIRECTION_TYPES,
  GEOMETRY,
  INVISIBLE_BOXES,
  MATERIAL_TYPES,
  MeshObjectData,
  OBJECT_TYPES,
  PART_TYPES,
} from '../sceneCreator/interface';
import { SyncManager } from '../sceneCreator/syncState';
import { formatEnumLabel } from '../sceneCreator/utils';
import { store } from '../store';
import {
  addObjects,
  setHoverdMesh,
  setSelectedChildObject,
  toggleMeasurement,
  toggleQuickHide,
  toggleWallDrawing,
} from '../store/dataSlice';
import { CustomToast } from '../utils/CustomToast';
import { Datastate, IconMap } from './interface';
import styles from './toolbar.module.css';

const Toolbar: React.FC<ToolbarProps> = ({ threeDView, onViewModeChange, viewMode }) => {
  const dispatch = useAppDispatch();
  const state = useSelector((state: { data: Datastate }) => state.data);
  const isQuickHideActive = state.isQuickHideActive;
  const isMeasurementActive = state.isMeasurementActive;
  const isWallDrawingActive = state.isWallDrawingActive;
  const [activeOption, setActiveOption] = useState('Home');
  const [isToolOpen, setIsToolOpen] = useState(true);
  const [activeOptionName, setActiveOptionName] = useState('Home');

  // When parent switches to 2d view, ensure toolbar shows Home and close any secondary panels
  useEffect(() => {
    if (viewMode === '2d') {
      // Show primary Home panel
      setActiveOption('Home');
      setActiveOptionName('Home');
      setIsToolOpen(true);

      // Close any open submenus or popups to avoid secondary panels appearing
      setcatalogMenu(false);
      setSelectedFurnitureCategory(null);
      setAddPartPopup(false);
      setSelectedCabinetItem(null);
      setQuantityValue(1);
      setIsModelOpen(false);
    }
  }, [viewMode]);

  useEffect(() => {
    const allModels = [
      ...SOFA,
      ...FRIDGE,
      ...STOVE,
      ...TV,
      ...DINNER_TABLE,
      ...FLOWER,
      ...MICROWAVE,
      ...CENTER_STUDY_TABLE,
    ];

    allModels.forEach((item) => {
      if (item.path) {
        prefetchGLB(item.path);
      }
    });
  }, []);
  const [catalogMenu, setcatalogMenu] = useState(false);
  const [isExlightActive, setIsExlightActive] = useState(false);
  const [cabinetItems, setCabinetItems] = useState<MeshObjectData[][]>([]);
  const [addPartPopup, setAddPartPopup] = useState(false);
  const [selectedCabinetItem, setSelectedCabinetItem] = useState<MeshObjectData | null>(null);
  const [quantityValue, setQuantityValue] = useState(1);
  const [selectedFurnitureCategory, setSelectedFurnitureCategory] = useState<string | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [isModelOpen, setIsModelOpen] = useState(false);

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
      // Preload any GLB models found in the fetched cabinet items
      cabinetResponse.data.flat().forEach((item: any) => {
        if (item.path) {
          prefetchGLB(item.path);
        }
      });
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
  const handleCabinetItemSelect = async (event: React.MouseEvent, item: MeshObjectData | any) => {
    console.log('handleCabinetItemSelect', item);
    // Check if it's a GLB model (has path property)
    if (item.path) {
      if (!threeDView || !threeDView.scene) return;

      showFullScreenLoader(`Loading ${item.name}...`);
      try {
        // Set realistic target dimensions (in meters) based on category
        let targetSize = { width: 0.12, height: 0.12, depth: 0.12 };

        // Determine category from path and set appropriate realistic dimensions
        if (item.path.includes('/sofa/')) {
          // Sofas: typically 2m wide, 0.8m tall, 0.9m deep
          targetSize = { width: 4.0, height: 0.8, depth: 0.9 };
        } else if (item.path.includes('/fridge/')) {
          // Fridges: typically 0.7m wide, 1.7m tall, 0.7m deep
          targetSize = { width: 0.8, height: 1.7, depth: 0.7 };
        } else if (item.path.includes('/stove/')) {
          // Stoves: typically 0.6m wide, 0.9m tall, 0.6m deep
          targetSize = { width: 0.15, height: 0.15, depth: 0.15 };
        } else if (item.path.includes('/tv/')) {
          // TVs: typically 1.2m wide, 0.7m tall, 0.1m deep
          targetSize = { width: 1.2, height: 0.7, depth: 0.1 };
        } else if (item.path.includes('/dinnertable/')) {
          // Dinner tables: typically 1.5m wide, 0.75m tall, 0.9m deep
          targetSize = { width: 2.0, height: 1.0, depth: 0.9 };
        } else if (item.path.includes('/flower/')) {
          // Flower pots: typically 0.3m wide, 0.4m tall, 0.3m deep
          targetSize = { width: 0.3, height: 0.4, depth: 0.3 };
        } else if (item.path.includes('/microwave/')) {
          // Microwaves/toasters: typically 0.5m wide, 0.3m tall, 0.4m deep
          targetSize = { width: 0.5, height: 0.3, depth: 0.4 };
        } else if (item.path.includes('/table/')) {
          // Study/center tables: typically 1.2m wide, 0.75m tall, 0.6m deep
          targetSize = { width: 1.2, height: 0.75, depth: 0.6 };
        }

        const model = await GLBLoader(item.path, item.name, targetSize);
        let position: THREE.Vector3 | null = null;

        if (model) {
          model.userData.objectId = item.id;
          model.userData.isGLB = true;

          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.userData.objectId = item.id;
              child.userData.isGLB = true;
              child.userData.type = OBJECT_TYPES.MODEL;
              child.name = `Model_Child_${child.id}`;
            }
          });

          // Position at center and perfectly on top of floor (y = 0)
          // We calculate the bbox to find the exact bottom offset
          const box = new THREE.Box3().setFromObject(model);

          // The floor mesh generated by FloorManager in 2dmodel/walls is placed at Y=0.01
          // to prevent z-fighting with the grid.
          // Because the model is already mathematically centered at local (0,0,0) from GLBLoader
          // (meaning its bottom is resting at -actualHeight / 2), we just push it up by
          // actualHeight / 2 + 0.01 directly onto its existing centered position instead of overwriting .set()!
          const actualHeight = box.max.y - box.min.y;
          model.position.y += 0.01 + actualHeight / 2;

          threeDView.scene.add(model);

          // Proactively start dragging the new model for better placement
          if (threeDView.moveHandler) {
            hideFullScreenLoader();
            position = await threeDView.moveHandler.startDragging(model);
          }

          const itemData = {
            ...item,
            id: crypto.randomUUID(),
            type: OBJECT_TYPES.MODEL,
            name: item.name,
            dimensions: targetSize,
            position: position || { x: 0, y: 0, z: 0 },
            material: [],
          };
          store.dispatch(addObjects([itemData]));

          if (threeDView.renderer && threeDView.camera) {
            threeDView.renderer.render(threeDView.scene, threeDView.camera);
          }
        }
      } catch (error) {
        console.error('Error loading GLB model:', error);
        toast.error(`Failed to load ${item.name}`);
      } finally {
        hideFullScreenLoader();
      }
      return;
    }

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
    } else {
      if (['door', 'Sliding Door', PART_TYPES.DOUBLE_DOOR].includes(item.type)) {
        console.log('item', item);
        setSelectedCabinetItem(item);
        onAddItems(item, 1);
      } else {
        setSelectedCabinetItem(item);
        setQuantityValue(1);
        setAddPartPopup(true);
      }
      handleSubmenuClick(event);
    }
  };

  const handleSideObjectAdd = async (direction: string) => {
    if (!selectedCabinetItem) return;

    const scene = threeDView!.scene;
    let targetBox: THREE.Mesh | null = null;
    const selectedChildObject = store.getState().data.selectedObject;

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
            message="Please select a cupboard first"
            closeToast={closeToast}
          />
        ),
        {
          position: 'top-center',
          autoClose: 5000,
          hideProgressBar: false,
          closeButton: false,
          icon: false,
          className:
            '!overflow-hidden !rounded-[0.75rem] !border !border-[var(--primary-color)] !bg-white !p-0 !min-h-0',
          style: { padding: 0, minHeight: 'auto' },
        }
      );
      return;
    }

    // Check if cupboard is main
    const mesh = targetBox as THREE.Mesh;
    const isMain = mesh.userData.isMain || mesh.userData.type === 'cupboard';
    // Explicitly reject walls and floors which also share isMain=true
    const isWallOrFloor = mesh.userData.type === 'wall' || mesh.userData.type === 'floor';
    // User said: "These objects should work only when a cupboard (is_main: true) is selected."
    // Also: "Do not show the 'Please select a blank box' error"

    if (!isMain || isWallOrFloor) {
      toast(
        ({ closeToast }) => (
          <CustomToast
            appearance="error"
            message="Please select a main cupboard"
            closeToast={closeToast}
          />
        ),
        {
          position: 'top-center',
          autoClose: 5000,
          hideProgressBar: false,
          closeButton: false,
          icon: false,
          className:
            '!overflow-hidden !rounded-[0.75rem] !border !border-[var(--primary-color)] !bg-white !p-0 !min-h-0',
          style: { padding: 0, minHeight: 'auto' },
        }
      );
      return;
    }

    await addSideObjectToCupboard(
      scene,
      targetBox,
      selectedCabinetItem.type,
      direction,
      selectedCabinetItem
    );

    setAddPartPopup(false);
    setSelectedCabinetItem(null);
    dispatch(setSelectedChildObject(null));
    removeExistingLines();
  };

  const onAddItems = async (overrideItem?: any, overrideQuantity?: number) => {
    // Ensure overrideItem is a valid item object (has 'type' and 'id') and not a React event
    const isValidItem =
      overrideItem &&
      overrideItem.type &&
      overrideItem.id &&
      typeof overrideItem.preventDefault !== 'function';
    const itemToAdd = isValidItem ? overrideItem : selectedCabinetItem;
    if (!itemToAdd) {
      console.error('No cabinet item selected');
      return;
    }
    setAddPartPopup(false);

    const quantity =
      overrideQuantity !== undefined ? overrideQuantity : parseInt(quantityValue.toString(), 10);
    const num = quantity;

    if (!Number.isFinite(num) || num <= 0) {
      return;
    }

    const scene = threeDView!.scene;
    let targetBox: THREE.Mesh | null = null;
    const selectedChildObject = store.getState().data.selectedChildObject
      ? store.getState().data.selectedChildObject
      : store.getState().data.selectedObject;

    scene.traverse((obj) => {
      if (obj.userData.objectId === selectedChildObject) {
        targetBox = obj as THREE.Mesh;
      }
    });

    const itemType = itemToAdd.type;
    const itemName = itemToAdd.name;

    const showErrorToast = (message: string) => {
      toast(
        ({ closeToast }) => (
          <CustomToast appearance="error" message={message} closeToast={closeToast} />
        ),
        {
          position: 'top-center',
          autoClose: 5000,
          hideProgressBar: false,
          closeButton: false,
          icon: false,
          className:
            '!overflow-hidden !rounded-[0.75rem] !border !border-[var(--primary-color)] !bg-white !p-0 !min-h-0',
          style: { padding: 0, minHeight: 'auto' },
        }
      );
    };

    if (
      (targetBox! as THREE.Mesh)?.userData.type !== INVISIBLE_BOXES.INVISIBLE_BOX &&
      ![PART_TYPES.DOOR, PART_TYPES.DOUBLE_DOOR, 'Sliding Door'].includes(itemType)
    ) {
      showErrorToast('Please select a blank box');
      return;
    }

    if (!targetBox) {
      showErrorToast('Target box not found!');
      return;
    }

    // If we're adding a door and the selected object isn't an invisible box (compartment),
    // try to add the door to the whole cupboard instead of the specific child plank they clicked on.
    if (
      [PART_TYPES.DOOR, PART_TYPES.DOUBLE_DOOR, 'Sliding Door'].includes(itemType) &&
      (targetBox as THREE.Mesh).userData.type !== INVISIBLE_BOXES.INVISIBLE_BOX
    ) {
      let cupboardMesh: any = targetBox;
      while (cupboardMesh && !cupboardMesh.userData?.isMain && cupboardMesh.parent) {
        cupboardMesh = cupboardMesh.parent;
      }
      if (cupboardMesh && cupboardMesh.userData?.isMain) {
        targetBox = cupboardMesh as THREE.Mesh;
      }
    }

    if ([PART_TYPES.DOOR, PART_TYPES.DOUBLE_DOOR, 'Sliding Door'].includes(itemType)) {
      if (
        itemType === PART_TYPES.DOUBLE_DOOR ||
        (itemType === PART_TYPES.DOOR && itemName === 'DOUBLE_DOOR')
      ) {
        const fullGroup = cabinetItems.find((group) => group.some((g) => g.id === itemToAdd?.id));
        await addDoubleDoorOnInvisibleBox(scene, targetBox, fullGroup ? fullGroup : []);
      } else {
        await addDoorOnInvisibleBox(scene, targetBox, itemToAdd);
      }
    } else if (itemType === 'drawer') {
      const fullGroup = cabinetItems.find((group) => group.some((g) => g.id === itemToAdd.id));
      await addDrawersOnInvisibleBox(scene, targetBox, num, fullGroup ? fullGroup : []);
    } else if (itemType === 'plank') {
      const nameLower = (itemName || '').toLowerCase();
      if (nameLower.includes('vertical')) {
        await addVerticalPlanksToBox(scene, targetBox, num, itemToAdd);
      } else if (nameLower.includes('horizontal')) {
        await addHorizontalPlanksInsideBox(scene, targetBox, num, itemToAdd);
      }
    } else if (
      itemType === PART_TYPES.L_SHAPE_OBJECT ||
      (itemName || '').toLowerCase().includes('l-shape')
    ) {
      await addLShapeObjectToBox(scene, targetBox, itemToAdd);
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
    { option: 'Model', icon: assets.homefurniture, isExpandable: true },
  ];

  const modelSubmenuItems = [
    { option: 'Sofa', icon: '/assets/3dmodel/toolbar/glb_icons/sofa.svg' },
    { option: 'Fridge', icon: '/assets/3dmodel/toolbar/glb_icons/fridge.svg' },
    { option: 'Stove', icon: '/assets/3dmodel/toolbar/glb_icons/stove.svg' },
    { option: 'TV', icon: '/assets/3dmodel/toolbar/glb_icons/tv.svg' },
    { option: 'Dinner Table', icon: '/assets/3dmodel/toolbar/glb_icons/dinner-table.svg' },
    { option: 'Flower', icon: '/assets/3dmodel/toolbar/glb_icons/flower.svg' },
    { option: 'Microwave', icon: '/assets/3dmodel/toolbar/glb_icons/microwave.svg' },
    { option: 'Study Table', icon: '/assets/3dmodel/toolbar/glb_icons/study-table.svg' },
  ];

  const getFilteredCabinetItems = (category: string) => {
    const categoryFilters: Record<string, string[]> = {
      Parts: Object.values(PART_TYPES),
      Cabinet: Object.values(OBJECT_TYPES),
      Kitchen: [OBJECT_TYPES.PLATFORM],
      'Kitchen Cabinet': Object.values(OBJECT_TYPES),
      'Kitchen Cabinet Parts': [...Object.values(PART_TYPES), ...Object.values(OBJECT_TYPES)],
    };

    // Explicit return for GLB categories
    if (category === 'Sofa') return SOFA;
    if (category === 'Fridge') return FRIDGE;
    if (category === 'Stove') return STOVE;
    if (category === 'TV') return TV;
    if (category === 'Dinner Table') return DINNER_TABLE;
    if (category === 'Flower') return FLOWER;
    if (category === 'Microwave') return MICROWAVE;
    if (category === 'Study Table') return CENTER_STUDY_TABLE;

    const allowedTypes = categoryFilters[category] || [];
    if (category === 'Kitchen') {
      const baseItems = [
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
              id: crypto.randomUUID(),
              name: 'Platform Material',
              type: MATERIAL_TYPES.MISCELLANEOUS,
              properties: {
                model: false,
                unit_of_issue: 'Each',
                default_cost: 0,
                sell_price: 0,
                default_markup: 0,
                sales_tax: false,
                default_tax_rate: 0,
                waste: 0,
                estimate: false,
                model_file: null,
              },
              textures: [],
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
              id: crypto.randomUUID(),
              name: 'Sink Material',
              type: MATERIAL_TYPES.MISCELLANEOUS,
              properties: {
                model: false,
                unit_of_issue: 'Each',
                default_cost: 0,
                sell_price: 0,
                default_markup: 0,
                sales_tax: false,
                default_tax_rate: 0,
                waste: 0,
                estimate: false,
                model_file: null,
              },
              textures: [],
            },
          ],
        },
      ];

      if (category === 'Kitchen') return baseItems;

      const otherItems = cabinetItems
        .map((item: any) => item[0])
        .filter((item: any) => allowedTypes.includes(item.type));

      return [...baseItems, ...otherItems];
    }
    return cabinetItems
      .map((item: any) => item[0])
      .filter((item: any) => allowedTypes.includes(item.type));
  };

  /** Open the Second Popup for selected furniture category */
  const handleFurnitureCategoryClick = (category: string) => {
    if (category === 'Model') {
      const nextOpenState = !isModelOpen;
      setIsModelOpen(nextOpenState);
      if (nextOpenState) {
        // If opening model list, close any active category panel
        setSelectedFurnitureCategory(null);
      }
      if (!nextOpenState) {
        setSelectedFurnitureCategory(null);
      }
      return;
    }

    // Check if the clicked category is a sub-model item
    const isModelSubItem = modelSubmenuItems.some((item) => item.option === category);

    // If clicking a primary category (not a sub-item of Model), close the Model expansion
    if (!isModelSubItem) {
      setIsModelOpen(false);
    }

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
    setIsModelOpen(false);
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
    lShapeObject: assets.lshape,
    uShapeObject: assets.lshape,
  };

  return (
    <>
      <aside
        className={styles.aside}
        onDoubleClick={(e) => {
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
        }}
      >
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
                      className={`${styles.toollistbox} ${isActive ? styles.activeItem : ''}`}
                      onClick={!disabled ? onClick : undefined}
                      style={{
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.3 : 1,
                      }}
                      title={disabled ? 'Coming Soon' : option}
                    >
                      <div className={styles.activegroup_tools}>
                        <img src={icon} alt={`${option} Icon`} />
                      </div>
                      <span>{option}</span>
                      <div className={styles.left_toolbarlist_arrow}>
                        <img src={assets.left_arrow} alt="arrow" />
                      </div>
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
                  {furnitureTools.map(({ option, icon, isExpandable }) => (
                    <React.Fragment key={option}>
                      <div
                        className={`${styles.furnitureItemslist} ${
                          selectedFurnitureCategory === option ? styles.activeItem : ''
                        } ${isExpandable && isModelOpen ? styles.activeItem : ''}`}
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
                              isExpandable && isModelOpen
                                ? 'rotate(90deg)'
                                : selectedFurnitureCategory === option
                                  ? 'rotate(180deg)'
                                  : 'rotate(0deg)',
                          }}
                        />
                      </div>

                      {isExpandable && (
                        <div
                          className={`${styles.submenuContainer} ${isModelOpen ? styles.open : ''}`}
                        >
                          {modelSubmenuItems.map((subItem) => (
                            <div
                              key={subItem.option}
                              className={`${styles.dropdownItem} ${
                                selectedFurnitureCategory === subItem.option ? styles.active : ''
                              }`}
                              onClick={() => handleFurnitureCategoryClick(subItem.option)}
                            >
                              <div className={styles.activegroup_tools}>
                                <img src={subItem.icon} alt={`${subItem.option} Icon`} />
                              </div>
                              <span>{subItem.option}</span>
                              <img
                                src={assets.left_arrow}
                                alt=""
                                className={styles.arrow}
                                style={{
                                  transform:
                                    selectedFurnitureCategory === subItem.option
                                      ? 'rotate(180deg)'
                                      : 'rotate(0deg)',
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submenu Panel */}

        {selectedFurnitureCategory && isToolOpen && (
          <div
            className={styles.submenuPanel}
            onDoubleClick={(e) => {
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }}
          >
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
                      item.image ||
                      (item.type === OBJECT_TYPES.CUPBOARD || item.type === 'Cabinet'
                        ? `/assets/3dmodel/sidebar/${formatEnumLabel(item.name)}.png`
                        : iconMap[
                            item.type === PART_TYPES.PLANK ? formatEnumLabel(item.name) : item.type
                          ]) ||
                      assets.cabinet
                    }
                    onError={(e) => {
                      const fallback =
                        iconMap[
                          item.type === PART_TYPES.PLANK ? formatEnumLabel(item.name) : item.type
                        ] || assets.cabinet;
                      e.currentTarget.src = fallback;
                      e.currentTarget.onerror = null;
                    }}
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
          onDoubleClick={(e) => {
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
          }}
        >
          <div
            className={
              selectedCabinetItem.type === PART_TYPES.L_SHAPE_OBJECT ||
              selectedCabinetItem.type === PART_TYPES.U_SHAPE_OBJECT
                ? styles.createpopupLShape
                : styles.createpopup
            }
          >
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
            {selectedCabinetItem.type === PART_TYPES.L_SHAPE_OBJECT ||
            selectedCabinetItem.type === PART_TYPES.U_SHAPE_OBJECT ? (
              <div className={styles.arrowContainer}>
                <div className={styles.arrowButtonsContainer}>
                  <button
                    className={styles.arrowButtons}
                    onClick={() => handleSideObjectAdd(DIRECTION_TYPES.TOP)}
                  >
                    <img src={assets.uparrow} alt="uparrow" />
                    Up
                  </button>
                  <button className={styles.disableArrowButton} disabled={true}>
                    <img src={assets.downarrow} alt="downarrow" />
                    Down
                  </button>
                </div>
                <div className={styles.arrowButtonsContainer}>
                  <button
                    className={styles.arrowButtons}
                    onClick={() => handleSideObjectAdd(DIRECTION_TYPES.LEFT)}
                  >
                    <img src={assets.leftarrow} alt="leftarrow" />
                    Left
                  </button>
                  <button
                    className={styles.arrowButtons}
                    onClick={() => handleSideObjectAdd(DIRECTION_TYPES.RIGHT)}
                  >
                    <img src={assets.rightarrow} alt="rightarrow" />
                    Right
                  </button>
                </div>
              </div>
            ) : (
              <>
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
                  <button className={styles.createcontinueButton} onClick={() => onAddItems()}>
                    Add
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Toolbar;
