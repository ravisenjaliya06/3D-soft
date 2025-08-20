import closeIcon from '@/assets/catalog/close.svg';
import { MoveHandler as MoveHandlerClass } from '@/components/3dmodel/handler/moveHandler';
import { MoveHandler } from '@/components/3dmodel/handler/moveHandlerInterface';
import { cadImporter } from '@/components/3dmodel/utils/cadImporter';
import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { store } from '../../store';
import { CustomDesignProps } from '../interface';
import styles from './ImportDialog.module.css';

const SUImportDialog: React.FC<CustomDesignProps> = ({ design3D, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [size, setSize] = useState(1); // Default size multiplier
  const [maxDimension, setMaxDimension] = useState(100); // Maximum dimension in cm
  const fileInputRef = useRef<HTMLInputElement>(null);
  const moveHandlerRef = useRef<MoveHandler | null>(null);

  React.useEffect(() => {
    if (design3D && !moveHandlerRef.current) {
      moveHandlerRef.current = new MoveHandlerClass({
        scene: design3D.scene,
        camera:
          design3D.camera instanceof THREE.PerspectiveCamera
            ? design3D.camera
            : new THREE.PerspectiveCamera(
                75,
                window.innerWidth / window.innerHeight,
                0.1,
                1000,
              ),
        renderer: design3D.renderer,
        movableObjects: [],
        gridBounds: {
          minX: -1000,
          maxX: 1000,
          minY: 0,
          maxY: 1000,
          minZ: -1000,
          maxZ: 1000,
        },
      });
    }

    return () => {
      if (moveHandlerRef.current) {
        moveHandlerRef.current.disableDragging();
        moveHandlerRef.current = null;
      }
    };
  }, [design3D]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!['skp', 'stl'].includes(extension || '')) {
        setError('Please select a SketchUp file (.skp) or STL file (.stl)');
        setSelectedFile(null);
        return;
      }

      // Check file size for SKP files
      if (extension === 'skp' && file.size > 100 * 1024 * 1024) {
        // 100MB limit
        setError(
          'The SKP file is too large. Please use a file smaller than 100MB.',
        );
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
  };

  const handleSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = parseFloat(event.target.value);
    setSize(newSize);
  };

  const handleMaxDimensionChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newMaxDimension = parseFloat(event.target.value);
    setMaxDimension(newMaxDimension);
  };

  const handleImport = async () => {
    if (!selectedFile || !design3D || !moveHandlerRef.current) {
      setError('Please select a file');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress(0);

    onClose();
    const cadData = await cadImporter.importCADFile({
      file: selectedFile,
      scene: design3D.scene,
      onProgress: (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setProgress(percentComplete);
        }
      },
      onError: (error) => {
        setError(error.message);
        setIsLoading(false);
      },
    });

    if (cadData.mesh) {
      // Calculate scale factor based on max dimension
      const maxCurrentDimension = Math.max(
        cadData.dimensions.width,
        cadData.dimensions.height,
        cadData.dimensions.depth,
      );
      const scaleFactor = (maxDimension / maxCurrentDimension) * size;

      // Apply scale
      cadData.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);

      const canvas = design3D.renderer.domElement;
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      const updatePosition = (event: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, design3D.camera);
        const gridPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(gridPlane, intersection);

        cadData.mesh.position.copy(intersection);
        cadData.mesh.position.z = 0;
        cadData.mesh.visible = true;
      };

      const placeSU = () => {
        document.removeEventListener('mousemove', updatePosition);
        canvas.removeEventListener('click', placeSU);

        if (design3D.transformControls) {
          setTimeout(() => {
            if (design3D.activeTools) {
              if (design3D.activeTools.eraser?.isActive) {
                design3D.activeTools.eraser.isActive = false;
              }
              if (design3D.activeTools.select) {
                design3D.activeTools.select.isActive = true;
              }
            }

            design3D.transformControls.attach(cadData.mesh);
            design3D.transformControls.setMode('translate');
            design3D.transformControls.enabled = true;

            // Store SU data in userData
            cadData.mesh.userData.isSU = true;
            cadData.mesh.userData.preventEraserTool = true;
            cadData.mesh.userData.fileName = selectedFile.name;
            cadData.mesh.userData.originalScale = scaleFactor;

            // Update store
            if (store && store.dispatch) {
              store.dispatch({
                type: 'SET_ACTIVE_TOOLS',
                payload: {
                  eraser: { isActive: false },
                  select: { isActive: true },
                  measure: { isActive: false },
                },
              });

              store.dispatch({
                type: 'NEW_SU_PLACED',
                payload: {
                  id: cadData.mesh.uuid,
                  isSU: true,
                  preventEraserTool: true,
                },
              });

              if (cadData.mesh.userData.shapeData) {
                store.dispatch({
                  type: 'customDesignHistory/addToHistory',
                  payload: {
                    id: cadData.mesh.uuid,
                    type: 'ADD',
                    data: {
                      shape: cadData.mesh.userData.shapeData,
                      mesh: cadData.mesh,
                      suData: {
                        fileName: selectedFile.name,
                        dimensions: cadData.dimensions,
                        scale: scaleFactor,
                      },
                    },
                  },
                });
              }
            }
          }, 100);
        }

        design3D.renderer.render(design3D.scene, design3D.camera);
      };

      document.addEventListener('mousemove', updatePosition);
      canvas.addEventListener('click', placeSU);
    }

    setIsLoading(false);
  };

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.importDialogOverlay}>
      <div className={styles.importDialogContainer}>
        <div className={styles.importDialogHeader}>
          <h3>Import 3D File</h3>
          <img
            src={closeIcon.src}
            alt="Close"
            className={styles.closeIcon}
            onClick={onClose}
          />
        </div>

        <div className={styles.importDialogContent}>
          <div className={styles.fileSelectArea}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".skp,.stl"
              style={{ display: 'none' }}
            />
            <button
              className={styles.selectFileButton}
              onClick={handleSelectFile}
            >
              Select File
            </button>
            {selectedFile && (
              <div className={styles.selectedFileName}>{selectedFile.name}</div>
            )}
          </div>

          <div className={styles.sizeControls}>
            <div className={styles.sizeControl}>
              <label>Size Multiplier:</label>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={size}
                onChange={handleSizeChange}
              />
              <span>{size.toFixed(1)}x</span>
            </div>
            <div className={styles.sizeControl}>
              <label>Max Dimension (cm):</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={maxDimension}
                onChange={handleMaxDimensionChange}
              />
            </div>
          </div>

          {isLoading && (
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress}%` }}
              />
              <span className={styles.progressText}>
                {Math.round(progress)}%
              </span>
            </div>
          )}

          {error && <div className={styles.errorMessage}>{error}</div>}

          <div className={styles.importDialogFooter}>
            <button
              className={styles.importButton}
              onClick={handleImport}
              disabled={!selectedFile || isLoading}
            >
              Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SUImportDialog;
