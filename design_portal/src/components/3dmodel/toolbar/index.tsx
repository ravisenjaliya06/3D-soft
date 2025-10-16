// @ts-nocheck
import part_line from '@/assets/3dmodel/part-line.svg';
import img1 from '@/assets/catalog/toolbaricon/img1.svg';
import img2 from '@/assets/catalog/toolbaricon/img2.svg';
import logo from '@/assets/titleLogo.svg';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import * as THREE from 'three';
import { toggleMeasurement, toggleQuickHide } from '../store/dataSlice';
import styles from './toolbar.module.css';

// home toolbar
import tool_toggle_open from '@/assets/3dmodel/header/tool-toggle-open.svg';
import tool_toggle from '@/assets/3dmodel/header/tool-toggle.svg';
import createicon from '@/assets/createicon.svg';
import sink from '@/assets/toolbar/5996079.png';
import catalog from '@/assets/toolbar/catalog.svg';
import align_dimension from '@/assets/toolbar/dimension-align.svg';
import exlight from '@/assets/toolbar/exlight.svg';
import hide from '@/assets/toolbar/hide.svg';
import cabinet from '@/assets/toolbar/images.jpg';
import measure from '@/assets/toolbar/measure.svg';
import tool_part_line from '@/assets/toolbar/tool-part-line.svg';
import InputField from '@/components/inputfields/InputField';
import { removeExistingLines } from '../design/index';

// catalog modal photo
import { objectName } from '@/components/3dmodel/handler/constant';

// parts
import close from '@/assets/catalog/close.svg';
import commonService from '@/services/CommonService';

import door from '@/assets/toolbar/door-icon.svg';
import drawer from '@/assets/toolbar/drawer.svg';
import horizontal_plank from '@/assets/toolbar/horizontal-plank.svg';
import platform from '@/assets/toolbar/kitchen-platform-icon.svg';
import vertical_plank from '@/assets/toolbar/vertical-plank.svg';
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
import {
  updateCatalogItemObject,
  updateObjectInDatabase,
} from '../handler/updateHandler';
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

  const isQuickHideActive = useSelector(
    (state) => state.data.isQuickHideActive,
  );
  const isMeasurementActive = useSelector(
    (state) => state.data.isMeasurementActive,
  );
  const isAlignmentActive = useSelector(
    (state) => state.data.isAlignmentActive,
  );
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

  const handleOptionClick = (option: string, name: string) => {
    setIsToolOpen(true);
    setActiveOptionName(name);
    setActiveOption(option);
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

    const outline = scene.children.find((o) =>
      o.name.startsWith('outline-'),
    ) as THREE.Object3D | undefined;
    if (outline) {
      const outlineCenter = outline.position.clone();
      const walls: THREE.Mesh[] = [];
      scene.traverse((o) => {
        if (
          o instanceof THREE.Mesh &&
          ['Center Wall', 'Left Wall', 'Right Wall'].includes(o.name)
        )
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
      (hovered &&
      ['Center Wall', 'Left Wall', 'Right Wall'].includes(hovered.name)
        ? hovered
        : null);

    let platformData: any[] = [];
    if (targetWall) {
      platformData = addPlatformOnWall(scene, targetWall, counterTexture);
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
        }
      } catch (e) {
        console.error('Platform API failed', e);
      }
    }
  };

  const options = [
    { option: 'Home', name: 'Home', icon: img1 },
    { option: 'View', name: 'View', icon: img2 },
  ];

  const handleTextureClick = async (name: string) => {
    const formattedTextureName = name.toLowerCase().replaceAll(' ', '_');
    const textureURL = `/textures/${formattedTextureName}.jpg`;

    const texture = new THREE.TextureLoader().load(textureURL);

    const objects = store.getState().data.objects;
    const selectedObjectId = store.getState().data.selectedObject;
    const selectedChildObjectId = store.getState().data.selectedChildObject;

    const selectedObject = threeDView?.scene.children.find(
      (child) => child.userData.objectId === selectedObjectId,
    );

    const selectedObjectData = objects.find(
      (object) => object.id === selectedObjectId,
    );

    const selectedChildObject = selectedObject?.children.find(
      (child) => child.userData.objectId === selectedChildObjectId,
    );

    const selectedChildObjectData = objects.find(
      (object) => object.id === selectedChildObjectId,
    );

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
                (entry) => entry.catalog.id === catalogObj.id,
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
        childCatalogList,
      );
    }
  };

  const fetchCabinetItem = async () => {
    const cabinetResponse: { status: number; data: any } =
      await commonService.get('material', 'catalog');
    if (cabinetResponse.status === 200 && Array.isArray(cabinetResponse.data)) {
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        console.log(cabinetResponse.data, 'cabinetResponse.data');
      }
      setCabinetItems(cabinetResponse.data);
    }
  };

  const addCabinetItemToDesign = async (
    catalogId: string,
    itemData: {
      type: string;
      name: string;
      description: string;
      design_id: string;
      width?: number;
      height?: number;
      depth?: number;
      position?: { x: number; y: number; z: number };
      additional_data?: any;
      parts?: Array<{
        name: string;
        width: number;
        height: number;
        depth: number;
      }>;
    },
  ) => {
    const payload = {
      type: itemData.type,
      name: itemData.name,
      description: itemData.description,
      design_id: itemData.design_id,
      // Optional spatial metadata for backend consumption
      width: itemData.width,
      height: itemData.height,
      depth: itemData.depth,
      position: itemData.position,
      additional_data: itemData.additional_data,
      parts: itemData.parts,
    };
    try {
      const response = await commonService.post(
        `material/catalog`,
        `${catalogId}/design`,
        payload,
      );
      if (response.status === 200 || response.status === 201) {
        return response.data;
      }
    } catch (error) {
      console.error('Error adding cabinet item to design:', error);
      throw error;
    }
  };
  const handleCabinetClick = () => {
    setActiveOption('Cabinet');
    setActiveOptionName('Cabinet');
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
        } else if (
          lowerName.includes('computer') ||
          lowerName.includes('desk')
        ) {
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

        // Get actual dimensions from the created object's geometry
        const bbox = new THREE.Box3().setFromObject(createdObject);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const center = new THREE.Vector3();
        bbox.getCenter(center);

        // Convert to mm for storage (meters * 1000 = mm)
        const width = Math.round(size.x * 1000);
        const height = Math.round(size.y * 1000);
        const depth = Math.round(size.z * 1000);
        const position = {
          x: Math.round(center.x * 1000),
          y: Math.round(center.y * 1000),
          z: Math.round(center.z * 1000),
        };

        // Extract parts data from the actual object
        const parts: Array<{
          name: string;
          width: number;
          height: number;
          depth: number;
          position: { x: number; y: number; z: number };
        }> = [];

        createdObject.traverse((child) => {
          if (child instanceof THREE.Mesh && child.name.includes('PLANK')) {
            const childBbox = new THREE.Box3().setFromObject(child);
            const childSize = new THREE.Vector3();
            childBbox.getSize(childSize);

            // Get world position
            const worldPos = new THREE.Vector3();
            child.getWorldPosition(worldPos);

            // Convert child dimensions to mm
            parts.push({
              name: child.name,
              width: Math.round(childSize.x * 1000),
              height: Math.round(childSize.y * 1000),
              depth: Math.round(childSize.z * 1000),
              position: {
                x: Math.round(worldPos.x * 1000),
                y: Math.round(worldPos.y * 1000),
                z: Math.round(worldPos.z * 1000),
              },
            });
          }
        });

        // Create API call with actual dimensions in mm
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
  const onAddItems = async () => {
    const num = parseInt(quantityValue.toString(), 10);
    if (!Number.isFinite(num) || num <= 0) {
      return;
    }

    const scene = threeDView.scene as THREE.Scene;
    const outline = scene.children.find((o) =>
      o.name.startsWith('outline-'),
    ) as THREE.Object3D | undefined;
    let targetBox: THREE.Mesh | null = null;

    const getOrCreateInternalBox = (container: THREE.Mesh): THREE.Mesh => {
      // Try find existing child invisible box
      const existing = (container.children || []).find(
        (c: any) =>
          typeof c.name === 'string' &&
          c.name.toLowerCase().startsWith('invisiblebox'),
      ) as THREE.Mesh | undefined;
      if (existing) return existing;
      // Create a new internal invisible box using container geometry params
      const params = (container.geometry as THREE.BoxGeometry)
        .parameters as any;
      const width = params.width as number;
      const height = params.height as number;
      const depth = params.depth as number;
      const thickness = 0.018;
      const invW = Math.max(width - thickness * 2, 0.02);
      const invH = Math.max(height - thickness * 2, 0.02);
      const invD = Math.max(depth - thickness * 2, 0.02);
      const invMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
      });
      const inv = new THREE.Mesh(
        new THREE.BoxGeometry(invW, invH, invD),
        invMat,
      );
      inv.name = 'invisibleBox_auto';
      (inv as any).userData.isInvisibleBox = true;
      inv.position.set(0, 0, 0);
      container.add(inv);
      return inv;
    };

    // Determine target box based on item type
    const itemType = selectedCabinetItem.type;
    const itemName = selectedCabinetItem.name;

    if (outline) {
      const outlineCenter = outline.position.clone();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          // For planks, use different invisible box types
          if (itemType === 'Plank') {
            if (
              itemName === 'Vertical Plank' &&
              o.name.toLowerCase().includes('invisiblebox')
            ) {
              const b = new THREE.Box3().setFromObject(o);
              const c = new THREE.Vector3();
              b.getCenter(c);
              if (c.distanceTo(outlineCenter) < 1e-3) targetBox = o;
            } else if (
              itemName === 'Horizontal Plank' &&
              o.name.toLowerCase().includes('invisiblebox')
            ) {
              const b = new THREE.Box3().setFromObject(o);
              const c = new THREE.Vector3();
              b.getCenter(c);
              if (c.distanceTo(outlineCenter) < 1e-3) targetBox = o;
            }
          } else if (o.name.toLowerCase().includes('invisiblebox')) {
            // For doors and drawers, use compartment invisible boxes
            const b = new THREE.Box3().setFromObject(o);
            const c = new THREE.Vector3();
            b.getCenter(c);
            if (c.distanceTo(outlineCenter) < 1e-3) targetBox = o;
          }
        }
      });
    }

    if (!targetBox) {
      const hovered = store.getState().data.hoverdMesh as THREE.Mesh | null;
      if (
        hovered &&
        typeof hovered.name === 'string' &&
        hovered.name.toLowerCase().includes('invisiblebox')
      ) {
        targetBox = hovered;
      }
    }

    // Final fallback: use selected container (or selected child’s parent) and auto-create internal box
    if (!targetBox) {
      const selectedChildObjectId = store.getState().data
        .selectedChildObject as string | null;
      const selectedObjectId = store.getState().data.selectedObject as
        | string
        | null;
      let container: THREE.Mesh | null = null;
      if (selectedChildObjectId) {
        scene.traverse((o: any) => {
          if (
            !container &&
            o &&
            o.isMesh &&
            o.userData &&
            o.userData.objectId === selectedChildObjectId
          ) {
            container =
              o.parent && (o.parent as any).isMesh
                ? (o.parent as THREE.Mesh)
                : (o as THREE.Mesh);
          }
        });
      }
      if (!container && selectedObjectId) {
        scene.traverse((o: any) => {
          if (
            !container &&
            o &&
            o.isMesh &&
            o.userData &&
            o.userData.objectId === selectedObjectId
          ) {
            container = o as THREE.Mesh;
          }
        });
      }
      if (container) {
        targetBox = getOrCreateInternalBox(container);
      }
    }

    // If still nothing, abort silently (no blocking alert)
    if (!targetBox) return;

    // Handle different item types and make individual API calls for each item
    const designId = window.location.pathname.split('/')[2];
    const catalogId = selectedCabinetItem.catalog_id || selectedCabinetItem.id;

    // Collect all API responses for the items
    const apiResponses = [];

    // Make API calls for each item
    // Compute target box dimensions and center position once
    const bbox = new THREE.Box3().setFromObject(targetBox);
    const bboxSize = new THREE.Vector3();
    const bboxCenter = new THREE.Vector3();
    bbox.getSize(bboxSize);
    bbox.getCenter(bboxCenter);
    for (let i = 0; i < num; i++) {
      try {
        const itemData = {
          type: itemType,
          name: `${itemName} ${i + 1}`,
          description:
            selectedCabinetItem.description || `${itemName} description`,
          design_id: designId,
          width: bboxSize.x,
          height: bboxSize.y,
          depth: bboxSize.z,
          position: { x: bboxCenter.x, y: bboxCenter.y, z: bboxCenter.z },
        };

        const apiResponse = await addCabinetItemToDesign(catalogId, itemData);
        if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
          console.log(apiResponse, 'apiResponse');
        }
        apiResponses.push(apiResponse);
        dispatch(addObjects(apiResponses));
      } catch (error) {
        console.error(
          `Failed to add ${itemType.toLowerCase()} ${i + 1} to design:`,
          error,
        );
        apiResponses.push(null); // Add null for failed API calls
      }
    }

    // Now add the 3D objects with API response data
    if (['Door', 'Sliding Door'].includes(itemType)) {
      await addDoorOnInvisibleBox(
        scene,
        targetBox,
        num,
        selectedCabinetItem,
        apiResponses,
      );
    } else if (itemType === 'Drawer') {
      await addDrawersOnInvisibleBox(
        scene,
        targetBox,
        num,
        selectedCabinetItem,
        apiResponses,
      );
    } else if (itemType === 'Plank') {
      const nameLower = (itemName || '').toLowerCase();
      if (nameLower.includes('vertical')) {
        if (nameLower.includes('common')) {
          await addVerticalPlanksToBox(
            scene,
            targetBox,
            num,
            selectedCabinetItem,
            apiResponses,
          );
        } else {
          await addVerticalPlanksToBox(
            scene,
            targetBox,
            num,
            selectedCabinetItem,
            apiResponses,
          );
        }
      } else if (nameLower.includes('horizontal')) {
        await addHorizontalPlanksInsideBox(
          scene,
          targetBox,
          num,
          selectedCabinetItem,
          apiResponses,
        );
      }
    } else if (itemType === 'Cabinet' && itemName === 'Simple Cabinet') {
      await addSimpleCabinet(
        scene,
        targetBox,
        num,
        selectedCabinetItem,
        apiResponses,
      );
    } else if (itemType === 'Cabinet' && itemName === 'Tv Unit') {
      await addSimpleTVUnit(
        scene,
        targetBox,
        num,
        selectedCabinetItem,
        apiResponses,
      );
    } else if (itemType === 'Cabinet' && itemName === 'Computer Desk') {
      await addComputerDesk(
        scene,
        targetBox,
        num,
        selectedCabinetItem,
        apiResponses,
      );
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
      icon: catalog,
      onClick: () => handleCabinetClick(),
      isActive: catalogMenu,
      disabled: false,
    },
    {
      option: 'Quick Hide',
      icon: hide,
      onClick: () => {
        dispatch(toggleQuickHide(!isQuickHideActive));
        setcatalogMenu(false);
      },
      isActive: isQuickHideActive,
      disabled: false,
    },
    {
      option: 'Measure',
      icon: measure,
      onClick: () => {
        dispatch(toggleMeasurement(!isMeasurementActive));
        setcatalogMenu(false);
      },
      isActive: isMeasurementActive,
      disabled: false,
    },
    {
      option: 'Align Dimension',
      icon: align_dimension,
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
      icon: exlight,
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

  const alwaysFields = [
    {
      option: 'Upper Cabinets',
      icon: cabinet,
      onClick: async () => {
        const scene = threeDView.scene as THREE.Scene;
        const outline = scene.children.find((o) =>
          o.name.startsWith('outline-'),
        ) as THREE.Object3D | undefined;
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
          )
            targetPlatform = hovered;
        }
        if (!targetPlatform) {
          alert('Select a platform/counter first.');
          return;
        }
        const input = prompt(
          'How many upper cabinets to add above this platform?',
        );
        const num = parseInt((input || '').trim(), 10);
        if (!Number.isFinite(num) || num <= 0) return;
        addUpperCabinetsAbovePlatform(scene, targetPlatform, num);
      },
      isActive: false,
    },
    {
      option: 'Double Door Upper Cabinets',
      icon: cabinet,
      onClick: async () => {
        const scene = threeDView.scene as THREE.Scene;
        const outline = scene.children.find((o) =>
          o.name.startsWith('outline-'),
        ) as THREE.Object3D | undefined;
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
          )
            targetPlatform = hovered;
        }
        if (!targetPlatform) {
          alert('Select a platform/counter first.');
          return;
        }
        const input = prompt(
          'How many double door upper cabinets to add above this platform?',
        );
        const num = parseInt((input || '').trim(), 10);
        if (!Number.isFinite(num) || num <= 0) return;
        addDoubleDoorUpperCabinetsAbovePlatform(scene, targetPlatform, num);
      },
      isActive: false,
    },
    {
      option: 'Load Sink GLB',
      icon: sink,
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
        'true',
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
    Drawer: drawer.src,
    'Sliding Door': door.src,
    Door: door.src,
    'Horizontal Plank': horizontal_plank.src,
    'Vertical Plank': vertical_plank.src,
    Plank: vertical_plank.src,
    Cabinet: cabinet.src,
    Platform: platform.src,
  };

  return (
    <>
      {/* Toolbar Container */}
      <aside className={styles.aside}>
        <div style={{ flexDirection: 'column', display: 'flex' }}>
          <div className={styles.group}>
            <img
              src={logo.src}
              className={styles.projectLogo}
              alt="Toolbar Logo"
            />
          </div>
          <div className={styles.partLineGroup}>
            <img
              src={part_line.src}
              className={styles.partLine}
              alt="Toolbar Logo"
            />
          </div>
          <div className={styles.icon_style}>
            {options.map(({ option, name, icon }) => (
              <div
                key={option}
                onClick={() => handleOptionClick(option, name)}
                className={
                  activeOption === option ? styles.icon_active : styles.icon
                }
              >
                <img src={icon.src} alt={`${option} Icon`} />
              </div>
            ))}
          </div>
        </div>

        {isToolOpen && (
          <div className={styles.activegroup_tools_container}>
            <div className={styles.activegroup}>
              <p>{activeOptionName}</p>
              <img
                src={tool_part_line.src}
                className={styles.active_tool_part_line}
                alt="active group"
              />
              {activeOption === 'Home' && (
                <div className={styles.activegroup_tools_group}>
                  {homeTools.map(
                    ({ option, icon, onClick, isActive, disabled }) => (
                      <div
                        key={option}
                        className={`${styles.activegroup_tools} ${
                          isActive ? styles.activegroup_tools_selected : ''
                        }`}
                        style={{
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          opacity: disabled ? 0.3 : 1,
                        }}
                        onClick={onClick}
                        title={disabled ? 'Coming Soon' : option}
                      >
                        <img src={icon.src} alt={`${option} Icon`} />
                        <span>{option}</span>
                      </div>
                    ),
                  )}
                </div>
              )}

              {activeOption === 'View' && (
                <div className={styles.activegroup_tools_group}>
                  {viewTools.map(
                    ({ option, icon, onClick, disabled, isActive }) => (
                      <div
                        key={option}
                        className={`${styles.activegroup_tools} ${
                          isActive ? styles.activegroup_tools_selected : ''
                        }`}
                        style={{
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          opacity: disabled ? 0.3 : 1,
                        }}
                        onClick={onClick}
                        title={disabled ? 'Coming Soon' : option}
                      >
                        <img src={icon.src} alt={`${option} Icon`} />
                        <span>{option}</span>
                      </div>
                    ),
                  )}
                </div>
              )}

              {activeOption === 'Cabinet' && (
                <div className={styles.activegroup_tools_group}>
                  {alwaysFields.map(({ option, onClick, icon }) => (
                    <div
                      key={option}
                      className={styles.activegroup_tools}
                      onClick={onClick}
                      title={option}
                    >
                      <img
                        src={icon.src} // fallback if type not found
                        alt={`${option} icon`}
                      />
                      <span>{option}</span>
                    </div>
                  ))}
                  {cabinetItems.map((item) => (
                    <div
                      key={item.id}
                      className={styles.activegroup_tools}
                      onClick={() => handleCabinetItemSelect(item)}
                      title={item.description}
                    >
                      <img
                        src={
                          iconMap[item.name] || iconMap[item.type] || drawer.src
                        } // fallback if type not found
                        alt={`${item.type} icon`}
                      />
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div
          className={isToolOpen ? styles.toggle : styles.toggle_open}
          onClick={handleToolToggleClick}
        >
          <img
            src={isToolOpen ? tool_toggle.src : tool_toggle_open.src}
            alt="toggle"
          />
        </div>
      </aside>

      {/* Catalog Menu */}
      {catalogMenu && (
        <div
          className={`${styles.catalogcontainer} ${!isToolOpen ? styles.catalogClosed : ''}`}
        >
          <div className={styles.firstpart}>
            <h3>Catalog</h3>
            <div className={styles.menuFunctionality}>
              <img
                src={close.src}
                onClick={() => setcatalogMenu(false)}
                alt="close"
              />
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
                <div
                  key={id}
                  className={styles.catalogbox}
                  onClick={() => handleAddObject(name)}
                >
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
        <div className={styles.createpopupOverlay}>
          <div className={styles.createpopup}>
            <img
              src={createicon.src || '/placeholder.svg'}
              className={styles.createicon}
              alt="createicon"
            />
            <img
              src={close.src || '/placeholder.svg'}
              className={styles.createclose}
              alt="close"
              onClick={onClose}
            />
            <div className={styles.create_right_side}>
              <h2>Add {selectedCabinetItem.name}</h2>
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
                    mediumField={true}
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
              <button className={styles.cancelcreateButton} onClick={onClose}>
                Cancel
              </button>
              <button
                className={styles.createcontinueButton}
                onClick={onAddItems}
              >
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
