import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as THREE from 'three';
import { Wall, WallPoint } from '../2dmodel/interface';
import { removeExistingLines } from '../design';
import { AppThunk } from '../store';
import { addToHistory } from './historySlice';
import { DataState, Object3D, Position } from './interface';
import { removeElement } from './sceneSlice';

const isMainObject = (object: Object3D): boolean => {
  return !object.parent || object.parent === null;
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
  isWallDrawingActive: false,
  hoverdMesh: null,
  points: [],
  walls: [],
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
      const index = state.objects.findIndex((obj) => obj.id === updatedObject.id);
      if (index !== -1) {
        state.objects[index] = { ...state.objects[index], ...updatedObject };
      }
    },
    updateObjectId: (state, action: PayloadAction<{ oldId: string; newId: string }>) => {
      const { oldId, newId } = action.payload;
      const index = state.objects.findIndex((obj) => obj.id === oldId);
      if (index !== -1) {
        const updatedObject = { ...state.objects[index], id: newId };
        state.objects = state.objects.filter((obj) => obj.id !== oldId);
        state.objects.push(updatedObject);
      }
    },
    updateObjectPosition: (state, action: PayloadAction<{ id: string; position: Position }>) => {
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
    toggleWallDrawing: (state, action: PayloadAction<boolean>) => {
      state.isWallDrawingActive = action.payload;
      // Turn off other modes when wall drawing is active
      if (action.payload) {
        state.isQuickHideActive = false;
        state.isMeasurementActive = false;
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
    // Wall-related reducers
    addPoint: (state, action: PayloadAction<WallPoint>) => {
      state.points.push(action.payload);
    },
    setPoints: (state, action: PayloadAction<WallPoint[]>) => {
      state.points = action.payload;
    },
    addWall: (state, action: PayloadAction<Wall>) => {
      state.walls.push(action.payload);
    },
    setWalls: (state, action: PayloadAction<Wall[]>) => {
      state.walls = action.payload;
    },
    updateWall: (state, action: PayloadAction<Wall>) => {
      const index = state.walls.findIndex((wall) => wall.id === action.payload.id);
      if (index !== -1) {
        state.walls[index] = action.payload;
      }
    },
    removeWall: (state, action: PayloadAction<Wall>) => {
      state.walls = state.walls.filter((wall) => wall.id !== action.payload.id);
    },
    clearWalls: (state) => {
      state.walls = [];
      state.points = [];
    },
  },
});

const findAllChildrenIds = (parentId: string, allObjects: Object3D[]): string[] => {
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
            id: crypto.randomUUID(),
            type: 'REMOVE',
            data: {
              object: objectToRemove,
              mesh,
              childObjects: state.objects.filter((obj) => childrenIds.includes(obj.id)),
            },
          })
        );
      }
    } else {
      console.warn(`Cannot find object with ID: ${id} to remove`);
    }
  };

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
    meshes: THREE.Mesh[];
    childObjects: Object3D[];
  } = {
    objects: [],
    meshes: [],
    childObjects: [],
  };

  mainObjects.forEach((object) => {
    const mesh = scene.children.find(
      (child) => child.userData.objectId === object.id && (child as unknown as Object3D)
    ) as THREE.Mesh | undefined;

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
        id: crypto.randomUUID(),
        type: 'REMOVE',
        data: {
          objects: historyData.objects,
          meshes: historyData.meshes,
          childObjects: historyData.childObjects,
        },
      })
    );

    historyData.meshes.forEach((mesh) => {
      dispatch(removeElement(mesh));
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
  toggleWallDrawing,
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
  addPoint,
  setPoints,
  addWall,
  setWalls,
  updateWall,
  removeWall,
  clearWalls,
} = dataSlice.actions;

export default dataSlice.reducer;
