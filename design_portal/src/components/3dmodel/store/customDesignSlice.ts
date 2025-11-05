//@ts-nocheck
import { safeGet } from '@/components/3dmodel/utils/objectUtils';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as THREE from 'three';
import { AppThunk } from '../store';
import { trackClearAllShapes } from './customDesignHistorySlice';
import { CustomDesignState, Shape } from './interface';

const initialState: CustomDesignState = {
  shapes: [],
  selectedShapeId: null,
  sceneState: {
    gridVisible: true,
    gridSize: 10,
    cameraPosition: { x: 0, y: 0, z: 0 },
    scene: new THREE.Scene(),
  },
};

const customDesignSlice = createSlice({
  name: 'customDesign',
  initialState,
  reducers: {
    addMesh: (state, action: PayloadAction<THREE.Mesh>) => {
      state.sceneState.scene.add(action.payload);
    },
    addShape: (state, action: PayloadAction<Shape>) => {
      state.shapes.push(action.payload);
    },
    removeShape: (state, action: PayloadAction<string>) => {
      state.shapes = state.shapes.filter((shape) => shape.id !== action.payload);
      if (state.selectedShapeId === action.payload) {
        state.selectedShapeId = null;
      }
    },
    removeMesh: (state, action: PayloadAction<THREE.Mesh>) => {
      state.sceneState.scene.remove(action.payload);
    },
    selectShape: (state, action: PayloadAction<string | null>) => {
      state.selectedShapeId = action.payload;
    },
    updateShape: (state, action: PayloadAction<{ id: string; updates: Partial<Shape> }>) => {
      const shapeIndex = state.shapes.findIndex((shape) => shape.id === action.payload.id);
      if (shapeIndex !== -1) {
        state.shapes[shapeIndex] = {
          ...state.shapes[shapeIndex],
          ...action.payload.updates,
        };
      }
    },
    setCustomScene: (state, action: PayloadAction<THREE.Scene>) => {
      state.sceneState.scene = action.payload;
    },
    updateSceneState: (state, action: PayloadAction<Partial<CustomDesignState[]>>) => {
      state.sceneState = {
        ...state.sceneState,
        ...action.payload,
      };
    },
    clearShapes: (state) => {
      state.shapes = [];
      state.selectedShapeId = null;
    },
  },
});

export const removeAllShapes = (): AppThunk => (dispatch, getState) => {
  const data = getState().customDesign;
  const scene = getState().customDesign.sceneState.scene;
  const allObjects = [...data.shapes];

  if (allObjects.length > 0) {
    const meshes = allObjects.map((shape) => {
      return scene.children.find(
        (child) =>
          safeGet(child, 'userData', {}).objectId === safeGet(shape, 'id', '') &&
          child instanceof THREE.Mesh
      ) as THREE.Mesh | undefined;
    }) as THREE.Mesh[];

    dispatch(trackClearAllShapes(allObjects, meshes));
    allObjects.forEach((shape) => {
      const mesh = scene.children.find(
        (child) =>
          safeGet(child, 'userData', {}).objectId === safeGet(shape, 'id', '') &&
          child instanceof THREE.Mesh
      ) as THREE.Mesh | undefined;

      if (mesh) {
        dispatch(customDesignSlice.actions.removeMesh(mesh));
      }
    });

    dispatch(customDesignSlice.actions.clearShapes());
  }
};

export const {
  addMesh,
  addShape,
  removeShape,
  selectShape,
  setCustomScene,
  updateShape,
  updateSceneState,
  removeMesh,
  clearShapes,
} = customDesignSlice.actions;

export default customDesignSlice.reducer;
