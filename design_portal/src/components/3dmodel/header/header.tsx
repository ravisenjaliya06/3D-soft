import Loading_style from '@/components/loading.module.css';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import commonService from '@/services/CommonService';
import { REDIRECT } from '@/services/CommonStatus';
import { assets } from '@/svgPaths';
import Fullscreen from '@mui/icons-material/Fullscreen';
import FullscreenExit from '@mui/icons-material/FullscreenExit';
import Cookies from 'js-cookie';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import * as THREE from 'three';
import { Design, HeaderProps } from '../interface';
import { ObjectsSaver } from '../sceneCreator/tools/objectSaver';
import { CabinetMotionController } from '../sceneCreator/tools/openCloseTool';
import { deleteObject } from '../sceneCreator/utils';
import { RootState } from '../store';
import {
  setActiveDesignCamDepth,
  setActiveDesignCamDiameter,
  setActiveDesignCamHeight,
  setActiveDesignMinifixDiameterHole,
  setActiveDesignMinifixDistance,
} from '../store/activeDesignSlice';
import { setGlobalDoorsOpen } from '../store/dataSlice';
import {
  selectHeaderCamDepth,
  selectHeaderCamDiameter,
  selectHeaderCamHeight,
  selectHeaderMinifixDiameterHole,
  selectHeaderMinifixDistance,
} from '../store/selectors';
import { CustomToast } from '../utils/CustomToast';
import styles from './header.module.css';

const Header: React.FC<HeaderProps> = ({ router, design3D }) => {
  const dispatch = useDispatch();
  const globalDoorsOpen = useSelector((state: RootState) => state.data.globalDoorsOpen);

  // Use selectors to get values with fallback to design settings
  const resolvedMinifixDistance = useSelector(selectHeaderMinifixDistance);
  const resolvedMinifixDiameterHole = useSelector(selectHeaderMinifixDiameterHole);
  const resolvedCamDepth = useSelector(selectHeaderCamDepth);
  const resolvedCamDiameter = useSelector(selectHeaderCamDiameter);
  const resolvedCamHeight = useSelector(selectHeaderCamHeight);

  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isRenderDropdownOpen, setIsRenderDropdownOpen] = useState(false);
  const [designName, setDesignName] = useState<Design[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const dropdownButtonRef = useRef<HTMLImageElement | null>(null);
  const renderDropdownRef = useRef<HTMLDivElement | null>(null);
  const renderDropdownButtonRef = useRef<HTMLDivElement | null>(null);
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [minifixDistance, setMinifixDistance] = useState(resolvedMinifixDistance);
  const [minifixDiameterHole, setMinifixDiameterHole] = useState(resolvedMinifixDiameterHole);
  const [camDepth, setCamDepth] = useState(resolvedCamDepth);
  const [camDiameter, setCamDiameter] = useState(resolvedCamDiameter);
  const [camHeight, setCamHeight] = useState(resolvedCamHeight);

  const handleClear = () => {
    /** Opens the confirmation popup to clear the current design. */

    if (!designId) {
      return;
    }
    setShowClearConfirm(true);
  };

  const confirmClear = async () => {
    /** Confirms and clears all design data from the backend and 3D scene. */

    setShowClearConfirm(false);
    setIsLoading(true);

    deleteObject(true);
    setIsLoading(false);
  };

  // Initialize values from Redux when popup opens
  useEffect(() => {
    if (showSettingsPopup) {
      setMinifixDistance(resolvedMinifixDistance);
      setMinifixDiameterHole(resolvedMinifixDiameterHole);
      setCamDepth(resolvedCamDepth);
      setCamDiameter(resolvedCamDiameter);
      setCamHeight(resolvedCamHeight);
    }
  }, [
    showSettingsPopup,
    resolvedMinifixDistance,
    resolvedMinifixDiameterHole,
    resolvedCamDepth,
    resolvedCamDiameter,
    resolvedCamHeight,
  ]);

  const handleZoomModeToggle = () => {
    /** Toggles zoom mode in the 3D design viewer. */

    if (design3D) {
      design3D.toggleZoomMode?.(!design3D.isZoomMode);
    }
  };

  const handleClick = (route: string) => {
    /** Handles navigation to a specific route, exiting fullscreen if active. */

    setIsLoading(true);
    if (document.fullscreenElement) {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        router.push(route).then(() => setIsLoading(false));
      });
    } else {
      router.push(route).then(() => setIsLoading(false));
    }
  };

  const pathName = typeof window !== 'undefined' ? window.location.pathname.split('/') : [];
  const designId = pathName.length > 2 ? pathName[2] : '';

  useEffect(() => {
    fetchDesigns();
  }, []);

  const fetchDesigns = async () => {
    /** Fetches all designs from the backend. */

    try {
      const response: { status: number; data: Design[] } = await commonService.get(
        API_ENDPOINT.GET_DESIGNS
      );
      if (response.status === 200) {
        const designs = response.data;
        const selectedDesign = designs.find((design) => design.id === designId);
        if (selectedDesign) {
          setDesignName([selectedDesign]);
        }
      }
    } catch (e) {
      console.error('Error fetching designs:', e);
    }
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        dropdownButtonRef.current &&
        !dropdownButtonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }

      if (
        renderDropdownRef.current &&
        !renderDropdownRef.current.contains(event.target as Node) &&
        renderDropdownButtonRef.current &&
        !renderDropdownButtonRef.current.contains(event.target as Node)
      ) {
        setIsRenderDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const toggleFullscreen = () => {
    /** Toggles fullscreen mode for the browser view. */

    if (!isFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'd') {
        event.preventDefault();
        handleScreenshot();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [design3D]);

  const handleProfileClick = () => {
    /** Toggles the visibility of the user profile dropdown menu. */

    setIsDropdownOpen((prev) => !prev);
  };

  const profileSetting = () => {
    /** Redirects the user to profile settings. */

    router.push(REDIRECT.SETTINGS);
  };

  const handleLogout = () => {
    /** Logs out the user, clears tokens, and redirects to the unauthorized screen. */

    localStorage.removeItem('token');
    Cookies.remove('token', { path: '' });
    router.push({
      pathname: REDIRECT.UNAUTHORIZED,
    });
  };

  const handleNesting = async () => {
    /** Fetches nesting data for the current design and navigates to the MES screen. */

    setIsLoading(true);

    try {
      const response: any = await commonService.post(
        API_ENDPOINT.CREATE_DESIGN_NESTING(designId),
        {}
      );
      if (response.status === 200) {
        router.push(`/design/${designId}/nesting`);
      } else {
        toast(({ closeToast }) => (
          <CustomToast
            appearance="error"
            message={response?.data?.message || 'Error occurred while generating nesting data.'}
            closeToast={closeToast}
          />
        ));
      }
    } catch (e: any) {
      console.error('Error fetching designs:', e);
      toast(({ closeToast }) => (
        <CustomToast
          appearance="error"
          message={e?.response?.data?.message || e?.message || 'An error occurred.'}
          closeToast={closeToast}
        />
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRender = async () => {
    if (!design3D || !design3D.renderer || !designId) return;

    setIsLoading(true);
    try {
      await commonService.put(API_ENDPOINT.UPDATE_DESIGN_DETAILS(designId), {
        rendering_project_id: null,
      });
      await commonService.post(API_ENDPOINT.CLEAR_RENDER_IMAGES(designId), {});

      // Ensure world matrices are updated before computing bounds
      design3D.scene.updateMatrixWorld(true);

      const box = new THREE.Box3();
      design3D.scene.traverseVisible((child: any) => {
        if (child.isMesh && child.geometry) {
          // Ignore known helper/background names
          const name = (child.name || '').toLowerCase();
          if (name.includes('grid') || name.includes('helper')) {
            return;
          }

          if (!child.geometry.boundingBox) {
            child.geometry.computeBoundingBox();
          }
          if (child.geometry.boundingBox) {
            const childBox = new THREE.Box3().copy(child.geometry.boundingBox);
            childBox.applyMatrix4(child.matrixWorld);

            const childSize = new THREE.Vector3();
            childBox.getSize(childSize);
            if (childSize.x < 100000 && childSize.y < 100000 && childSize.z < 100000) {
              box.union(childBox);
            }
          }
        }
      });

      if (box.isEmpty()) {
        alert('Scene is empty');
        setIsLoading(false);
        return;
      }

      const center = new THREE.Vector3();
      box.getCenter(center);
      const size = new THREE.Vector3();
      box.getSize(size);

      const maxDim = Math.max(size.x, size.y, size.z);
      const isPersp = (design3D.camera as any).isPerspectiveCamera;
      const fov = isPersp
        ? (design3D.camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
        : Math.PI / 4;

      // Calculate appropriate distance to fit maxDim with a slight margin
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
      cameraZ *= 0.95;

      const originalPosition = design3D.camera.position.clone();
      const originalTarget = design3D.controls.target.clone();

      design3D.controls.target.copy(center);

      const angles = [
        { name: 'front', pos: new THREE.Vector3(center.x, center.y, center.z + cameraZ) },
        // { name: 'back', pos: new THREE.Vector3(center.x, center.y, center.z - cameraZ) },
        // { name: 'left', pos: new THREE.Vector3(center.x - cameraZ, center.y, center.z) },
        // { name: 'right', pos: new THREE.Vector3(center.x + cameraZ, center.y, center.z) },
        { name: 'top', pos: new THREE.Vector3(center.x, center.y + cameraZ, center.z) },
        {
          name: 'isometric',
          pos: new THREE.Vector3(
            center.x + cameraZ * 0.7,
            center.y + cameraZ * 0.7,
            center.z + cameraZ * 0.7
          ),
        },
      ];

      const raycaster = new THREE.Raycaster();
      let capturedAnglesCount = 0;

      for (let i = 0; i < angles.length; i++) {
        const angle = angles[i];
        design3D.camera.position.copy(angle.pos);
        design3D.camera.lookAt(center);
        design3D.controls.update();

        // Check for wall interference
        raycaster.setFromCamera(new THREE.Vector2(0, 0), design3D.camera);
        const intersects = raycaster.intersectObjects(design3D.scene.children, true);

        let isBlockedByWall = false;
        if (intersects.length > 0) {
          const firstHit = intersects[0].object;
          if (firstHit.userData?.type === 'wall' || firstHit.name.toLowerCase().includes('wall')) {
            isBlockedByWall = true;
          }
        }

        if (isBlockedByWall) {
          console.log(`Skipping ${angle.name} angle due to wall interference.`);
          continue;
        }

        design3D.renderer.render(design3D.scene, design3D.camera);

        const dataURL = design3D.renderer.domElement.toDataURL('image/png');
        const res = await fetch(dataURL);
        const blob = await res.blob();

        const formData = new FormData();
        formData.append('image', blob, `${angle.name}.png`);

        await commonService.post(API_ENDPOINT.UPLOAD_RENDER_IMAGE(designId), formData);
        capturedAnglesCount++;
      }

      design3D.camera.position.copy(originalPosition);
      design3D.controls.target.copy(originalTarget);
      design3D.controls.update();

      if (capturedAnglesCount === 0) {
        alert(
          'Could not capture any angles clearly (all blocked by walls). Please adjust walls or scene.'
        );
      } else {
        router.push(`/rendering/?designId=${designId}`);
      }
    } catch (error) {
      console.error('Error during rendering', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToRender = () => {
    router.push(`/rendering/?designId=${designId}`);
  };

  const handleScreenshot = () => {
    /** Captures a screenshot of the 3D scene and downloads it as a PNG file. */

    if (!design3D || !design3D.renderer) {
      console.error('Renderer not available');
      return;
    }

    design3D.renderer.render(design3D.scene, design3D.camera);
    const dataURL = design3D.renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `screenshot-${new Date().toISOString()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenCloseClick = () => {
    if (!design3D || !design3D.scene) return;

    /** Toggles open/close animations for doors and drawers in the 3D scene. */
    const controller = new CabinetMotionController();

    const newState = !globalDoorsOpen;
    dispatch(setGlobalDoorsOpen(newState));

    controller.toggleAll(design3D.scene, newState);
  };

  const handleSettingsClick = () => {
    setShowSettingsPopup(true);
  };

  const handleSaveHeaderSettings = () => {
    // Dispatch design-level overrides to Redux
    dispatch(setActiveDesignMinifixDistance(minifixDistance));
    dispatch(setActiveDesignMinifixDiameterHole(minifixDiameterHole));
    dispatch(setActiveDesignCamDepth(camDepth));
    dispatch(setActiveDesignCamDiameter(camDiameter));
    dispatch(setActiveDesignCamHeight(camHeight));

    // Note: We don't update existing cupboards - they keep their own settings
    // Only new cupboards will use these updated design-level settings

    setSuccessMessage('Design settings updated successfully!');
    setTimeout(() => {
      setSuccessMessage(null);
      setShowSettingsPopup(false);
    }, 2000);
  };

  const handleSave = () => {
    const objectSaver = new ObjectsSaver();
    objectSaver.saveAllObjects();
  };

  const headerTools = [
    // {
    //   option: 'undo',
    //   name: 'Undo',
    //   icon: assets.newundo,
    //   disabled: !history?.past?.length,
    //   onClick: () => dispatch(undoAction() as unknown as UnknownAction),
    // },
    // {
    //   option: 'redo',
    //   name: 'Redo',
    //   icon: assets.newredu,
    //   disabled: !history?.future?.length,
    //   onClick: () => dispatch(redoAction() as unknown as UnknownAction),
    // },
    {
      option: 'clear',
      name: 'Clear',
      icon: assets.newclear,
      disabled: false,
      onClick: handleClear,
    },
    {
      option: 'zoom',
      name: 'Zoom',
      icon: assets.newzoom,
      disabled: false,
      onClick: handleZoomModeToggle,
    },
    {
      option: 'save',
      name: 'Save Design',
      icon: assets.save,
      disabled: false,
      onClick: handleSave,
    },
    {
      option: 'screenshot',
      name: 'Screenshot',
      icon: assets.screenshot_svg,
      disabled: false,
      onClick: handleScreenshot,
    },
    {
      option: 'Open/Close',
      name: 'Open/Close',
      icon: assets.newopenclose,
      disabled: false,
      onClick: handleOpenCloseClick,
    },
    {
      option: 'settings',
      name: 'Settings',
      icon: assets.setting_svg,
      disabled: false,
      onClick: handleSettingsClick,
    },
  ];

  return (
    <>
      {isLoading && (
        <div className={Loading_style.loadingOverlay}>
          <div className={Loading_style.loadingSpinner}></div>
          <p>Loading...</p>
        </div>
      )}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <p>{designName.length > 0 ? designName[0].design_name : 'Furniture Design'}</p>
        </div>

        <div className={styles.headerTools}>
          {headerTools.map(({ option, name, icon, disabled, onClick }) => (
            <div key={option} className={styles.headerToolList}>
              <div
                key={option}
                className={disabled ? styles.disabledHeaderIcon : styles.headerIcon}
                onClick={disabled ? undefined : onClick}
                title={name}
              >
                <img src={icon || '/placeholder.svg'} alt={name} />
                {name}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.header_rightmenu}>
          {designName.length > 0 && (designName[0] as any).rendering_project_id ? (
            <div
              className={styles.nestingbutton}
              style={{ display: 'flex', alignItems: 'center', padding: '0px' }}
            >
              <p
                onClick={handleGoToRender}
                style={{
                  padding: '8px 12px',
                  margin: 0,
                  borderRight: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                View Render
              </p>
              <div
                ref={renderDropdownButtonRef}
                onClick={() => setIsRenderDropdownOpen((prev) => !prev)}
                style={{
                  padding: '8px 12px',
                  margin: 0,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Render options"
              >
                <span style={{ fontSize: '12px', color: 'white' }}>▼</span>
              </div>
            </div>
          ) : (
            <div className={styles.nestingbutton} onClick={handleRender}>
              <p>Render</p>
            </div>
          )}
          <div className={styles.nestingbutton} onClick={handleNesting}>
            <p>Nesting</p>
          </div>
          {isLoading && (
            <div className={Loading_style.loadingOverlay}>
              <div className={Loading_style.loadingSpinner}></div>
              <p>Loading...</p>
            </div>
          )}
          <img
            src={assets.profile || '/placeholder.svg'}
            alt="profile"
            onClick={handleProfileClick}
            ref={dropdownButtonRef}
            style={{ cursor: 'pointer' }}
          />
          {isFullscreen ? (
            <FullscreenExit
              onClick={toggleFullscreen}
              style={{
                width: '1.5rem',
                cursor: 'pointer',
                marginRight: '0rem',
              }}
            />
          ) : (
            <Fullscreen
              onClick={toggleFullscreen}
              style={{
                width: '1.5rem',
                cursor: 'pointer',
                marginRight: '0rem',
              }}
            />
          )}
          <img
            src={assets.close || '/placeholder.svg'}
            alt="close"
            onClick={() => handleClick(REDIRECT.DESIGNS)}
            className={styles.close}
          />
        </div>
      </div>

      {isDropdownOpen && (
        <div className={styles.dropdownMenuProfile} ref={dropdownRef}>
          <ul className={styles.ProfiledropdownList}>
            <li onClick={profileSetting}>Profile Settings</li>
            <img
              src={assets.edit_delete_line || '/placeholder.svg'}
              alt="edit-delete-line"
              className={styles.edit_delete_line}
            />
            <li onClick={handleLogout}>Logout</li>
          </ul>
        </div>
      )}

      {isRenderDropdownOpen && (
        <div className={styles.dropdownMenuRender} ref={renderDropdownRef}>
          <ul className={styles.ProfiledropdownList}>
            <li
              onClick={() => {
                setIsRenderDropdownOpen(false);
                handleGoToRender();
              }}
            >
              View Render
            </li>
            <img
              src={assets.edit_delete_line || '/placeholder.svg'}
              alt="edit-delete-line"
              className={styles.edit_delete_line}
            />
            <li
              onClick={() => {
                setIsRenderDropdownOpen(false);
                handleRender();
              }}
            >
              Generate New Render
            </li>
          </ul>
        </div>
      )}

      {showClearConfirm && (
        <div className={styles.confirmPopup}>
          <div className={styles.confirmContent}>
            <p>
              Are you sure you want to clear all catalogs and reset the scene? This cannot be
              undone.
            </p>
            <div className={styles.buttonGroup}>
              <button className={styles.confirmButton} onClick={confirmClear}>
                Yes, Clear
              </button>
              <button className={styles.cancelButton} onClick={() => setShowClearConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettingsPopup && (
        <div className={styles.popupOverlay}>
          <div className={styles.minifixPopupContent}>
            {/* Header with icon and title */}
            <div className={styles.popupHeader}>
              <div className={styles.settingsTitleContainer}>
                <img src={assets.Setting || '/placeholder.svg'} alt="Settings Icon" />
                <div>
                  <h2>Design Settings</h2>
                </div>
              </div>
              <img
                src={assets.close || '/placeholder.svg'}
                alt="Close"
                className={styles.minifixCancelButton}
                onClick={() => setShowSettingsPopup(false)}
              />
            </div>

            <div className={styles.minifixFormGroupWrapper}>
              {/* Minifix Settings Section */}
              <h4 className={styles.sectionSubtitle}>Minifix Settings</h4>
              <div className={styles.minifixFlexRow}>
                <div className={styles.minifixInputGroup}>
                  <label htmlFor="minifix-spacing">Distance (mm)</label>
                  <input
                    id="minifix-Dsitance"
                    type="number"
                    value={minifixDistance}
                    onChange={(e) => setMinifixDistance(Number(e.target.value))}
                    min="1"
                  />
                </div>
                <div className={styles.minifixInputGroup}>
                  <label htmlFor="minifix-diameter-hole">Minifix Diameter Hole (mm)</label>
                  <input
                    id="minifix-diameter-hole"
                    type="number"
                    value={minifixDiameterHole}
                    onChange={(e) => setMinifixDiameterHole(Number(e.target.value))}
                    min="1"
                  />
                </div>
                <div className={styles.minifixInputGroup}>
                  <label htmlFor="cam-depth">Cam Depth (mm)</label>
                  <input
                    id="cam-depth"
                    type="number"
                    value={camDepth}
                    onChange={(e) => setCamDepth(Number(e.target.value))}
                    min="1"
                  />
                </div>
              </div>

              {/* Camlock Settings Section */}
              <h4 className={styles.sectionSubtitle}>Camlock Settings</h4>
              <div className={styles.minifixFlexRow}>
                <div className={styles.minifixInputGroup}>
                  <label htmlFor="cam-diameter">Cam Diameter (mm)</label>
                  <input
                    id="cam-diameter"
                    type="number"
                    value={camDiameter}
                    onChange={(e) => setCamDiameter(Number(e.target.value))}
                    min="1"
                  />
                </div>
                <div className={styles.minifixInputGroup}>
                  <label htmlFor="cam-height">Cam Height (mm)</label>
                  <input
                    id="cam-height"
                    type="number"
                    value={camHeight}
                    onChange={(e) => setCamHeight(Number(e.target.value))}
                    min="1"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className={styles.minifixSubmitGroup}>
                <button className={styles.minifixSubmitButton} onClick={handleSaveHeaderSettings}>
                  Save Changes
                </button>
                {successMessage && (
                  <div className={styles.successPopup}>
                    <img src={assets.success} alt="Success" />
                    <p>{successMessage}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
