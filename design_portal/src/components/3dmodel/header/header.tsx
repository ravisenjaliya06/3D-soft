import screenshot_svg from '@/assets/3dmodel/footerbar/screenshot_svg.svg';
import clear_svg from '@/assets/3dmodel/header/newclear.svg';
import door_sliding from '@/assets/3dmodel/header/newopenclose.svg';
import redo_svg from '@/assets/3dmodel/header/newredu.svg';
import undo_svg from '@/assets/3dmodel/header/newundo.svg';
import zoom_svg from '@/assets/3dmodel/header/newzoom.svg';
import settings_svg from '@/assets/3dmodel/header/Setting.svg';
import close from '@/assets/catalog/close.svg';
import profile from '@/assets/catalog/profile.svg';
import edit_delete_line from '@/assets/edit-delete-line.svg';
import success from '@/assets/profile/success.svg';
import Loading_style from '@/components/loading.module.css';
import commonService from '@/services/CommonService';
import { REDIRECT } from '@/services/CommonStatus';
import Fullscreen from '@mui/icons-material/Fullscreen';
import FullscreenExit from '@mui/icons-material/FullscreenExit';
import Cookies from 'js-cookie';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { UnknownAction } from 'redux';
import * as THREE from 'three';
import { toggleDoor, toggleDrawer } from '../handler/items';
import { useAppDispatch } from '../hooks';
import { Design, HeaderProps } from '../interface';
import { getMinifixStandards } from '../minifix/calculator';
import { removeAllObjects } from '../store/dataSlice';
import { redoAction, undoAction } from '../store/historySlice';
import type { RootState } from '../store/types';
import styles from './header.module.css';

const Header: React.FC<HeaderProps> = ({ router, design3D }) => {
  const dispatch = useAppDispatch();
  const history = useSelector((state: RootState) => state.history);
  const data = useSelector((state: RootState) => state.data);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [designName, setDesignName] = useState<Design[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const dropdownButtonRef = useRef<HTMLImageElement | null>(null);
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [minifixDistance, setMinifixDistance] = useState(0);
  const [boltSize, setBoltSize] = useState(0);
  const [camDepth, setCamDepth] = useState(0);
  const [grooveGap, setGrooveGap] = useState(0);
  const [grooveDig, setGrooveDig] = useState(0);

  interface DesignIDSettingData {
    id: string;
    unit: string;
    sheet_width: number;
    sheet_height: number;
    minifix_distance: number;
    groove_gap: number;
    groove_dig: number;
    width: number;
    height: number;
    minifix_bolt: number;
    cam_points: number;
  }

  const handleClear = () => {
    if (!designId) {
      return;
    }
    setShowClearConfirm(true); // Show custom confirm popup
  };

  const confirmClear = async () => {
    setShowClearConfirm(false);
    setIsLoading(true);

    try {
      const response: { status: number } = await commonService.delete(
        'material',
        `catalog/design/${designId}`
      );

      if (response.status === 200 || response.status === 204) {
        if (design3D) {
          dispatch(removeAllObjects() as unknown as UnknownAction);
        }
        fetchDesigns();
        setSuccessMessage('Design cleared successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (e) {
      console.error('Error clearing design:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (showSettingsPopup) {
      const standards = getMinifixStandards();
      setMinifixDistance(standards.SPACING);
      // ...set other values too if needed
    }
  }, [showSettingsPopup]);

  const handleZoomModeToggle = () => {
    if (design3D) {
      design3D.toggleZoomMode?.(!design3D.isZoomMode);
    }
  };

  const handleClick = (route: string) => {
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
  const fetchSettingsConfig = async () => {
    const designId = window.location.pathname.split('/')[2];

    const response: { status: number; data: DesignIDSettingData } = await commonService.get(
      'design',
      `${designId}/settings`
    );
    if (response.status === 200) {
      setMinifixDistance(response.data.minifix_distance ?? 30);
      setBoltSize(response.data.minifix_bolt ?? 5);
      setCamDepth(response.data.cam_points ?? 6);
      setGrooveGap(response.data.groove_gap ?? 3);
      setGrooveDig(response.data.groove_dig ?? 10);
    }
  };
  const handleSettingsSubmit = async () => {
    const designId = window.location.pathname.split('/')[2];
    if (!designId) return;

    const formData = new FormData();
    formData.append('sheet_height', '2480');
    formData.append('sheet_width', '1240');
    formData.append('minifix_distance', String(minifixDistance));

    try {
      const response = await commonService.put('design', `${designId}/settings`, formData);
      if (response.status === 200) {
        // Update the Minifix calculator with new spacing
        const { updateMinifixSpacing } = await import('../minifix/calculator');
        updateMinifixSpacing(minifixDistance);

        setSuccessMessage(
          'Settings updated successfully! Minifix spacing updated to ' + minifixDistance + 'mm'
        );
        fetchSettingsConfig(); // refresh
        setTimeout(() => {
          setSuccessMessage(null);
          setShowSettingsPopup(false); // ✅ Close popup after message
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to update settings', error);
    }
  };

  useEffect(() => {
    if (showSettingsPopup) fetchSettingsConfig();
  }, [showSettingsPopup]);

  const pathName = typeof window !== 'undefined' ? window.location.pathname.split('/') : [];
  const designId = pathName.length > 2 ? pathName[2] : '';

  useEffect(() => {
    fetchDesigns();
  }, []);

  const fetchDesigns = async () => {
    try {
      const response: { status: number; data: Design[] } = await commonService.get('design', '');
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
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const toggleFullscreen = () => {
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
    setIsDropdownOpen((prev) => !prev);
  };

  const profileSetting = () => {
    router.push(REDIRECT.SETTINGS);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    Cookies.remove('token', { path: '' });
    router.push({
      pathname: REDIRECT.UNAUTHORIZED,
    });
  };

  const handleNesting = async () => {
    setIsLoading(true); // 🔄 Show loading spinner
    try {
      const response: { status: number; data: Design[] } = await commonService.get(
        'design',
        `${designId}/nesting`
      );
      if (response.status === 200) {
        router.push(`/mes/${designId}`);
      }
    } catch (e) {
      console.error('Error fetching designs:', e);
    } finally {
      setIsLoading(false); // ✅ Hide loading spinner
    }
  };

  const handleScreenshot = () => {
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
    design3D?.scene.traverse((child) => {
      if (child.name.includes('Door') && child instanceof THREE.Mesh) {
        const direction = child.userData.openDirection;
        if (direction) {
          toggleDoor(child);
        }
      }

      if (child.name.includes('Drawer')) {
        toggleDrawer(child as THREE.Mesh);
      }
    });
  };

  const headerTools = [
    {
      option: 'undo',
      name: 'Undo',
      icon: undo_svg,
      disabled: !history?.past?.length,
      onClick: () => dispatch(undoAction() as unknown as UnknownAction),
    },
    {
      option: 'redo',
      name: 'Redo',
      icon: redo_svg,
      disabled: !history?.future?.length,
      onClick: () => dispatch(redoAction() as unknown as UnknownAction),
    },
    {
      option: 'clear',
      name: 'Clear',
      icon: clear_svg,
      disabled: data?.objects?.length === 0,
      onClick: handleClear,
    },
    {
      option: 'zoom',
      name: 'Zoom',
      icon: zoom_svg,
      disabled: false,
      onClick: handleZoomModeToggle,
    },
    {
      option: 'screenshot',
      name: 'Screenshot',
      icon: screenshot_svg,
      disabled: false,
      onClick: handleScreenshot,
    },
    {
      option: 'Open/Close',
      name: 'Open/Close',
      icon: door_sliding,
      disabled: false,
      onClick: handleOpenCloseClick,
    },
  ];

  return (
    <>
      <div className={styles.header}>
        {isLoading && (
          <div className={Loading_style.loadingOverlay}>
            <div className={Loading_style.loadingSpinner}></div>
            <p>Loading...</p>
          </div>
        )}
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
                <img src={icon.src || '/placeholder.svg'} alt={name} />
                {name}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.header_rightmenu}>
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
            src={profile.src || '/placeholder.svg'}
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
            src={close.src || '/placeholder.svg'}
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
              src={edit_delete_line.src || '/placeholder.svg'}
              alt="edit-delete-line"
              className={styles.edit_delete_line}
            />
            <li onClick={handleLogout}>Logout</li>
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
                <img src={settings_svg.src || '/placeholder.svg'} alt="Settings Icon" />
                <div>
                  <h2>Design Settings</h2>
                </div>
              </div>
              <img
                src={close.src || '/placeholder.svg'}
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
                  <label htmlFor="bolt-size">Bolt Size (mm)</label>
                  <input
                    id="bolt-size"
                    type="number"
                    value={boltSize}
                    onChange={(e) => setBoltSize(Number(e.target.value))}
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

              {/* Grooving Settings Section */}
              <h4 className={styles.sectionSubtitle}>Grooving Settings</h4>
              <div className={styles.minifixFlexRow}>
                <div className={styles.minifixInputGroup}>
                  <label htmlFor="groove-Gap">Groove Gap (mm)</label>
                  <input
                    id="groove-gap"
                    type="number"
                    value={grooveGap}
                    onChange={(e) => setGrooveGap(Number(e.target.value))}
                    min="1"
                  />
                </div>
                <div className={styles.minifixInputGroup}>
                  <label htmlFor="groove-Dig">Groove Dig (mm)</label>
                  <input
                    id="groove-dig"
                    type="number"
                    value={grooveDig}
                    onChange={(e) => setGrooveDig(Number(e.target.value))}
                    min="1"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className={styles.minifixSubmitGroup}>
                <button className={styles.minifixSubmitButton} onClick={handleSettingsSubmit}>
                  Save Changes
                </button>
                {successMessage && (
                  <div className={styles.successPopup}>
                    <img src={success.src} alt="Success" />
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
