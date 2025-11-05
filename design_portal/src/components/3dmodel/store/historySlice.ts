import commonService from '@/services/CommonService';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as THREE from 'three';
import { gettingDesignID } from '../design';
import { ResponseStatus } from '../interface';
import { AppThunk } from '../store';
import { convertObjectData } from '../utils/convertData';
import { updateObjectGeometry } from '../utils/geometryUtils'; // Import the utility
import { addObjects, removeObject, removeObjectWithHistory, updateObject } from './dataSlice';
import { HistoryAction, HistoryState, Object3D, Position } from './interface';
import { addElement, removeElement } from './sceneSlice';

// Helper functions (unchanged)
const isMainObject = (object: Object3D): boolean => {
  return !object.parent || object.parent === null;
};

const getAllChildObjects = (object: Object3D, allObjects: Object3D[]): Object3D[] => {
  const childObjects = allObjects.filter((obj) => {
    return obj.parent === object.id && obj.parent !== null && obj.parent !== undefined;
  });

  let result = [...childObjects];
  childObjects.forEach((child) => {
    result = [...result, ...getAllChildObjects(child, allObjects)];
  });

  return result;
};

const initialState: HistoryState = {
  past: [],
  future: [],
};

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    addToHistory: (state, action: PayloadAction<HistoryAction>) => {
      const { type, data } = action.payload;
      if (type === 'REMOVE' && data.objects && data.meshes) {
        state.past.push(action.payload);
        state.future = [];
      } else if (data.object && isMainObject(data.object) && data.mesh) {
        state.past.push(action.payload);
        state.future = [];
      }
    },
    undo: (state) => {
      if (state.past.length > 0) {
        const lastAction = state.past.pop()!;
        state.future.push(lastAction);
      }
    },
    redo: (state) => {
      if (state.future.length > 0) {
        const lastAction = state.future.pop()!;
        state.past.push(lastAction);
      }
    },
    clearHistory: (state) => {
      state.past = [];
      state.future = [];
    },
    updateHistory: (
      state,
      action: PayloadAction<{ past: HistoryAction[]; future: HistoryAction[] }>
    ) => {
      state.past = action.payload.past;
      state.future = action.payload.future;
    },
  },
});

export const trackPropertyChange =
  (
    object: Object3D,
    property: string,
    oldValue: number,
    newValue: number,
    mesh?: THREE.Mesh
  ): AppThunk =>
  (dispatch) => {
    const action: HistoryAction = {
      id: object.id,
      type: 'PROPERTY_CHANGE',
      data: {
        object,
        mesh,
        propertyChanges: [{ property, oldValue, newValue }],
      },
    };
    dispatch(addToHistory(action));
  };

export const undoAction = (): AppThunk => (dispatch, getState) => {
  const state = getState();
  const history = state.history;

  if (history.past.length > 0) {
    const lastAction = history.past[history.past.length - 1];

    switch (lastAction.type) {
      case 'ADD':
        if (lastAction.data.mesh && lastAction.data.object) {
          dispatch(deleteObject(lastAction.data.mesh, lastAction.data.object.id));
        }
        if (lastAction.data.object) {
          dispatch(removeObject(lastAction.data.object.id));
        }
        if (lastAction.data.mesh) {
          dispatch(removeElement(lastAction.data.mesh));
        }
        if (lastAction.data.childObjects) {
          lastAction.data.childObjects.forEach((child) => dispatch(removeObject(child.id)));
        }
        break;

      case 'REMOVE':
        // Handle bulk removal (removeAllObjects case)
        if (lastAction.data.objects && lastAction.data.meshes) {
          // Restore all main objects and meshes
          lastAction.data.objects.forEach((obj, index) => {
            const mesh = lastAction.data.meshes![index];
            dispatch(createObject(obj, mesh, lastAction.data.childObjects));
            dispatch(addElement(mesh));
          });
          dispatch(addObjects(lastAction.data.objects));

          // Restore all child objects
          if (lastAction.data.childObjects) {
            dispatch(addObjects(lastAction.data.childObjects));
          }
        } else {
          // Handle single object removal
          if (lastAction.data.mesh && lastAction.data.object) {
            dispatch(createObject(lastAction.data.object, lastAction.data.mesh));
            dispatch(addElement(lastAction.data.mesh));
          }
          if (lastAction.data.object) {
            dispatch(addObjects([lastAction.data.object]));
          }
          if (lastAction.data.childObjects) {
            dispatch(addObjects(lastAction.data.childObjects));
          }
        }
        break;

      case 'PROPERTY_CHANGE':
        if (lastAction.data.propertyChanges && lastAction.data.mesh && lastAction.data.object) {
          const change = lastAction.data.propertyChanges[0];
          const updatedData = { [change.property]: change.oldValue };
          const allObjects = getState().data.objects;
          if (isMainObject(lastAction.data.object)) {
            dispatch(
              updateMainObjectInDatabase(
                lastAction.data.object.id,
                updatedData,
                lastAction.data.object,
                lastAction.data.mesh,
                allObjects
              )
            );
          }
        }
        break;
    }
    dispatch(undo());
  }
};

export const redoAction = (): AppThunk => (dispatch, getState) => {
  const state = getState();
  const history = state.history;

  if (history.future.length > 0) {
    const nextAction = history.future[history.future.length - 1];

    switch (nextAction.type) {
      case 'ADD':
        if (nextAction.data.mesh && nextAction.data.object) {
          dispatch(
            createObject(nextAction.data.object, nextAction.data.mesh, nextAction.data.childObjects)
          );
        }
        if (nextAction.data.object) {
          dispatch(addObjects([nextAction.data.object]));
        }
        if (nextAction.data.mesh) {
          dispatch(addElement(nextAction.data.mesh));
        }
        if (nextAction.data.childObjects) {
          dispatch(addObjects(nextAction.data.childObjects));
        }
        break;

      case 'REMOVE':
        // Handle bulk removal (removeAllObjects case)
        if (nextAction.data.objects && nextAction.data.meshes) {
          // Remove all main objects and meshes
          nextAction.data.objects.forEach((obj, index) => {
            const mesh = nextAction.data.meshes![index];
            dispatch(deleteObject(mesh, obj.id));
            dispatch(removeElement(mesh));
          });
          nextAction.data.objects.forEach((obj) => {
            dispatch(removeObject(obj.id));
          });

          // Remove all child objects
          if (nextAction.data.childObjects) {
            nextAction.data.childObjects.forEach((child) => dispatch(removeObject(child.id)));
          }
        } else {
          // Handle single object removal
          if (nextAction.data.mesh && nextAction.data.object) {
            dispatch(deleteObject(nextAction.data.mesh, nextAction.data.object.id));
          }
          if (nextAction.data.object) {
            dispatch(removeObject(nextAction.data.object.id));
          }
          if (nextAction.data.mesh) {
            dispatch(removeElement(nextAction.data.mesh));
          }
          if (nextAction.data.childObjects) {
            nextAction.data.childObjects.forEach((child) => dispatch(removeObject(child.id)));
          }
        }
        break;

      case 'PROPERTY_CHANGE':
        if (nextAction.data.propertyChanges && nextAction.data.mesh && nextAction.data.object) {
          const change = nextAction.data.propertyChanges[0];
          const updatedData = { [change.property]: change.newValue };
          const allObjects = getState().data.objects;
          if (isMainObject(nextAction.data.object)) {
            dispatch(
              updateMainObjectInDatabase(
                nextAction.data.object.id,
                updatedData,
                nextAction.data.object,
                nextAction.data.mesh,
                allObjects
              )
            );
          }
        }
        break;
    }

    dispatch(redo());
  }
};

export const createObject =
  (object: Object3D, mesh: THREE.Mesh, childObjects?: Object3D[]): AppThunk =>
  async (dispatch, getState) => {
    const designId = gettingDesignID();
    if (!designId) {
      console.error('No design ID found');
      return;
    }
    const convertedData = convertObjectData(object, childObjects);
    const data = {
      data: {
        catalog: {
          ...convertedData.object,
        },
        items: convertedData?.items || [],
        child_catalogs: convertedData?.child_catalogs || [],
      },
    };

    const response = await commonService.post('design', `${designId}/object`, data);

    if (response.status === 200 || response.status === 201) {
      const state = getState();
      const history = state.history;

      const updateHistory = (actions: HistoryAction[]) => {
        actions.map((action) => {
          if (action.id === object.id) {
            return {
              ...action,
              data: {
                ...action.data,
                object: {
                  ...action.data.object,
                },
                childObjects: action.data.childObjects,
              },
            };
          }
          return action;
        });
      };
      const updatedPast = updateHistory(history.past);
      const updatedFuture = updateHistory(history.future);

      dispatch({
        type: 'history/updateHistory',
        payload: {
          past: updatedPast,
          future: updatedFuture,
        },
      });
    } else {
      throw new Error('Failed to create object');
    }
  };

export const updateMainObjectInDatabase =
  (
    objectId: string,
    updatedData: Partial<Object3D>,
    selectedObject: Object3D,
    mesh: THREE.Mesh,
    allObjects: Object3D[]
  ): AppThunk =>
  async (dispatch) => {
    const designId = gettingDesignID();
    if (!designId) {
      console.error('No design ID found');
      return;
    }

    const dataObject: {
      width: number;
      height: number;
      depth: number;
      position: Position;
      rotateX: number;
      rotateY: number;
      rotateZ: number;
    } = {
      width: selectedObject.width || 1,
      height: selectedObject.height || 1,
      depth: selectedObject.depth || 1,
      position: selectedObject.position || { x: 0, y: 0, z: 0 },
      rotateX: selectedObject.rotationX || 0,
      rotateY: selectedObject.rotationY || 0,
      rotateZ: selectedObject.rotationZ || 0,
    };

    if (updatedData.width !== undefined) dataObject.width = updatedData.width;
    if (updatedData.height !== undefined) dataObject.height = updatedData.height;
    if (updatedData.depth !== undefined) dataObject.depth = updatedData.depth;
    if (updatedData.position)
      dataObject.position = { ...dataObject.position, ...updatedData.position };
    if (updatedData.rotationX !== undefined) dataObject.rotateX = updatedData.rotationX;
    if (updatedData.rotationY !== undefined) dataObject.rotateY = updatedData.rotationY;
    if (updatedData.rotationZ !== undefined) dataObject.rotateZ = updatedData.rotationZ;

    const items = [];
    const updatedObject = { ...selectedObject, ...updatedData };
    dispatch(updateObject(updatedObject));

    const childUpdates = updateObjectGeometry(mesh, updatedObject, updatedData, allObjects);

    for (const [childId, childData] of Object.entries(childUpdates)) {
      const childObject = allObjects.find((obj) => obj.id === childId);
      if (childObject) {
        dispatch(updateObject({ ...childObject, ...childData }));
        items.push({
          id: childId,
          name: childObject.name,
          data: { ...childObject, ...childData },
        });
      }
    }

    const payload = {
      data: {
        catalog: { id: objectId, name: selectedObject.name, data: dataObject },
        items: items,
      },
    };
    const response: { status: number } = await commonService.putObjectData(
      'design',
      designId,
      'object',
      payload
    );

    if (response && response.status === 200) {
    } else {
      throw new Error(`Failed to update main object ${objectId}`);
    }
  };

export const deleteObject =
  (threeDObject: THREE.Mesh, objectId: string): AppThunk =>
  async (dispatch) => {
    const formData = new FormData();
    formData.append('ids', objectId);

    const response = (await commonService.deleteDesignObjectsData(
      'design',
      gettingDesignID(),
      'object',
      formData
    )) as ResponseStatus;

    if (response && response.status === 200) {
      dispatch(removeObjectWithHistory(objectId, threeDObject));
    } else {
      throw new Error('Failed to delete object');
    }
  };

export const quickHideAction = (): AppThunk => () => {};

export const addObjectWithChildrenToHistory =
  (object: Object3D, mesh: THREE.Mesh): AppThunk =>
  (dispatch, getState) => {
    const state = getState();
    const allObjects = state.data.objects;
    const childObjects = getAllChildObjects(object, allObjects);

    const action: HistoryAction = {
      id: object.id,
      type: 'ADD',
      data: { object, mesh, childObjects },
    };
    dispatch(addToHistory(action));
  };

export const removeObjectWithChildrenFromHistory =
  (object: Object3D, mesh: THREE.Mesh): AppThunk =>
  (dispatch, getState) => {
    const state = getState();
    const allObjects = state.data.objects;
    const childObjects = getAllChildObjects(object, allObjects);

    const action: HistoryAction = {
      id: object.id,
      type: 'REMOVE',
      data: { object, mesh, childObjects },
    };
    dispatch(addToHistory(action));
  };

export const { addToHistory, undo, redo, clearHistory, updateHistory } = historySlice.actions;
export default historySlice.reducer;
