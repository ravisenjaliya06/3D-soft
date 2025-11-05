import { assets } from '@/svgPaths';
import ImportImage from '@/components/3dmodel/customDesign/components/ImportImage';
import {
  redoCustomAction,
  undoCustomAction,
} from '@/components/3dmodel/store/customDesignHistorySlice';
import { removeAllShapes } from '@/components/3dmodel/store/customDesignSlice';
import Loading_style from '@/components/loading.module.css';
import commonService from '@/services/CommonService';
import { REDIRECT } from '@/services/CommonStatus';
import Fullscreen from '@mui/icons-material/Fullscreen';
import FullscreenExit from '@mui/icons-material/FullscreenExit';
import Cookies from 'js-cookie';
import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { useAppDispatch } from '../../hooks';
import { RootState } from '../../store/types';
import CADImportDialog from '../components/CADImportDialog';
import SUImportDialog from '../components/SUImportDialog';
import { HeaderProps } from '../interface';
import styles from './header.module.css';

const Header: React.FC<HeaderProps> = ({ router, design3D }) => {
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFileDropdownOpen, setIsFileDropdownOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [importDialogType, setImportDialogType] = useState<'none' | 'cad' | 'su' | 'image'>('none');
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const dropdownButtonRef = useRef<HTMLImageElement | null>(null);
  const fileDropdownRef = useRef<HTMLDivElement | null>(null);

  if (errorMessage) {
    setTimeout(() => {
      setErrorMessage('');
    }, 3000);
  }
  const historyState = useSelector((state: RootState) => {
    return state.customDesignHistory;
  });

  const customShapes = useSelector((state: RootState) => state.customDesign.shapes);

  const handleClear = async () => {
    if (!customdesignId) {
      setErrorMessage('No design selected');
      return;
    }

    if (!customShapes || Object.keys(customShapes).length === 0) {
      setErrorMessage('No objects to clear');
      return;
    }

    if (
      !window.confirm(
        'Are you sure you want to clear all catalogs and reset the scene? This cannot be undone.'
      )
    ) {
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response: { status: number } = await commonService.deleteWithQueryParam(
        'design',
        `${customdesignId}`,
        `object/?is_custom=True`
      );

      if (response.status === 200 || response.status === 204) {
        if (design3D) {
          dispatch(removeAllShapes());
        }
      } else {
        setErrorMessage('Failed to clear design');
      }
    } catch (e) {
      console.error('Error clearing design:', e);
      setErrorMessage('Error clearing design');
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setErrorMessage('');
      }, 3000);
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

  const pathName = typeof window !== 'undefined' ? window.location.pathname.split('/') : [];
  const customdesignId = pathName.length > 2 ? pathName[4] : '';

  const designId = pathName.length > 2 ? pathName[2] : '';

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      // Handle profile dropdown
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        dropdownButtonRef.current &&
        !dropdownButtonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }

      const fileButtonElement = document.querySelector('[data-option="file"]');
      const isFileButtonClicked =
        fileButtonElement && fileButtonElement.contains(event.target as Node);

      if (
        fileDropdownRef.current &&
        !fileDropdownRef.current.contains(event.target as Node) &&
        !isFileButtonClicked
      ) {
        setIsFileDropdownOpen(false);
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

      if (event.ctrlKey && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (!historyState || historyState.past.length === 0) {
          return;
        }
        dispatch(undoCustomAction());
      }

      if (
        (event.ctrlKey && event.key.toLowerCase() === 'y') ||
        (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'z')
      ) {
        event.preventDefault();
        if (!historyState || historyState.future.length === 0) {
          return;
        }
        dispatch(redoCustomAction());
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [design3D, historyState, dispatch]);

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

  // Handle undo action
  const handleUndo = () => {
    if (!historyState || historyState.past.length === 0) {
      return;
    }
    dispatch(undoCustomAction());
  };

  // Handle redo action
  const handleRedo = () => {
    if (!historyState || historyState.future.length === 0) {
      return;
    }
    dispatch(redoCustomAction());
  };

  const handleFileClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsFileDropdownOpen(!isFileDropdownOpen);
  };
  const handleCloseImport = () => {
    setImportDialogType('none');
  };

  const handleCADImportClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setImportDialogType('cad');
    setIsFileDropdownOpen(false);
  };

  const handleSUImportClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setImportDialogType('su');
    setIsFileDropdownOpen(false);
  };

  const handleImageImportClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setImportDialogType('image');
    setIsFileDropdownOpen(false);
  };

  const handleScreenshot = async () => {
    if (!design3D || !customdesignId) {
      setErrorMessage('No design selected');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    const objects = design3D.scene.children.filter((obj) => {
      if (obj instanceof THREE.GridHelper) return false;
      if (obj instanceof Sky) return false;
      if (obj.name === 'stars') return false;
      if (obj.name === 'grid') return false;
      if (obj.name === 'floor') return false;
      if (obj.name === 'daysky' || obj.name === 'nightsky') return false;
      return true;
    });
    if (objects.length === 0) {
      setErrorMessage('No objects to capture');
      return;
    }

    // Calculate bounding box of all objects
    const boundingBox = new THREE.Box3();
    objects.forEach((obj) => {
      boundingBox.expandByObject(obj);
    });

    // Get center point of all objects
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    const size = boundingBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.z);
    const fov = 45;
    const cameraDistance = (maxDim / (2 * Math.tan((fov * Math.PI) / 360))) * 0.8;
    const camera = design3D.camera;
    const highestPoint = boundingBox.max.y;

    const angle = Math.PI / 4;
    const cameraPosition = new THREE.Vector3(
      center.x + Math.cos(angle) * cameraDistance,
      highestPoint * 0.7,
      center.z + Math.sin(angle) * cameraDistance
    );

    const originalPosition = camera.position.clone();
    const originalTarget = design3D.controls.target.clone();
    const originalFov =
      design3D.camera instanceof THREE.PerspectiveCamera ? design3D.camera.fov : 75;

    camera.position.copy(cameraPosition);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    design3D.controls.target.copy(center);
    camera.lookAt(center);
    design3D.controls.update();

    // Render the scene
    design3D.renderer.render(design3D.scene, camera);

    // Get the canvas element and convert to blob
    const canvas = design3D.renderer.domElement;

    // Convert canvas to blob
    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            console.error('Failed to create blob');
            reject(new Error('Failed to create blob'));
          }
        },
        'image/png',
        1.0
      );
    });

    // Create FormData
    const formData = new FormData();
    formData.append('custom_design_picture', blob, 'screenshot.png');
    formData.append('is_custom', 'true');

    const response: { status: number } = await commonService.putWithFormData(
      'design',
      customdesignId,
      formData
    );

    camera.position.copy(originalPosition);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = originalFov;
      camera.updateProjectionMatrix();
    }
    design3D.controls.target.copy(originalTarget);
    design3D.controls.update();
    design3D.renderer.render(design3D.scene, camera);

    if (response.status === 200) {
      setErrorMessage('Screenshot saved successfully');
      setIsLoading(false);
      setTimeout(() => {
        setErrorMessage('');
      }, 3000);
    } else {
      setErrorMessage('Failed to save screenshot');
    }
  };

  const headerTools = [
    {
      option: 'file',
      name: 'File',
      icon: assets.file,
      disabled: false,
      onClick: handleFileClick,
    },
    {
      option: 'publish',
      name: 'Publish',
      icon: assets.save,
      disabled: false,
      onClick: handleScreenshot,
    },
    {
      option: 'undo',
      name: 'Undo',
      icon: assets.undo,
      disabled: !historyState || !historyState.past || historyState.past.length === 0,
      onClick: handleUndo,
    },
    {
      option: 'redo',
      name: 'Redo',
      icon: assets.redo,
      disabled: !historyState || !historyState.future || historyState.future.length === 0,
      onClick: handleRedo,
    },
    {
      option: 'clear',
      name: 'Clear',
      icon: assets.clear,
      disabled: !customShapes || Object.keys(customShapes).length === 0,
      onClick: handleClear,
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
          <p>Custom Design</p>
        </div>

        <div className={styles.headerTools}>
          {headerTools.map(({ option, name, icon, disabled, onClick }) => (
            <div
              key={option}
              className={disabled ? styles.disabledHeaderIcon : styles.headerIcon}
              onClick={disabled ? undefined : onClick}
              title={name}
              data-option={option}
            >
              <img src={icon} alt={name} />
              {name}
            </div>
          ))}
        </div>

        <div className={styles.header_rightmenu}>
          <img
            src={assets.profile}
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
            src={assets.close}
            alt="close"
            onClick={() => handleClick(REDIRECT.DESIGNPAGE(designId))}
            className={styles.close}
          />
        </div>
      </div>

      {isDropdownOpen && (
        <div className={styles.dropdownMenuProfile} ref={dropdownRef}>
          <ul className={styles.ProfiledropdownList}>
            <li onClick={profileSetting}>Profile Settings</li>
            <img
              src={assets.edit_delete_line}
              alt="edit-delete-line"
              className={styles.profile_setting_line}
            />
            <li onClick={handleLogout}>Logout</li>
          </ul>
        </div>
      )}

      {/* File Dropdown Menu */}
      {isFileDropdownOpen && (
        <div className={styles.fileDropdown} ref={fileDropdownRef}>
          <div className={styles.fileDropdownItem}>New</div>
          <div className={`${styles.fileDropdownItem} ${styles.hasSubmenu}`}>
            Import File
            <div className={styles.fileDropdownSubmenu}>
              <div className={styles.fileDropdownSubItem} onClick={handleCADImportClick}>
                CAD file
              </div>
              <div className={styles.fileDropdownSubItem} onClick={handleSUImportClick}>
                SU file
              </div>
              <div className={styles.fileDropdownSubItem} onClick={handleImageImportClick}>
                Image file
              </div>
            </div>
          </div>
          <div className={styles.fileDropdownItem}>Save</div>
        </div>
      )}

      {importDialogType === 'image' && (
        <ImportImage design3D={design3D} onClose={handleCloseImport} />
      )}

      {importDialogType === 'cad' && (
        <CADImportDialog design3D={design3D} onClose={handleCloseImport} />
      )}

      {importDialogType === 'su' && (
        <SUImportDialog design3D={design3D} onClose={handleCloseImport} />
      )}
    </>
  );
};

export default Header;
