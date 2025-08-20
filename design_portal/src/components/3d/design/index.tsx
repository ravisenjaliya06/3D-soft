// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { DesignProps } from '../interface';
import { actionChoices } from '../utils/choices';
import objectHandler from './handler';
import { calculateBoxes, findBoxContainingPoint } from './handler/utils';
import { init3DDesign, ThreeDView } from './scene';
import { createScene } from './scene-creator';

const Design: React.FC<{ DesignProps: DesignProps }> = ({ DesignProps }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const latestProps = useRef(DesignProps);
  const [Design3D, setDesign3D] = useState<ThreeDView | null>(null);

  useEffect(() => {
    const loadScene = async () => {
      try {
        if (!mountRef.current) return;
        const design3D = init3DDesign(mountRef.current);
        const { Design3D1, cupBoardData, childIds } =
          await createScene(design3D);
        if (DesignProps.setScene) {
          DesignProps.setScene(Design3D1.scene);
        }

        if (DesignProps.setcupBoardData) {
          DesignProps.setcupBoardData([
            {
              data: cupBoardData,
              childs: childIds,
              type: 'CUPBOARD',
            },
          ]);
        }
        setDesign3D(Design3D1);
        if (DesignProps.setIsReady) {
          DesignProps.setIsReady(true);
        }
      } catch (error) {
        console.error('Error loading scene:', error);
      }
    };

    loadScene(); // Call the async function inside useEffect
  }, []);

  useEffect(() => {
    latestProps.current = DesignProps;
    if (!Design3D) return;
    if (latestProps.current.scene) {
      Design3D.scene = latestProps.current.scene;
    }
  }, [DesignProps]);

  const createEdgeLine = (selected_box: any): THREE.LineSegments => {
    const boxGeometry = new THREE.BoxGeometry(
      selected_box.width,
      selected_box.height,
      20,
    );
    const edges = new THREE.EdgesGeometry(boxGeometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xffff00,
      linewidth: 2,
    });
    const edgeLines = new THREE.LineSegments(edges, edgeMaterial);

    // Position the edges at the correct location
    edgeLines.position.set(selected_box.center.x, selected_box.center.y, 1);
    return edgeLines;
  };

  useEffect(() => {
    if (mountRef.current) {
      if (!latestProps.current.isReady) return;
      if (!Design3D) return;

      const handleObjectSelection = (event: MouseEvent) => {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, Design3D.camera);
        const intersects = raycaster.intersectObjects(Design3D.scene.children);
        if (intersects.length > 0) {
          const selectedObject = intersects[0].object.parent;
          const clickPoint = intersects[0].point;
          const localPoint = selectedObject?.worldToLocal(clickPoint.clone());

          const mainCupboard = latestProps.current.cupBoardData?.find(
            (cupboard) => cupboard.childs.includes(intersects[0].object.uuid),
          );
          if (mainCupboard) {
            if (latestProps.current.selectedEgdeLine) {
              //@ts-ignore
              latestProps.current?.selectedObject.remove(
                latestProps.current.selectedEgdeLine,
              );
            }

            if (latestProps.current.selectedObjectLine) {
              //@ts-ignore
              latestProps.current?.selectedObject.remove(
                latestProps.current.selectedObjectLine,
              );
            }

            const selected_box = {
              width: selectedObject?.userData.width,
              height: selectedObject?.userData.height,
              center: { x: 0, y: 0 },
            };

            const edgeLines = createEdgeLine(selected_box);
            selectedObject?.add(edgeLines);
            if (latestProps.current.setSelectedEgdeLine) {
              latestProps.current.setSelectedEgdeLine(edgeLines);
            }
          }

          if (selectedObject instanceof THREE.Mesh) {
            if (latestProps.current.selectedObject) {
              if (latestProps.current.selectedEgdeLine) {
                latestProps.current?.selectedObject.remove(
                  latestProps.current.selectedEgdeLine,
                );
              }

              if (latestProps.current.selectedObjectLine) {
                latestProps.current?.selectedObject.remove(
                  latestProps.current.selectedObjectLine,
                );
              }
            }
            if (localPoint instanceof THREE.Vector3) {
              localStorage.setItem(
                'clicked_point',
                JSON.stringify({
                  x: localPoint.x,
                  y: localPoint.y,
                  z: localPoint.z,
                }),
              );
              let boxes;
              if (latestProps.current.cupBoardData) {
                boxes = calculateBoxes(
                  latestProps.current?.cupBoardData[0]?.data,
                );
              }
              let selected_box;
              if (boxes) {
                selected_box = findBoxContainingPoint(boxes);
              }
              if (selected_box) {
                if (
                  selectedObject.name === 'DRAWER' ||
                  (selectedObject.name === '' &&
                    selectedObject.children[0].name === 'RIGHT_DOOR') ||
                  selectedObject.children[0].name === 'PLANK'
                ) {
                } else {
                  const edgeLines = createEdgeLine(selected_box);

                  selectedObject.add(edgeLines);
                  if (latestProps.current.setSelectedEgdeLine) {
                    latestProps.current.setSelectedEgdeLine(edgeLines);
                  }

                  if (latestProps.current.setSelectedObjectLine) {
                    latestProps.current.setSelectedObjectLine(edgeLines);
                  }
                }
              }
            }
            latestProps.current.setSelectedObject(selectedObject);
          }
        } else {
          latestProps.current.setSelectedObject(null);
        }
      };

      window.addEventListener('dblclick', handleObjectSelection);

      return () => {
        window.removeEventListener('dblclick', handleObjectSelection);
      };
    }
  }, [DesignProps.cupBoardData]);

  useEffect(() => {
    const handleDeleteObject = async (event: KeyboardEvent) => {
      if (event.key === 'Delete' && DesignProps.selectedObject) {
        const updatedScene = await objectHandler(
          // @ts-ignore
          { action: actionChoices.DELETE_OBJECT, type: '', item: '' },
          DesignProps,
          // @ts-ignore
          DesignProps.scene,
          null,
          DesignProps.selectedObject,
        );

        DesignProps.setSelectedObject(null);
        // @ts-ignore
        if (updatedScene) {
          DesignProps?.setScene?.(updatedScene); // Now, it's a proper THREE.Scene object
        }
      }
    };

    window.addEventListener('keydown', handleDeleteObject);

    return () => {
      window.removeEventListener('keydown', handleDeleteObject);
    };
  }, [DesignProps.selectedObject, DesignProps.scene]);

  return (
    <div style={{ position: 'absolute' }}>
      <div ref={mountRef}></div>
    </div>
  );
};

export default Design;
