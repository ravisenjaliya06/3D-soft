import Item from '@/components/3dmodel/handler/items';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { removeExistingLines } from '../design';
import { AppThunk } from '../store';
import { addToHistory } from './historySlice';
import { DataState, Object3D, Position } from './interface';
import { addElement, removeElement } from './sceneSlice';

const isMainObject = (object: Object3D): boolean => {
  return !object.parent || object.parent === null;
};

const findObjects = (
  objects: Object3D[],
): { mainObjects: Object3D[]; childObjects: Object3D[] } => {
  const mainObjects: Object3D[] = [];
  const childObjects: Object3D[] = [];

  objects.forEach((obj) => {
    if (isMainObject(obj)) {
      mainObjects.push(obj);
    } else {
      childObjects.push(obj);
    }
  });

  return { mainObjects, childObjects };
};

const initialState: DataState = {
  objects: [],
  selectedObject: null,
  selectedChildObject: null,
  selectedInvisibleBox: null,
  mainCupboardId: null,
  isQuickHideActive: false,
  isMeasurementActive: false,
  currentUnitType: 'cm',
  showCreationCancelHint: false,
  isAlignmentActive: false,
  hoverdMesh: null,
};

const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    addObjects: (state, action: PayloadAction<Object3D[]>) => {
      state.objects = [...state.objects, ...action.payload];
    },
    setObjects: (state, action: PayloadAction<Object3D[]>) => {
      state.objects = action.payload;
    },
    setMainCupboardId: (state, action: PayloadAction<string>) => {
      state.mainCupboardId = action.payload;
    },
    setobjectSelected: (state, action: PayloadAction<string | null>) => {
      state.selectedObject = action.payload;
    },
    setSelectedChildObject: (state, action: PayloadAction<string | null>) => {
      state.selectedChildObject = action.payload;
    },
    updateObject: (state, action: PayloadAction<Object3D>) => {
      const updatedObject = action.payload;
      const index = state.objects.findIndex(
        (obj) => obj.id === updatedObject.id,
      );
      if (index !== -1) {
        state.objects[index] = { ...state.objects[index], ...updatedObject };
      }
    },
    updateObjectId: (
      state,
      action: PayloadAction<{ oldId: string; newId: string }>,
    ) => {
      const { oldId, newId } = action.payload;
      const index = state.objects.findIndex((obj) => obj.id === oldId);
      if (index !== -1) {
        const updatedObject = { ...state.objects[index], id: newId };
        state.objects = state.objects.filter((obj) => obj.id !== oldId);
        state.objects.push(updatedObject);
      }
    },
    updateObjectPosition: (
      state,
      action: PayloadAction<{ id: string; position: Position }>,
    ) => {
      const { id, position } = action.payload;
      const index = state.objects.find((obj) => obj.id === id);
      if (index) {
        index.position = position;
        state.objects.forEach((obj) => {
          if (obj.parent === id) {
          }
        });
      }
    },
    removeObject: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.objects = state.objects.filter((obj) => obj.id !== id);
    },
    toggleQuickHide: (state, action: PayloadAction<boolean>) => {
      state.isQuickHideActive = action.payload;
      // Turn off measurement when quick hide is active
      if (action.payload) {
        state.isMeasurementActive = false;
        state.isAlignmentActive = false;
      }
    },
    toggleMeasurement: (state, action: PayloadAction<boolean>) => {
      state.isMeasurementActive = action.payload;
      // Turn off quick hide when measurement is active
      if (action.payload) {
        state.isQuickHideActive = false;
        state.isAlignmentActive = false;
      }
    },

    setUnitType: (state, action: PayloadAction<'mm' | 'cm' | 'in'>) => {
      state.currentUnitType = action.payload;
    },
    setCreationCancelHint: (state, action: PayloadAction<boolean>) => {
      state.showCreationCancelHint = action.payload;
    },

    togglAlignment: (state, action: PayloadAction<boolean>) => {
      state.isAlignmentActive = action.payload;
      if (action.payload) {
        state.isQuickHideActive = false;
        state.isMeasurementActive = false;
      }
    },
    setHoverdMesh: (state, action: PayloadAction<THREE.Mesh | null>) => {
      state.hoverdMesh = action.payload;
    },
    setInvisibleBox: (state, action: PayloadAction<string | null>) => {
      state.selectedInvisibleBox = action.payload;
    },
  },
});

const findAllChildrenIds = (
  parentId: string,
  allObjects: Object3D[],
): string[] => {
  const directChildren = allObjects.filter((obj) => obj.parent === parentId);
  let childrenIds = directChildren.map((child) => child.id);
  directChildren.forEach((child) => {
    const grandChildrenIds = findAllChildrenIds(child.id, allObjects);
    childrenIds = [...childrenIds, ...grandChildrenIds];
  });

  return childrenIds;
};

export const removeObjectWithHistory =
  (id: string, mesh: THREE.Mesh): AppThunk =>
  (dispatch, getState) => {
    const state = getState().data;
    const objectToRemove = state.objects.find((obj) => obj.id === id);

    if (objectToRemove) {
      const childrenIds = findAllChildrenIds(id, state.objects);
      dispatch(removeObject(id));
      childrenIds.forEach((childId) => {
        dispatch(removeObject(childId));
      });

      if (isMainObject(objectToRemove)) {
        dispatch(
          addToHistory({
            id: uuidv4(),
            type: 'REMOVE',
            data: {
              object: objectToRemove,
              mesh,
              childObjects: state.objects.filter((obj) =>
                childrenIds.includes(obj.id),
              ),
            },
          }),
        );
      }
    } else {
      console.warn(`Cannot find object with ID: ${id} to remove`);
    }
  };

export const addObjectsThunk =
  (name: string): AppThunk =>
  async (dispatch, getState) => {
    const catalog = getState().catalog;
    const data = getState().data.objects;
    const scene = getState().scene.scene;
    try {
      dispatch(setCreationCancelHint(true));
      const result = await Item.moveObject(
        name,
        catalog,
        scene,
        dispatch,
        data,
      );
      dispatch(setCreationCancelHint(false));
      if (
        result?.threeDObject &&
        result?.createResult &&
        'objectsList' in result.createResult
      ) {
        const objectsList = result.createResult.objectsList;
        dispatch(addElement(result.threeDObject));

        const { mainObjects, childObjects } = findObjects(objectsList);
        for (const obj of mainObjects) {
          dispatch(
            addToHistory({
              id: uuidv4(),
              type: 'ADD',
              data: {
                object: obj,
                mesh: result.threeDObject,
                childObjects: childObjects,
              },
            }),
          );
        }
      } else {
      }
    } catch (Error) {
      dispatch(setCreationCancelHint(false));
      console.error('Error during object creation:', Error);
    }
  };

export const copyObjectsThunk = createAsyncThunk(
  'data/copyObjects',
  async (selectedId: string, { dispatch }) => {
    const result = await Item.copyObjects(selectedId);

    if (result && result.objectsList && result.objectsList.length > 0) {
      const idSet = new Set(result.objectsList.map((obj) => obj.id));
      if (idSet.size !== result.objectsList.length) {
        throw new Error('Duplicate IDs detected in copied objects');
      }

      dispatch(addObjects(result.objectsList));
      const { mainObjects, childObjects } = findObjects(result.objectsList);

      return {
        objectId: mainObjects[0]?.id,
        mainObjects,
        childObjects,
      };
    }

    throw new Error('Failed to copy objects');
  },
);

export const removeAllObjects = (): AppThunk => (dispatch, getState) => {
  removeExistingLines();
  const data = getState().data;
  const scene = getState().scene.scene;
  const allObjects = data.objects;

  // Identify main objects
  const mainObjects = allObjects.filter((obj) => isMainObject(obj));

  // Collect data for history
  const historyData: {
    objects: Object3D[];
    meshes: Object3D[];
    childObjects: Object3D[];
  } = {
    objects: [],
    meshes: [],
    childObjects: [],
  };

  mainObjects.forEach((object) => {
const mesh = scene.children.find(
  (child) =>
    child.userData.objectId === object.id && (child as unknown as Object3D)
) as Object3D | undefined;

    if (mesh) {
      historyData.objects.push(object);
      historyData.meshes.push(mesh);

      const childObjects = findAllChildrenIds(object.id, allObjects)
        .map((childId) => allObjects.find((obj) => obj.id === childId))
        .filter((obj): obj is Object3D => obj !== undefined);

      historyData.childObjects.push(...childObjects);
    } else {
      console.warn(`No mesh found for object with ID: ${object.id}`);
    }
  });

  if (historyData.objects.length > 0) {
    dispatch(
      addToHistory({
        id: uuidv4(),
        type: 'REMOVE',
        data: {
          objects: historyData.objects,
          meshes: historyData.meshes as any,
          childObjects: historyData.childObjects,
        },
      }),
    );

    historyData.meshes.forEach((mesh) => {
      dispatch(removeElement(mesh as any));
    });

    historyData.objects.forEach((object) => {
      dispatch(removeObject(object.id));
    });
    historyData.childObjects.forEach((child) => {
      dispatch(removeObject(child.id));
    });
  }
  
};

export const {
  toggleQuickHide,
  toggleMeasurement,
  setUnitType,
  setCreationCancelHint,
  togglAlignment,
} = dataSlice.actions;

export const {
  addObjects,
  setObjects,
  setMainCupboardId,
  setobjectSelected,
  setSelectedChildObject,
  updateObject,
  updateObjectId,
  updateObjectPosition,
  removeObject,
  setHoverdMesh,
  setInvisibleBox,
} = dataSlice.actions;

export default dataSlice.reducer;
