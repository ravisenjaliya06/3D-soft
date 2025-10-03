//@ts-nocheck
import commonService from '@/services/CommonService';
import gsap from 'gsap';
import { Dispatch } from 'redux';
import * as THREE from 'three';
import {
  applyEdgeBanding,
  convertDataToGeometry,
  createDesign,
} from '../catalog/object-creator';
import {
  addComputerDesk,
  addPlatformOnWall,
  addSimpleCabinet,
  addSimpleTable,
  addSimpleTVUnit,
} from '../design/scene';
import {
  generateMinifixSystem,
  PlankData,
  visualizeMinifixConnections,
} from '../minifix';
import { store } from '../store';
import { addObjects } from '../store/dataSlice';
import { Object3D, Position } from '../store/interface';
import { objectName } from './constant';
import {
  AllItemsData,
  CatalogResponse,
  ITEM,
  PLANK,
  PlankDataItem,
} from './interface';
import { MoveHandler } from './moveHandler';
import { updateObjectInDatabase } from './updateHandler';
// import { addPlatformOnWall } from '@/components/3dmodel/design/scene';

let moveHandler: MoveHandler | null = null;

function initializeMoveHandler(options: {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}) {
  moveHandler = new MoveHandler({
    scene: options.scene,
    camera: options.camera,
    renderer: options.renderer,
    movableObjects: [],
  });
}

export function generateCompartmentsFromPlanks(
  plankData: PlankDataItem[],
  objectName?: string,
) {
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  let depth = 0;

  const internalPlanks = plankData;

  internalPlanks.forEach((p) => {
    const { width, height, depth: d, position } = p;
    const smallest = Math.min(width, height, d);

    const left = position.x - width / 2 + smallest;
    const right = position.x + width / 2 - smallest;
    const bottom = position.y - height / 2 + smallest;
    const top = position.y + height / 2 - smallest;

    minX = Math.min(minX, left);
    maxX = Math.max(maxX, right);
    minY = Math.min(minY, bottom);
    maxY = Math.max(maxY, top);
    depth = Math.max(depth, d || 0);
  });
  depth = Math.max(...plankData.map((p) => p.depth || 0));

  const step = 1;
  const gridWidth = Math.ceil((maxX - minX) / step);
  const gridHeight = Math.ceil((maxY - minY) / step);
  const grid: string[][] = Array(gridHeight)
    .fill(null)
    .map(() => Array(gridWidth).fill('empty'));

  internalPlanks.forEach((p) => {
    const { width, height, position, name } = p;
    if (
      name.includes('VERTICAL') ||
      name.includes('HORIZONTAL') ||
      name.includes(ITEM.DRAWER)
    ) {
      const startX = Math.round((position.x - width / 2 - minX) / step);
      const endX = Math.round((position.x + width / 2 - minX) / step);
      const startY = Math.round((position.y - height / 2 - minY) / step);
      const endY = Math.round((position.y + height / 2 - minY) / step);

      for (
        let y = Math.max(0, startY);
        y <= Math.min(gridHeight - 1, endY);
        y++
      ) {
        for (
          let x = Math.max(0, startX);
          x <= Math.min(gridWidth - 1, endX);
          x++
        ) {
          grid[y][x] = 'plank';
        }
      }
    }
  });

  const compartments: {
    width: number;
    height: number;
    depth: number;
    position: Position;
  }[] = [];

  if (objectName?.includes('HORIZONTAL')) {
    for (let y = 0; y < gridHeight; y++) {
      let startX = 0;
      for (let x = 0; x <= gridWidth; x++) {
        if (x === gridWidth || grid[y][x] === 'plank') {
          if (x > startX) {
            const width = (x - startX) * step;
            const height = step;
            const centerX = minX + (startX + (x - startX) / 2) * step;
            const centerY = minY + y * step + step / 2;
            if (width > 0 && height > 0) {
              compartments.push({
                width,
                height,
                depth,
                position: { x: centerX, y: centerY, z: 0 },
              });
            }
          }
          startX = x + 1;
        }
      }
    }
  } else if (objectName?.includes('VERTICAL')) {
    for (let x = 0; x < gridWidth; x++) {
      let startY = 0;
      for (let y = 0; y <= gridHeight; y++) {
        if (y === gridHeight || grid[y][x] === 'plank') {
          if (y > startY) {
            const width = step;
            const height = (y - startY) * step;
            const centerX = minX + x * step + step / 2;
            const centerY = minY + (startY + (y - startY) / 2) * step;
            if (width > 0 && height > 0) {
              compartments.push({
                width,
                height,
                depth,
                position: { x: centerX, y: centerY, z: 0 },
              });
            }
          }
          startY = y + 1;
        }
      }
    }
  } else if (objectName?.includes(ITEM.DRAWER)) {
    for (let y = 0; y < gridHeight; y++) {
      let startX = 0;
      for (let x = 0; x <= gridWidth; x++) {
        if (x === gridWidth || grid[y][x] === 'plank') {
          if (x > startX) {
            const width = (x - startX) * step;
            const height = step;
            const centerX = minX + (startX + (x - startX) / 2) * step;
            const centerY = minY + y * step + step / 2;
            if (width > 0 && height > 0) {
              compartments.push({
                width,
                height,
                depth,
                position: { x: centerX, y: centerY, z: 0 },
              });
            }
          }
          startX = x + 1;
        }
      }
    }
  } else {
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        if (grid[y][x] === 'empty') {
          let bottomRightX = x;
          let bottomRightY = y;

          while (
            bottomRightX + 1 < gridWidth &&
            grid[y][bottomRightX + 1] === 'empty'
          ) {
            let valid = true;
            for (let yCheck = y; yCheck <= bottomRightY; yCheck++) {
              if (grid[yCheck][bottomRightX + 1] !== 'empty') {
                valid = false;
                break;
              }
            }
            if (!valid) break;
            bottomRightX++;
          }

          while (
            bottomRightY + 1 < gridHeight &&
            grid[bottomRightY + 1][x] === 'empty'
          ) {
            let valid = true;
            for (let xCheck = x; xCheck <= bottomRightX; xCheck++) {
              if (grid[bottomRightY + 1][xCheck] !== 'empty') {
                valid = false;
                break;
              }
            }
            if (!valid) break;
            bottomRightY++;
          }

          const width = (bottomRightX - x + 1) * step;
          const height = (bottomRightY - y + 1) * step;
          const centerX = minX + (x + (bottomRightX - x) / 2) * step;
          const centerY = minY + (y + (bottomRightY - y) / 2) * step;

          if (width > 0 && height > 0) {
            compartments.push({
              width,
              height,
              depth,
              position: { x: centerX, y: centerY, z: 0 },
            });
          }

          for (let fillY = y; fillY <= bottomRightY; fillY++) {
            for (let fillX = x; fillX <= bottomRightX; fillX++) {
              grid[fillY][fillX] = 'plank';
            }
          }
        }
      }
    }
  }

  return compartments.filter((comp) => comp.width > 0 && comp.height > 0);
}

async function loadDesignObjects(
  designId: string,
  scene: THREE.Scene,
): Promise<Object3D[]> {
  try {
    const response: { status: number; data: CatalogResponse[] } =
      await commonService.getWithQueryParam(
        'material',
        'catalog',
        'design_id',
        designId,
      );
    if (response.status === 200 && response.data) {
      const data = response.data;
      const createdObjects: Object3D[] = [];

      // Re-create all known types using existing helpers, tagging userData.objectId
      data.forEach((item) => {
        try {
          const nameLower = (item?.name || '').toLowerCase();
          if (item.type === 'Platform') {
            const wall = scene.getObjectByName(item.additional_data?.wall);
            const meshes = addPlatformOnWall(scene, wall as any);
            // Tag created platform meshes with object id if possible
            meshes?.forEach?.(() => {});
          } else if (item.type === 'Cabinet') {
            if (nameLower.includes('tv')) {
              addSimpleTVUnit(scene);
            } else if (
              nameLower.includes('computer') ||
              nameLower.includes('desk')
            ) {
              addComputerDesk(scene);
            } else if (nameLower.includes('table')) {
              addSimpleTable(scene);
            } else {
              addSimpleCabinet(scene);
            }
          }
        } catch (e) {
          console.error('Failed to recreate item on refresh', item, e);
        }
      });
      return data as unknown as Object3D[];
    }
    // if (response.status === 200 && response.data) {
    //   const responseData: CatalogResponse[] = response.data;
    //   const allObjects: Object3D[] = [];
    //   const idSet = new Set<string>();
    //   const parentEntries = responseData.filter((entry) => !entry.parent);
    //   for (const parentEntry of parentEntries) {
    //     if (idSet.has(parentEntry.id)) {
    //       console.warn(`Duplicate ID detected: ${parentEntry.id}, skipping`);
    //       continue;
    //     }
    //     idSet.add(parentEntry.id);

    //     let parentDataList = [];

    //     if (
    //       parentEntry.design_catalog_items &&
    //       parentEntry.design_catalog_items.length > 0
    //     ) {
    //       parentDataList = parentEntry.design_catalog_items.map((item) => ({
    //         ...item.data,
    //         position: item.data?.position || { x: 0, y: 0, z: 0 },
    //       }));
    //     } else if (parentEntry.data) {
    //       parentDataList = [
    //         {
    //           ...parentEntry.data,
    //           position: parentEntry.data?.position || { x: 0, y: 0, z: 0 },
    //         },
    //       ];
    //     } else {
    //       console.error(
    //         'No items or data found for parent entry:',
    //         parentEntry.name,
    //       );
    //       continue;
    //     }
    //     const parentConvertedData = convertDataToGeometry(parentDataList);
    //     const parentThreeDObject = createDesign(parentConvertedData, 'MAX');
    //     const parentPosition = parentEntry.data?.position || {
    //       x: 0,
    //       y: 0,
    //       z: 0,
    //     };
    //     parentThreeDObject.position.set(
    //       parentPosition.x,
    //       parentPosition.y,
    //       parentPosition.z,
    //     );
    //     parentThreeDObject.scale.set(0.01, 0.01, 0.01);
    //     parentThreeDObject.name = parentEntry.name || '';
    //     parentThreeDObject.userData.objectId = parentEntry.id;
    //     parentThreeDObject.userData.type = parentEntry.data?.catalog_type || '';

    //     // Handle child entries (e.g., FIRST_DRAWER, SECOND_DRAWER)
    //     const childEntries = responseData.filter(
    //       (entry) => entry.parent === parentEntry.id,
    //     );

    //     const childObjects: Object3D[] = [];

    //     const parentCatalogItems =
    //       parentEntry.design_catalog_items?.map((item) => {
    //         return {
    //           id: item.id,
    //           name: item.data?.name || item.name || '',
    //           width: item.data?.width || 0,
    //           height: item.data?.height || 0,
    //           depth: item.data?.depth || 0,
    //           altitude: item.data?.altitude || 0,
    //           position: item.data?.position || { x: 0, y: 0, z: 0 },
    //           material: item.data?.material || {
    //             type: 'TEXTURE',
    //             value: 'default',
    //           },
    //           parent: parentEntry.id,
    //           child: item.data?.child || [],
    //           grooves: item.data?.grooves || [],
    //           catalog_type: item.data?.catalog_type || '',
    //           layer: item.data?.layer || 0,
    //           plankSize: item.data?.plankSize || 2,
    //           // 🔧 LOAD MINIFIX HOLES FROM DATABASE
    //           minifixConnections: item.data?.minifixConnections || [],
    //           minifixHoles: item.data?.minifixHoles || [],
    //         };
    //       }) || [];

    //     childObjects.push(...parentCatalogItems);

    //     for (const childEntry of childEntries) {
    //       if (idSet.has(childEntry.id)) {
    //         console.warn(`Duplicate ID detected: ${childEntry.id}, skipping`);
    //         continue;
    //       }
    //       idSet.add(childEntry.id);

    //       let childDataList = [];
    //       if (
    //         childEntry.design_catalog_items &&
    //         childEntry.design_catalog_items.length > 0
    //       ) {
    //         childDataList = childEntry.design_catalog_items.map((item) => ({
    //           ...item.data,
    //           position: item.data?.position || { x: 0, y: 0, z: 0 },
    //           name: item.data?.name || item.name || '',
    //         }));
    //       } else if (childEntry.data) {
    //         childDataList = [
    //           {
    //             ...childEntry.data,
    //             position: childEntry.data?.position || { x: 0, y: 0, z: 0 },
    //             name: childEntry.data?.name || childEntry.name || '',
    //           },
    //         ];
    //       } else {
    //         console.error(
    //           'No items or data found for child entry:',
    //           childEntry.name,
    //         );
    //         continue;
    //       }
    //       const childConvertedData = convertDataToGeometry(childDataList);
    //       const childThreeDObject = createDesign(childConvertedData, 'MAX');
    //       const childPosition = childEntry.data?.position || {
    //         x: 0,
    //         y: 0,
    //         z: 0,
    //       };
    //       childThreeDObject.position.set(
    //         childPosition.x,
    //         childPosition.y,
    //         childPosition.z,
    //       );

    //       childThreeDObject.children.forEach((plank) => {
    //         if (plank.userData.isDrowerPlank) {
    //           const plankData = childDataList.find(
    //             (item) => item.name === plank.name,
    //           );
    //           if (plankData) {
    //             plank.position.set(
    //               plankData.position.x,
    //               plankData.position.y,
    //               plankData.position.z,
    //             );
    //           }
    //         }
    //       });

    //       childThreeDObject.scale.set(1, 1, 1);
    //       childThreeDObject.name = childEntry.name || '';
    //       childThreeDObject.userData.objectId = childEntry.id;
    //       childThreeDObject.userData.type = childEntry.data?.catalog_type || '';

    //       childThreeDObject.updateMatrix();
    //       childThreeDObject.updateMatrixWorld(true);

    //       parentThreeDObject.add(childThreeDObject);

    //       const childObjectMetadata: Object3D = {
    //         id: childEntry.id,
    //         name: childEntry.name || '',
    //         width: childEntry.data?.width || 0,
    //         height: childEntry.data?.height || 0,
    //         depth: childEntry.data?.depth || 0,
    //         altitude: childEntry.data?.altitude || 0,
    //         position: childPosition,
    //         material: childEntry.data?.material || {
    //           type: 'TEXTURE',
    //           value: 'default',
    //         },
    //         parent: parentEntry.id,
    //         child:
    //           childEntry.design_catalog_items?.map((item) => item.id) || [],
    //         grooves: childEntry.data?.grooves || [],
    //         layer: childEntry.data?.layer || 0,
    //         rotationX: childEntry.data?.rotationX || 0,
    //         rotationY: childEntry.data?.rotationY || 0,
    //         rotationZ: childEntry.data?.rotationZ || 0,
    //         plankSize: childEntry.data?.plankSize || 2,
    //         catalog_type: childEntry.data?.catalog_type || '',
    //         minifixHoles: childEntry.data?.minifixHoles || [],
    //         minifixConnections: childEntry.data?.minifixConnections || [],
    //       };

    //       const childCatalogItems =
    //         childEntry.design_catalog_items?.map((item) => {
    //           if (idSet.has(item.id)) {
    //             console.warn(
    //               `Duplicate item ID detected: ${item.id}, generating new ID`,
    //             );
    //             item.id = crypto.randomUUID();
    //           }
    //           idSet.add(item.id);
    //           return {
    //             id: item.id,
    //             name: item.data?.name || item.name || '',
    //             width: item.data?.width || 0,
    //             height: item.data?.height || 0,
    //             depth: item.data?.depth || 0,
    //             altitude: item.data?.altitude || 0,
    //             position: item.data?.position || { x: 0, y: 0, z: 0 },
    //             material: item.data?.material || {
    //               type: 'TEXTURE',
    //               value: 'default',
    //             },
    //             parent: childEntry.id,
    //             child: item.data?.child || [],
    //             grooves: item.data?.grooves || [],
    //             layer: item.data?.layer || 0,
    //             plankSize: item.data?.plankSize || 2,
    //             minifixHoles: item.data?.minifixHoles || [],
    //             minifixConnections: item.data?.minifixConnections || [],
    //           };
    //         }) || [];

    //       childObjects.push(childObjectMetadata, ...childCatalogItems);
    //     }

    //     // Generate compartments
    //     if (
    //       !parentThreeDObject.name.includes(PLANK.HORIZONTAL_PLANK) &&
    //       !parentThreeDObject.name.includes(PLANK.VERTICAL_PLANK)
    //     ) {
    //       const compartments = generateCompartmentsFromPlanks(
    //         parentDataList as PlankDataItem[],
    //       );
    //       compartments.forEach((compartment, index) => {
    //         const geometry = new THREE.BoxGeometry(
    //           compartment.width,
    //           compartment.height,
    //           compartment.depth,
    //         );
    //         const material = new THREE.MeshBasicMaterial({
    //           transparent: true,
    //           opacity: 0,
    //         });
    //         const box = new THREE.Mesh(geometry, material);
    //         box.position.set(
    //           compartment.position.x,
    //           compartment.position.y,
    //           compartment.position.z,
    //         );
    //         box.name = 'invisibleBox';
    //         box.userData = {
    //           objectId: `invisibleBox_${index}_${parentEntry.id}`,
    //         };
    //         parentThreeDObject.add(box);
    //       });
    //     }

    //     // Assign userData.objectId to all objects, similar to moveObject
    //     const objectList: Object3D[] = [
    //       {
    //         id: parentEntry.id,
    //         name: parentEntry.name || '',
    //         width: parentEntry.data?.width || 0,
    //         height: parentEntry.data?.height || 0,
    //         depth: parentEntry.data?.depth || 0,
    //         altitude: parentEntry.data?.altitude || 0,
    //         position: parentPosition,
    //         material: parentEntry.data?.material || {
    //           type: 'TEXTURE',
    //           value: 'default',
    //         },
    //         parent: null,
    //         child: [
    //           ...childEntries.map((child) => child.id),
    //           ...(parentEntry.design_catalog_items?.map((item) => item.id) ||
    //             []),
    //         ],
    //         grooves: parentEntry.data?.grooves || [],
    //         layer: parentEntry.data?.layer || 0,
    //         rotationX: parentEntry.data?.rotationX || 0,
    //         rotationY: parentEntry.data?.rotationY || 0,
    //         rotationZ: parentEntry.data?.rotationZ || 0,
    //         plankSize: parentEntry.data?.plankSize || 2,
    //         // 🔧 LOAD MINIFIX DATA FROM DATABASE
    //         minifixConnections: parentEntry.data?.minifixConnections || [],
    //         minifixSpacing: parentEntry.data?.minifixSpacing,
    //         minifixHoles: parentEntry.data?.minifixHoles || [],
    //       },
    //       ...childObjects,
    //     ];

    //     // Assign IDs by traversing parentThreeDObject
    //     objectList.forEach((obj) => {
    //       let targetObject: THREE.Object3D | undefined;
    //       parentThreeDObject.traverse((child) => {
    //         if (child.name === obj.name) {
    //           targetObject = child;
    //         }
    //       });

    //       if (targetObject) {
    //         targetObject.userData.objectId = obj.id;
    //       } else if (obj.name !== '') {
    //         console.warn(
    //           `No 3D object found for ${obj.name} with ID ${obj.id}`,
    //         );
    //       }
    //     });

    //     visualizeMinifixConnections(
    //       parentEntry.data?.minifixConnections || [],
    //       parentThreeDObject,
    //     );
    //     parentThreeDObject.updateMatrix();
    //     parentThreeDObject.updateMatrixWorld(true);
    //     scene.add(parentThreeDObject);

    //     allObjects.push(...objectList);
    //   }

    //   if (moveHandler) {
    //     const movableObjects = allObjects
    //       .map((obj) => {
    //         return scene.getObjectByName(obj.name);
    //       })
    //       .filter((obj) => obj !== undefined);

    //     moveHandler.movableObjects = movableObjects;
    //   }
    //   return allObjects;
    // } else {
    //   console.error('Failed to load design objects:', response);
    //   return [];
    // }
  } catch (error) {
    console.error('Error loading design objects:', error);
    return [];
  }
}

interface CatalogData {
  id: string;
  name: string;
  width?: number;
  height?: number;
  depth?: number;
  position: {
    x: number;
    y: number;
    z: number;
  };
  material?: {
    type: string;
    value: string;
  };
  layer?: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  plankSize?: number;
  catalog_type?: string;

  [key: string]: unknown;
}

interface CatalogListItem {
  catalog: {
    id: string;
    name: string;
    data: CatalogData;
  };
  items?: Array<{
    id: string;
    name: string;
    data: CatalogData;
  }>;
  child_catalogs?: Array<{
    catalog: {
      id: string;
      name: string;
      data: CatalogData;
    };
    items?: Array<{
      id: string;
      name: string;
      data: CatalogData;
    }>;
  }>;
}

interface CreateResult {
  objectsList: Object3D[];
  mainObjects: Object3D[];
  catalogMap: Record<string, Object3D[]>;
}

async function create(
  name: string,
  catalogList: { catalog: CatalogListItem[][] },
  element: THREE.Mesh,
): Promise<CreateResult | null> {
  const catalogEntry = catalogList.catalog[0].find(
    (catObj: CatalogListItem) => catObj.catalog.name === name,
  );

  const designId = getDesignId();
  if (!designId) {
    console.error('No design ID found in URL');
    return null;
  }

  try {
    const formData = new FormData();
    formData.append('catalog_id', catalogEntry?.catalog.id || '');
    const response = await commonService.post(
      'design',
      `${designId}/object`,
      formData,
    );

    if (response.status === 200 || response.status === 201) {
      if (response.data) {
        const responseData: CatalogResponse[] = response.data;
        const allObjects: Object3D[] = [];
        const mainObjects: Object3D[] = [];
        const catalogMap: { [key: string]: Object3D[] } = {};

        responseData.forEach((entry) => {
          const mainObject: Object3D = {
            id: entry.id,
            name: entry.name || '',
            width: entry.data?.width || 0,
            height: entry.data?.height || 0,
            depth: entry.data?.depth || 0,
            altitude: 0,
            position: entry.data?.position || { x: 0, y: 0, z: 0 },
            material: entry.data?.material || {
              type: 'TEXTURE',
              value: 'default',
            },
            parent: entry.parent || null,
            grooves: entry.grooves || [],
            catalog_type: entry.data?.catalog_type ?? '',
            child: [],
            layer: 0,
            rotationZ: 0,
            rotationX: 0,
            rotationY: 0,
          };
          const childObjects = entry.design_catalog_items?.map((item) => ({
            id: item.id,
            name: item.data.name,
            width: item.data.width,
            height: item.data.height,
            depth: item.data.depth,
            altitude: item.data.altitude,
            position: item.data.position,
            material: item.data.material,
            parent: entry.id,
            child: item.data.child || [],
            grooves: item.data.grooves || [],
            catalog_type: item.data.catalog_type,
            layer: item.data.layer,
            rotationZ: 0,
            rotationX: 0,
            rotationY: 0,
          }));

          mainObject.child = childObjects?.map((child) => child.id) || [];

          catalogMap[entry.name || ''] = [mainObject, ...(childObjects || [])];
          if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
            console.log('catalogMap', catalogMap);
          }
          allObjects.push(mainObject, ...(childObjects || []));

          if (!entry.parent) {
            mainObjects.push(mainObject);
          }
        });

        responseData.forEach((entry) => {
          if (entry.parent) {
            const parentObj = allObjects.find((o) => o.id === entry.parent);
            if (parentObj && !parentObj.child.includes(entry.id)) {
              parentObj.child.push(entry.id);
            }
          }
        });

        const allItems: AllItemsData[] = [];

        for (const entry of responseData) {
          const itemIds =
            entry.design_catalog_items?.map((item) => item.id) || [];

          for (const obj of allObjects) {
            let matchedMesh: THREE.Object3D | undefined;

            element.traverse((child) => {
              if (child.name === obj.name) {
                matchedMesh = child;
              }
            });

            if (matchedMesh) {
              matchedMesh.userData.objectId = obj.id;
            } else {
              console.warn(`No mesh matched for ${obj.name}`);
            }
          }

          for (const itemId of itemIds) {
            const matchingPlank = element.children.find(
              (child: object) =>
                child instanceof THREE.Mesh &&
                child.userData.objectId === itemId,
            ) as THREE.Mesh | undefined;

            if (matchingPlank && matchingPlank.userData?.grooves?.length > 0) {
              const itemEntry = entry.design_catalog_items?.find(
                (item) => item.id === itemId,
              );

              if (itemEntry) {
                allItems.push({
                  id: itemEntry.id,
                  name: itemEntry.data.name,
                  data: {
                    ...itemEntry.data,
                    grooves: matchingPlank.userData.grooves,
                  },
                });
              }
            }
          }
        }

        if (allItems.length > 0) {
          const data = {
            data: {
              catalog: {
                id: mainObjects[0].id,
                name: mainObjects[0].name,
              },
              items: allItems,
            },
          };

          const patchResponse = await commonService.put(
            'design',
            `${designId}/object`,
            data as unknown as FormData,
          );

          if (patchResponse.status === 200) {
            for (const entry of patchResponse.data) {
              for (const item of entry.design_catalog_items || []) {
                const target = allObjects.find((obj) => obj.id === item.id);
                if (target && item.data?.grooves) {
                  target.grooves = item.data.grooves;
                }
              }
            }
          } else {
            console.error(`Failed to update grooves`, patchResponse);
          }
        }

        return {
          objectsList: allObjects,
          mainObjects,
          catalogMap,
        };
      }
    } else {
      console.error('Failed to create object:', response);
    }
  } catch (error) {
    console.error('Error creating object:', error);
  }
  return null;
}

interface NormalizeInputData {
  id?: string;
  name?: string;
  width?: number;
  height?: number;
  depth?: number;
  altitude?: number;
  position?: { x: number; y: number; z: number };
  material?: { type: string; value: string };
  parent?: string | null;
  child?: string[];
  layer?: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
}

function normalizeObjectData(
  input: NormalizeInputData,
  defaults: Partial<Object3D> = {},
): Object3D {
  const normalized: Object3D = {
    id: input.id || defaults.id || crypto.randomUUID(),
    name: input.name || defaults.name || 'Unnamed_Object',
    width: input.width || defaults.width || 0,
    height: input.height || defaults.height || 0,
    depth: input.depth || defaults.depth || 0,
    altitude: input.altitude || defaults.altitude || 0,
    position: input.position || defaults.position || { x: 0, y: 0, z: 0 },
    material: input.material ||
      defaults.material || { type: 'TEXTURE', value: 'default' },
    parent: input.parent || defaults.parent || null,
    child: input.child || defaults.child || [],
    layer: input.layer || defaults.layer || 0,
    rotationX: input.rotationX ?? input.rotateX ?? defaults.rotationX ?? 0,
    rotationY: input.rotationY ?? input.rotateY ?? defaults.rotationY ?? 0,
    rotationZ: input.rotationZ ?? input.rotateZ ?? defaults.rotationZ ?? 0,
  };
  return normalized;
}

interface CreateItemResponse {
  id: string;
  status: number;
  data: {
    id: string;
    name: string;
    data: CatalogData;
  };
}
async function createItem(
  name: string,
  catalogList: { catalog: CatalogListItem[][] },
  parentId: string,
  threeDObject: THREE.Mesh,
  finalPosition: THREE.Vector3,
  dispatch: Dispatch,
  dataObjects?: Object3D[],
  scene?: THREE.Scene,
): Promise<CreateItemResponse | null> {
  const objectData: Object3D[] = [];
  const catalogEntry = catalogList.catalog[0].find(
    (catObj: CatalogListItem) => catObj.catalog.name === name,
  );
  const width = (threeDObject.geometry as THREE.BoxGeometry).parameters.width;
  const height = (threeDObject.geometry as THREE.BoxGeometry).parameters.height;
  const depth = (threeDObject.geometry as THREE.BoxGeometry).parameters.depth;
  const position = threeDObject.parent?.position || { x: 0, y: 0, z: 0 };
  const mainObject: THREE.Mesh = threeDObject.parent?.parent as THREE.Mesh;
  threeDObject.position.copy(position || { x: 0, y: 0, z: 0 });
  if (threeDObject.name === objectName.HORIZONTAL_PLANK) {
    threeDObject.position.y += finalPosition.y;
  } else if (threeDObject.name === objectName.VERTICAL_PLANK) {
    threeDObject.position.x += finalPosition.x;
    threeDObject.position.y -= 0.5;
  }

  mainObject.add(threeDObject);

  const { x, y, z } = threeDObject.position;
  if (!catalogEntry) {
    console.error('Catalog entry not found for:', name);
    return null;
  }

  const fullCatalogData = catalogEntry.catalog.data;
  const clonedData = {
    ...fullCatalogData,
    width,
    height,
    depth,
    position: { x: x, y: y, z: z },
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
  };

  const normalizedData = normalizeObjectData(clonedData, {
    name,
    parent: parentId,
  });

  objectData.push(normalizedData);

  if (
    threeDObject.name.includes(ITEM.PLANK) ||
    threeDObject.name.includes(ITEM.DRAWER)
  ) {
    const allObjects: Object3D[] = store.getState().data.objects || [];
    const cupboards = allObjects.filter(
      (obj) =>
        !obj.name.includes(ITEM.PLANK) &&
        !obj.name.includes(ITEM.DOOR) &&
        !obj.name.includes(ITEM.DRAWER) &&
        (obj.parent === null || obj.parent === undefined),
    );

    // Find the cupboard this plank belongs to
    const targetCupboard = cupboards.find(
      (cupboard) => cupboard.id === parentId,
    );

    if (targetCupboard) {
      const cupboardObject = scene?.children.find(
        (obj) => obj.userData.objectId === targetCupboard.id,
      ) as THREE.Mesh;

      if (cupboardObject) {
        // Get all existing planks + the new plank
        const existingPlanks = allObjects
          .filter(
            (obj) =>
              obj.parent === targetCupboard.id &&
              (obj.name.includes(ITEM.PLANK) ||
                obj.name.includes(ITEM.DRAWER)) &&
              !obj.name.includes(ITEM.DOOR),
          )
          .map((obj) => ({
            id: obj.id,
            name: obj.name,
            width: obj.width,
            height: obj.height,
            depth: obj.depth,
            position: obj.position,
            parent: obj.parent,
            material: obj.material,
          }));

        const allPlanks: PlankData[] = [...existingPlanks];

        if (!normalizedData.name.includes('DRAWER')) {
          const newPlankData = {
            id: normalizedData.id,
            name: normalizedData.name,
            width: normalizedData.width,
            height: normalizedData.height,
            depth: normalizedData.depth,
            position: normalizedData.position,
            parent: normalizedData.parent,
            material: normalizedData.material,
          };
          allPlanks.push(newPlankData);
        }

        try {
          // 🔧 GENERATE MINIFIX SYSTEM WITH NEW PLANK
          const minifixSystem = generateMinifixSystem(
            targetCupboard.id,
            allPlanks,
          );

          if (minifixSystem.connections.length > 0) {
            // 🔧 CLEAR EXISTING MINIFIX VISUALIZATIONS
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

            // 🔧 ADD NEW MINIFIX VISUALIZATIONS
            visualizeMinifixConnections(
              minifixSystem.connections,
              cupboardObject,
            );

            // 🔧 UPDATE CUPBOARD WITH NEW MINIFIX DATA
            const updatedCupboard = {
              ...targetCupboard,
              minifixConnections: minifixSystem.connections,
            };

            // 🔧 UPDATE DATABASE WITH NEW MINIFIX DATA
            const designId = getDesignId();
            if (designId) {
              const allItems = minifixSystem.planksWithHoles
                .filter((plank) => !plank.name.includes(ITEM.DRAWER))
                .map((plank) => ({
                  id: plank.id,
                  name: plank.name,
                  data: {
                    ...plank,
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
                  },
                }));

              const data = {
                data: {
                  catalog: {
                    id: updatedCupboard.id,
                    name: updatedCupboard.name,
                    data: updatedCupboard,
                  },
                  items: allItems,
                },
              };

              try {
                const patchResponse = await commonService.put(
                  'design',
                  `${designId}/object`,
                  data,
                );

                if (
                  patchResponse.status === 200 ||
                  patchResponse.status === 201
                ) {
                  if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
                    console.log(
                      'Minifix data updated in database after adding new plank',
                    );
                  }
                } else {
                  console.error(
                    'Failed to update Minifix data in database:',
                    patchResponse,
                  );
                }
              } catch (error) {
                console.error(
                  'Error updating Minifix data in database:',
                  error,
                );
              }
            }
          }
        } catch (error) {
          console.error(
            'Error generating Minifix system for new plank:',
            error,
          );
        }
      }
    }

    cupboards.forEach((cupboard) => {
      const cupboardObject = scene?.children.find(
        (obj) => obj.userData.objectId === cupboard.id,
      ) as THREE.Mesh;
      if (cupboardObject) {
        const plankDataList: PlankDataItem[] = allObjects
          .filter(
            (obj) =>
              obj.parent === cupboard.id &&
              obj.name.includes(ITEM.PLANK) &&
              !obj.name.includes(ITEM.DRAWER) &&
              !obj.name.includes(ITEM.DOOR),
          )
          .map((obj) => ({
            id: obj.id,
            name: obj.name,
            width: obj.width,
            height: obj.height,
            depth: obj.depth,
            position: obj.position,
          }))
          .concat(
            !normalizeObjectData.name.includes('DRAWER')
              ? [
                  {
                    id: normalizedData.id,
                    name: normalizedData.name,
                    width: normalizedData.width,
                    height: normalizedData.height,
                    depth: normalizedData.depth,
                    position: normalizedData.position,
                  },
                ]
              : [],
          );

        const objectsToRemove: THREE.Mesh[] = [];
        cupboardObject.traverse((child) => {
          if (child.name === 'invisibleBox' && child instanceof THREE.Mesh) {
            objectsToRemove.push(child);
          }
        });
        objectsToRemove.forEach((obj) => {
          cupboardObject.remove(obj);
          obj.geometry.dispose();
          if (obj.material instanceof THREE.Material) {
            obj.material.dispose();
          }
        });

        const compartments = generateCompartmentsFromPlanks(plankDataList);
        compartments.forEach((compartment, index) => {
          const geometry = new THREE.BoxGeometry(
            compartment.width,
            compartment.height,
            compartment.depth,
          );
          const material = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
          });
          const box = new THREE.Mesh(geometry, material);
          box.position.set(
            compartment.position.x,
            compartment.position.y,
            compartment.position.z,
          );
          box.name = 'invisibleBox';
          box.userData = {
            objectId: `invisibleBox_${index}_${cupboard.id}`,
          };
          cupboardObject.add(box);
        });
      }
    });
  }

  const designId = getDesignId();
  if (!designId) {
    console.error('No design ID found in URL');
    return null;
  }

  if (!fullCatalogData) {
    console.error('No catalog data found for:', name);
    return null;
  }

  const payload = {
    name,
    data: normalizedData,
  };

  try {
    const response = await commonService.post(
      'design',
      `${designId}/catalog/${parentId}/item`,
      payload,
    );

    if (response.status === 200 || response.status === 201) {
      let itemId: string | undefined;
      if (response.data?.id) {
        itemId = response.data.id;
      } else if (Array.isArray(response.data) && response.data[0]?.id) {
        itemId = response.data[0].id;
      }

      if (itemId) {
        threeDObject.userData.objectId = itemId;
      } else {
        console.warn(
          `No valid ID found in API response for ${name}, userData.objectId not assigned`,
        );
      }
      if (itemId) {
        objectData[0].id = itemId;
      } else {
        console.warn(
          `No valid ID found in API response for ${name}, using temporary ID`,
        );
      }
      dispatch(addObjects(objectData));

      return response.data;
    } else {
      console.error('Failed to create object:', response);
      return null;
    }
  } catch (error) {
    console.error('Error creating object:', error);
    return null;
  }
}

interface MoveObjectResult {
  createResult?: CreateResult | CreateItemResponse | null;
  threeDObject?: THREE.Mesh;
}

export interface CatalogWithChildren {
  catalog: {
    name: string;
    id: string;
    data: CatalogData;
  };
  items?: Array<{
    id: string;
    name: string;
    data: CatalogData;
  }>;
  child_catalogs?: Array<{
    catalog: {
      name: string;
      id: string;
      data: CatalogData;
    };
    items?: Array<{
      id: string;
      name: string;
      data: CatalogData;
    }>;
  }>;
}

async function moveObject(
  name: string,
  catalogList: { catalog: CatalogWithChildren[][] },
  scene: THREE.Scene,
  dispatch: Dispatch,
  dataObjects?: Object3D[],
): Promise<MoveObjectResult | void> {
  if (!scene) {
    return;
  }

  const catalogEntry = catalogList.catalog[0].find(
    (catObj: CatalogWithChildren) => catObj.catalog.name === name,
  );
  if (!catalogEntry) {
    console.error('Catalog entry not found for:', name);
    return;
  }

  let dataList: CatalogData[];
  if (catalogEntry.items && catalogEntry.items.length > 0) {
    dataList = catalogEntry.items.map((item: CatalogChildItem) => item.data);
  } else if (catalogEntry.catalog.data) {
    dataList = [catalogEntry.catalog.data];
  } else {
    console.error('No items or catalog data found for', name);
    return;
  }
  const childCatalogs = catalogEntry.child_catalogs || [];
  const childObjects: THREE.Mesh[] = [];
  for (const childCatalog of childCatalogs) {
    if (childCatalog.items && childCatalog.items.length > 0) {
      const childDataList = childCatalog.items.map(
        (item: CatalogChildItem) => item.data,
      );
      const convertedChildData = convertDataToGeometry(childDataList);
      const childObject = createDesign(convertedChildData, 'MAX');
      const position = childCatalog.catalog.data.position;
      childObject.position.set(position.x, position.y, position.z);
      childObject.scale.set(1, 1, 1);
      childObject.name = childCatalog.catalog.name;
      childObject.userData.type = childCatalog.catalog.data.catalog_type;
      childObjects.push(childObject);
    }
  }

  const convertedData = convertDataToGeometry(dataList);
  const threeDObject = createDesign(convertedData, 'MAX');
  threeDObject.scale.set(0.01, 0.01, 0.01);
  threeDObject.name = catalogEntry.catalog.name;
  threeDObject.userData.type = catalogEntry.catalog.data.catalog_type;

  if (
    !threeDObject.name.includes(PLANK.HORIZONTAL_PLANK) &&
    !threeDObject.name.includes(PLANK.VERTICAL_PLANK) &&
    !threeDObject.name.includes(ITEM.DRAWER)
  ) {
    const compartments = generateCompartmentsFromPlanks(
      dataList.map((item) => ({
        name: String(item.name || ''),
        width: Number(item.width || 0),
        height: Number(item.height || 0),
        depth: Number(item.depth || 0),
        position: {
          x: Number(
            (item.position as { x: number; y: number; z: number })?.x || 0,
          ),
          y: Number(
            (item.position as { x: number; y: number; z: number })?.y || 0,
          ),
          z: Number(
            (item.position as { x: number; y: number; z: number })?.z || 0,
          ),
        },
      })),
    );
    compartments.forEach((compartment, index) => {
      const geometry = new THREE.BoxGeometry(
        compartment.width,
        compartment.height,
        compartment.depth,
      );
      const material = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
      });
      const box = new THREE.Mesh(geometry, material);
      box.position.set(
        compartment.position.x,
        compartment.position.y,
        compartment.position.z,
      );
      box.name = 'invisibleBox';
      box.userData = { objectId: `invisibleBox_${index}_${name}` };
      threeDObject.add(box);
    });
  }

  childObjects.forEach((child) => {
    threeDObject.add(child);
  });

  if (!threeDObject.name.includes(ITEM.PLANK)) {
    scene.add(threeDObject);
  }

  let createResult;

  if (
    threeDObject.name.includes(ITEM.PLANK) ||
    threeDObject.name.includes(ITEM.DRAWER)
  ) {
    const allObjects: Object3D[] = dataObjects || [];
    const cupboards = allObjects.filter(
      (obj) =>
        !obj.name.includes(ITEM.PLANK) &&
        !obj.name.includes(ITEM.DOOR) &&
        !obj.name.includes(ITEM.DRAWER) &&
        (obj.parent === null || obj.parent === undefined),
    );

    cupboards.forEach((cupboard) => {
      const cupboardObject = scene.children.find(
        (obj) => obj.userData.objectId === cupboard.id,
      ) as THREE.Mesh;
      if (cupboardObject) {
        const plankDataList: PlankDataItem[] = allObjects
          .filter(
            (obj) =>
              obj.parent === cupboard.id &&
              (obj.name.includes(ITEM.PLANK) ||
                obj.name.includes(ITEM.DRAWER)) &&
              !obj.name.includes(ITEM.DOOR),
          )
          .map((obj) => ({
            name: obj.name,
            width: obj.width,
            height: obj.height,
            depth: obj.depth,
            position: obj.position,
          }));

        const objectsToRemove: THREE.Mesh[] = [];
        cupboardObject.traverse((child) => {
          if (child.name === 'invisibleBox') {
            objectsToRemove.push(child);
          }
        });
        objectsToRemove.forEach((obj) => {
          cupboardObject.remove(obj);
          obj.geometry.dispose();
          if (obj.material instanceof THREE.Material) {
            obj.material.dispose();
          }
        });

        const compartments = generateCompartmentsFromPlanks(
          plankDataList,
          threeDObject.name,
        );
        compartments.forEach((compartment, index) => {
          const geometry = new THREE.BoxGeometry(
            compartment.width,
            compartment.height,
            compartment.depth,
          );
          const material = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
          });
          const box = new THREE.Mesh(geometry, material);
          box.position.set(
            compartment.position.x,
            compartment.position.y,
            compartment.position.z,
          );
          box.name = 'invisibleBox';
          box.userData = {
            objectId: `invisibleBox_${index}_${cupboard.id}`,
          };
          cupboardObject.add(box);
        });
      }
    });
  }

  if (moveHandler) {
    const finalPosition = await moveHandler.enableDragging(threeDObject);
    if (finalPosition) {
      threeDObject.position.set(
        finalPosition.x,
        finalPosition.y,
        finalPosition.z,
      );

      if (
        threeDObject.name.includes('PLANK') ||
        threeDObject.name.includes('DOOR') ||
        threeDObject.name.includes(ITEM.DRAWER)
      ) {
        threeDObject.children
          .filter((child) => child.name.startsWith('edge_banding'))
          .forEach((child) => {
            threeDObject.remove(child);
            // Optionally dispose geometry and material
            if ((child as THREE.Mesh).geometry)
              (child as THREE.Mesh).geometry.dispose();
            if ((child as THREE.Mesh).material instanceof THREE.Material) {
              (child as THREE.Mesh).material.dispose();
            }
          });

        const edge_banding = applyEdgeBanding(threeDObject);
        threeDObject.add(edge_banding);
        const parentId = threeDObject.parent?.parent?.userData.objectId;
        createResult = await createItem(
          name,
          catalogList,
          parentId,
          threeDObject,
          finalPosition,
          dispatch,
          dataObjects,
          scene,
        );
      } else {
        // Handle non-plank objects (e.g., cupboard with children
        createResult = await create(name, catalogList, threeDObject);
        createResult.objectsList[0].position = finalPosition;
        // Assign userData.objectId to all objects in the scene based on objectsList
        if (createResult?.objectsList?.length) {
          // Iterate through objectsList to assign IDs to child objects
          createResult.objectsList.forEach((obj: Object3D) => {
            let targetObject: THREE.Object3D | undefined;
            threeDObject.traverse((child) => {
              if (child.name === obj.name) {
                targetObject = child;
              }
            });

            if (targetObject) {
              targetObject.userData.objectId = obj.id;
            } else {
              console.warn(
                `No 3D object found for ${obj.name} with ID ${obj.id}`,
              );
            }
          });
          try {
            const cupboardId = createResult.objectsList[0].id;
            const cupboardPlanks: PlankDataItem[] =
              createResult.objectsList.filter(
                (obj) =>
                  obj.parent === cupboardId &&
                  obj.name.includes(ITEM.PLANK) &&
                  !obj.name.includes(ITEM.DRAWER),
              );
            const cupboardMinifixSystem = generateMinifixSystem(
              cupboardId,
              cupboardPlanks.map((plank) => ({
                id: plank.id,
                name: plank.name,
                width: plank.width,
                height: plank.height,
                depth: plank.depth,
                position: plank.position,
                parent: plank.parent,
              })),
            );
            const drawers = createResult.objectsList.filter(
              (obj) =>
                obj.parent === cupboardId && obj.name.includes(ITEM.DRAWER),
            );
            const drawerUpdates = [];
            for (const drawer of drawers) {
              const drawerPlanks = createResult.objectsList.filter(
                (obj) => obj.parent === drawer.id,
              );
              if (drawerPlanks.length > 0) {
                const drawerMinifixSystem = generateMinifixSystem(
                  drawer.id,
                  drawerPlanks.map((plank) => ({
                    id: plank.id,
                    name: plank.name,
                    width: plank.width,
                    height: plank.height,
                    depth: plank.depth,
                    position: plank.position,
                    parent: plank.parent,
                  })),
                );

                drawerUpdates.push({
                  drawer,
                  minifixSystem: drawerMinifixSystem,
                  planks: drawerPlanks,
                });
              }
            }
            const updatedObjects = [];
            const updatedCupboard = {
              ...createResult.objectsList[0],
              minifixConnections: cupboardMinifixSystem.connections || [],
            };
            updatedObjects.push(updatedCupboard);
            const updatedDirectPlanks = cupboardPlanks.map((plank) => {
              const plankWithHoles = cupboardMinifixSystem.planksWithHoles.find(
                (p) => p.id === plank.id,
              );
              return {
                ...plank,
                minifixHoles: plankWithHoles?.minifixHoles || [],
              };
            });

            updatedObjects.push(...updatedDirectPlanks);
            // Update drawers and their planks
            for (const { drawer, minifixSystem, planks } of drawerUpdates) {
              const updatedDrawer = {
                ...drawer,
                minifixConnections: minifixSystem.connections || [],
              };
              updatedObjects.push(updatedDrawer);

              const updatedDrawerPlanks = planks.map((plank) => {
                const plankWithHoles = minifixSystem.planksWithHoles.find(
                  (p) => p.id === plank.id,
                );
                return {
                  ...plank,
                  minifixHoles: plankWithHoles?.minifixHoles || [],
                };
              });
              updatedObjects.push(...updatedDrawerPlanks);
            }
            updatedObjects.push(
              ...createResult.objectsList.filter(
                (obj) =>
                  !obj.name.includes(ITEM.PLANK) &&
                  obj.id !== cupboardId &&
                  !drawers.some((drawer) => drawer.id === obj.id) &&
                  !obj.name.includes(PLANK.DRAWER_HANDLE),
              ),
            );
            dispatch(addObjects(updatedObjects));
            if (cupboardMinifixSystem.connections.length > 0) {
              visualizeMinifixConnections(
                cupboardMinifixSystem.connections,
                threeDObject,
              );
              threeDObject.userData.minifixConnections =
                cupboardMinifixSystem.connections;
            }
            for (const { drawer, minifixSystem } of drawerUpdates) {
              const drawerObject = threeDObject.children.find(
                (c) => c.userData.objectId === drawer.id,
              );
              if (drawerObject && minifixSystem.connections.length > 0) {
                visualizeMinifixConnections(
                  minifixSystem.connections,
                  drawerObject,
                );
                drawerObject.userData.minifixConnections =
                  minifixSystem.connections;
              }
            }

            const designId = getDesignId();
            if (designId) {
              // Update cupboard + planks
              const cupboardPayload = {
                data: {
                  catalog: {
                    id: updatedCupboard.id,
                    name: updatedCupboard.name,
                    data: updatedCupboard,
                  },
                  items: updatedDirectPlanks.map((plank) => ({
                    id: plank.id,
                    name: plank.name,
                    data: {
                      name: plank.name,
                      width: plank.width,
                      height: plank.height,
                      depth: plank.depth,
                      position: plank.position,
                      parent: plank.parent,
                      minifixHoles: plank.minifixHoles || [],
                      material: plank.material || {
                        type: 'TEXTURE',
                        value: 'default',
                      },
                    },
                  })),
                },
              };
              const cupboardResponse = await commonService.put(
                'design',
                `${designId}/object`,
                cupboardPayload,
              );

              if (
                cupboardResponse.status === 200 ||
                cupboardResponse.status === 201
              ) {
                if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
                  console.log('✅ Cupboard & planks updated');
                }
              } else {
                console.error(
                  '❌ Failed to update cupboard:',
                  cupboardResponse,
                );
              }

              // Update each drawer + its planks separately
              for (const { drawer, minifixSystem, planks } of drawerUpdates) {
                const updatedDrawerPlanks = planks.map((plank) => {
                  const updated = minifixSystem.planksWithHoles.find(
                    (p) => p.id === plank.id,
                  );
                  return {
                    id: plank.id,
                    name: plank.name,
                    data: {
                      name: plank.name,
                      width: plank.width,
                      height: plank.height,
                      depth: plank.depth,
                      position: plank.position,
                      parent: plank.parent,
                      minifixHoles: updated?.minifixHoles || [],
                      material: plank.material || {
                        type: 'TEXTURE',
                        value: 'default',
                      },
                    },
                  };
                });

                const drawerPayload = {
                  data: {
                    catalog: {
                      id: updatedCupboard.id,
                      name: updatedCupboard.name,
                      data: updatedCupboard,
                    },
                    child_catalogs: [
                      {
                        catalog: {
                          id: drawer.id,
                          name: drawer.name,
                          data: {
                            name: drawer.name,
                            width: drawer.width,
                            height: drawer.height,
                            depth: drawer.depth,
                            position: drawer.position,
                            parent: drawer.parent,
                            minifixConnections: minifixSystem.connections || [],
                          },
                        },
                        items: updatedDrawerPlanks,
                      },
                    ],
                  },
                };
                if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
                  console.log('drawerPayload', drawerPayload);
                }
                const drawerResponse = await commonService.put(
                  'design',
                  `${designId}/object`,
                  drawerPayload,
                );

                if (
                  drawerResponse.status === 200 ||
                  drawerResponse.status === 201
                ) {
                  if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
                    console.log(`✅ Drawer ${drawer.name} updated`);
                  }
                } else {
                  console.error(
                    `❌ Failed to update drawer ${drawer.name}:`,
                    drawerResponse,
                  );
                }
              }
            }
          } catch (error) {
            console.error('❌ Error generating Minifix system:', error);
            dispatch(addObjects(createResult.objectsList));
            const designId = getDesignId();
            if (designId && createResult?.objectsList?.[0]?.id) {
              const updatedData: Object3D = {
                ...createResult.objectsList[0],
                position: {
                  x: finalPosition.x,
                  y: finalPosition.y,
                  z: finalPosition.z,
                },
              };

              await updateObjectInDatabase(
                createResult.mainObjects[0].id,
                updatedData,
                updatedData,
              );
            }
          }
        }
      }
    } else {
      console.error('Final position is null for', threeDObject.name);
    }
  }

  return { createResult, threeDObject };
}

function getDesignId(): string | null {
  const url = window.location.href;
  const designId = url.split('/').pop();
  return designId || null;
}

interface CopyObjectsResult {
  objectsList: Object3D[];
  mainObjects: Object3D[];
  catalogMap: Record<string, Object3D[]>;
}

async function copyObjects(id: string): Promise<CopyObjectsResult | null> {
  const designId = getDesignId();
  if (!designId) {
    console.error('No design ID found in URL');
    return null;
  }

  try {
    const formData = new FormData();
    formData.append('catalog_id', id);

    const response = await commonService.post(
      'design',
      `${designId}/object`,
      formData,
    );

    if (response.status === 200 || response.status === 201) {
      const responseData = response.data;
      const dataArray = Array.isArray(responseData)
        ? responseData
        : responseData
          ? [responseData]
          : [];

      const allObjects: Object3D[] = [];
      const mainObjects: Object3D[] = [];
      const catalogMap: { [key: string]: Object3D[] } = {};
      const idMap = new Map<string, string>();

      dataArray.forEach((entry: CatalogResponse) => {
        const newId =
          entry.id && !idMap.has(entry.id) ? entry.id : crypto.randomUUID();
        idMap.set(newId, newId);

        const mainObject: Object3D = {
          id: newId,
          name: entry.name || '',
          width: entry.data?.width || 0,
          height: entry.data?.height || 0,
          depth: entry.data?.depth || 0,
          altitude: 0,
          position: {
            x: (entry.data?.position?.x || 0) + 0.1,
            y: entry.data?.position?.y || 0,
            z: entry.data?.position?.z || 0,
          },
          material: { type: 'TEXTURE', value: 'default' },
          parent: entry.parent ? idMap.get(entry.parent) || entry.parent : null,
          child: [],
          layer: 0,
          rotationX: 0,
          rotationY: 0,
          rotationZ: 0,
        };

        const childObjects = entry.design_catalog_items?.map((item) => {
          const childId =
            item.id && !idMap.has(item.id) ? item.id : crypto.randomUUID();
          idMap.set(childId, childId);
          return {
            id: childId,
            name: item.data.name,
            width: item.data.width,
            height: item.data.height,
            depth: item.data.depth,
            altitude: item.data.altitude,
            position: { ...item.data.position },
            material: item.data.material,
            parent: newId,
            child: item.data.child
              ? item.data.child.map(() => crypto.randomUUID())
              : [],
            layer: item.data.layer,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
          };
        });

        mainObject.child = childObjects?.map((child) => child.id) || [];
        catalogMap[mainObject.name] = [mainObject, ...(childObjects || [])];
        allObjects.push(mainObject, ...(childObjects || []));

        if (!entry.parent) {
          mainObjects.push(mainObject);
        }
      });

      dataArray.forEach((entry: CatalogResponse) => {
        if (entry.parent) {
          const parentObj = allObjects.find(
            (o) => o.id === idMap.get(entry.parent ?? ''),
          );
          const currentObj = allObjects.find(
            (o) => o.id === idMap.get(entry.id),
          );
          if (
            parentObj &&
            currentObj &&
            !parentObj.child.includes(currentObj.id)
          ) {
            parentObj.child.push(currentObj.id);
          }
        }
      });

      return {
        objectsList: allObjects,
        mainObjects,
        catalogMap,
      };
    } else {
      console.error('Failed to copy object:', response);
      return null;
    }
  } catch (error) {
    console.error('Error copying object:', error);
    return null;
  }
}

export {
  copyObjects,
  create,
  initializeMoveHandler,
  loadDesignObjects,
  moveObject,
};
export default {
  initializeMoveHandler,
  loadDesignObjects,
  create,
  moveObject,
  copyObjects,
};

export function toggleDoor(child: THREE.Mesh) {
  if (!child) return;

  const isClosed = child.userData.isClosed ?? true;

  // Traverse parents to detect wall placement
  let obj: THREE.Object3D | null = child;
  let wallType: 'center' | 'leftwall' | 'rightwall' | null = null;

  while (obj && !wallType) {
    if (obj.name.toLowerCase().includes('center')) wallType = 'center';
    else if (obj.name.toLowerCase().includes('leftwall')) wallType = 'leftwall';
    else if (obj.name.toLowerCase().includes('rightwall'))
      wallType = 'rightwall';
    obj = obj.parent;
  }

  child.geometry.computeBoundingBox();
  const bbox = child.geometry.boundingBox;
  if (!bbox) {
    console.error('Bounding Box is Null');
    return;
  }

  let pivotOffsetX = 0;
  let pivotOffsetY = 0;

  // Default openDirection comes from userData (left, right, top, bottom)
  let type: 'left' | 'right' | 'top' | 'bottom' = child.userData.openDirection;

  // Adjust open direction based on wall type
  if (wallType === 'leftwall') {
    // Left wall doors usually swing along +X axis
    if (type === 'left') type = 'right';
    else if (type === 'right') type = 'left';
  } else if (wallType === 'rightwall') {
    // Right wall doors usually swing along -X axis
    if (type === 'left') type = 'right';
    else if (type === 'right') type = 'left';
  } else if (wallType === 'center') {
    // Center wall → default directions (front open/close)
    type = type;
  }

  switch (type) {
    case 'left':
      pivotOffsetX = bbox.min.x;
      pivotOffsetY = (bbox.max.y + bbox.min.y) / 2;
      break;
    case 'right':
      pivotOffsetX = bbox.max.x;
      pivotOffsetY = (bbox.max.y + bbox.min.y) / 2;
      break;
    case 'top':
      pivotOffsetX = (bbox.max.x + bbox.min.x) / 2;
      pivotOffsetY = bbox.max.y;
      break;
    case 'bottom':
      pivotOffsetX = (bbox.max.x + bbox.min.x) / 2;
      pivotOffsetY = bbox.min.y;
      break;
  }

  // Move geometry pivot to hinge side
  child.geometry.translate(-pivotOffsetX, -pivotOffsetY, 0);
  child.position.x += pivotOffsetX;
  child.position.y += pivotOffsetY;

  const targetRotation = { x: 0, y: 0, z: 0 };

  switch (type) {
    case 'left':
      targetRotation.y = isClosed ? -Math.PI / 2.5 : 0;
      break;
    case 'right':
      targetRotation.y = isClosed ? Math.PI / 2.5 : 0;
      break;
    case 'top':
      targetRotation.x = isClosed ? -Math.PI / 3 : 0;
      break;
    case 'bottom':
      targetRotation.x = isClosed ? Math.PI / 3 : 0;
      break;
  }

  gsap.to(child.rotation, {
    x: targetRotation.x,
    y: targetRotation.y,
    z: targetRotation.z,
    duration: 1,
    ease: 'power2.inOut',
  });

  child.userData.isClosed = !isClosed;
}

export function toggleDrawer(child: THREE.Mesh, openDistance = 0.2) {
  if (!child) return;

  const isClosed = child.userData.isClosed ?? true;
  const closedPos = child.userData.closedPos ?? child.position.clone();

  // Traverse parents to detect wall placement
  let obj: THREE.Object3D | null = child;
  let wallType: 'center' | 'leftwall' | 'rightwall' | null = null;

  while (obj && !wallType) {
    // const n = obj.name.toLowerCase();
    if (obj.name.includes('center')) wallType = 'center';
    else if (obj.name.includes('leftwall')) wallType = 'leftwall';
    else if (obj.name.includes('rightwall')) wallType = 'rightwall';
    obj = obj.parent;
  }

  // Decide direction based on wall type
  let direction = new THREE.Vector3();
  switch (wallType) {
    case 'center':
      direction.set(0, 0, 1);
      break;
    case 'leftwall':
      direction.set(1, 0, 0); // push outward along X+
      break;
    case 'rightwall':
      direction.set(-1, 0, 0); // push outward along X-
      break;
    default:
      direction.set(0, 0, 1); // fallback → front
  }

  // Apply parent orientation
  const parent = child.parent as THREE.Object3D;
  if (parent) direction.applyQuaternion(parent.quaternion).normalize();

  // Compute open pos
  const openPos = closedPos.clone().add(direction.multiplyScalar(openDistance));
  const targetPos = isClosed ? openPos : closedPos;

  gsap.to(child.position, {
    x: targetPos.x,
    y: targetPos.y,
    z: targetPos.z,
    duration: 1,
    ease: 'power2.inOut',
  });

  child.userData.isClosed = !isClosed;
  child.userData.closedPos = closedPos;
}
