import { itemChoices, partChoices, typeChoices } from '../../utils/choices';
import { addInitObject } from '../handler';
import { getDesignData } from '../handler/utils';
import { ThreeDView } from '../scene';

export const createScene = async (design3D: ThreeDView) => {
  localStorage.setItem('cupboard', 'false');
  let dataList = [];
  let childIds = [];

  let selectedObject = null;
  const response_data = await getDesignData();
  if (response_data) {
    // @ts-expect-error no error, need to hanlde it properly
    for (const item of response_data) {
      const object_data = item.data;
      const item_data = object_data.data;
      const action_data = {
        id: item.id,
        data: item_data,
        type: '',
        item: '',
      };

      if (object_data.type === 'CUPBOARD') {
        action_data.item = itemChoices.CUPBOARD;
        action_data.type = typeChoices.ITEM;
        // @ts-expect-error no error, need to hanlde it properly
        const { Scene, Cupboard, cupboardData, children_ids } =
          // @ts-expect-error no error, need to hanlde it properly
          await addInitObject(action_data, [], design3D.scene, null);

        // Update scene and latestProps
        selectedObject = Cupboard;
        design3D.scene = Scene;
        dataList = cupboardData;
        childIds = children_ids;
      } else if (object_data.type === 'CUPBOARD_PART') {
        action_data.type = typeChoices.PART;
        if (item_data.drawerData) {
          action_data.item = partChoices.DRAWER;
        } else if (item_data.doorData) {
          action_data.item = partChoices.DOOR;
        } else if (item_data[0].name === 'VERTICAL_PLANK') {
          action_data.item = partChoices.VERTICAL_PLANK;
        } else if (item_data[0].name === 'HORIZONTAL_PLANK') {
          action_data.item = partChoices.HORIZONTAL_PLANK;
        } else if (item_data[0].name === 'DOOR') {
          action_data.item = partChoices.DOOR;
        } else if (item_data[0].name === 'DRAWER') {
          action_data.item = partChoices.DRAWER;
        }

        // **Wait for addInitObject to return the updated scene & props**
        // @ts-expect-error no error, need to hanlde it properly
        const { Scene, cupboardData } = await addInitObject(
          // @ts-expect-error no error, need to hanlde it properly
          action_data,
          dataList,
          design3D.scene,
          selectedObject,
        );

        design3D.scene = Scene;
        dataList = cupboardData;
      }
    }
  }

  return { Design3D1: design3D, cupBoardData: dataList, childIds: childIds };
};
