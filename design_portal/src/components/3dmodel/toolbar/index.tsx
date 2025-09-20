// @ts-nocheck
import part_line from '@/assets/3dmodel/part-line.svg';
import img1 from '@/assets/catalog/toolbaricon/img1.svg';
import img2 from '@/assets/catalog/toolbaricon/img2.svg';
import logo from '@/assets/titleLogo.svg';
import { useEffect, useRef, useState } from 'react';
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
import texture from '@/assets/toolbar/texture.svg';
import tool_part_line from '@/assets/toolbar/tool-part-line.svg';
import InputField from '@/components/inputfields/InputField';

// catalog modal photo
import {
  TEXTURE_MEDIA,
  objectName,
  textureChoices,
} from '@/components/3dmodel/handler/constant';

// parts
import close from '@/assets/catalog/close.svg';
import part_1 from '@/assets/catalog/parts/part_1.svg';
import part_4 from '@/assets/catalog/parts/part_4.svg';
import commonService from '@/services/CommonService';
import { REDIRECT } from '@/services/CommonStatus';
import { DesignProps } from '../interface';

import door from '@/assets/toolbar/door-icon.svg';
import drawer from '@/assets/toolbar/drawer.svg';
import horizontal_plank from '@/assets/toolbar/horizontal-plank.svg';
import platform from '@/assets/toolbar/kitchen-platform-icon.svg';
import texture_3 from '@/assets/toolbar/texture/dark_brown.jpg';
import texture_4 from '@/assets/toolbar/texture/grossy_brown.jpg';
import texture_1 from '@/assets/toolbar/texture/light_brown.jpg';
import texture_2 from '@/assets/toolbar/texture/light_wood.jpg';
import texture_5 from '@/assets/toolbar/texture/off_white.jpg';
import texture_6 from '@/assets/toolbar/texture/wood.jpg';
import vertical_plank from '@/assets/toolbar/vertical-plank.svg';
import { useRouter } from 'next/router';
import React from 'react';
import {
  addDoorOnInvisibleBox,
  addDrawersOnInvisibleBox,
  addHorizontalPlanksInsideBox,
  addLShapeKitchenPlatform,
  addPlatformOnWall,
  addUpperCabinetsAbovePlatform,
  addDoubleDoorUpperCabinetsAbovePlatform,
  addVerticalPlanksInsideBox,
} from '../design/scene';
import {
  updateCatalogItemObject,
  updateObjectInDatabase,
} from '../handler/updateHandler';
import { useAppDispatch } from '../hooks';
import { ToolbarProps } from '../interface';
import { store } from '../store';
import { addObjectsThunk, togglAlignment } from '../store/dataSlice';

const Toolbar: React.FC<ToolbarProps> = ({ threeDView }) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

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
  const [parts, setparts] = useState(false);
  const [material, setmaterial] = useState(false);
  const [blankCupboardPopup, setBlankCupboardPopup] = useState(false);
  const [cupboardDimensions, setCupboardDimensions] = useState({
    width: 120,
    height: 120,
  });
  const [furnitureItems, setFurnitureItems] = useState([]);
  const [partItems, setPartItems] = useState([]);
  const [customItems, setCustomItems] = useState([]);
  const [activeCatalogTab, setActiveCatalogTab] = useState('furniture');
  const [isExlightActive, setIsExlightActive] = useState(false);
  const [designTexture, setdesignTexture] = useState(false);
  const [cabinetItems, setCabinetItems] = useState([]);
  const [createCompanyPopup, setCreateCompanyPopup] = useState(false);
  const [selectedCabinetItem, setSelectedCabinetItem] = useState(null);
  const [quantityValue, setQuantityValue] = useState(1);

  const designTextureModal = [
    {
      name: 'Texture 1',
      image: texture_1,
      onClick: () => applyTexture('texture_1'),
    },
    {
      name: 'Texture 2',
      image: texture_2,
      onClick: () => applyTexture('texture_2'),
    },
    {
      name: 'Texture 3',
      image: texture_3,
      onClick: () => applyTexture('texture_3'),
    },
    {
      name: 'Texture 4',
      image: texture_4,
      onClick: () => applyTexture('texture_4'),
    },
    {
      name: 'Texture 5',
      image: texture_5,
      onClick: () => applyTexture('texture_5'),
    },
    {
      name: 'Texture 6',
      image: texture_6,
      onClick: () => applyTexture('texture_6'),
    },
  ];

  const handleOptionClick = (option: string, name: string) => {
    setIsToolOpen(true);
    setActiveOptionName(name);
    setActiveOption(option);
  };

  const handleToolToggleClick = () => {
    setIsToolOpen((prevState) => !prevState);
    setparts(false);
    setcatalogMenu(false);
    setmaterial(false);
  };

  const handlePartClick = async (name: string) => {
    if (DesignProps.scene && DesignProps.setScene) {
      let data;
      if (name === partChoices.VERTICAL_PLANK) {
        data = {
          action: actionChoices.ADD_OBJECT,
          type: typeChoices.PART,
          item: partChoices.VERTICAL_PLANK,
        };
      } else if (name === partChoices.HORIZONTAL_PLANK) {
        data = {
          action: actionChoices.ADD_OBJECT,
          type: typeChoices.PART,
          item: partChoices.HORIZONTAL_PLANK,
        };
      }
      if (data) {
        const updatedScene = await objectHandler(
          data,
          DesignProps,
          DesignProps.scene,
          null,
          DesignProps.selectedObject,
        );
        DesignProps.setScene(updatedScene);
      }
    }
  };

  const handleClosePopup = () => {
    setBlankCupboardPopup(false);
    setCupboardDimensions({ width: 120, height: 120 });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCupboardDimensions((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    const data = {
      action: actionChoices.ADD_OBJECT,
      type: typeChoices.ITEM,
      item: itemChoices.CUPBOARD,
      blankCupboardData: {
        width: Number(cupboardDimensions.width),
        height: Number(cupboardDimensions.height),
      },
    };

    if (DesignProps.scene && DesignProps.setScene) {
      const updatedScene = await objectHandler(
        data,
        DesignProps,
        DesignProps.scene,
        data,
        DesignProps.selectedObject,
      );
      DesignProps.setScene(updatedScene);
    }

    handleClosePopup();
  };

  const goToDashboard = () => {
    if (router) {
      router.push({
        pathname: REDIRECT.DASHBOARD,
      });
    }
  };

  const handleToAddPlatform = () => {
    const textureLoader = new THREE.TextureLoader();
    const counterTexture = textureLoader.load('/img14_64.jpg');
    counterTexture.wrapS = counterTexture.wrapT = THREE.RepeatWrapping;
    counterTexture.repeat.set(10, 1);

    // Prefer selected wall via outline center match; fallback to hovered wall; else fallback to L-shape
    const scene = threeDView.scene as THREE.Scene;
    const outline = scene.children.find((o) =>
      o.name.startsWith('outline-'),
    ) as THREE.Object3D | undefined;
    console.log('outline', outline);
    let wallFromSelection: THREE.Mesh | null = null;
    if (outline) {
      const outlineCenter = outline.position.clone();
      const walls: THREE.Mesh[] = [];
      scene.traverse((o) => {
        if (
          o instanceof THREE.Mesh &&
          (o.name === 'Center Wall' ||
            o.name === 'Left Wall' ||
            o.name === 'Right Wall')
        ) {
          walls.push(o);
        }
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
      (hovered.name === 'Center Wall' ||
        hovered.name === 'Left Wall' ||
        hovered.name === 'Right Wall')
        ? hovered
        : null);
    if (targetWall) addPlatformOnWall(scene, targetWall, counterTexture);
    else addLShapeKitchenPlatform(scene, counterTexture);
  };

  const options = [
    { option: 'Home', name: 'Home', icon: img1 },
    { option: 'View', name: 'View', icon: img2 },
  ];

  const partsModal = [
    {
      option: 'part_1',
      name: 'Vertical Plate',
      icon: part_1,
      onClick: () => handlePartClick(partChoices.VERTICAL_PLANK),
    },
    {
      option: 'part_4',
      name: 'Horizontal Plank',
      icon: part_4,
      onClick: () => handlePartClick(partChoices.HORIZONTAL_PLANK),
    },
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

  const materialModal = [
    {
      option: 'materal_0',
      name: 'Dark Brown',
      image: TEXTURE_MEDIA.WOOD,
      onClick: () => handleTextureClick(textureChoices.WOOD),
    },
    {
      option: 'materal_1',
      name: 'Dark Brown',
      image: TEXTURE_MEDIA.WOOD_1,
      onClick: () => handleTextureClick(textureChoices.WOOD1),
    },
    {
      option: 'materal_2',
      name: 'Light Wood',
      image: TEXTURE_MEDIA.WOOD_2,
      onClick: () => handleTextureClick(textureChoices.WOOD2),
    },
    {
      option: 'materal_3',
      name: 'Off White',
      image: TEXTURE_MEDIA.WOOD_3,
      onClick: () => handleTextureClick(textureChoices.WOOD3),
    },
    {
      option: 'materal_4',
      name: 'Glossy Brown',
      image: TEXTURE_MEDIA.WOOD_4,
      onClick: () => handleTextureClick(textureChoices.WOOD4),
    },
    {
      option: 'materal_5',
      name: 'Light Brown',
      image: TEXTURE_MEDIA.WOOD_5,
      onClick: () => handleTextureClick(textureChoices.WOOD5),
    },
    {
      option: 'materal_6',
      name: 'Wood',
      image: TEXTURE_MEDIA.WOOD_6,
      onClick: () => handleTextureClick(textureChoices.WOOD6),
    },
    {
      option: 'materal_7',
      name: 'Wood',
      image: TEXTURE_MEDIA.WOOD_7,
      onClick: () => handleTextureClick(textureChoices.WOOD7),
    },
  ];

  const fetchCabinetItem = async () => {
    const cabinetResponse = await commonService.getWithQueryParam(
      'material',
      'catalog',
    );
    if (cabinetResponse.status === 200 && Array.isArray(cabinetResponse.data)) {
      console.log(cabinetResponse.data, 'cabinetResponse.data');
      setCabinetItems(cabinetResponse.data);
    }
  };
  const handleCabinetClick = () => {
    setActiveOption('Cabinet');
    setActiveOptionName('Cabinet');
    fetchCabinetItem();
  };

  const handleCabinetItemSelect = (item) => {
    console.log(item, 'item');
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
    if (outline) {
      const outlineCenter = outline.position.clone();
      scene.traverse((o) => {
        if (
          o instanceof THREE.Mesh &&
          o.name.toLowerCase().includes('invisiblebox_compartment')
        ) {
          const b = new THREE.Box3().setFromObject(o);
          const c = new THREE.Vector3();
          b.getCenter(c);
          if (c.distanceTo(outlineCenter) < 1e-3) targetBox = o;
        }
      });
    }
    if (!targetBox) {
      const hovered = store.getState().data.hoverdMesh as THREE.Mesh | null;
      if (
        hovered &&
        hovered.name.toLowerCase().includes('invisiblebox_compartment')
      )
        targetBox = hovered;
    }
    if (!targetBox) {
      alert('Select a compartment invisible box first.');
      return;
    }

    const itemType = selectedCabinetItem.type;
    if (['Door', 'Sliding Door'].includes(itemType)) {
      await addDoorOnInvisibleBox(scene, targetBox, num, selectedCabinetItem);
    } else if (itemType === 'Drawer') {
      await addDrawersOnInvisibleBox(
        scene,
        targetBox,
        num,
        selectedCabinetItem,
      );
    }

    setCreateCompanyPopup(false);
    setSelectedCabinetItem(null);
    setQuantityValue(1);
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
      // onClick: () => {
      //   if (localStorage.getItem('cupboard') === 'true') {
      //     setcatalogMenu(false);
      //   } else {
      //     setcatalogMenu((catalogMenu) => !catalogMenu);
      //   }
      //   setparts(false);
      //   setmaterial(false);
      //   setdesignTexture(false);
      // },
      onClick: () => handleCabinetClick(),
      isActive: catalogMenu,
    },
    {
      option: 'Quick Hide',
      icon: hide,
      onClick: () => {
        dispatch(toggleQuickHide(!isQuickHideActive));
        setmaterial(false);
        setparts(false);
        setcatalogMenu(false);
        setdesignTexture(false);
      },
      isActive: isQuickHideActive,
    },
    {
      option: 'Measure',
      icon: measure,
      onClick: () => {
        dispatch(toggleMeasurement(!isMeasurementActive));
        setmaterial(false);
        setparts(false);
        setcatalogMenu(false);
        setdesignTexture(false);
      },
      isActive: isMeasurementActive,
    },
    {
      option: 'Align Dimension',
      icon: align_dimension,
      onClick: () => {
        dispatch(togglAlignment(!isAlignmentActive));
        setmaterial(false);
        setparts(false);
        setcatalogMenu(false);
        setdesignTexture(false);
      },
      isActive: isAlignmentActive,
    },
    {
      option: 'Texture',
      icon: texture,
      onClick: () => {
        setdesignTexture((prev) => !prev); // Toggle texture panel
        setmaterial(false);
        setcatalogMenu(false);
        setparts(false);
      },
      isActive: designTexture,
    },
    // {
    //   option: 'Add Base Cabinets',
    //   icon: texture,
    //   onClick: () => {
    //     if (threeDView && typeof threeDView.addBaseCabinetsUnderPlatform === 'function') {
    //       threeDView.addBaseCabinetsUnderPlatform();
    //     }
    //   },
    //   isActive: false,
    // },
    {
      option: 'Add Platform',
      icon: platform,
      onClick: () => {
        handleToAddPlatform();
      },
      isActive: designTexture,
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
      isActive: isExlightActive,
    },
    // {
    //   option: 'Full Kitchen',
    //   icon: texture,
    //   onClick: () => {
    //     if (threeDView && typeof threeDView.addFullKitchenSetup === 'function') {
    //       threeDView.addFullKitchenSetup();
    //     }
    //   },
    //   isActive: false,
    // },
    // {
    //   option: 'Load Handle GLB',
    //   icon: texture,
    //   onClick: () => {
    //     if (threeDView && typeof threeDView.loadHandleModel === 'function') {
    //       threeDView.loadHandleModel('/door_handle.glb');
    //     }
    //   },
    //   isActive: false,
    // },
  ];

  const alwaysFields = [
    {
      option: 'Vertical Planks',
      icon: vertical_plank,
      onClick: async () => {
        const scene = threeDView.scene as THREE.Scene;
        // Determine selected object via outline center; fallback to hovered
        const outline = scene.children.find((o) =>
          o.name.startsWith('outline-'),
        ) as THREE.Object3D | undefined;
        let targetBox: THREE.Mesh | null = null;
        if (outline) {
          const outlineCenter = outline.position.clone();
          scene.traverse((o) => {
            if (
              o instanceof THREE.Mesh &&
              o.name.toLowerCase().includes('invisiblebox')
            ) {
              const b = new THREE.Box3().setFromObject(o);
              const c = new THREE.Vector3();
              b.getCenter(c);
              if (c.distanceTo(outlineCenter) < 1e-3) targetBox = o;
            }
          });
        }
        if (!targetBox) {
          const hovered = store.getState().data.hoverdMesh as THREE.Mesh | null;
          if (hovered && hovered.name.toLowerCase().includes('invisiblebox'))
            targetBox = hovered;
        }
        if (!targetBox) {
          alert('Select an invisible box under the platform first.');
          return;
        }
        const input = prompt(
          'How many vertical planks to add inside this box?',
        );
        const num = parseInt((input || '').trim(), 10);
        if (!Number.isFinite(num) || num <= 0) return;
        addVerticalPlanksInsideBox(scene, targetBox, num);
      },
      isActive: false,
    },
    {
      option: 'Horizontal Planks',
      icon: horizontal_plank,
      onClick: async () => {
        const scene = threeDView.scene as THREE.Scene;
        const outline = scene.children.find((o) =>
          o.name.startsWith('outline-'),
        ) as THREE.Object3D | undefined;
        let targetBox: THREE.Mesh | null = null;
        if (outline) {
          const outlineCenter = outline.position.clone();
          scene.traverse((o) => {
            if (
              o instanceof THREE.Mesh &&
              o.name.toLowerCase().includes('invisiblebox_compartment')
            ) {
              const b = new THREE.Box3().setFromObject(o);
              const c = new THREE.Vector3();
              b.getCenter(c);
              if (c.distanceTo(outlineCenter) < 1e-3) targetBox = o;
            }
          });
        }
        if (!targetBox) {
          alert('Select a compartment invisible box first.');
          return;
        }
        const input = prompt('How many horizontal planks (shelves)?');
        const num = parseInt((input || '').trim(), 10);
        if (!Number.isFinite(num) || num <= 0) return;
        addHorizontalPlanksInsideBox(scene, targetBox, num);
      },
      isActive: false,
    },
    // {
    //   option: 'Cabinet',
    //   icon: texture,
    //   // onClick: () => handleCabinetClick(),
    // },
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
  const minifixDataRef = useRef<{
    [objectId: string]: MinifixConnection[];
  }>({});

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
      const getMinifixData = async () => {};
    };

    fetchCatalogItems();
  }, []);

  const iconMap = {
    Drawer: drawer.src,
    'Sliding Door': door.src,
    Door: door.src,
    'Horizontal Plank': horizontal_plank.src,
    'Vertical Plank': vertical_plank.src,
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
              onClick={() => goToDashboard()}
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
                        src={iconMap[item.type] || drawer.src} // fallback if type not found
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

      {/* Parts */}
      {parts && (
        <div
          className={`${styles.partcatalogcontainer} ${!isToolOpen ? styles.catalogClosed : ''}`}
        >
          <div className={styles.partfirstpart}>
            <h3>Parts</h3>
            <img src={close.src} onClick={() => setparts(false)} alt="close" />
          </div>

          <div className={styles.partsecondpart}>
            <div className={styles.scrollContainer}>
              {partsModal.map(({ icon, name, onClick }) => (
                <div key={name} className={styles.partsbox} onClick={onClick}>
                  <img src={icon.src} alt="photo" />
                  <p>{name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Material */}
      {material && (
        <div
          className={`${styles.materialcatalogcontainer} ${!isToolOpen ? styles.catalogClosed : ''}`}
        >
          <div className={styles.materialfirstpart}>
            <h3>Texture</h3>
            <img
              src={close.src}
              onClick={() => setmaterial(false)}
              alt="close"
            />
          </div>

          <div className={styles.materialescondpart}>
            <div className={styles.scrollContainer}>
              {materialModal.map(({ image, name, onClick }) => (
                <div
                  key={name}
                  className={styles.materialbox}
                  onClick={onClick}
                >
                  <img src={image} alt="photo" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {designTexture && (
        <div
          className={`${styles.catalogcontainer} ${!isToolOpen ? styles.catalogClosed : ''}`}
        >
          <div className={styles.firstpart}>
            <h3>Texture</h3>
            <div className={styles.menuFunctionality}>
              <img
                src={close.src}
                onClick={() => setdesignTexture(false)}
                alt="close"
              />
            </div>
          </div>

          <div className={styles.secondpart}>
            <div className={styles.scrollContainer}>
              {materialModal.map(({ image, name, onClick }) => (
                <div key={name} className={styles.catalogbox} onClick={onClick}>
                  <img src={image} alt={name} />
                  <p>{name}</p>
                </div>
              ))}
              {materialModal.length === 0 && (
                <div className={styles.noItems}>No textures found</div>
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
      {/* Blank Cupboard Popup */}
      {blankCupboardPopup && (
        <div className={styles.popupOverlay}>
          <div className={styles.popupContent}>
            <div className={styles.popupHeader}>
              <h3>Create Blank Cupboard</h3>
              <img
                src={close.src}
                onClick={handleClosePopup}
                alt="close"
                className={styles.closeButton}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="width">Width (cm)</label>
              <input
                type="number"
                id="width"
                name="width"
                value={cupboardDimensions.width}
                onChange={handleInputChange}
                placeholder="Enter width"
                min={80}
                max={120}
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="height">Height (cm)</label>
              <input
                type="number"
                id="height"
                name="height"
                value={cupboardDimensions.height}
                onChange={handleInputChange}
                placeholder="Enter height"
                min={80}
                max={120}
              />
            </div>

            <div className={styles.buttonGroup}>
              <button
                className={`${styles.button} ${styles.cancelButton}`}
                onClick={handleClosePopup}
              >
                Cancel
              </button>
              <button
                className={`${styles.button} ${styles.submitButton}`}
                onClick={handleSubmit}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Toolbar;

export const formatName = (name) => {
  if (!name) return '';
  const words = name.replace(/_/g, ' ').split(' ');
  return words
    .map((word) => {
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};
