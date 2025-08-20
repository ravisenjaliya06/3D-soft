import closeIcon from '@/assets/catalog/close.svg';
import { MoveHandler as MoveHandlerClass } from '@/components/3dmodel/handler/moveHandler';
import { MoveHandler } from '@/components/3dmodel/handler/moveHandlerInterface';
import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { store } from '../../store';
import { addObjectToScene } from '../handler/objectCreator';
import { CustomDesignProps } from '../interface';
import styles from './ImportDialog.module.css';

const ImportImage: React.FC<CustomDesignProps> = ({ design3D, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState(1);
  const [maxDimension, setMaxDimension] = useState(100);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const moveHandlerRef = useRef<MoveHandler | null>(null);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [isInitialized, setIsInitialized] = useState(false);

  // Function to save image state to localStorage
  const saveImageState = (imageMesh: THREE.Object3D) => {
    if (!imageMesh.userData.dimensions) return;

    const imageState = {
      id: imageMesh.uuid,
      position: {
        x: imageMesh.position.x,
        y: imageMesh.position.y,
        z: imageMesh.position.z,
      },
      rotation: {
        x: imageMesh.rotation.x,
        y: imageMesh.rotation.y,
        z: imageMesh.rotation.z,
      },
      scale: {
        x: imageMesh.scale.x,
        y: imageMesh.scale.y,
        z: imageMesh.scale.z,
      },
      dimensions: {
        width: imageMesh.userData.dimensions.width,
        height: imageMesh.userData.dimensions.height,
        sizeMultiplier: imageMesh.userData.dimensions.sizeMultiplier,
        maxDimension: imageMesh.userData.dimensions.maxDimension,
        imageSize: imageMesh.userData.dimensions.imageSize,
      },
      metadata: {
        timestamp: Date.now(),
        persistDuringTransform: true,
        aspectRatio: imageMesh.userData.dimensions.aspectRatio,
        fileName: imageMesh.userData.dimensions.fileName,
      },
      imageUrl: imageMesh.userData.originalImageUrl,
    };
    localStorage.setItem('lastImageState', JSON.stringify(imageState));
  };

  // Function to load image state from localStorage
  const loadImageState = () => {
    const savedState = localStorage.getItem('lastImageState');
    return savedState ? JSON.parse(savedState) : null;
  };

  // Initialize image properties from existing data if available
  React.useEffect(() => {
    if (design3D && !isInitialized) {
      const savedState = loadImageState();
      const existingImages = design3D.scene.children.filter(
        (child) => child.userData.isImage,
      );

      // Sort by timestamp if available, otherwise use the last one
      const latestImage = existingImages.sort((a, b) => {
        const timeA = a.userData.timestamp || 0;
        const timeB = b.userData.timestamp || 0;
        return timeB - timeA;
      })[0];

      if (latestImage) {
        // Get data from the image's userData
        const imageData = latestImage.userData.data || {};
        const dimensions = imageData.dimensions || {};
        const metadata = imageData.imageMetadata || {};

        // Always use saved state if available
        if (savedState && savedState.id === latestImage.uuid) {
          // Restore position from saved state or image data
          const position = savedState.position ||
            imageData.position || { x: 0, y: 0, z: 0 };
          latestImage.position.set(position.x, position.y, position.z);

          // Restore rotation from saved state or image data
          const rotation = savedState.rotation || {
            x: imageData.rotateX || 0,
            y: imageData.rotateY || 0,
            z: imageData.rotateZ || 0,
          };
          latestImage.rotation.set(rotation.x, rotation.y, rotation.z);

          // Restore scale from saved state or image data
          const scale = savedState.scale ||
            imageData.scale || { x: 1, y: 1, z: 1 };
          latestImage.scale.set(scale.x, scale.y, scale.z);

          // Restore dimensions
          const finalDimensions = {
            width: dimensions.width || savedState.dimensions?.width || 0,
            height: dimensions.height || savedState.dimensions?.height || 0,
            sizeMultiplier:
              dimensions.sizeMultiplier ||
              savedState.dimensions?.sizeMultiplier ||
              1,
            maxDimension:
              dimensions.maxDimension ||
              savedState.dimensions?.maxDimension ||
              100,
            imageSize: dimensions.imageSize ||
              savedState.dimensions?.imageSize || { width: 0, height: 0 },
            aspectRatio:
              imageData.aspectRatio || savedState.dimensions?.aspectRatio || 1,
            fileName:
              imageData.fileName ||
              savedState.dimensions?.fileName ||
              'image.png',
          };

          // Update the image's dimensions
          latestImage.userData.dimensions = finalDimensions;

          // Update state with dimensions
          setSize(finalDimensions.sizeMultiplier);
          setMaxDimension(finalDimensions.maxDimension);
          setImageSize(finalDimensions.imageSize);

          // Restore metadata
          const finalMetadata = {
            timestamp:
              metadata.timestamp ||
              savedState.metadata?.timestamp ||
              Date.now(),
            persistDuringTransform:
              metadata.persistDuringTransform ||
              savedState.metadata?.persistDuringTransform ||
              true,
          };

          latestImage.userData.metadata = finalMetadata;
        } else if (imageData) {
          // Use image data if no saved state
          const finalDimensions = {
            width: dimensions.width || 0,
            height: dimensions.height || 0,
            sizeMultiplier: dimensions.sizeMultiplier || 1,
            maxDimension: dimensions.maxDimension || 100,
            imageSize: dimensions.imageSize || { width: 0, height: 0 },
            aspectRatio: imageData.aspectRatio || 1,
            fileName: imageData.fileName || 'image.png',
          };

          // Update the image's dimensions
          latestImage.userData.dimensions = finalDimensions;

          // Update state with dimensions
          setSize(finalDimensions.sizeMultiplier);
          setMaxDimension(finalDimensions.maxDimension);
          setImageSize(finalDimensions.imageSize);

          // Set metadata
          latestImage.userData.metadata = {
            timestamp: metadata.timestamp || Date.now(),
            persistDuringTransform: metadata.persistDuringTransform || true,
          };
        }

        setIsInitialized(true);
      }
    }
  }, [design3D, isInitialized]);

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
      if (!file.type.match('image.*')) {
        setError('Please select an image file (jpg, png, gif, etc.)');
        setSelectedFile(null);
        setPreviewUrl(null);
        return;
      }

      setSelectedFile(file);
      setError(null);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setPreviewUrl(dataUrl);
        const img = new Image();
        img.onload = () => {
          // Calculate initial dimensions while maintaining aspect ratio
          let width = img.width;
          let height = img.height;

          // Set initial size based on maxDimension
          const maxDim = Math.max(width, height);
          if (maxDim > maxDimension) {
            const scale = maxDimension / maxDim;
            width *= scale;
            height *= scale;
          }

          setImageSize({ width, height });
          setIsInitialized(true);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const updatePreviewSize = () => {
    if (!imageSize.width || !imageSize.height) return;

    // Calculate dimensions based on original image size and multiplier
    let width = imageSize.width * size;
    let height = imageSize.height * size;

    // Scale down if either dimension exceeds maxDimension
    const maxDim = Math.max(width, height);
    if (maxDim > maxDimension) {
      const scale = maxDimension / maxDim;
      width *= scale;
      height *= scale;
    }

    // Update preview size state with rounded values
    setPreviewSize({
      width: Math.round(width * 10) / 10,
      height: Math.round(height * 10) / 10,
    });
  };

  // Update preview size whenever relevant values change
  React.useEffect(() => {
    if (isInitialized) {
      updatePreviewSize();
    }
  }, [size, maxDimension, imageSize, isInitialized]);

  const handleSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = parseFloat(event.target.value);
    setSize(newSize);
  };

  const handleMaxDimensionChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newMaxDimension = parseInt(event.target.value);
    setMaxDimension(newMaxDimension);
  };

  const handleImport = async () => {
    if (!selectedFile || !previewUrl || !design3D || !moveHandlerRef.current) {
      setError('Please select an image file');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      onClose();
      const textureLoader = new THREE.TextureLoader();
      const texturePromise = new Promise<THREE.Texture>((resolve) => {
        textureLoader.load(previewUrl, (loadedTexture) => {
          loadedTexture.needsUpdate = true;
          loadedTexture.flipY = false;
          loadedTexture.colorSpace = THREE.SRGBColorSpace;
          const renderer = new THREE.WebGLRenderer();
          const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
          loadedTexture.anisotropy = maxAnisotropy;
          renderer.dispose();

          resolve(loadedTexture);
        });
      });
      const texture = await texturePromise;
      const fileName = selectedFile.name;
      const aspectRatio = imageSize.width / imageSize.height;

      // Calculate final dimensions based on size multiplier and max dimension
      let finalWidth = imageSize.width * size;
      let finalHeight = imageSize.height * size;

      // Scale down if either dimension exceeds maxDimension
      const maxDim = Math.max(finalWidth, finalHeight);
      if (maxDim > maxDimension) {
        const scale = maxDimension / maxDim;
        finalWidth *= scale;
        finalHeight *= scale;
      }

      const imageData = {
        type: 'image' as const,
        dimensions: {
          width: finalWidth,
          height: finalHeight,
          imageUrl: previewUrl,
          imageSize: {
            width: finalWidth,
            height: finalHeight,
          },
          fileName: fileName,
          aspectRatio: aspectRatio,
          sizeMultiplier: size,
          maxDimension: maxDimension,
        },
        preloadedTexture: texture,
        imageData: {
          dataUrl: previewUrl,
          fileName: fileName,
          aspectRatio: aspectRatio,
          sizeMultiplier: size,
          maxDimension: maxDimension,
          dimensions: {
            width: finalWidth,
            height: finalHeight,
          },
        },
      };

      const imageMesh = await addObjectToScene(
        design3D.scene,
        design3D.camera,
        imageData,
        moveHandlerRef.current,
        store.dispatch,
      );

      if (imageMesh) {
        onClose();
        const canvas = design3D.renderer.domElement;
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const updatePosition = (event: MouseEvent) => {
          const rect = canvas.getBoundingClientRect();
          mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

          // Update the raycaster
          raycaster.setFromCamera(mouse, design3D.camera);
          const gridPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
          const intersection = new THREE.Vector3();
          raycaster.ray.intersectPlane(gridPlane, intersection);

          // Update image position
          imageMesh.position.copy(intersection);
          imageMesh.position.z = 0;
          imageMesh.visible = true;
        };

        const placeImage = () => {
          document.removeEventListener('mousemove', updatePosition);
          canvas.removeEventListener('click', placeImage);

          // Store the final position and dimensions
          const finalPosition = {
            x: imageMesh.position.x,
            y: imageMesh.position.y,
            z: imageMesh.position.z,
          };

          // Ensure all dimension data is properly set
          const finalDimensions = {
            width: finalWidth,
            height: finalHeight,
            sizeMultiplier: size,
            maxDimension: maxDimension,
            imageSize: {
              width: finalWidth,
              height: finalHeight,
            },
            aspectRatio: aspectRatio,
            fileName: selectedFile?.name || 'image.png',
          };

          // Set initial metadata
          const metadata = {
            timestamp: Date.now(),
            persistDuringTransform: true,
          };

          imageMesh.userData.lastPosition = finalPosition;
          imageMesh.userData.timestamp = Date.now();
          imageMesh.userData.dimensions = finalDimensions;
          imageMesh.userData.metadata = metadata;

          // Save the complete image state
          saveImageState(imageMesh);

          if (design3D.transformControls) {
            setTimeout(() => {
              if (design3D.activeTools) {
                // Disable eraser if it was active
                if (
                  design3D.activeTools.eraser &&
                  design3D.activeTools.eraser.isActive
                ) {
                  design3D.activeTools.eraser.isActive = false;
                }

                if (design3D.activeTools.select) {
                  design3D.activeTools.select.isActive = true;
                }
              }
              design3D.transformControls.attach(imageMesh);
              design3D.transformControls.setMode('translate');
              design3D.transformControls.enabled = true;

              const onObjectChange = () => {
                if (imageMesh && imageMesh.material) {
                  const material =
                    imageMesh.material as THREE.MeshBasicMaterial;
                  if (material.map) {
                    material.map.needsUpdate = true;
                    material.needsUpdate = true;
                  }
                }

                // Update position and save state
                const newPosition = {
                  x: imageMesh.position.x,
                  y: imageMesh.position.y,
                  z: imageMesh.position.z,
                };
                imageMesh.userData.lastPosition = newPosition;
                imageMesh.userData.timestamp = Date.now();

                // Ensure dimensions and metadata are preserved during position changes
                imageMesh.userData.dimensions = {
                  ...imageMesh.userData.dimensions,
                  ...finalDimensions,
                };
                imageMesh.userData.metadata = {
                  ...imageMesh.userData.metadata,
                  ...metadata,
                };

                saveImageState(imageMesh);
              };

              design3D.transformControls.addEventListener(
                'objectChange',
                onObjectChange,
              );

              if (previewUrl) {
                imageMesh.userData.originalImageUrl = previewUrl;
                imageMesh.userData.isImage = true;
                imageMesh.userData.preventEraserTool = true;
                imageMesh.userData.dimensions = {
                  width: finalWidth,
                  height: finalHeight,
                  sizeMultiplier: size,
                  maxDimension: maxDimension,
                };
              }

              design3D.transformControls.enabled = true;
              if (store && store.dispatch) {
                try {
                  store.dispatch({
                    type: 'SET_ACTIVE_TOOLS',
                    payload: {
                      eraser: { isActive: false },
                      select: { isActive: true },
                      measure: { isActive: false },
                    },
                  });
                  store.dispatch({
                    type: 'NEW_IMAGE_PLACED',
                    payload: {
                      id: imageMesh.uuid,
                      isImage: true,
                      preventEraserTool: true,
                      dimensions: {
                        width: finalWidth,
                        height: finalHeight,
                        sizeMultiplier: size,
                        maxDimension: maxDimension,
                      },
                      position: finalPosition,
                      timestamp: imageMesh.userData.timestamp,
                    },
                  });
                  if (imageMesh.userData && imageMesh.userData.shapeData) {
                    const shapeData = imageMesh.userData.shapeData;
                    store.dispatch({
                      type: 'customDesignHistory/addToHistory',
                      payload: {
                        id: imageMesh.uuid,
                        type: 'ADD',
                        data: {
                          shape: shapeData,
                          mesh: imageMesh,
                          imageData: {
                            url: previewUrl,
                            fileName: selectedFile?.name || 'image.png',
                            aspectRatio: aspectRatio,
                            dimensions: {
                              width: finalWidth,
                              height: finalHeight,
                            },
                            sizeMultiplier: size,
                            maxDimension: maxDimension,
                            position: finalPosition,
                            timestamp: imageMesh.userData.timestamp,
                          },
                        },
                      },
                    });
                  } else {
                    console.warn(
                      'Could not find shape data for image, undo/redo may not work properly',
                    );
                  }
                } catch (e) {
                  console.warn('Could not dispatch event to store:', e);
                }
              }

              if (
                design3D &&
                design3D.activeTools &&
                design3D.activeTools.eraser
              ) {
                try {
                  design3D.activeTools.eraser.isActive = false;
                  if (design3D.activeTools.select) {
                    design3D.activeTools.select.isActive = true;
                  }
                } catch (toolError) {
                  console.warn(
                    'Could not directly modify tool state:',
                    toolError,
                  );
                }
              }
            }, 100);
          }

          // Force a render update
          design3D.renderer.render(design3D.scene, design3D.camera);
        };

        // Add event listeners for manual placement
        document.addEventListener('mousemove', updatePosition);
        canvas.addEventListener('click', placeImage);
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Error importing image:', err);
      setError('Failed to import image. Please try again.');
      setIsLoading(false);
    }
  };

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.importDialogOverlay}>
      <div className={styles.importDialogContainer}>
        <div className={styles.importDialogHeader}>
          <h3>Import Image</h3>
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
              accept="image/*"
              style={{ display: 'none' }}
            />
            <button
              className={styles.selectFileButton}
              onClick={handleSelectFile}
            >
              Select Image File
            </button>
            {selectedFile && (
              <div className={styles.selectedFileName}>{selectedFile.name}</div>
            )}
          </div>

          {previewUrl && (
            <div className={styles.previewContainer}>
              <h3>Preview:</h3>
              <img
                src={previewUrl}
                alt="Preview"
                className={styles.imagePreview}
              />
              <div className={styles.previewSize}>
                <p>
                  Preview Size: {previewSize.width.toFixed(1)} x{' '}
                  {previewSize.height.toFixed(1)} cm
                  <br />
                  <small>
                    Original: {imageSize.width.toFixed(1)} x{' '}
                    {imageSize.height.toFixed(1)} cm
                  </small>
                </p>
              </div>
            </div>
          )}

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

          {error && <div className={styles.errorMessage}>{error}</div>}
          <div className={styles.importDialogActions}>
            <button className={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button
              className={styles.importButton}
              onClick={handleImport}
              disabled={!selectedFile || isLoading}
            >
              {isLoading ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportImage;
