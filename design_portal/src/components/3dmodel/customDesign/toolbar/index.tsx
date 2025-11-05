// @ts-nocheck
import part_line from '@/assets/3dmodel/part-line.svg';
import img1 from '@/assets/catalog/toolbaricon/img1.svg';
import img2 from '@/assets/catalog/toolbaricon/img2.svg';
import cone from '@/assets/customdesign/shape/cone.svg';
import cube from '@/assets/customdesign/shape/cube.svg';
import cylinder from '@/assets/customdesign/shape/cylinder.svg';
import sphere from '@/assets/customdesign/shape/sphere.svg';
import torus from '@/assets/customdesign/shape/torus.svg';
import logo from '@/assets/titleLogo.svg';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import styles from './toolbar.module.css';
// home toolbar
import tool_toggle_open from '@/assets/3dmodel/header/tool-toggle-open.svg';
import tool_toggle from '@/assets/3dmodel/header/tool-toggle.svg';
import exlight from '@/assets/toolbar/exlight.svg';

// catalog modal photo
import { TEXTURE_MEDIA } from '@/components/3dmodel/handler/constant';

// parts
import close from '@/assets/catalog/close.svg';
import commonService from '@/services/CommonService';
import { REDIRECT } from '@/services/CommonStatus';
import * as THREE from 'three';
import { DesignProps } from '../interface';

import React from 'react';
import { MoveHandler } from '../handler/moveHandler';
import { addObjectToScene } from '../handler/objectCreator';
import { ToolbarProps } from '../interface';

const Toolbar: React.FC<ToolbarProps> = ({ threeDView }) => {
  const router = useRouter();

  const [activeOption, setActiveOption] = useState('Home');
  const [isToolOpen, setIsToolOpen] = useState(true);

  const [catalogMenu, setcatalogMenu] = useState(false);
  const [parts, setparts] = useState(false);
  const [material, setmaterial] = useState(false);
  const [blankCupboardPopup, setBlankCupboardPopup] = useState(false);
  const [cupboardDimensions, setCupboardDimensions] = useState({
    width: 120,
    height: 120,
  });
  const [catalogItems, setCatalogItems] = useState([]);
  // State for Exlight (placeholder, adjust if ThreeDView exposes state)
  const [isExlightActive, setIsExlightActive] = useState(false);

  const moveHandler = threeDView
    ? new MoveHandler({
        scene: threeDView.scene,
        camera: threeDView.camera,
        renderer: threeDView.renderer,
        movableObjects: [],
      })
    : null;

  const handleOptionClick = (option: string) => {
    setIsToolOpen(true);
    setActiveOption(option);
  };

  const handleToolToggleClick = () => {
    setIsToolOpen((prevState) => !prevState);
    setparts(false);
    setcatalogMenu(false);
    setmaterial(false);
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
        DesignProps.selectedObject
      );
      updatedScene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
        }
      });
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
        data,
        DesignProps,
        DesignProps.scene,
        null,
        DesignProps.selectedObject
      );
      DesignProps.setScene(updatedScene);
    }
  };

  const goToDashboard = () => {
    if (router) {
      router.push({
        pathname: REDIRECT.DASHBOARD,
      });
    }
  };

  const handleAddObject = (objectConfig: { type: string; dimensions: Record<string, number> }) => {
    if (threeDView) {
      addObjectToScene(
        threeDView.scene,
        threeDView.camera,
        {
          ...objectConfig,
          color: 0xd3d3d3,
        },
        moveHandler
      );
      threeDView.renderer.render(threeDView.scene, threeDView.camera);
    }
  };

  const options = [
    { option: 'Home', name: 'Home', icon: img1 },
    { option: 'View', name: 'View', icon: img2 },
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
      option: 'Cube',
      icon: cube,
      onClick: () =>
        handleAddObject({
          type: 'box',
          dimensions: {
            width: 2,
            height: 2,
            depth: 2,
            widthSegments: 2,
            heightSegments: 2,
            depthSegments: 2,
          },
        }),
    },
    {
      option: 'Sphere',
      icon: sphere,
      onClick: () =>
        handleAddObject({
          type: 'sphere',
          dimensions: {
            radius: 1,
            segments: 16,
          },
        }),
    },
    {
      option: 'Cylinder',
      icon: cylinder,
      onClick: () =>
        handleAddObject({
          type: 'cylinder',
          dimensions: {
            radiusTop: 1,
            radiusBottom: 1,
            height: 2,
            segments: 16,
            heightSegments: 4,
          },
        }),
    },
    {
      option: 'Cone',
      icon: cone,
      onClick: () =>
        handleAddObject({
          type: 'cone',
          dimensions: {
            radius: 1,
            height: 2,
            segments: 16,
            heightSegments: 3,
          },
        }),
    },
    {
      option: 'Torus',
      icon: torus,
      onClick: () =>
        handleAddObject({
          type: 'torus',
          dimensions: {
            radius: 1,
            tube: 0.2,
            segments: 16,
          },
        }),
    },
    {
      option: 'Box2',
      icon: cube, // Reuse the cube icon
      onClick: () =>
        handleAddObject({
          type: 'box2',
          dimensions: {
            width: 1,
            height: 1,
            depth: 1,
          },
        }),
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
            <img src={part_line.src} className={styles.partLine} alt="Toolbar Logo" />
          </div>
          <div className={styles.icon_style}>
            {options.map(({ option, icon }) => (
              <div
                key={option}
                onClick={() => handleOptionClick(option)}
                className={activeOption === option ? styles.icon_active : styles.icon}
              >
                <img src={icon.src} alt={`${option} Icon`} />
              </div>
            ))}
          </div>
        </div>

        {isToolOpen && (
          <div className={styles.activegroup_tools_container}>
            <div className={styles.activegroup}>
              {activeOption === 'Home' && (
                <div className={styles.activegroup_tools_group}>
                  {homeTools.map(({ option, icon, onClick, disabled, isActive }) => (
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
                  ))}
                </div>
              )}
              {activeOption === 'View' && (
                <div className={styles.activegroup_tools_group}>
                  {viewTools.map(({ option, icon, onClick, disabled, isActive }) => (
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
          <img src={isToolOpen ? tool_toggle.src : tool_toggle_open.src} alt="toggle" />
        </div>
      </aside>

      {/* Catalog Menu */}
      {catalogMenu && (
        <div className={`${styles.catalogcontainer} ${!isToolOpen ? styles.catalogClosed : ''}`}>
          <div className={styles.firstpart}>
            <h3>Furniture</h3>
            <div className={styles.menuFunctionality}>
              <img src={close.src} onClick={() => setcatalogMenu(false)} alt="close" />
            </div>
          </div>

          <div className={styles.secondpart}>
            {catalogItems.map(({ id, image, name }) => (
              <div key={id} className={styles.catalogbox} onClick={() => handleAddObject(name)}>
                <img src={`${process.env.NEXT_PUBLIC_PUBLIC_API}` + `/${image}`} alt={name} />
                <p>{name}</p>
              </div>
            ))}
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
            {partsModal.map(({ icon, name, onClick }) => (
              <div key={name} className={styles.partsbox} onClick={onClick}>
                <img src={icon.src} alt="photo" />
                <p>{name}</p>
              </div>
            ))}
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
            <img src={close.src} onClick={() => setmaterial(false)} alt="close" />
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
              <button className={`${styles.button} ${styles.submitButton}`} onClick={handleSubmit}>
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
