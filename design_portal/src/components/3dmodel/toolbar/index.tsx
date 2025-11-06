// @ts-nocheck
import InputField from '@/components/inputfields/InputField';
import { assets } from '@/svgPaths';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import * as THREE from 'three';
import { removeExistingLines } from '../design/index';
import { toggleMeasurement, toggleQuickHide } from '../store/dataSlice';
import styles from './toolbar.module.css';
// catalog modal photo
import { objectName } from '@/components/3dmodel/handler/constant';
import commonService from '@/services/CommonService';
import React from 'react';
import {
  addDoorOnInvisibleBox,
  addDoubleDoorUpperCabinetsAbovePlatform,
  addDrawersOnInvisibleBox,
  addHorizontalPlanksInsideBox,
  addPlatformOnWall,
  addSimpleCabinet,
  addSimpleTVUnit,
  addUpperCabinetsAbovePlatform,
  addVerticalPlanksToBox,
} from '../design/scene';
import { addCabinetItemToDesign } from '../handler/items';
import { metersToMM } from '../handler/unitConversion';
import { updateCatalogItemObject, updateObjectInDatabase } from '../handler/updateHandler';
import { useAppDispatch } from '../hooks';
import { ToolbarProps } from '../interface';
import { store } from '../store';
import {
  addObjects,
  addObjectsThunk,
  setHoverdMesh,
  setSelectedChildObject,
  setobjectSelected,
  togglAlignment,
} from '../store/dataSlice';

const Toolbar: React.FC<ToolbarProps> = ({ threeDView }) => {
  const dispatch = useAppDispatch();

  const isQuickHideActive = useSelector((state) => state.data.isQuickHideActive);
  const isMeasurementActive = useSelector((state) => state.data.isMeasurementActive);
  const isAlignmentActive = useSelector((state) => state.data.isAlignmentActive);
  const [activeOption, setActiveOption] = useState('Home');
  const [isToolOpen, setIsToolOpen] = useState(true);
  const [activeOptionName, setActiveOptionName] = useState('Home');
  const [catalogMenu, setcatalogMenu] = useState(false);
  const [furnitureItems, setFurnitureItems] = useState([]);
  const [partItems, setPartItems] = useState([]);
  const [customItems, setCustomItems] = useState([]);
  const [activeCatalogTab, setActiveCatalogTab] = useState('furniture');
  const [isExlightActive, setIsExlightActive] = useState(false);
  const [cabinetItems, setCabinetItems] = useState([]);
  const [createCompanyPopup, setCreateCompanyPopup] = useState(false);
  const [selectedCabinetItem, setSelectedCabinetItem] = useState(null);
  const [quantityValue, setQuantityValue] = useState(1);
  const [activeSubOption, setActiveSubOption] = useState<string | null>(null);
  const [selectedFurnitureCategory, setSelectedFurnitureCategory] = useState<string | null>(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [selectedItem, setSelectedItem] = useState(null);

  const handleOptionClick = (option: string, name: string) => {
    setIsToolOpen(true);
    setActiveOptionName(name);
    setActiveOption(option);
  };

  const handleSubmenuClick = (event: React.MouseEvent, item: any) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPopupPosition({ x: rect.right + 12, y: rect.top + 55 });
    setSelectedItem(item);
    setPopupVisible(true);
  };

  const closePopup = () => {
    setPopupVisible(false);
    setSelectedItem(null);
    setCreateCompanyPopup(false);
    setSelectedCabinetItem(null);
    setQuantityValue(1);
  };

  const handleToolToggleClick = () => {
    setIsToolOpen((prevState) => !prevState);
    setcatalogMenu(false);
  };

  const handleToAddPlatform = async (catalogId: string) => {
    const textureLoader = new THREE.TextureLoader();
    const counterTexture = textureLoader.load('/img14_64.jpg');
    counterTexture.wrapS = counterTexture.wrapT = THREE.RepeatWrapping;
    counterTexture.repeat.set(10, 1);

    const scene = threeDView.scene as THREE.Scene;
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

    let platformData: any[] = [];
    let platFormGroup;
    if (targetWall) {
      const platform = await addPlatformOnWall(scene, targetWall, counterTexture);
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
          platFormGroup.userData.objectId = apiResponse.id;
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

  const handleTextureClick = async (name: string) => {
    const formattedTextureName = name.toLowerCase().replaceAll(' ', '_');
    const textureURL = `/textures/${formattedTextureName}.jpg`;

    const texture = new THREE.TextureLoader().load(textureURL);

    const objects = store.getState().data.objects;
    const selectedObjectId = store.getState().data.selectedObject;
    const selectedChildObjectId = store.getState().data.selectedChildObject;

    const selectedObject = threeDView?.scene.children.find(
      (child) => child.userData.objectId === selectedObjectId
    );

    const selectedObjectData = objects.find((object) => object.id === selectedObjectId);

    const selectedChildObject = selectedObject?.children.find(
      (child) => child.userData.objectId === selectedChildObjectId
    );

    const selectedChildObjectData = objects.find((object) => object.id === selectedChildObjectId);

    if (selectedChildObject && selectedChildObjectData) {
      selectedChildObject.material = new THREE.MeshPhongMaterial({
        map: texture,
      });
      updateCatalogItemObject(selectedObjectData, {
        ...selectedChildObjectData,
        material: { type: 'TEXTURE', value: name },
      });
    } else if (selectedObject) {
      const items = [];
      const childCatalogList = [];

      selectedObject.traverse((child) => {
        if (child.name.includes(objectName.PLANK)) {
          child.material = new THREE.MeshPhongMaterial({ map: texture });

          const object = objects.find((o) => o.id === child.userData.objectId);

          if (object) {
            items.push({
              id: object.id,
              name: object.name,
              data: {
                ...object,
                material: { type: 'TEXTURE', value: name },
              },
            });

            const catalogObj = objects.find((o) => o.id === object.parent);
            if (catalogObj) {
              let catalogEntry = childCatalogList.find(
                (entry) => entry.catalog.id === catalogObj.id
              );

              if (!catalogEntry) {
                catalogEntry = {
                  catalog: {
                    id: catalogObj.id,
                    name: catalogObj.name,
                    data: catalogObj,
                  },
                  items: [],
                };
                childCatalogList.push(catalogEntry);
              }

              catalogEntry.items.push({
                id: object.id,
                name: object.name,
                data: {
                  ...object,
                  material: { type: 'TEXTURE', value: name },
                },
              });
            }
          }
        }
      });
      updateObjectInDatabase(
        selectedObjectData.id,
        { material: { type: 'TEXTURE', value: name } },
        selectedObjectData,
        items,
        childCatalogList
      );
    }
  };

  const fetchCabinetItem = async () => {
    const cabinetResponse: { status: number; data: any } = await commonService.get(
      'material',
      'catalog'
    );
    if (cabinetResponse.status === 200 && Array.isArray(cabinetResponse.data)) {
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        console.log(cabinetResponse.data, 'cabinetResponse.data');
      }
      setCabinetItems(cabinetResponse.data);
    }
  };

  const handleCabinetClick = () => {
    setActiveOption('Furniture');
    setActiveOptionName('Furniture');
    fetchCabinetItem();
  };

  const handleCabinetItemSelect = async (item: any) => {
    if (item.type === 'Platform') {
      handleToAddPlatform(item.id);
      return;
    }

    // For Cabinet items: no quantity popup, no target selection; create via API and add directly
    if (item?.type === 'Cabinet') {
      try {
        const scene = threeDView.scene as THREE.Scene;
        const designId = window.location.pathname.split('/')[2];
        const catalogId = item.id;
        const lowerName = (item?.name || '').toLowerCase();

        // Get actual dimensions from the created object instead of static values
        let createdObject: THREE.Object3D | null = null;

        // Add to scene first to get actual dimensions
        if (lowerName.includes('tv')) {
          if (typeof threeDView.addSimpleTVUnit === 'function') {
            threeDView.addSimpleTVUnit();
            // Find the created TV unit (get the last one added)
            const tvUnits: THREE.Object3D[] = [];
            scene.traverse((obj) => {
              if (obj.name === 'SimpleTVUnit') {
                tvUnits.push(obj);
              }
            });
            createdObject = tvUnits[tvUnits.length - 1] || null;
          }
        } else if (lowerName.includes('computer') || lowerName.includes('desk')) {
          if (typeof threeDView.addComputerDesk === 'function') {
            threeDView.addComputerDesk();
            // Find the created computer desk (get the last one added)
            const desks: THREE.Object3D[] = [];
            scene.traverse((obj) => {
              if (obj.name === 'ComputerDesk') {
                desks.push(obj);
              }
            });
            createdObject = desks[desks.length - 1] || null;
          }
        } else {
          if (typeof threeDView.addSimpleCabinet === 'function') {
            threeDView.addSimpleCabinet();
            // Find the created cabinet (get the last one added)
            const cabinets: THREE.Object3D[] = [];
            scene.traverse((obj) => {
              if (obj.name === 'SimpleCabinet') {
                cabinets.push(obj);
              }
            });
            createdObject = cabinets[cabinets.length - 1] || null;
          }
        }

        if (!createdObject) {
          console.error('Failed to create or find the cabinet object');
          return;
        }

        // Convert to mm for storage (meters * 1000 = mm)
        const width = metersToMM(createdObject.geometry.parameters.width);
        const height = metersToMM(createdObject.geometry.parameters.height);
        const depth = metersToMM(createdObject.geometry.parameters.depth);
        const position = {
          x: metersToMM(createdObject.position.x),
          y: metersToMM(createdObject.position.y),
          z: metersToMM(createdObject.position.z),
        };

        const ruleParts: any[] = [];

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

        let apiResponse: any = null;
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
    setCreateCompanyPopup(true);
  };
  const handleAddUpperCabinets = async (type: 'UpperCabinet' | 'DoubleDoorUpperCabinet') => {
    const scene = threeDView.scene as THREE.Scene;
    const outline = scene.children.find((o) => o.name.startsWith('outline-')) as
      | THREE.Object3D
      | undefined;
    let targetPlatform: THREE.Mesh | null = null;

    if (outline) {
      const outlineCenter = outline.position.clone();
      scene.traverse((o) => {
        if (
          o instanceof THREE.Mesh &&
          (o.name.startsWith('Counter_') ||
            o.name === 'Back Counter' ||
            o.name === 'Left Counter' ||
            o.name === 'Right Counter')
        ) {
          const b = new THREE.Box3().setFromObject(o);
          const c = new THREE.Vector3();
          b.getCenter(c);
          if (c.distanceTo(outlineCenter) < 1e-3) targetPlatform = o;
        }
      });
    }

    if (!targetPlatform) {
      const hovered = store.getState().data.hoverdMesh as THREE.Mesh | null;
      if (
        hovered &&
        (hovered.name.startsWith('Counter_') ||
          hovered.name === 'Back Counter' ||
          hovered.name === 'Left Counter' ||
          hovered.name === 'Right Counter')
      ) {
        targetPlatform = hovered;
      }
    }

    if (!targetPlatform) {
      alert('Please select a platform/counter first.');
      return;
    }

    const num = parseInt(quantityValue.toString(), 10);
    if (!Number.isFinite(num) || num <= 0) return;

    if (type === 'UpperCabinet') {
      addUpperCabinetsAbovePlatform(scene, targetPlatform, num);
    } else if (type === 'DoubleDoorUpperCabinet') {
      addDoubleDoorUpperCabinetsAbovePlatform(scene, targetPlatform, num);
    }
  };
  const onAddItems = async () => {
    setCreateCompanyPopup(false);
    const num = parseInt(quantityValue.toString(), 10);
    if (!Number.isFinite(num) || num <= 0) {
      return;
    }

    const scene = threeDView.scene as THREE.Scene;
    const outline = scene.children.find((o) => o.name.startsWith('outline-')) as
      | THREE.Object3D
      | undefined;
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

    const designId = window.location.pathname.split('/')[2];
    const catalogId = selectedCabinetItem.catalog_id || selectedCabinetItem.id;

    const itemData = {
      catalogId: catalogId,
      type: itemType,
      name: `${itemName}`,
      description: selectedCabinetItem.description || `${itemName} description`,
      design_id: designId,
    };

    if (['Door', 'Sliding Door'].includes(itemType)) {
      await addDoorOnInvisibleBox(scene, targetBox, selectedCabinetItem, itemData, num);
    } else if (itemType === 'Drawer') {
      await addDrawersOnInvisibleBox(scene, targetBox, num, itemData);
    } else if (itemType === 'Plank') {
      const nameLower = (itemName || '').toLowerCase();
      if (nameLower.includes('vertical')) {
        await addVerticalPlanksToBox(scene, targetBox, num, selectedCabinetItem, itemData);
      } else if (nameLower.includes('horizontal')) {
        await addHorizontalPlanksInsideBox(scene, targetBox, num, selectedCabinetItem, itemData);
      }
    } else if (itemType === 'Cabinet' && itemName === 'Simple Cabinet') {
      await addSimpleCabinet(scene, targetBox, num, selectedCabinetItem, apiResponses);
    } else if (itemType === 'Cabinet' && itemName === 'Tv Unit') {
      await addSimpleTVUnit(scene, targetBox, num, selectedCabinetItem, apiResponses);
    } else if (itemType === 'Cabinet' && itemName === 'Computer Desk') {
      await addComputerDesk(scene, targetBox, num, selectedCabinetItem, apiResponses);
    } else if (itemType === 'UpperCabinet') {
      await handleAddUpperCabinets('UpperCabinet');
    } else if (itemType === 'DoubleDoorUpperCabinet') {
      await handleAddUpperCabinets('DoubleDoorUpperCabinet');
    }

    setCreateCompanyPopup(false);
    setSelectedCabinetItem(null);
    setQuantityValue(1);
    dispatch(setobjectSelected(null));
    dispatch(setSelectedChildObject(null));
    dispatch(setHoverdMesh(null));
    removeExistingLines();
  };

  const onClose = () => {
    setCreateCompanyPopup(false);
    setSelectedCabinetItem(null);
    setQuantityValue(1);
  };

  const homeTools = [
    {
      option: 'Furniture',
      icon: assets.homefurniture,
      onClick: () => {
        if (activeOption !== 'Furniture') {
          setActiveOption('Furniture');
          setActiveOptionName('Furniture');
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
      option: 'Align Dimension',
      icon: assets.alingDimension,
      onClick: () => {
        dispatch(togglAlignment(!isAlignmentActive));
        setcatalogMenu(false);
      },
      isActive: isAlignmentActive,
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
    { option: 'Kitchen', icon: assets.kitchen_svg },
    { option: 'Cabinet', icon: assets.cabinet_svg },
    { option: 'Tv unit', icon: assets.tvunit_svg },
    { option: 'Computer Desk', icon: assets.table_svg },
  ];

  // Submenu items for each furniture category - dynamically filtered from API
  const getFilteredCabinetItems = (category: string) => {
    // Define what types should appear for each category
    const categoryFilters: Record<string, string[]> = {
      Kitchen: ['Platform', 'Vertical Plank', 'Horizontal Plank', 'Drawer', 'Door'],
      Cabinet: ['Simple Cabinet', 'Vertical Plank', 'Horizontal Plank', 'Drawer', 'Door'],
      'Tv unit': [
        'Tv Unit',
        'Simple TV Unit',
        'Vertical Plank',
        'Horizontal Plank',
        'Drawer',
        'Door',
      ],
      'Computer Desk': [
        'Computer Desk',
        'Simple Computer Desk',
        'Vertical Plank',
        'Horizontal Plank',
        'Drawer',
        'Door',
      ],
    };

    const allowedTypes = categoryFilters[category] || [];
    let result: any[] = [];

    // For Kitchen, add alwaysFields items first
    if (category === 'Kitchen') {
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
      const filtered = cabinetItems.filter((item: any) => {
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
              itemNameLower.includes('cabinet')) ||
            // Match TV Unit variations
            (type.includes('TV') && itemNameLower.includes('tv')) ||
            (type.includes('Tv') && itemNameLower.includes('tv')) ||
            // Match Computer Desk variations
            (type.includes('Computer') && itemNameLower.includes('computer')) ||
            (type.includes('Desk') && itemNameLower.includes('desk'))
          );
        });
      });

      // Remove duplicates from filtered results
      const uniqueFiltered = filtered.reduce((acc: any[], item: any) => {
        const key = `${item.type}-${item.name}`;
        const exists = acc.find((i: any) => `${i.type}-${i.name}` === key);
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

  const handleFurnitureCategoryClick = (category: string) => {
    setSelectedFurnitureCategory(category === selectedFurnitureCategory ? null : category);
    setPopupVisible(false);
    setSelectedItem(null);
    setCreateCompanyPopup(false);
    setSelectedCabinetItem(null);
    setQuantityValue(1);
  };

  const handleSubMenuItemClick = (item: any) => {
    // Find the corresponding catalog item from API and handle selection
    const catalogItem = cabinetItems.find((ci: any) => {
      // Match by exact name or by type
      return (
        ci.name === item.name ||
        (ci.type === 'Plank' &&
          item.name.includes('Plank') &&
          ci.name.includes(item.name.split(' ')[0])) ||
        (ci.type === 'Door' && item.name === 'Door') ||
        (ci.type === 'Drawer' && item.name === 'Drawer') ||
        (ci.type === 'Platform' && item.name === 'Platform')
      );
    });

    if (catalogItem) {
      handleCabinetItemSelect(catalogItem);
    } else {
      console.warn(`No catalog item found for ${item.name}`);
    }
  };

  const alwaysFields = [
    {
      option: 'Upper Cabinets',
      icon: assets.double_door,
      onClick: () => {
        setSelectedCabinetItem({
          id: 'upper-cabinet',
          name: 'Upper Cabinets',
          type: 'UpperCabinet',
        });
        setQuantityValue(1);
        setCreateCompanyPopup(true);
      },
      isActive: false,
    },
    {
      option: 'Double Door Upper Cabinets',
      icon: assets.single,
      onClick: () => {
        setSelectedCabinetItem({
          id: 'double-door-upper-cabinet',
          name: 'Double Door Upper Cabinets',
          type: 'DoubleDoorUpperCabinet',
        });
        setQuantityValue(1);
        setCreateCompanyPopup(true);
      },
      isActive: false,
    },
    {
      option: 'Load Sink GLB',
      icon: assets.sink,
      onClick: () => {
        if (threeDView && typeof threeDView.loadSinkModel === 'function') {
          threeDView.loadSinkModel('/sink.glb');
        }
      },
      isActive: false,
    },
  ];
  const handleAddObject = (name: string) => {
    dispatch(addObjectsThunk(name));
    setcatalogMenu(false);
  };

  const handleback = () => {
    setActiveOption('Home');
    setActiveOptionName('Home');
    setSelectedFurnitureCategory(null);
    setcatalogMenu(false);
    setPopupVisible(false);
    setSelectedItem(null);
    setCreateCompanyPopup(false);
    setSelectedCabinetItem(null);
    setQuantityValue(1);
  };
  useEffect(() => {
    const fetchCatalogItems = async () => {
      const response = await commonService.get('design', 'catalog/default');
      if (response.status === 200 && Array.isArray(response.data)) {
        const allItems = response.data.map((catalog) => ({
          id: catalog.catalog.id,
          name: catalog.catalog.name,
          image: catalog.catalog.image,
          type: catalog.catalog.data.type,
          data: catalog.catalog.data,
        }));

        setFurnitureItems(allItems.filter((item) => item.type === 'furniture'));
        setPartItems(allItems.filter((item) => item.type === 'parts'));
      }
      const customResponse = await commonService.getWithQueryParam(
        'design',
        '',
        'is_custom',
        'true'
      );

      if (customResponse.status === 200 && Array.isArray(customResponse.data)) {
        const customDesigns = customResponse.data.map((design) => ({
          id: design.id,
          name: design.design_name,
          image: design.custom_design_picture,
          type: 'custom',
          data: design,
        }));
        setCustomItems(customDesigns);
      }
    };

    fetchCatalogItems();
  }, []);

  const iconMap = {
    Drawer: assets.drawer,
    'Sliding Door': assets.door,
    Door: assets.door_icon,
    'Horizontal Plank': assets.horizontal_plank,
    'Vertical Plank': assets.vertical_plank,
    'Tv Unit': assets.tv,
    'Computer Desk': assets.table,
    Plank: assets.vertical_plank,
    Cabinet: assets.cabinet,
    Platform: assets.platform,
  };

  return (
    <>
      {/* Toolbar Container */}
      <aside className={styles.aside}>
        <div style={{ flexDirection: 'column', display: 'flex' }}>
          <div className={styles.group}>
            <img src={assets.logo} className={styles.projectLogo} alt="Toolbar Logo" />
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
                <div className={styles.activegroup_header}>
                  <img src={assets.back} alt="back" onClick={handleback} />
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
                  {viewTools.map(({ option, icon, onClick, disabled, isActive }) => (
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
                        src={assets.list_line_arrow}
                        alt=""
                        style={{
                          transform:
                            selectedFurnitureCategory === option
                              ? 'rotate(180deg)'
                              : 'rotate(0deg)',
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
              <h3 className={styles.headerTitle}>{selectedFurnitureCategory}</h3>
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
                src={assets.close}
                alt="close"
                className={styles.closeIcon}
                onClick={() => setSelectedFurnitureCategory(null)}
              />
            </div>
            <div className={styles.submenuContent}>
              {getFilteredCabinetItems(selectedFurnitureCategory).map((item: any) => (
                <div
                  key={item.id}
                  className={styles.submenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSubmenuClick(e, item);
                    if (item.isAlwaysField) {
                      // For alwaysFields items, call their onClick directly
                      item.onClick();
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

        <div
          className={isToolOpen ? styles.toggle : styles.toggle_open}
          onClick={handleToolToggleClick}
        >
          <img src={isToolOpen ? assets.tool_toggle : assets.tool_toggle_open} alt="toggle" />
        </div>
      </aside>

      {/* Catalog Menu */}
      {catalogMenu && (
        <div className={`${styles.catalogcontainer} ${!isToolOpen ? styles.catalogClosed : ''}`}>
          <div className={styles.firstpart}>
            <h3>Catalog</h3>
            <div className={styles.menuFunctionality}>
              <img src={assets.close} onClick={() => setcatalogMenu(false)} alt="close" />
            </div>
          </div>
          <div className={styles.catalogTabs}>
            <button
              className={`${styles.tabButton} ${activeCatalogTab === 'furniture' ? styles.activeTab : ''}`}
              onClick={() => setActiveCatalogTab('furniture')}
            >
              Product Catalog
            </button>
            <button
              className={`${styles.tabButton} ${activeCatalogTab === 'parts' ? styles.activeTab : ''}`}
              onClick={() => setActiveCatalogTab('parts')}
            >
              Part
            </button>
            <button
              className={`${styles.tabButton} ${activeCatalogTab === 'custom' ? styles.activeTab : ''}`}
              onClick={() => setActiveCatalogTab('custom')}
            >
              My Custom
            </button>
          </div>
          <div className={styles.secondpart}>
            <div className={styles.scrollContainer}>
              {(activeCatalogTab === 'furniture'
                ? furnitureItems
                : activeCatalogTab === 'parts'
                  ? partItems
                  : customItems
              ).map(({ id, image, name }) => (
                <div key={id} className={styles.catalogbox} onClick={() => handleAddObject(name)}>
                  <img
                    src={
                      image
                        ? image.startsWith('http')
                          ? image
                          : `${process.env.NEXT_PUBLIC_PUBLIC_API}${image}`
                        : ''
                    }
                    alt={name || 'Design'}
                  />
                  <p>{formatName(name)}</p>
                </div>
              ))}
              {(activeCatalogTab === 'furniture'
                ? furnitureItems
                : activeCatalogTab === 'parts'
                  ? partItems
                  : customItems
              ).length === 0 && (
                <div className={styles.noItems}>
                  No{' '}
                  {activeCatalogTab === 'furniture'
                    ? 'furniture'
                    : activeCatalogTab === 'parts'
                      ? 'parts'
                      : 'custom designs'}{' '}
                  found
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {createCompanyPopup && selectedCabinetItem && (
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
                      setQuantityValue(e.target.value)
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

export const formatName = (name: string) => {
  if (!name) return '';
  const words = name.replace(/_/g, ' ').split(' ');
  return words
    .map((word) => {
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};
