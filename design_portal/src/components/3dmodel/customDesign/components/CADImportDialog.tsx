import closeIcon from '@/assets/catalog/close.svg';
import { MoveHandler as MoveHandlerClass } from '@/components/3dmodel/handler/moveHandler';
import { MoveHandler } from '@/components/3dmodel/handler/moveHandlerInterface';
import { cadImporter } from '@/components/3dmodel/utils/cadImporter';
import DxfParser from 'dxf-parser';
import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { store } from '../../store';
import { Position } from '../../store/interface';
import { CADData, CustomDesignProps, DXFEntity } from '../interface';
import styles from './ImportDialog.module.css';

const CADImportDialog: React.FC<CustomDesignProps> = ({
  design3D,
  onClose,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
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
      if (
        !['stl', 'obj', 'gltf', 'glb', 'dwg', 'dxf'].includes(extension || '')
      ) {
        setError(
          'Please select a supported CAD file (STL, OBJ, GLTF/GLB, DWG, DXF).',
        );
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !design3D || !moveHandlerRef.current) {
      setError('Please select a CAD file');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress(0);

    try {
      onClose();
      const extension = selectedFile.name.split('.').pop()?.toLowerCase();
      let cadData: CADData | undefined;

      if (extension === 'dwg') {
        setError(
          'Please convert your DWG file to DXF format first using AutoCAD or other CAD software. DXF files are directly supported.',
        );
        setIsLoading(false);
        return;
      } else if (extension === 'dxf') {
        const reader = new FileReader();

        reader.onload = async (e) => {
          try {
            const text = e.target?.result as string;
            if (!text) {
              throw new Error('Failed to read DXF file');
            }

            // Parse DXF data using the correct method
            const parser = new DxfParser();
            const dxfData = parser.parseSync(text);

            if (!dxfData || !dxfData.entities) {
              throw new Error('Invalid DXF file format');
            }

            // Create a group to hold all the entities
            const group = new THREE.Group();

            // Process each entity in the DXF file
            dxfData.entities.forEach((entity: DXFEntity) => {
              let geometry;

              switch (entity.type) {
                case 'LINE':
                  if (entity.start && entity.end) {
                    geometry = new THREE.BufferGeometry().setFromPoints([
                      new THREE.Vector3(
                        entity.start.x,
                        entity.start.y,
                        entity.start.z || 0,
                      ),
                      new THREE.Vector3(
                        entity.end.x,
                        entity.end.y,
                        entity.end.z || 0,
                      ),
                    ]);
                  }
                  break;

                case 'CIRCLE':
                  if (entity.center && entity.radius) {
                    geometry = new THREE.CircleGeometry(entity.radius, 32);
                  }
                  break;

                case 'ARC':
                  if (
                    entity.center &&
                    entity.radius &&
                    entity.startAngle !== undefined &&
                    entity.endAngle !== undefined
                  ) {
                    geometry = new THREE.BufferGeometry();
                    const points = [];
                    const startAngle = entity.startAngle * (Math.PI / 180);
                    const endAngle = entity.endAngle * (Math.PI / 180);
                    const segments = 32;

                    for (let i = 0; i <= segments; i++) {
                      const angle =
                        startAngle + (endAngle - startAngle) * (i / segments);
                      points.push(
                        new THREE.Vector3(
                          entity.center.x + entity.radius * Math.cos(angle),
                          entity.center.y + entity.radius * Math.sin(angle),
                          entity.center.z || 0,
                        ),
                      );
                    }
                    geometry.setFromPoints(points);
                  }
                  break;

                case 'POLYLINE':
                case 'LWPOLYLINE':
                  const vertices = entity.vertices || entity.points;
                  if (vertices && vertices.length > 0) {
                    const points = vertices.map(
                      (v: Position) => new THREE.Vector3(v.x, v.y, v.z || 0),
                    );
                    if (entity.closed) {
                      points.push(points[0]);
                    }
                    geometry = new THREE.BufferGeometry().setFromPoints(points);
                  }
                  break;

                case 'INSERT':
                  if (entity.block && entity.block.entities) {
                    entity.block.entities.forEach(() => {
                      // Process block entities similar to main entities
                      // You might want to add more entity type handling here
                    });
                  }
                  break;
              }

              if (geometry) {
                const material = new THREE.LineBasicMaterial({
                  color: entity.color
                    ? '#' + entity.color.toString(16)
                    : '#000000',
                });
                const line = new THREE.Line(geometry, material);

                // Apply transformations if present
                if (entity.transformation) {
                  line.applyMatrix4(entity.transformation);
                }

                group.add(line);
              }
            });

            // Calculate dimensions
            const box = new THREE.Box3().setFromObject(group);
            const size = new THREE.Vector3();
            box.getSize(size);

            // Center the group
            const center = new THREE.Vector3();
            box.getCenter(center);
            group.position.sub(center);

            // Make the group initially invisible
            group.visible = false;

            // Add the group to the scene
            design3D.scene.add(group);

            cadData = {
              mesh: group,
              dimensions: {
                width: size.x,
                height: size.y,
                depth: size.z,
              },
            };

            // Set up mouse tracking for placement
            const canvas = design3D.renderer.domElement;
            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();
            const gridPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

            const updatePosition = (event: MouseEvent) => {
              const rect = canvas.getBoundingClientRect();
              mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
              mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

              raycaster.setFromCamera(mouse, design3D.camera);
              const intersection = new THREE.Vector3();
              raycaster.ray.intersectPlane(gridPlane, intersection);

              group.position.copy(intersection);
              group.position.z = 0;
              group.visible = true;

              // Render the scene
              design3D.renderer.render(design3D.scene, design3D.camera);
            };

            const placeCAD = () => {
              document.removeEventListener('mousemove', updatePosition);
              canvas.removeEventListener('click', placeCAD);

              if (design3D.transformControls) {
                design3D.transformControls.attach(group);
                design3D.transformControls.setMode('translate');
                design3D.transformControls.enabled = true;

                // Store CAD data in userData
                group.userData.isCAD = true;
                group.userData.preventEraserTool = true;
                group.userData.fileName = selectedFile.name;

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
                    type: 'NEW_CAD_PLACED',
                    payload: {
                      id: group.uuid,
                      isCAD: true,
                      preventEraserTool: true,
                    },
                  });

                  store.dispatch({
                    type: 'customDesignHistory/addToHistory',
                    payload: {
                      id: group.uuid,
                      type: 'ADD',
                      data: {
                        shape: group.userData.shapeData,
                        mesh: group,
                        cadData: cadData
                          ? {
                              fileName: selectedFile.name,
                              dimensions: cadData.dimensions,
                            }
                          : undefined,
                      },
                    },
                  });
                }
              }
            };

            document.addEventListener('mousemove', updatePosition);
            canvas.addEventListener('click', placeCAD);

            setIsLoading(false);
          } catch (err) {
            console.error('Error loading DXF file:', err);
            setError(
              'Failed to load DXF file. Please ensure it is a valid DXF file.',
            );
            setIsLoading(false);
          }
        };

        reader.readAsText(selectedFile);
        return;
      } else {
        const importedData = await cadImporter.importCADFile({
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

        if (importedData) {
          cadData = {
            mesh: importedData.mesh,
            dimensions: importedData.dimensions,
          };
        }
      }

      if (cadData && cadData.mesh) {
        handleMeshPlacement(cadData);
      } else {
        setError('Failed to import CAD file. No valid data was loaded.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error importing CAD file:', err);
      setError('Failed to import CAD file. Please try again.');
      setIsLoading(false);
    }
  };

  const handleMeshPlacement = (cadData: CADData) => {
    if (!design3D || !cadData.mesh || !selectedFile) return;

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

    const placeCAD = () => {
      document.removeEventListener('mousemove', updatePosition);
      canvas.removeEventListener('click', placeCAD);

      if (design3D.transformControls) {
        setTimeout(() => {
          design3D.transformControls.attach(cadData.mesh);
          design3D.transformControls.setMode('translate');
          design3D.transformControls.enabled = true;

          // Store CAD data in userData
          cadData.mesh.userData.isCAD = 1;
          cadData.mesh.userData.preventEraserTool = true;
          cadData.mesh.userData.fileName = selectedFile.name;

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
              type: 'NEW_CAD_PLACED',
              payload: {
                id: cadData.mesh.uuid,
                isCAD: true,
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
                    cadData: {
                      fileName: selectedFile.name,
                      dimensions: cadData.dimensions,
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
    canvas.addEventListener('click', placeCAD);
    setIsLoading(false);
  };

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.importDialogOverlay}>
      <div className={styles.importDialogContainer}>
        <div className={styles.importDialogHeader}>
          <h3>Import CAD File</h3>
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
              accept=".stl,.obj,.gltf,.glb,.dwg,.dxf"
              style={{ display: 'none' }}
            />
            <button
              className={styles.selectFileButton}
              onClick={handleSelectFile}
            >
              Select CAD File
            </button>
            {selectedFile && (
              <div className={styles.selectedFileName}>{selectedFile.name}</div>
            )}
          </div>

          <div className={styles.supportedFormats}>
            <p>Supported formats: STL, GLTF/GLB, DWG, DXF</p>
            <p className={styles.warningMessage}>
              Note: For best results, ensure your CAD files are properly scaled
              and oriented before importing.
            </p>
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

export default CADImportDialog;
