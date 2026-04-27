import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as THREE from 'three';
import { Floor, Wall, WallPoint } from '../2dmodel/interface';
import { removeWallsPoints } from '../2dmodel/utils';
import { FLOOR_PLAN_TYPES, MeshObjectData } from '../sceneCreator/interface';
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
  wallDrawStartPointId: null,
  hoverdMesh: null,
  points: [],
  floor: [],
  globalDoorsOpen: false,
  isWireframeVisible: false,
  wireframeColor: '#000000',
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
    setGlobalDoorsOpen: (state, action: PayloadAction<boolean>) => {
      state.globalDoorsOpen = action.payload;
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
          panelDesign: updatedObject.panelDesign
            ? updatedObject.panelDesign // Replace panel design entirely
            : existingObject.panelDesign,
          grooves: updatedObject.grooves
            ? updatedObject.grooves // Replace array entirely, do not merge
            : existingObject.grooves,
          holes: updatedObject.holes
            ? updatedObject.holes // Replace array entirely, do not merge
            : existingObject.holes,
        };
        state.objects[index] = mergedObject;
      }
    },
    updateObjects: (state, action: PayloadAction<(Partial<MeshObjectData> & { id: string })[]>) => {
      action.payload.forEach((updatedObject) => {
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
            panelDesign: updatedObject.panelDesign
              ? updatedObject.panelDesign // Replace panel design entirely
              : existingObject.panelDesign,
            grooves: updatedObject.grooves
              ? updatedObject.grooves // Replace array entirely, do not merge
              : existingObject.grooves,
            holes: updatedObject.holes
              ? updatedObject.holes // Replace array entirely, do not merge
              : existingObject.holes,
          };
          state.objects[index] = mergedObject;
        }
      });
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
      const idToRemove = action.payload;

      const collectIdsToRemove = (id: string): string[] => {
        const children = state.objects.filter((obj) => obj.parent === id).map((obj) => obj.id);

        return [id, ...children.flatMap((childId) => collectIdsToRemove(childId))];
      };

      const idsToRemove = collectIdsToRemove(idToRemove);

      state.objects = state.objects.filter((obj) => !idsToRemove.includes(obj.id));

      // Also keep 2D state in sync when walls or floors are deleted from 3D
      state.floor = state.floor.filter((floor) => !idsToRemove.includes(floor.id));
      const remainingWalls = state.objects.filter((obj) => obj.type === FLOOR_PLAN_TYPES.WALL);
      state.points = removeWallsPoints(state.points, remainingWalls as any);
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
      // New session whenever the wall tool is toggled (toolbar or Esc); chain is only stored while tool stays on.
      state.wallDrawStartPointId = null;
      // Turn off other modes when wall drawing is active
      if (action.payload) {
        state.isQuickHideActive = false;
        state.isMeasurementActive = false;
        state.isAlignmentActive = false;
      }
    },
    setWallDrawStartPointId: (state, action: PayloadAction<string | null>) => {
      state.wallDrawStartPointId = action.payload;
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
    toggleWireframe: (state, action: PayloadAction<boolean>) => {
      state.isWireframeVisible = action.payload;
    },
    setWireframeColor: (state, action: PayloadAction<string>) => {
      state.wireframeColor = action.payload;
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
      state.objects.push(action.payload);
    },
    setWalls: (state, action: PayloadAction<MeshObjectData[]>) => {
      // Filter out existing wall objects and replace with new ones
      const nonWallObjects = state.objects.filter((obj) => obj.type !== FLOOR_PLAN_TYPES.WALL);
      state.objects = [...nonWallObjects, ...action.payload];
    },
    updateWall: (state, action: PayloadAction<MeshObjectData>) => {
      const index = state.objects.findIndex((obj) => obj.id === action.payload.id);
      if (index !== -1) {
        state.objects[index] = action.payload;
      }
    },
    removeWall: (state, action: PayloadAction<Wall>) => {
      state.objects = state.objects.filter((obj) => obj.id !== action.payload.id);
    },
    clearWalls: (state) => {
      state.objects = state.objects.filter((obj) => obj.type !== FLOOR_PLAN_TYPES.WALL);
      state.points = [];
    },
    setFloor: (state, action: PayloadAction<Floor[]>) => {
      state.floor = action.payload;
    },
    setPoints: (state, action: PayloadAction<WallPoint[]>) => {
      state.points = action.payload;
    },
    updatePoints: (state, action: PayloadAction<WallPoint[]>) => {
      action.payload.forEach((updatedPoint) => {
        const index = state.points.findIndex((p) => p.id === updatedPoint.id);
        if (index !== -1) {
          state.points[index] = { ...state.points[index], ...updatedPoint };
        }
      });
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
  setWallDrawStartPointId,
  setUnitType,
  setCreationCancelHint,
  togglAlignment,
  setGlobalDoorsOpen,
  toggleWireframe,
  setWireframeColor,
} = dataSlice.actions;

export const {
  addObjects,
  setObjects,
  setMainCupboardId,
  setobjectSelected,
  setSelectedChildObject,
  updateObject,
  updateObjects,
  updateObjectId,
  updateObjectPosition,
  removeObject,
  setHoverdMesh,
  setInvisibleBox,
  addPoint,
  addWall,
  setWalls,
  setFloor,
  setPoints,
  updatePoints,
  updateWall,
  removeWall,
  clearWalls,
  resetData,
} = dataSlice.actions;

export default dataSlice.reducer;
