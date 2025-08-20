import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { WritableDraft } from 'immer';
import * as THREE from 'three';
import { AppThunk } from '../store';
import { SceneState } from './interface';

const initialState: SceneState = {
  scene: new THREE.Scene(),
};

const sceneSlice = createSlice({
  name: 'scene',
  initialState,
  reducers: {
    addElement: (state, action: PayloadAction<THREE.Mesh>) => {
      state.scene.add(action.payload);
    },
    removeElement: (state, action: PayloadAction<THREE.Mesh>) => {
      state.scene.remove(action.payload);
    },
    setScene: (state, action: PayloadAction<THREE.Scene>) => {
      state.scene = action.payload as WritableDraft<THREE.Scene>;
    },
  },
});

export const addElementInState =
  (object: THREE.Mesh): AppThunk =>
  (dispatch) => {
    dispatch(addElement(object));
  };

export const { setScene, addElement, removeElement } = sceneSlice.actions;
export default sceneSlice.reducer;
