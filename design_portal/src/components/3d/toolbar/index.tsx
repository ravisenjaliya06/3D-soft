// @ts-nocheck
import part_line from '@/assets/3dmodel/part-line.svg';
import img1 from '@/assets/catalog/toolbaricon/img1.svg';
import img2 from '@/assets/catalog/toolbaricon/img2.svg';
import img3 from '@/assets/catalog/toolbaricon/img3.svg';
import img4 from '@/assets/catalog/toolbaricon/img4.svg';
import img5 from '@/assets/catalog/toolbaricon/img5.svg';
import img6 from '@/assets/catalog/toolbaricon/img6.svg';
import img7 from '@/assets/catalog/toolbaricon/img7.svg';
import logo from '@/assets/titleLogo.svg';
import { useEffect, useRef, useState } from 'react';
import styles from './toolbar.module.css';

import search from '@/assets/design/search.svg';

// home toolbar
import catalog from '@/assets/toolbar/catalog.svg';
import part from '@/assets/toolbar/parts.svg';
import texture from '@/assets/toolbar/texture.svg';
import tool_part_line from '@/assets/toolbar/tool-part-line.svg';

import tool_toggle_open from '@/assets/3dmodel/header/tool-toggle-open.svg';
import tool_toggle from '@/assets/3dmodel/header/tool-toggle.svg';

// catalog modal photo
import { TEXTURE_MEDIA } from '../utils/constants';

// parts
import close from '@/assets/catalog/close.svg';
import part_1 from '@/assets/catalog/parts/part_1.svg';
// import part_2 from '@/assets/catalog/parts/part_2.svg';
import part_3 from '@/assets/catalog/parts/part_3.svg';
import part_4 from '@/assets/catalog/parts/part_4.svg';
import part_5 from '@/assets/catalog/parts/part_5.svg';
// import part_6 from '@/assets/catalog/parts/part_6.svg';

import commonService from '@/services/CommonService';
import { REDIRECT } from '@/services/CommonStatus';
import { useRouter } from 'next/router';
import * as THREE from 'three';
import objectHandler from '../design/handler';
import { DesignProps } from '../interface';
import {
  actionChoices,
  itemChoices,
  partChoices,
  textureChoices,
  typeChoices,
} from '../utils/choices';

const Toolbar: React.FC<{ DesignProps: DesignProps }> = ({ DesignProps }) => {
  const { selectedObject } = DesignProps;
  const latestProps = useRef(DesignProps);
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
  const [catalogItems, setCatalogItems] = useState([]);

  const router = useRouter();

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

  useEffect(() => {
    latestProps.current = {
      ...DesignProps,
      scene: DesignProps.scene,
      cupBoardData: DesignProps.cupBoardData,
      selectedObject: DesignProps.selectedObject,
    };
  }, [
    DesignProps,
    DesignProps.scene,
    DesignProps.cupBoardData,
    DesignProps.selectedObject,
  ]);

  const handleCatalogClick = async (name: string) => {
    let cupboardData;
    try {
      const response: { status: number; data } = await commonService.get(
        'design',
        'catalog',
      );
      if (response.status === 200) {
        cupboardData = response.data.find(
          (item: { name: string }) => item.name === name,
        );
      } else {
        console.error('Failed to fetch catalog');
      }
    } catch (error) {
      console.error('Error fetching catalog:', error);
    }

    setcatalogMenu(false);
    if (DesignProps.scene && DesignProps.setScene) {
      if (cupboardData.data.MAIN_CUPBOARD) {
        const data = {
          action: actionChoices.ADD_OBJECT,
          type: typeChoices.ITEM,
          item: itemChoices.CUPBOARD,
          id: '',
          data: [],
        };
        const updatedScene: THREE.Scene = await objectHandler(
          data,
          DesignProps,
          DesignProps.scene,
          cupboardData.data.MAIN_CUPBOARD,
        );
        DesignProps.setScene(updatedScene);
      }

      if (cupboardData.data.CUPBOARD_PART) {
        const parts = cupboardData.data.CUPBOARD_PART;

        // Handle PLANKs
        if (parts.PLANK && Array.isArray(parts.PLANK)) {
          for (const plank of parts.PLANK) {
            const data = {
              action: actionChoices.ADD_OBJECT,
              type: typeChoices.INIT_PART,
              item: partChoices.PLANK,
              id: '',
              data: [],
            };
            const updatedScene: THREE.Scene = await objectHandler(
              data,
              latestProps.current,
              latestProps.current.scene,
              plank,
              DesignProps.selectedObject,
            );
            DesignProps?.setScene?.(updatedScene);
          }
        }

        // Handle DOORs
        if (parts.DOOR && Array.isArray(parts.DOOR)) {
          for (const door of parts.DOOR) {
            const data = {
              action: actionChoices.ADD_OBJECT,
              type: typeChoices.INIT_PART,
              item: partChoices.DOOR,
              id: '',
              data: [],
            };
            const updatedScene: THREE.Scene = await objectHandler(
              data,
              latestProps.current,
              latestProps.current.scene,
              door,
              DesignProps.selectedObject,
            );
            DesignProps?.setScene?.(updatedScene);
          }
        }

        // Handle DRAWERs
        if (parts.DRAWER && Array.isArray(parts.DRAWER)) {
          for (const drawer of parts.DRAWER) {
            const data = {
              action: actionChoices.ADD_OBJECT,
              type: typeChoices.INIT_PART,
              item: partChoices.DRAWER,
              id: '',
              data: [],
            };
            const updatedScene: THREE.Scene = await objectHandler(
              data,
              latestProps.current,
              latestProps.current.scene,
              drawer,
              DesignProps.selectedObject,
            );
            DesignProps?.setScene?.(updatedScene);
          }
        }
      }
    }
  };

  const handlePartClick = async (name: string) => {
    if (DesignProps.scene && DesignProps.setScene) {
      if (name === partChoices.VERTICAL_PLANK) {
        const data = {
          action: actionChoices.ADD_OBJECT,
          type: typeChoices.PART,
          item: partChoices.VERTICAL_PLANK,
        };
        const updatedScene = await objectHandler(
          // @ts-expect-error no erros, only need to create object
          data,
          DesignProps,
          DesignProps.scene,
          null,
          DesignProps.selectedObject,
        );
        DesignProps.setScene(updatedScene);
      }
      if (name === partChoices.HORIZONTAL_PLANK) {
        const data = {
          action: actionChoices.ADD_OBJECT,
          type: typeChoices.PART,
          item: partChoices.HORIZONTAL_PLANK,
        };
        const updatedScene = await objectHandler(
          // @ts-expect-error no erros, only need to create object
          data,
          DesignProps,
          DesignProps.scene,
          null,
          DesignProps.selectedObject,
        );
        DesignProps.setScene(updatedScene);
      }
      if (name === partChoices.DRAWER) {
        const data = {
          action: actionChoices.ADD_OBJECT,
          type: typeChoices.PART,
          item: partChoices.DRAWER,
        };
        const updatedScene = await objectHandler(
          // @ts-expect-error no erros, only need to create object
          data,
          DesignProps,
          DesignProps.scene,
          null,
          DesignProps.selectedObject,
        );
        DesignProps.setScene(updatedScene);
      }
      if (name === partChoices.DOOR) {
        const data = {
          action: actionChoices.ADD_OBJECT,
          type: typeChoices.PART,
          item: partChoices.DOOR,
        };
        const updatedScene = await objectHandler(
          // @ts-expect-error no erros, only need to create object
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

  const handleBlankCupboard = () => {
    setBlankCupboardPopup(true);
    setcatalogMenu(false);
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
    // Here you can handle the submission of dimensions
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

  const handleTextureClick = async (name: string) => {
    if (DesignProps.scene && DesignProps.setScene) {
      const data = {
        action: actionChoices.CHANGE_TEXTURE,
        type: typeChoices.TEXTURE,
        item: name,
      };
      const updatedScene = await objectHandler(
        // @ts-expect-error no erros, only need to create object
        data,
        DesignProps,
        DesignProps.scene,
        null,
        DesignProps.selectedObject,
      );
      DesignProps.setScene(updatedScene);
    }
  };
  const goToDashboard = () => {
    router.push({
      pathname: REDIRECT.DASHBOARD,
    });
  };

  const options = [
    { option: 'Home', name: 'Home', icon: img1 },
    { option: 'View', name: 'Coming Soon', icon: img2 },
    { option: '3rd', name: 'Coming Soon', icon: img3 },
    { option: '4th', name: 'Coming Soon', icon: img4 },
    { option: '5th', name: 'Coming Soon', icon: img5 },
    { option: '6th', name: 'Coming Soon', icon: img6 },
    { option: '7th', name: 'Coming Soon', icon: img7 },
  ];

  const catalogModal = [
    {
      option: 'cupboard1',
      name: 'Blank Cupboard',
      image: '/cupboard/blank_cupboard.png',
      onClick: () => handleBlankCupboard(),
    },
    {
      option: 'cupboard1',
      name: 'Cupboard 1',
      image: '/cupboard/cupboard1.png',
      onClick: () => handleCatalogClick('cupboard1'),
    },
    {
      option: 'cupboard2',
      name: 'Cupboard 2',
      image: '/cupboard/cupboard2.png',
      onClick: () => handleCatalogClick('cupboard2'),
    },
    {
      option: 'cupboard2',
      name: 'Cupboard 3',
      image: '/cupboard/cupboard3.png',
      onClick: () => handleCatalogClick('cupboard3'),
    },
  ];

  const partsModal = [
    {
      option: 'part_1',
      name: 'Vertical Plate',
      icon: part_1,
      onClick: () => handlePartClick(partChoices.VERTICAL_PLANK),
    },
    {
      option: 'part_3',
      name: 'Single Drawer',
      icon: part_3,
      onClick: () => handlePartClick(partChoices.DRAWER),
    },
    {
      option: 'part_4',
      name: 'Horizontal Plank',
      icon: part_4,
      onClick: () => handlePartClick(partChoices.HORIZONTAL_PLANK),
    },
    {
      option: 'part_5',
      name: 'Penal door',
      icon: part_5,
      onClick: () => handlePartClick(partChoices.DOOR),
    },
  ];

  const materialModal = [
    {
      option: 'materal_0',
      name: 'Dark Brown',
      image: TEXTURE_MEDIA.wood,
      onClick: () => handleTextureClick(textureChoices.WOOD),
    },
    {
      option: 'materal_1',
      name: 'Dark Brown',
      image: TEXTURE_MEDIA.wood_1,
      onClick: () => handleTextureClick(textureChoices.WOOD1),
    },
    {
      option: 'materal_2',
      name: 'Light Wood',
      image: TEXTURE_MEDIA.wood_2,
      onClick: () => handleTextureClick(textureChoices.WOOD2),
    },
    {
      option: 'materal_3',
      name: 'Off White',
      image: TEXTURE_MEDIA.wood_3,
      onClick: () => handleTextureClick(textureChoices.WOOD3),
    },
    {
      option: 'materal_4',
      name: 'Glossy Brown',
      image: TEXTURE_MEDIA.wood_4,
      onClick: () => handleTextureClick(textureChoices.WOOD4),
    },
    {
      option: 'materal_5',
      name: 'Light Brown',
      image: TEXTURE_MEDIA.wood_5,
      onClick: () => handleTextureClick(textureChoices.WOOD5),
    },
    {
      option: 'materal_6',
      name: 'Wood',
      image: TEXTURE_MEDIA.wood_6,
      onClick: () => handleTextureClick(textureChoices.WOOD6),
    },
    {
      option: 'materal_7',
      name: 'Wood',
      image: TEXTURE_MEDIA.wood_7,
      onClick: () => handleTextureClick(textureChoices.WOOD7),
    },
  ];

  const homeTools = [
    {
      option: 'Furniture',
      icon: catalog,
      onClick: () => {
        if (localStorage.getItem('cupboard') === 'true') {
          setcatalogMenu(false);
        } else {
          setcatalogMenu((catalogMenu) => !catalogMenu);
        }
        setparts(false);
        setmaterial(false);
      },
      disabled: selectedObject !== null,
    },
    {
      option: 'Parts',
      icon: part,
      onClick: () => {
        if (localStorage.getItem('cupboard') === 'true') {
          setparts((parts) => !parts);
        } else {
          setparts(false);
        }
        setmaterial(false);
        setcatalogMenu(false);
      },
      disabled: selectedObject === null,
    },
    {
      option: 'Texture',
      icon: texture,
      onClick: () => {
        if (localStorage.getItem('cupboard') === 'true') {
          setmaterial((material) => !material);
        } else {
          setmaterial(false);
        }
        setparts(false);
        setcatalogMenu(false);
      },
      disabled: selectedObject === null,
    },
  ];

  useEffect(() => {
    const fetchCatalogItems = async () => {
      const response = await commonService.get('design', 'catalog/default');
      if (response.status === 200 && Array.isArray(response.data)) {
        const items = response.data.flatMap((catalog) => catalog.catalog || []);
        setCatalogItems(items);
      } else {
        console.error('Failed to fetch user details:', response.status);
      }
    };

    fetchCatalogItems();
  }, []);

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
                  {homeTools.map(({ option, icon, onClick, disabled }) => (
                    <div
                      key={option}
                      className={styles.activegroup_tools}
                      style={{
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.3 : 1,
                      }}
                      onClick={onClick}
                      title={disabled ? 'Coming Soon' : ''}
                    >
                      <img src={icon.src} alt={`${option} Icon`} />
                      <span>{option}</span>
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

      {/* Catalog Menu (Moved Outside Toolbar) */}
      {catalogMenu && (
        <div
          className={`${styles.catalogcontainer} ${!isToolOpen ? styles.catalogClosed : ''}`}
        >
          <div className={styles.firstpart}>
            <h3>Furniture</h3>
            <div className={styles.menuFunctionality}>
              <div className={styles.searchWrapper}>
                <img
                  src={search.src}
                  alt="Search Icon"
                  className={styles.searchIcon}
                />
                <input
                  type="text"
                  placeholder="Search Furniture"
                  className={styles.searchInput}
                  disabled
                />
              </div>
              <img
                src={close.src}
                onClick={() => setcatalogMenu(false)}
                alt="close"
              />
            </div>
          </div>

          <div className={styles.secondpart}>
            {catalogItems.map(({ id, image, name, onClick }) => (
              <div key={id} className={styles.catalogbox} onClick={onClick}>
                <img
                  src={`${process.env.NEXT_PUBLIC_PUBLIC_API}` + `/${image}`}
                  alt={name}
                />
                <p>{name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* parts */}

      {parts && (
        <div
          className={`${styles.partcatalogcontainer} ${!isToolOpen ? styles.catalogClosed : ''}`}
        >
          <div className={styles.partfirstpart}>
            <h3>Parts</h3>
            <img src={close.src} onClick={() => setparts(false)} alt="close" />
          </div>

          <div className={styles.partsecondpart}>
            {partsModal.map(({ icon, name, onClick }) => (
              <div key={name} className={styles.partsbox} onClick={onClick}>
                <img src={icon.src} alt="photo" />
                <p>{name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* material */}

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
            {materialModal.map(({ image, name, onClick }) => (
              <div key={name} className={styles.materialbox} onClick={onClick}>
                <img src={image} alt="photo" />
              </div>
            ))}
          </div>
        </div>
      )}

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
