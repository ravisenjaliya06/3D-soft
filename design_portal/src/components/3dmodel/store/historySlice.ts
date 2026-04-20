import { API_ENDPOINT } from '@/services/ApiEndPoints';
import commonService from '@/services/CommonService';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as THREE from 'three';
import { ResponseStatus } from '../interface';
import { AppThunk } from '../store';
import { convertObjectData } from '../utils/convertData';
import { gettingDesignID } from '../utils/routeIds';
import { removeObject } from './dataSlice';
import { HistoryAction, HistoryState, Object3D } from './interface';
import { addElement, removeElement } from './sceneSlice';

// Helper functions (unchanged)
const isMainObject = (object: Object3D): boolean => {
  return !object.parent || object.parent === null;
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

      case 'PROPERTY_CHANGE':
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
        if (nextAction.data.mesh) {
          dispatch(addElement(nextAction.data.mesh));
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

    const response = await commonService.post(API_ENDPOINT.CREATE_DESIGN_OBJECT(designId), data);

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

export const deleteObject =
  (threeDObject: THREE.Mesh, objectId: string): AppThunk =>
  async () => {
    const formData = new FormData();
    formData.append('ids', objectId);
    const designId = gettingDesignID();
    if (!designId) return;

    formData.append('design', designId);

    const response = (await commonService.delete(
      API_ENDPOINT.DELETE_OBJECT(designId),
      formData
    )) as ResponseStatus;

    if (response && response.status === 200) {
    } else {
      throw new Error('Failed to delete object');
    }
  };

export const quickHideAction = (): AppThunk => () => {};

export const { addToHistory, undo, redo, clearHistory, updateHistory } = historySlice.actions;
export default historySlice.reducer;
