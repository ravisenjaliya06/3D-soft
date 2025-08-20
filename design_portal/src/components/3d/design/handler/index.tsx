// @ts-nocheck
import * as THREE from 'three';
import Cupboard from '../../catalog/items/cupboard2';
import Door from '../../catalog/parts/door';
import Drawer from '../../catalog/parts/drawer';
import Planks from '../../catalog/parts/plank';
import {
  cupBoardData,
  cupBoardObjectData,
  DesignProps,
  partsDataList,
} from '../../interface';
import {
  actionChoices,
  itemChoices,
  partChoices,
  typeChoices,
} from '../../utils/choices';
import {
  editObjectHandlerInterface,
  objectHandlerInterface,
} from './interface';
import {
  calculateBoxes,
  createObjectData,
  deleteAllObjectData,
  deleteObjectData,
  findBoxContainingPoint,
  getDesignData,
  updateObjectData,
} from './utils';

const addObject = async (
  data: objectHandlerInterface,
  designProps: DesignProps,
  scene: THREE.Scene,
  elementData,
  selectedObject: THREE.Object3D | null,
): Promise<THREE.Scene> => {
  const childrenData: cupBoardData[] = [];
  const backendData: cupBoardData[] = [];
  let partBackendData: cupBoardData[] = [];

  if (data.type === typeChoices.ITEM) {
    if (data.item === itemChoices.CUPBOARD) {
      const cupboard = Cupboard((data = elementData));
      cupboard.position.set(
        scene.position.x,
        scene.position.y,
        scene.position.z,
      );

      const cupboardDataList: cupBoardObjectData[] = [];
      const backendDataList: cupBoardObjectData[] = [];
      const childIds: string[] = [];
      cupboard.children.forEach((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.name !== 'BACK_PLANK') {
            const objectData: cupBoardObjectData = {
              uuid: object.uuid,
              name: object.name || 'Unnamed',
              width: object.geometry.parameters.width,
              height: object.geometry.parameters.height,
              depth: object.geometry.parameters.depth,
              plankSize: cupboard.userData.plankSize || 0,
              center_point: {
                x: object.position.x,
                y: object.position.y,
              },
              up_down_space: null,
              left_right_space: null,
              texture: object.userData.texture,
            };

            cupboardDataList.push(objectData);
            backendDataList.push(objectData);
            childIds.push(object.uuid);
          } else {
            const objectData: cupBoardObjectData = {
              uuid: object.uuid,
              name: object.name || 'Unnamed',
              width: object.geometry.parameters.width,
              height: object.geometry.parameters.height,
              depth: object.geometry.parameters.depth,
              plankSize: cupboard.userData.plankSize || 0,
              center_point: {
                x: object.position.x,
                y: object.position.y,
              },
              up_down_space: null,
              left_right_space: null,
              texture: object.userData.texture,
            };

            backendDataList.push(objectData);
          }
        }
      });

      if (cupboardDataList.length > 0) {
        childrenData.push({
          type: 'CUPBOARD',
          data: cupboardDataList,
          childs: childIds,
        });
        backendData.push({
          type: 'CUPBOARD',
          data: backendDataList,
          childs: childIds,
        });
      }
      localStorage.setItem(
        'cupBoardDataForLocal',
        JSON.stringify(childrenData),
      );
      designProps?.setcupBoardData?.(childrenData as partsDataList);

      const jsonData = JSON.stringify({ data: backendData[0] });
      const createObject = await createObjectData(jsonData);
      cupboard.userData.object_id = createObject;

      selectedObject = cupboard;
      localStorage.setItem('cupboard', 'true');
      scene.add(cupboard);
    }
  }

  if (data.type === typeChoices.INIT_PART) {
    let partObject: THREE.Object3D = new THREE.Object3D();
    if (data.item === partChoices.PLANK) {
      partObject = Planks((data = elementData));
      if (partObject) {
        const objectData: cupBoardObjectData = {
          uuid: partObject.uuid,
          name: partObject.name,
          width: partObject.children[0].geometry.parameters.width,
          height: partObject.children[0].geometry.parameters.height,
          depth: partObject.children[0].geometry.parameters.depth,
          plankSize: partObject.userData.plankSize || 2,
          center_point: {
            x: partObject.children[0].position.x,
            y: partObject.children[0].position.y,
          },
          up_down_space: null,
          left_right_space: null,
          texture: partObject.children[0].userData.texture,
        };

        const cupboardLocalData = localStorage.getItem('cupBoardDataForLocal');
        const parsedCupboardData = cupboardLocalData
          ? JSON.parse(cupboardLocalData)
          : [];
        if (parsedCupboardData.length > 0 && parsedCupboardData[0].data) {
          parsedCupboardData[0].data.push(objectData);
        }
        localStorage.setItem(
          'cupBoardDataForLocal',
          JSON.stringify(parsedCupboardData),
        );
        designProps?.setcupBoardData?.(parsedCupboardData);

        backendData.push({
          type: 'CUPBOARD_PART',
          data: [objectData],
          childs: [],
        });

        const jsonData = JSON.stringify({ data: backendData[0] });
        const createObject = await createObjectData(jsonData);
        partObject.userData.object_id = createObject;
      }
      const cupboard = scene.children.find(
        (child) => child instanceof THREE.Object3D && child.userData.object_id,
      );
      if (cupboard) {
        cupboard.add(partObject);
      }
      return scene;
    }
    if (data.item === partChoices.DOOR) {
      partObject = Door((data = elementData));
      const doorData = [];
      if (partObject) {
        partObject.children.forEach((object) => {
          const objectData: cupBoardObjectData = {
            uuid: object.uuid,
            name: object.name,
            width: object.geometry.parameters.width,
            height: object.geometry.parameters.height,
            depth: object.geometry.parameters.depth,
            plankSize: object.userData.plankSize || 2,
            center_point: {
              x: object.position.x,
              y: object.position.y,
              z: object.position.z,
            },
            up_down_space: null,
            left_right_space: null,
            texture: object.userData.texture,
          };
          doorData.push(objectData);
        });

        backendData.push({
          type: 'CUPBOARD_PART',
          data: {
            position: {
              x: partObject.position.x,
              y: partObject.position.y,
              z: partObject.position.z,
            },
            doorData: doorData,
          },
          childs: [],
        });

        const jsonData = JSON.stringify({ data: backendData[0] });
        const createObject = await createObjectData(jsonData);
        partObject.userData.object_id = createObject;
      }

      const cupboard = scene.children.find(
        (child) => child instanceof THREE.Object3D && child.userData.object_id,
      );
      if (cupboard) {
        cupboard.add(partObject);
      }
    }
    if (data.item === partChoices.DRAWER) {
      partObject = Drawer((data = elementData));
      const drawerdata = [];
      if (partObject) {
        partObject.children.forEach((object) => {
          const objectData: cupBoardObjectData = {
            uuid: object.uuid,
            name: object.name,
            width: object.geometry.parameters.width,
            height: object.geometry.parameters.height,
            depth: object.geometry.parameters.depth,
            plankSize: object.userData.plankSize || 2,
            center_point: {
              x: object.position.x,
              y: object.position.y,
              z: object.position.z,
            },
            up_down_space: null,
            left_right_space: null,
            texture: object.userData.texture,
          };
          drawerdata.push(objectData);
        });

        backendData.push({
          type: 'CUPBOARD_PART',
          data: {
            position: {
              x: partObject.position.x,
              y: partObject.position.y,
              z: partObject.position.z,
            },
            drawerData: drawerdata,
          },
          childs: [],
        });

        const jsonData = JSON.stringify({ data: backendData[0] });
        const createObject = await createObjectData(jsonData);
        partObject.userData.object_id = createObject;
      }
      const cupboard = scene.children.find(
        (child) => child instanceof THREE.Object3D && child.userData.object_id,
      );
      if (cupboard) {
        cupboard.add(partObject);
      }
    }

    return scene;
  }

  if (data.type === typeChoices.PART) {
    let boxes;
    if (designProps.cupBoardData) {
      boxes = calculateBoxes(designProps?.cupBoardData[0]?.data);
    }
    let selected_box;
    if (boxes) {
      selected_box = findBoxContainingPoint(boxes);
    }
    let width = 0;
    let height = 0;
    let depth = 0;
    let plankSize = 0;
    const dimensionsData = selectedObject?.userData;
    let partObject: THREE.Object3D = new THREE.Object3D();
    if (selected_box) {
      if (data.item === partChoices.VERTICAL_PLANK) {
        partObject = Planks(
          data,
          dimensionsData?.plankSize,
          selected_box?.height,
          dimensionsData?.depth,
        );
        width = dimensionsData?.plankSize;
        height = selected_box?.height;
        depth = dimensionsData?.depth;
      }

      if (data.item === partChoices.HORIZONTAL_PLANK) {
        partObject = Planks(
          data,
          selected_box?.width,
          dimensionsData?.plankSize,
          dimensionsData?.depth,
        );
        width = selected_box?.width;
        height = dimensionsData?.plankSize;
        depth = dimensionsData?.depth;
      }

      if (data.item === partChoices.DRAWER) {
        partObject = Drawer(
          data,
          selected_box?.width,
          selected_box?.height,
          dimensionsData?.depth,
          dimensionsData?.plankSize,
        );
        width = selected_box?.width;
        height = selected_box?.height;
        depth = dimensionsData?.depth;
        plankSize = dimensionsData?.plankSize;
      }

      if (data.item === partChoices.DOOR) {
        partObject = Door(
          data,
          selected_box?.width,
          selected_box?.height,
          dimensionsData?.depth,
          dimensionsData?.plankSize,
        );
        width = selected_box?.width;
        height = selected_box?.height;
        depth = dimensionsData?.depth;
        plankSize = dimensionsData?.plankSize;
      }

      if (
        designProps.cupBoardData &&
        (partChoices.VERTICAL_PLANK === data.item ||
          partChoices.HORIZONTAL_PLANK === data.item)
      ) {
        const cupboardDataList: cupBoardObjectData[] = [];
        let up_down_space;
        let left_right_space;
        if (partChoices.VERTICAL_PLANK === data.item) {
          left_right_space = {
            left: selected_box?.width / 2,
            right: selected_box?.width / 2,
          };
        }
        if (partChoices.HORIZONTAL_PLANK === data.item) {
          up_down_space = {
            up: selected_box?.height / 2,
            down: selected_box?.height / 2,
          };
        }

        cupboardDataList.push({
          uuid: partObject.uuid,
          name: partObject.name || data.item,
          // @ts-ignore
          width: partObject.children[0].geometry.parameters.width,
          // @ts-ignore
          height: partObject.children[0].geometry.parameters.height,
          // @ts-ignore
          depth: partObject.children[0].geometry.parameters.depth,
          plankSize: partObject.userData.plankSize || 0,
          center_point: {
            x: selected_box.center.x,
            y: selected_box.center.y,
          },
          up_down_space: up_down_space || null,
          left_right_space: left_right_space || null,
          texture: partObject.children[0].userData.texture,
        });

        childrenData.push({
          type: 'cupboard',
          data: cupboardDataList.concat(designProps.cupBoardData[0].data),
          childs: designProps.cupBoardData[0].childs,
        });
        designProps?.setcupBoardData?.(childrenData as partsDataList);
      }

      if (data.item === partChoices.DOOR) {
        partObject = Door(
          data,
          selected_box?.width,
          selected_box?.height,
          dimensionsData?.depth,
          dimensionsData?.plankSize,
        );

        const doorData = [];
        partObject.children.forEach((object) => {
          const objectData: cupBoardObjectData = {
            uuid: object.uuid,
            name: object.name,
            width: object.geometry.parameters.width,
            height: object.geometry.parameters.height,
            depth: object.geometry.parameters.depth,
            plankSize: object.userData.plankSize || dimensionsData?.plankSize,
            center_point: {
              x: object.position.x,
              y: object.position.y,
              z: object.position.z,
            },
            up_down_space: null,
            left_right_space: null,
            texture: object.userData.texture,
          };
          doorData.push(objectData);
        });

        partBackendData = [
          {
            type: 'CUPBOARD_PART',
            data: {
              position: {
                x: selected_box.center.x,
                y: selected_box.center.y,
                z: 0,
              },
              doorData: doorData,
            },
            childs: [],
          },
        ];
      } else if (data.item === partChoices.DRAWER) {
        partObject = Drawer(
          data,
          selected_box?.width,
          selected_box?.height,
          dimensionsData?.depth,
          dimensionsData?.plankSize,
        );

        const drawerData = [];
        partObject.children.forEach((object) => {
          const objectData: cupBoardObjectData = {
            uuid: object.uuid,
            name: object.name,
            width: object.geometry.parameters.width,
            height: object.geometry.parameters.height,
            depth: object.geometry.parameters.depth,
            plankSize: object.userData.plankSize || dimensionsData?.plankSize,
            center_point: {
              x: object.position.x,
              y: object.position.y,
              z: object.position.z,
            },
            up_down_space: null,
            left_right_space: null,
            texture: object.userData.texture,
          };
          drawerData.push(objectData);
        });

        partBackendData = [
          {
            type: 'CUPBOARD_PART',
            data: {
              position: {
                x: selected_box.center.x,
                y: selected_box.center.y,
                z: 0,
              },
              drawerData: drawerData,
            },
            childs: [],
          },
        ];
      }

      const partData: cupBoardObjectData[] = [];
      partData.push({
        uuid: partObject.uuid,
        name: partObject.name || data.item,
        width: width,
        height: height,
        depth: depth,
        plankSize: plankSize,
        center_point: {
          x: selected_box.center.x,
          y: selected_box.center.y,
        },
        up_down_space: null,
        left_right_space: null,
        texture: partObject.children[0].userData.texture,
      });

      partBackendData.push({
        type: 'CUPBOARD_PART',
        data: partData,
        // @ts-ignore
        childs: designProps.cupBoardData[0].childs,
      });

      const jsonData = JSON.stringify({ data: partBackendData[0] });
      const createObject = await createObjectData(jsonData);
      partBackendData = [];
      partObject.userData.object_id = createObject;
      partObject.position.set(selected_box.center.x, selected_box.center.y, 0);
      selectedObject?.add(partObject);
    }
  }

  return scene;
};

const editObject = async (
  data: objectHandlerInterface,
  designProps: DesignProps,
  scene: THREE.Scene,
  selectedObject: THREE.Object3D | null,
): Promise<THREE.Scene> => {
  if (selectedObject && selectedObject.children[0]) {
    //@ts-ignore
    const geometry = selectedObject.children[0].geometry as THREE.BoxGeometry;

    // Update geometry based on provided data
    let newWidth = geometry.parameters.width;
    let newHeight = geometry.parameters.height;
    const newDepth = geometry.parameters.depth;

    //@ts-ignore
    if (data.width !== undefined && !isNaN(data.width)) {
      //@ts-ignore
      newWidth = data.width;
    }
    // @ts-ignore
    if (data.height !== undefined && !isNaN(data.height)) {
      // @ts-ignore
      newHeight = data.height;
    }

    // Dispose old geometry and create new one
    geometry.dispose();
    // @ts-ignore
    selectedObject.children[0].geometry = new THREE.BoxGeometry(
      newWidth,
      newHeight,
      newDepth,
    );
    // @ts-ignore
    selectedObject.children[0].geometry.needsUpdate = true;

    // Update cupBoardData to reflect the changes
    // @ts-ignore
    // @ts-ignore
    const updatedCupBoardData = designProps.cupBoardData.map((cupboard) => {
      const updatedData = cupboard.data.map((item) => {
        if (item.uuid === selectedObject.uuid) {
          return {
            ...item,
            width: newWidth,
            height: newHeight,
          };
        }
        return item;
      });
      return { ...cupboard, data: updatedData };
    });

    //@ts-ignore
    const updatedItem = updatedCupBoardData[0].data.find(
      //@ts-ignore
      (item) => item.uuid === selectedObject.uuid,
    );

    //@ts-ignore
    const updatedItemData = {
      type: 'CUPBOARD_PART',
      data: [updatedItem],
      //@ts-ignore
      childs: designProps.cupBoardData[0].childs,
    };
    const jsonData = JSON.stringify({ data: updatedItemData });
    const id = selectedObject.userData.object_id;
    updateObjectData(id, jsonData);
    designProps.setcupBoardData?.(updatedCupBoardData);
  }

  return scene;
};

const deleteObject = async (
  data: objectHandlerInterface,
  designProps: DesignProps,
  scene: THREE.Scene,
  selectedObject: THREE.Object3D | null,
) => {
  if (!selectedObject) return;

  const parent = selectedObject.parent;
  if (parent) {
    parent.remove(selectedObject);
  } else {
    scene.remove(selectedObject);
  }

  // @ts-ignore
  const updatedCupBoardData = designProps.cupBoardData
    .map((item) => ({
      ...item,
      data: item.data.filter((obj) => obj.uuid !== selectedObject.uuid),
    }))
    .filter((item) => item.data.length > 0);

  const id = selectedObject.userData.object_id;
  deleteObjectData(id);

  selectedObject.children.forEach(async (child) => {
    // @ts-ignore
    if (
      designProps.cupBoardData &&
      designProps.cupBoardData[0].childs.includes(child.uuid)
    ) {
      updatedCupBoardData[0].childs = [];
      updatedCupBoardData[0].data = [];
      updatedCupBoardData[0].type = '';
      localStorage.setItem('cupboard', 'false');
      designProps.setSelectedObject(null);
      await deleteAllObjectData();
    }
  });

  // @ts-ignore
  designProps?.setcupBoardData(updatedCupBoardData);
  designProps.setSelectedObject(null);

  return scene;
};

const applyTexture = async (
  textureName: string,
): Promise<THREE.MeshPhongMaterial> => {
  const formattedTextureName = textureName.toLowerCase().replaceAll(' ', '_');
  const baseUrl = process.env.NEXT_PUBLIC_PUBLIC_API + '/media/database_image/';
  const textureURL = `/textures/${formattedTextureName}.jpg`;

  const texture = new THREE.TextureLoader().load(textureURL);
  return new THREE.MeshPhongMaterial({ map: texture });
};

const textureHandler = async (
  data: objectHandlerInterface,
  scene: THREE.Scene,
  designProps: DesignProps,
  selectedObject: THREE.Object3D | null,
): Promise<THREE.Scene> => {
  if (selectedObject) {
    if (data.item) {
      const formattedTextureName = data.item.toLowerCase().replaceAll(' ', '_');
      if (selectedObject.name === 'MAIN_CUPBOARD') {
        selectedObject.children[0].material = await applyTexture(data.item);
        selectedObject.children[1].material = await applyTexture(data.item);
        selectedObject.children[2].material = await applyTexture(data.item);
        selectedObject.children[3].material = await applyTexture(data.item);
        selectedObject.children[4].material = await applyTexture(data.item);
        const objects = await getDesignData();
        const filteredObjects = objects.filter(
          (obj) => obj.id === selectedObject.userData.object_id,
        );
        const changeObjectData = filteredObjects[0].data.data;
        changeObjectData.forEach((element) => {
          element.texture = formattedTextureName;
        });
        const updatedItemData = {
          type: 'CUPBOARD',
          data: changeObjectData,
          //@ts-ignore
          childs: [],
        };
        await updateObjectData(
          selectedObject.userData.object_id,
          JSON.stringify({ data: updatedItemData }),
        );
      } else {
        selectedObject.traverse(async (child) => {
          const object_id = selectedObject.userData.object_id;
          if (child instanceof THREE.Mesh) {
            child.material = await applyTexture(data.item);
            const objects = await getDesignData();
            const filteredObjects = objects.filter(
              (obj) => obj.id === object_id,
            );
            const changeObjectData = filteredObjects[0].data.data;
            changeObjectData[0].texture = formattedTextureName;
            const updatedItemData = {
              type: 'CUPBOARD_PART',
              data: changeObjectData,
              //@ts-ignore
              childs: [],
            };
            await updateObjectData(
              object_id,
              JSON.stringify({ data: updatedItemData }),
            );
          }
        });
      }
    }
  }
  return scene;
};

const objectHandler = async (
  data: objectHandlerInterface | editObjectHandlerInterface,
  designProps: DesignProps,
  scene: THREE.Scene,
  elementData,
  selectedObject: THREE.Object3D | null = null,
) => {
  if (data.action === actionChoices.ADD_OBJECT) {
    // @ts-ignore
    scene = await addObject(
      data as objectHandlerInterface,
      (designProps = designProps),
      (scene = scene),
      (elementData = elementData),
      (selectedObject = selectedObject),
    );

    if (designProps.selectedEgdeLine && designProps.selectedObject) {
      designProps?.selectedObject.remove(designProps.selectedEgdeLine);
    }
  }
  if (data.action === actionChoices.EDIT_OBJECT) {
    scene = await editObject(
      data as editObjectHandlerInterface,
      (designProps = designProps),
      (scene = scene),
      (selectedObject = selectedObject),
    );
  }
  if (data.action === actionChoices.DELETE_OBJECT) {
    // @ts-ignore
    scene = await deleteObject(
      data as objectHandlerInterface,
      (designProps = designProps),
      (scene = scene),
      (selectedObject = selectedObject),
    );
  }
  if (data.action === actionChoices.CHANGE_TEXTURE) {
    scene = await textureHandler(
      data as objectHandlerInterface,
      (scene = scene),
      (designProps = designProps),
      (selectedObject = selectedObject),
    );
  }

  return scene;
};

export default objectHandler;

export const addInitObject = async (
  data: objectHandlerInterface,
  cupBoardData: cupBoardData[],
  // designProps: DesignProps,
  scene: THREE.Scene,
  selectedObject: THREE.Object3D | null,
): Promise<THREE.Scene> => {
  const childrenData: cupBoardData[] = [];

  const designObjectId = data.id;
  const designObjectData = data.data;

  if (data.type === typeChoices.ITEM) {
    if (data.item === itemChoices.CUPBOARD) {
      const cupboard = Cupboard((data = data.data));
      cupboard.position.set(
        scene.position.x,
        scene.position.y,
        scene.position.z,
      );

      const cupboardDataList: cupBoardObjectData[] = [];
      const childIds: string[] = [];
      let index = 0;
      cupboard.children.forEach((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.name !== 'BACK_PLANK') {
            const objectData: cupBoardObjectData = {
              uuid: object.uuid,
              name: object.name || 'Unnamed',
              width: object.geometry.parameters.width,
              height: object.geometry.parameters.height,
              depth: object.geometry.parameters.depth,
              plankSize: cupboard.userData.plankSize || 0,
              center_point: {
                x: object.position.x,
                y: object.position.y,
              },
              up_down_space: null,
              left_right_space: null,
            };

            cupboardDataList.push(objectData);
            childIds.push(object.uuid);
            index++;
          }
        }
      });

      if (cupboardDataList.length > 0) {
        childrenData.push({
          type: 'CUPBOARD',
          data: cupboardDataList,
          childs: childIds,
        });
      }
      cupboard.userData.object_id = designObjectId;
      scene.add(cupboard);
      localStorage.setItem('cupboard', 'true');
      return {
        // @ts-ignore
        Scene: scene,
        Cupboard: cupboard,
        cupboardData: cupboardDataList,
        // DesignProps: designProps,
        children_ids: childIds,
      };
    }
  }

  if (data.type === typeChoices.PART) {
    let partObject: THREE.Object3D = new THREE.Object3D();
    if (data.item === partChoices.VERTICAL_PLANK) {
      partObject = Planks(
        designObjectData[0],
        designObjectData[0]?.width,
        designObjectData[0]?.height,
        designObjectData[0]?.depth,
      );
    }

    if (data.item === partChoices.HORIZONTAL_PLANK) {
      partObject = Planks(
        designObjectData[0],
        designObjectData[0]?.width,
        designObjectData[0]?.height,
        designObjectData[0]?.depth,
      );
    }

    if (data.item === partChoices.DRAWER) {
      partObject = Drawer(
        designObjectData,
        designObjectData[0]?.width,
        designObjectData[0]?.height,
        designObjectData[0]?.depth,
        designObjectData[0]?.plankSize,
      );
    }

    if (data.item === partChoices.DOOR) {
      partObject = Door(
        designObjectData,
        designObjectData[0]?.width,
        designObjectData[0]?.height,
        designObjectData[0]?.depth,
        designObjectData[0]?.plankSize,
      );
    }

    if (
      cupBoardData &&
      (partChoices.VERTICAL_PLANK === data.item ||
        partChoices.HORIZONTAL_PLANK === data.item)
    ) {
      const cupboardDataList: cupBoardObjectData[] = [];
      let up_down_space;
      let left_right_space;
      cupBoardData.push({
        // @ts-ignore
        uuid: designObjectData[0].uuid,
        name: designObjectData[0].name || 'Unnamed',
        // @ts-ignore
        width: designObjectData[0].width,
        // @ts-ignore
        height: designObjectData[0].height,
        // @ts-ignore
        depth: designObjectData[0].depth,
        plankSize: designObjectData[0].plankSize || 0,
        center_point: {
          x: designObjectData[0].center_point.x,
          y: designObjectData[0].center_point.y,
        },
        up_down_space: up_down_space || null,
        left_right_space: left_right_space || null,
      });
    }
    partObject.userData.object_id = designObjectId;
    if (partChoices.DOOR === data.item) {
      partObject.position.set(
        designObjectData.position.x,
        designObjectData.position.y,
        designObjectData.position.z || 0,
      );
    } else if (partChoices.DRAWER === data.item) {
      partObject.position.set(
        designObjectData.position.x,
        designObjectData.position.y,
        designObjectData.position.z || 0,
      );
    } else {
      partObject.children[0].position.set(
        designObjectData[0].center_point.x,
        designObjectData[0].center_point.y,
        0,
      );
    }

    selectedObject?.add(partObject);
  }

  return {
    // @ts-ignore
    Scene: scene,
    cupboardData: cupBoardData,
  };
};
