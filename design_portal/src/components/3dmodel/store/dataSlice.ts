import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as THREE from 'three';
import { Floor, Wall, WallPoint } from '../2dmodel/interface';
import { MeshObjectData } from '../sceneCreator/interface';
import { DataState, Position } from './interface';

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
  floor: [],
};

const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    addObjects: (state, action: PayloadAction<MeshObjectData[]>) => {
      state.objects = [...state.objects, ...action.payload];
    },
    setObjects: (state, action: PayloadAction<MeshObjectData[]>) => {
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
    updateObject: (state, action: PayloadAction<Partial<MeshObjectData> & { id: string }>) => {
      const updatedObject = action.payload;
      const index = state.objects.findIndex((obj) => obj.id === updatedObject.id);
      if (index !== -1) {
        const existingObject = state.objects[index];
        // Deep merge for nested objects like edgeBanding
        const mergedObject: MeshObjectData = {
          ...existingObject,
          ...updatedObject,
          // Merge nested properties properly
          dimensions: updatedObject.dimensions
            ? { ...existingObject.dimensions, ...updatedObject.dimensions }
            : existingObject.dimensions,
          position: updatedObject.position
            ? { ...existingObject.position, ...updatedObject.position }
            : existingObject.position,
          rotation: updatedObject.rotation
            ? { ...existingObject.rotation, ...updatedObject.rotation }
            : existingObject.rotation,
          edgeBanding: updatedObject.edgeBanding
            ? { ...existingObject.edgeBanding, ...updatedObject.edgeBanding }
            : existingObject.edgeBanding,
        };
        state.objects[index] = mergedObject;
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
      state.objects = state.objects.filter((obj) => obj.parent !== id);
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
    addWall: (state, action: PayloadAction<MeshObjectData>) => {
      state.walls.push(action.payload);
    },
    setWalls: (state, action: PayloadAction<MeshObjectData[]>) => {
      state.walls = action.payload;
    },
    updateWall: (state, action: PayloadAction<MeshObjectData>) => {
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
    setFloor: (state, action: PayloadAction<Floor[]>) => {
      state.floor = action.payload;
    },
    resetData: () => {
      return { ...initialState };
    },
  },
});

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
  addWall,
  setWalls,
  setFloor,
  updateWall,
  removeWall,
  clearWalls,
  resetData,
} = dataSlice.actions;

export default dataSlice.reducer;
