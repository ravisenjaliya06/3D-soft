import { API_ENDPOINT } from '@/services/ApiEndPoints';
import commonService from '@/services/CommonService';
import * as THREE from 'three';
import { createOutlineForObject, removeExistingLines } from '../design';
import { mmToMeters } from '../handler/unitConversion';
import { CatalogItem, ChildCatalog, ResponseStatus } from '../interface';
import { generateMinifixSystem, MINIFIX_STANDARDS, visualizeMinifixConnections } from '../minifix';
import { AppDispatch, store } from '../store';
import { updateObject } from '../store/dataSlice';
import { trackPropertyChange } from '../store/historySlice';
import { Object3D } from '../store/interface';
import { updateObjectGeometry } from '../utils/geometryUtils';
import { ITEM, ItemData, PLANK, UpdatedItemData } from './interface';

function getDesignId(): string | null {
  const url = window.location.href;
  const designId = url.split('/').pop();
  return designId || null;
}

function itemCheck(object: Object3D): boolean {
  return (
    object.name.includes(ITEM.PLANK) &&
    !object.name.includes(ITEM.DRAWER) &&
    !object.name.includes(ITEM.DOOR)
  );
}
export const updateObjectInDatabase = async (
  objectId: string,
  updatedMainData: Partial<Object3D>,
  selectedObject: Object3D,
  items: CatalogItem[] = [],
  childCatalogs: ChildCatalog[] = [],
): Promise<THREE.Scene | null> => {
  const designId = getDesignId();
  if (!designId) {
    console.error('No design ID found in URL');
    return null;
  }

  const mainDataObject = {
    id: selectedObject.id,
    name: selectedObject.name || '',
    width: updatedMainData.width ?? selectedObject.width ?? 1,
    height: updatedMainData.height ?? selectedObject.height ?? 1,
    depth: updatedMainData.depth ?? selectedObject.depth ?? 1,
    position: {
      x: updatedMainData.position?.x ?? selectedObject.position?.x ?? 0,
      y: updatedMainData.position?.y ?? selectedObject.position?.y ?? 0,
      z: updatedMainData.position?.z ?? selectedObject.position?.z ?? 0,
    },
    rotateX: updatedMainData.rotationX ?? selectedObject.rotationX ?? 0,
    rotateY: updatedMainData.rotationY ?? selectedObject.rotationY ?? 0,
    rotateZ: updatedMainData.rotationZ ?? selectedObject.rotationZ ?? 0,
    grooves: selectedObject.grooves || [],
    child: selectedObject.child || [],
    parent: selectedObject.parent || null,
    layer: selectedObject.layer ?? 0,
    altitude: selectedObject.altitude ?? 0,
    material: selectedObject.material || { type: 'TEXTURE', value: 'default' },
    catalog_type: selectedObject.catalog_type || '',
    // Include Minifix data
    minifixSpacing: updatedMainData.minifixSpacing ?? selectedObject.minifixSpacing,
    minifixConnections:
      updatedMainData.minifixConnections ?? (selectedObject.minifixConnections || []),
    minifixHoles: updatedMainData.minifixHoles ?? (selectedObject.minifixHoles || []),
  };

  // Create a Set to track unique items
  const uniqueItems = new Set<string>();
  const uniqueChildCatalogs = new Set<string>();

  // Filter out items that are the main cupboard
  const filteredItems = items.filter((item) => item.id !== objectId);

  const payload = {
    data: {
      catalog: {
        id: objectId,
        name: selectedObject.name || '',
        data: mainDataObject,
      },
      items: filteredItems
        .filter((item) => {
          // Check for duplicates
          if (uniqueItems.has(item.id)) return false;
          uniqueItems.add(item.id);
          return true;
        })
        .map((item) => ({
          id: item.id,
          name: item.name,
          data: {
            name: item.data.name,
            width: item.data.width,
            height: item.data.height,
            depth: item.data.depth,
            position: item.data.position,
            material: item.data.material || {
              type: 'TEXTURE',
              value: 'wood_3',
            },
            parent: item.data.parent || '',
            child: item.data.child || [],
            ...(item.data.minifixHoles && {
              minifixHoles: item.data.minifixHoles,
            }),
            grooves: item.data.grooves || [],
          },
          material: item.material || '',
        })),
      child_catalogs: childCatalogs
        .filter((catalog) => {
          // Ensure main cupboard is not in child_catalogs
          if (catalog.catalog.id === objectId) return false;
          // Check for duplicates
          if (uniqueChildCatalogs.has(catalog.catalog.id)) return false;
          uniqueChildCatalogs.add(catalog.catalog.id);
          return true;
        })
        .map((catalog) => ({
          catalog: {
            id: catalog.catalog.id,
            name: catalog.catalog.name,
            data: {
              position: catalog.catalog.data.position,
              // Add Minifix data to child catalogs if present
              ...(catalog.catalog.data.minifixHoles && {
                minifixHoles: catalog.catalog.data.minifixHoles,
              }),
              ...(catalog.catalog.data.minifixConnections && {
                minifixConnections: catalog.catalog.data.minifixConnections,
              }),
            },
          },
          items: catalog.items.map((item) => ({
            id: item.id,
            name: item.name,
            data: {
              width: item.data.width,
              height: item.data.height,
              depth: item.data.depth,
              position: item.data.position,
              material: item.data.material || {
                type: 'TEXTURE',
                value: 'wood_3',
              },
              grooves: item.data.grooves || [],
            },
            material: item.material || null,
            grooves: item.data.grooves || [],
          })),
        })),
    },
  };

  const response = await commonService.put(
    API_ENDPOINT.UPDATE_OBJECT_DATA(designId),
    payload
  );

  if ((response as ResponseStatus).status === 200) {
    return response;
  } else {
    console.error(`Failed to update object ${objectId}: ${(response as ResponseStatus).status}`);
    return null;
  }
};

export const updateObjectInScene = (
  objectId: string,
  updatedData: Partial<Object3D>,
  scene: THREE.Scene,
  dispatch: AppDispatch,
  selectedObject: Object3D | null,
): void => {
  if (!scene || !selectedObject) return;
  removeExistingLines();
  const allObjects = store.getState().data.objects;
  let threeDObject: THREE.Mesh | undefined;
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.userData.objectId === objectId) {
      threeDObject = obj;
    }
  });

  if (!threeDObject || !(threeDObject instanceof THREE.Mesh)) {
    console.error(`Main object mesh not found for ID: ${objectId}`);
    return;
  }
  const currentWidth = selectedObject.width || 1;
  const currentHeight = selectedObject.height || 1;
  const currentDepth = selectedObject.depth || 1;
  const currentPosition = selectedObject.position || { x: 0, y: 0, z: 0 };

  const widthRatio = updatedData.width ? updatedData.width / currentWidth : 1;
  const heightRatio = updatedData.height ? updatedData.height / currentHeight : 1;
  const depthRatio = updatedData.depth ? updatedData.depth / currentDepth : 1;

  let serializableObject = {
    ...selectedObject,
    width: updatedData.width ?? currentWidth,
    height: updatedData.height ?? currentHeight,
    depth: updatedData.depth ?? currentDepth,
    position: {
      x: updatedData.position?.x ?? currentPosition.x,
      y: updatedData.position?.y ?? currentPosition.y,
      z: updatedData.position?.z ?? currentPosition.z,
    },
    rotationX: updatedData.rotationX ?? selectedObject.rotationX,
    rotationY: updatedData.rotationY ?? selectedObject.rotationY,
    rotationZ: updatedData.rotationZ ?? selectedObject.rotationZ,
  };

  let updatedItems: UpdatedItemData[] = [];
  if (
    updatedData.minifixSpacing !== undefined ||
    updatedData.width !== undefined ||
    updatedData.height !== undefined ||
    updatedData.depth !== undefined
  ) {
    try {
      const cupboardObject = scene.children.find(
        (obj) => obj.userData.objectId === selectedObject.id
      ) as THREE.Mesh;

      if (cupboardObject) {
        // Collect planks and update their depths
        const planks = allObjects
          .filter((obj) => obj.parent === selectedObject.id && itemCheck(obj))
          .map((obj) => ({
            id: obj.id,
            name: obj.name,
            width: updatedData.width ? obj.width * widthRatio : obj.width,
            height: updatedData.height ? obj.height * heightRatio : obj.height,
            depth: updatedData.depth && obj.depth ? obj.depth * depthRatio : obj.depth,
            position: {
              x: obj.position.x * widthRatio || 0,
              y: obj.position.y * heightRatio || 0,
              z: obj.position.z * depthRatio || 0,
            },
            parent: obj.parent,
            material: obj.material,
            child: obj.child || [],
            grooves: obj.grooves || [],
            minifixHoles: obj.minifixHoles || [],
          }));

        if (planks.length > 0) {
          const minifixSpacing =
            updatedData.minifixSpacing ??
            selectedObject.minifixSpacing ??
            MINIFIX_STANDARDS.SPACING;
          const minifixSystem = generateMinifixSystem(selectedObject.id, planks, minifixSpacing);

          if (minifixSystem.connections.length > 0) {
            // Clear existing Minifix visualizations
            const existingMinifixObjects: THREE.Object3D[] = [];
            cupboardObject.traverse((child) => {
              if (
                child.name.startsWith('Minifix_Screw_') ||
                child.name.startsWith('Minifix_Cam_') ||
                child.name.startsWith('Minifix_Dowel_') ||
                child.name.startsWith('Minifix_BoltDrill_')
              ) {
                existingMinifixObjects.push(child);
              }
            });

            existingMinifixObjects.forEach((obj) => {
              cupboardObject.remove(obj);
              if (obj instanceof THREE.Mesh) {
                obj.geometry.dispose();
                if (obj.material instanceof THREE.Material) {
                  obj.material.dispose();
                }
              }
            });

            visualizeMinifixConnections(minifixSystem.connections, cupboardObject);

            // Update cupboard object with new Minifix data
            serializableObject = {
              ...serializableObject,
              minifixSpacing: minifixSpacing,
              minifixConnections: minifixSystem.connections,
            };

            dispatch(updateObject(serializableObject));

            minifixSystem.planksWithHoles.forEach((plankWithHoles) => {
              const plankObject = cupboardObject.children.find(
                (child) => child.userData.objectId === plankWithHoles.id
              ) as THREE.Mesh | undefined;

              const originalPlank = allObjects.find((obj) => obj.id === plankWithHoles.id);
              if (!originalPlank) return;

              if (plankObject && plankObject instanceof THREE.Mesh) {
                plankObject.geometry.dispose();
                plankObject.geometry = new THREE.BoxGeometry(
                  mmToMeters(plankWithHoles.width),
                  mmToMeters(plankWithHoles.height),
                  mmToMeters(plankWithHoles.depth)
                );
                plankObject.position.set(
                  mmToMeters(plankWithHoles.position.x * widthRatio),
                  mmToMeters(plankWithHoles.position.y * heightRatio),
                  mmToMeters(plankWithHoles.position.z * depthRatio)
                );
                plankObject.geometry.attributes.position.needsUpdate = true;
                plankObject.geometry.computeVertexNormals();
                plankObject.updateMatrix();
                plankObject.updateMatrixWorld(true);

                const updatedPlank = {
                  ...originalPlank,
                  width: plankWithHoles.width,
                  height: plankWithHoles.height,
                  depth: plankWithHoles.depth,
                  position: plankWithHoles.position,
                  minifixHoles: plankWithHoles.minifixHoles ?? [],
                };

                dispatch(updateObject(updatedPlank));

                updatedItems.push({
                  id: updatedPlank.id,
                  name: updatedPlank.name,
                  data: {
                    name: updatedPlank.name,
                    width: updatedPlank.width,
                    height: updatedPlank.height,
                    depth: updatedPlank.depth,
                    position: updatedPlank.position,
                    material: updatedPlank.material || {
                      type: 'TEXTURE',
                      value: 'wood_3',
                    },
                    parent: updatedPlank.parent || '',
                    child: updatedPlank.child || [],
                    minifixHoles: updatedPlank.minifixHoles,
                    grooves: updatedPlank.grooves || [],
                  },
                  material: updatedPlank.material?.value || '',
                });
              }
            });

            // Prepare items for database update
            updatedItems = minifixSystem.planksWithHoles.map((plank) => {
              const originalPlank = allObjects.find((obj) => obj.id === plank.id);
              return {
                id: plank.id,
                name: plank.name,
                data: {
                  name: plank.name,
                  width: plank.width,
                  height: plank.height,
                  depth: plank.depth,
                  position: plank.position,
                  material: originalPlank?.material || {
                    type: 'TEXTURE',
                    value: 'wood_3',
                  },
                  parent: originalPlank?.parent || '',
                  child: originalPlank?.child || [],
                  minifixHoles:
                    plank.minifixHoles?.map((hole) => ({
                      type: hole.type,
                      connectorId: hole.connectorId,
                      position: hole.position,
                      direction: hole.direction,
                      diameter: hole.diameter,
                      depth: hole.depth,
                      length: hole.length,
                      localPosition2D: hole.localPosition2D,
                    })) || [],
                  grooves: originalPlank?.grooves || [],
                },
                material: '',
              };
            });

            // Update database with cupboard and updated planks
            updateObjectInDatabase(
              objectId,
              serializableObject,
              serializableObject,
              updatedItems as CatalogItem[],
              [],
            );
          }
        }
      }
    } catch (error) {
      console.error('❌ Error updating Minifix system:', error);
    }
  }

  if (
    updatedData.width !== undefined ||
    updatedData.height !== undefined ||
    updatedData.depth !== undefined
  ) {
    const newWidth = updatedData.width ?? currentWidth; // mm
    const newHeight = updatedData.height ?? currentHeight; // mm
    const newDepth = updatedData.depth ?? currentDepth; // mm

    threeDObject.geometry.dispose();
    threeDObject.geometry = new THREE.BoxGeometry(
      mmToMeters(newWidth),
      mmToMeters(newHeight),
      mmToMeters(newDepth)
    );
    threeDObject.geometry.attributes.position.needsUpdate = true;
    threeDObject.geometry.computeVertexNormals();
    threeDObject.updateMatrix();
    threeDObject.updateMatrixWorld(true);
    const newOutline = createOutlineForObject(threeDObject);
    if (newOutline) scene.add(newOutline);

    dispatch(updateObject(serializableObject));

    if (updatedData.width !== undefined && updatedData.width !== currentWidth) {
      dispatch(
        trackPropertyChange(
          serializableObject,
          'width',
          currentWidth,
          updatedData.width,
          threeDObject
        )
      );
    }
    if (updatedData.height !== undefined && updatedData.height !== currentHeight) {
      dispatch(
        trackPropertyChange(
          serializableObject,
          'height',
          currentHeight,
          updatedData.height,
          threeDObject
        )
      );
    }
    if (updatedData.depth !== undefined && updatedData.depth !== currentDepth) {
      dispatch(
        trackPropertyChange(
          serializableObject,
          'depth',
          currentDepth,
          updatedData.depth,
          threeDObject
        )
      );
    }

    threeDObject.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        const childObject = allObjects.find((obj) => obj.id === child.userData.objectId);
        if (childObject) {
          const newChildWidth = childObject.width * widthRatio;
          const newChildHeight = childObject.height * heightRatio;
          const newChildDepth = childObject.depth * depthRatio;
          const newChildX = childObject.position?.x * widthRatio || 0;
          const newChildY = childObject.position?.y * heightRatio || 0;
          const newChildZ = childObject.position?.z * depthRatio || 0;

          child.geometry.dispose();
          child.geometry = new THREE.BoxGeometry(
            mmToMeters(newChildWidth),
            mmToMeters(newChildHeight),
            mmToMeters(newChildDepth)
          );
          child.geometry.attributes.position.needsUpdate = true;
          child.geometry.computeVertexNormals();
          child.position.set(mmToMeters(newChildX), mmToMeters(newChildY), mmToMeters(newChildZ));
          child.updateMatrix();
          child.updateMatrixWorld(true);

          const serializableChild = {
            ...childObject,
            width: newChildWidth,
            height: newChildHeight,
            depth: newChildDepth,
            position: {
              x: newChildX,
              y: newChildY,
              z: newChildZ,
            },
          };

          dispatch(updateObject(serializableChild));

          if (newChildWidth !== childObject.width) {
            dispatch(
              trackPropertyChange(
                serializableChild,
                'width',
                childObject.width,
                newChildWidth,
                child
              )
            );
          }
          if (newChildHeight !== childObject.height) {
            dispatch(
              trackPropertyChange(
                serializableChild,
                'height',
                childObject.height,
                newChildHeight,
                child
              )
            );
          }
          if (newChildDepth !== childObject.depth) {
            dispatch(
              trackPropertyChange(
                serializableChild,
                'depth',
                childObject.depth,
                newChildDepth,
                child
              )
            );
          }
        }
      }
    });
  }

  // Track position changes
  if (updatedData.position) {
    if (updatedData.position.x !== undefined && updatedData.position.x !== currentPosition.x) {
      dispatch(
        trackPropertyChange(
          serializableObject,
          'position.x',
          currentPosition.x,
          updatedData.position.x,
          threeDObject
        )
      );
    }
    if (updatedData.position.y !== undefined && updatedData.position.y !== currentPosition.y) {
      dispatch(
        trackPropertyChange(
          serializableObject,
          'position.y',
          currentPosition.y,
          updatedData.position.y,
          threeDObject
        )
      );
    }
    if (updatedData.position.z !== undefined && updatedData.position.z !== currentPosition.z) {
      dispatch(
        trackPropertyChange(
          serializableObject,
          'position.z',
          currentPosition.z,
          updatedData.position.z,
          threeDObject
        )
      );
    }
  }

  // Track rotation changes
  if (updatedData.rotationX !== undefined && updatedData.rotationX !== selectedObject.rotationX) {
    dispatch(
      trackPropertyChange(
        serializableObject,
        'rotationX',
        selectedObject.rotationX || 0,
        updatedData.rotationX,
        threeDObject
      )
    );
  }
  if (updatedData.rotationY !== undefined && updatedData.rotationY !== selectedObject.rotationY) {
    dispatch(
      trackPropertyChange(
        serializableObject,
        'rotationY',
        selectedObject.rotationY || 0,
        updatedData.rotationY,
        threeDObject
      )
    );
  }
  if (updatedData.rotationZ !== undefined && updatedData.rotationZ !== selectedObject.rotationZ) {
    dispatch(
      trackPropertyChange(
        serializableObject,
        'rotationZ',
        selectedObject.rotationZ || 0,
        updatedData.rotationZ,
        threeDObject
      )
    );
  }

  // Update rotations if provided
  if (updatedData.rotationX !== undefined) {
    threeDObject.rotation.z = THREE.MathUtils.degToRad(updatedData.rotationX);
  }
  if (updatedData.rotationY !== undefined) {
    threeDObject.rotation.x = THREE.MathUtils.degToRad(updatedData.rotationY);
  }
  if (updatedData.rotationZ !== undefined) {
    threeDObject.rotation.y = THREE.MathUtils.degToRad(updatedData.rotationZ);
  }

  if (updatedData.position) {
    threeDObject.position.set(
      mmToMeters(updatedData.position.x ?? currentPosition.x),
      mmToMeters(updatedData.position.y ?? currentPosition.y),
      mmToMeters(updatedData.position.z ?? currentPosition.z)
    );
  }

  const childUpdates = updateObjectGeometry(threeDObject, selectedObject, updatedData, allObjects);

  const items: CatalogItem[] = [];
  const childCatalogs: ChildCatalog[] = [];

  Object.entries(childUpdates.childUpdates).forEach(([childId, childData]) => {
    const childObject = allObjects.find((obj: Object3D) => obj.id === childId);
    if (!childObject) return;

    const updatedChildData = {
      ...childData,
      width: childData.width ? childData.width : childObject.width,
      height: childData.height ? childData.height : childObject.height,
      depth: childData.depth ? childData.depth : childObject.depth,
      position: {
        x: childData.position?.x ? childData.position.x : childObject.position?.x || 0,
        y: childData.position?.y ? childData.position.y : childObject.position?.y || 0,
        z: childData.position?.z ? childData.position.z : childObject.position?.z || 0,
      },
    };

    dispatch(
      updateObject({
        ...childObject,
        ...updatedChildData,
      })
    );

    if (updatedChildData.width !== childObject.width) {
      dispatch(
        trackPropertyChange(
          { ...childObject, ...updatedChildData },
          'width',
          childObject.width,
          updatedChildData.width,
          threeDObject
        )
      );
    }
    if (updatedChildData.height !== childObject.height) {
      dispatch(
        trackPropertyChange(
          { ...childObject, ...updatedChildData },
          'height',
          childObject.height,
          updatedChildData.height,
          threeDObject
        )
      );
    }
    if (updatedChildData.depth !== childObject.depth) {
      dispatch(
        trackPropertyChange(
          { ...childObject, ...updatedChildData },
          'depth',
          childObject.depth,
          updatedChildData.depth,
          threeDObject
        )
      );
    }

    items.push({
      id: childId,
      name: childObject.name || `CHILD_${childId}`,
      data: {
        name: childObject.name || `CHILD_${childId}`,
        width: updatedChildData.width,
        height: updatedChildData.height,
        depth: updatedChildData.depth,
        position: updatedChildData.position,
        material: childObject.material || {
          type: 'TEXTURE',
          value: 'wood_3',
        },
        parent: childObject.parent || '',
        child: childObject.child || [],
        id: '',
        layer: 0,
        altitude: 0,
        plankSize: 0,
        rotateX: 0,
        rotateY: 0,
        rotateZ: 0,
        minifixHoles: [],
        minifixConnections: [],
        grooves: [],
      },
      material: childObject.material?.value ?? null,
    });
  });

  Object.entries(childUpdates.grandChildUpdates).forEach(([childId, childData]) => {
    const childObject = allObjects.find((obj: Object3D) => obj.id === childId);
    if (!childObject) return;

    const updatedChildData = {
      ...childData,
      width: childData.width ? childData.width : childObject.width,
      height: childData.height ? childData.height : childObject.height,
      depth: childData.depth ? childData.depth : childObject.depth,
      position: {
        x: childData.position?.x ? childData.position.x : childObject.position?.x || 0,
        y: childData.position?.y ? childData.position.y : childObject.position?.y || 0,
        z: childData.position?.z ? childData.position.z : childObject.position?.z || 0,
      },
    };
    dispatch(
      updateObject({
        ...childObject,
        ...updatedChildData,
      })
    );

    if (updatedChildData.width !== childObject.width) {
      dispatch(
        trackPropertyChange(
          { ...childObject, ...updatedChildData },
          'width',
          childObject.width,
          updatedChildData.width,
          threeDObject
        )
      );
    }
    if (updatedChildData.height !== childObject.height) {
      dispatch(
        trackPropertyChange(
          { ...childObject, ...updatedChildData },
          'height',
          childObject.height,
          updatedChildData.height,
          threeDObject
        )
      );
    }
    if (updatedChildData.depth !== childObject.depth) {
      dispatch(
        trackPropertyChange(
          { ...childObject, ...updatedChildData },
          'depth',
          childObject.depth,
          updatedChildData.depth,
          threeDObject
        )
      );
    }

    if (childData.child && Array.isArray(childData.child) && childData.child.length > 0) {
      const catalogItems = childData.child
        .map((grandChildId: string) => {
          const grandChildObj = allObjects.find((obj: Object3D) => obj.id === grandChildId);
          const grandChildUpdate =
            (childUpdates.grandChildUpdates as Record<string, Partial<Object3D>>)[grandChildId] ||
            {};
          if (!grandChildObj) return null;

          const updatedGrandChildData = {
            width: grandChildUpdate.width ? grandChildUpdate.width : grandChildObj.width,
            height: grandChildUpdate.height ? grandChildUpdate.height : grandChildObj.height,
            depth: grandChildUpdate.depth ? grandChildUpdate.depth : grandChildObj.depth,
            position: {
              x: grandChildUpdate.position?.x
                ? grandChildUpdate.position.x
                : grandChildObj.position?.x || 0,
              y: grandChildUpdate.position?.y
                ? grandChildUpdate.position.y
                : grandChildObj.position?.y || 0,
              z: grandChildUpdate.position?.z
                ? grandChildUpdate.position.z
                : grandChildObj.position?.z || 0,
            },
          };

          dispatch(
            updateObject({
              ...grandChildObj,
              ...updatedGrandChildData,
            })
          );

          if (updatedGrandChildData.width !== grandChildObj.width) {
            dispatch(
              trackPropertyChange(
                { ...grandChildObj, ...updatedGrandChildData },
                'width',
                grandChildObj.width,
                updatedGrandChildData.width,
                threeDObject
              )
            );
          }
          if (updatedGrandChildData.height !== grandChildObj.height) {
            dispatch(
              trackPropertyChange(
                { ...grandChildObj, ...updatedGrandChildData },
                'height',
                grandChildObj.height,
                updatedGrandChildData.height,
                threeDObject
              )
            );
          }
          if (updatedGrandChildData.depth !== grandChildObj.depth) {
            dispatch(
              trackPropertyChange(
                { ...grandChildObj, ...updatedGrandChildData },
                'depth',
                grandChildObj.depth,
                updatedGrandChildData.depth,
                threeDObject
              )
            );
          }

          return {
            id: grandChildId,
            name: grandChildObj.name || `ITEM_${grandChildId}`,
            data: {
              width: updatedGrandChildData.width,
              height: updatedGrandChildData.height,
              depth: updatedGrandChildData.depth,
              position: updatedGrandChildData.position,
              material: grandChildObj.material || {
                type: 'TEXTURE',
                value: 'wood_3',
              },
            },
            material: null,
          };
        })
        .filter((item: ItemData) => item !== null);

      if (catalogItems.length > 0) {
        childCatalogs.push({
          catalog: {
            id: childId,
            name: childObject?.name || `CATALOG_${childId}`,
            data: {
              position: updatedChildData.position,
              id: '',
              name: '',
              width: 0,
              height: 0,
              depth: 0,
              layer: 0,
              altitude: 0,
              plankSize: 0,
              rotateX: 0,
              rotateY: 0,
              rotateZ: 0,
              parent: '',
              child: [],
              minifixHoles: [],
              minifixConnections: [],
              grooves: [],
              material: childObject.material || {
                type: 'TEXTURE',
                value: 'wood_3',
              },
            },
            material: childObject.material?.value ?? null,
          },
          items: catalogItems,
        });
      }
    }
  });

  if (
    !selectedObject.name.includes(PLANK.HORIZONTAL_PLANK) &&
    !selectedObject.name.includes(PLANK.VERTICAL_PLANK)
  ) {
    const objectsToRemove: THREE.Object3D[] = [];
    threeDObject.traverse((child) => {
      if (child.name === 'invisibleBox') {
        objectsToRemove.push(child);
      }
    });
    objectsToRemove.forEach((obj) => {
      threeDObject?.remove(obj);
    });
  }

  updateObjectInDatabase(
    objectId,
    { ...updatedData },
    selectedObject,
    items,
    childCatalogs,
  );

  updateObjectOutline(selectedObject, scene);
};

export const updateObjectOutline = (
  selectedObject: Object3D | null,
  scene: THREE.Scene | null
): void => {
  if (!scene || !selectedObject) return;

  const threeDObject = scene.children.find(
    (child) => child.userData.objectId === selectedObject.id
  );

  if (threeDObject && threeDObject instanceof THREE.Mesh) {
    const outlineObject = scene.children.find(
      (child) =>
        child instanceof THREE.LineSegments &&
        child.userData.isOutline &&
        child.userData.outlineFor === selectedObject.id
    ) as THREE.LineSegments | undefined;

    if (outlineObject) {
      scene.remove(outlineObject);
      outlineObject.geometry?.dispose();

      if (outlineObject.material instanceof THREE.Material) {
        outlineObject.material.dispose();
      } else if (Array.isArray(outlineObject.material)) {
        outlineObject.material.forEach((material) => material.dispose());
      }

      const edges = new THREE.EdgesGeometry(threeDObject.geometry);
      const outlineMaterial = new THREE.LineBasicMaterial({
        color: 0x00bfff,
        linewidth: 2,
      });
      const newOutline = new THREE.LineSegments(edges, outlineMaterial);

      newOutline.position.copy(threeDObject.position);
      newOutline.rotation.copy(threeDObject.rotation);
      newOutline.scale.copy(threeDObject.scale);
      newOutline.name = 'selected_outline';
      newOutline.userData.isOutline = true;
      newOutline.userData.outlineFor = selectedObject.id;

      scene.add(newOutline);
    }
  }
};

export const gettingDesignID = () => {
  const designID = window.location.pathname.split('/')[2];
  return designID;
};

export const updateCatalogItemObject = async (catalog: CatalogItem, data: CatalogItem) => {
  const payload = {
    data: {
      catalog: {
        id: catalog.id,
        name: catalog.name,
        data: catalog,
      },
      items: [
        {
          id: data.id,
          name: data.name,
          data: data,
        },
      ],
    },
  };

  const response: { status: number } = await commonService.put(
    API_ENDPOINT.UPDATE_OBJECT_ITEMS_DATA(gettingDesignID(), data.id),
    payload
  );

  if (response.status !== 200) {
    console.error('Failed to update catalog items');
  }
};
