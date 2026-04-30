import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SyncManager } from '../sceneCreator/syncState';
import { AppThunk, RootState } from '../store';
import { generateCompartmentsFromMesh } from '../handler/items';
import { restoreActiveDesignState } from './activeDesignSlice';
import { restoreActiveItemState } from './activeItemSlice';
import { restoreDataState } from './dataSlice';
import { restoreDesignSettingsState } from './designSettingsSlice';
import * as THREE from 'three';
import { FloorManager } from '../sceneCreator/floorManager';

const MAX_HISTORY_STEPS = 20;

export interface HistorySnapshot {
  data: ReturnType<typeof buildDataSnapshot>;
  activeDesign: RootState['activeDesign'];
  activeItem: RootState['activeItem'];
  designSettings: RootState['designSettings'];
}

interface HistoryState {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  isApplying: boolean;
}

const initialState: HistoryState = {
  past: [],
  future: [],
  isApplying: false,
};

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

function buildDataSnapshot(state: RootState['data']) {
  return {
    objects: deepClone(state.objects),
    selectedObject: state.selectedObject,
    selectedChildObject: state.selectedChildObject,
    selectedInvisibleBox: state.selectedInvisibleBox,
    mainCupboardId: state.mainCupboardId,
    isQuickHideActive: state.isQuickHideActive,
    isMeasurementActive: state.isMeasurementActive,
    currentUnitType: state.currentUnitType,
    showCreationCancelHint: state.showCreationCancelHint,
    isAlignmentActive: state.isAlignmentActive,
    isWallDrawingActive: state.isWallDrawingActive,
    wallDrawStartPointId: state.wallDrawStartPointId,
    points: deepClone(state.points),
    floor: deepClone(state.floor),
    globalDoorsOpen: state.globalDoorsOpen ?? false,
    isWireframeVisible: state.isWireframeVisible,
    wireframeColor: state.wireframeColor,
    wallPointMode: state.wallPointMode,
  };
}

export function createHistorySnapshot(state: RootState): HistorySnapshot {
  return {
    data: buildDataSnapshot(state.data),
    activeDesign: deepClone(state.activeDesign),
    activeItem: deepClone(state.activeItem),
    designSettings: deepClone(state.designSettings),
  };
}

function clearRuntimeSceneOnly(scene: THREE.Scene) {
  const disposableObjects: THREE.Object3D[] = [];
  scene.children.forEach((child) => {
    const type = child.userData?.type;
    if (type === 'ambient_light' || type === 'directional_light' || type === 'transform_controls') {
      return;
    }
    disposableObjects.push(child);
  });

  disposableObjects.forEach((object) => {
    scene.remove(object);
    object.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.geometry?.dispose();
        if (Array.isArray(node.material)) {
          node.material.forEach((mat) => mat.dispose());
        } else {
          node.material?.dispose();
        }
      }
    });
  });
}

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    pushSnapshot: (state, action: PayloadAction<HistorySnapshot>) => {
      state.past.push(action.payload);
      if (state.past.length > MAX_HISTORY_STEPS) {
        state.past.shift();
      }
      state.future = [];
    },
    movePastToFuture: (state, action: PayloadAction<HistorySnapshot>) => {
      if (state.past.length === 0) return;
      const current = action.payload;
      state.past.pop();
      state.future.push(current);
      if (state.future.length > MAX_HISTORY_STEPS) {
        state.future.shift();
      }
      state.isApplying = true;
    },
    moveFutureToPast: (state, action: PayloadAction<HistorySnapshot>) => {
      if (state.future.length === 0) return;
      const current = action.payload;
      state.future.pop();
      state.past.push(current);
      if (state.past.length > MAX_HISTORY_STEPS) {
        state.past.shift();
      }
      state.isApplying = true;
    },
    movePastToFutureSteps: (
      state,
      action: PayloadAction<{ current: HistorySnapshot; steps: number }>
    ) => {
      if (state.past.length === 0 || action.payload.steps <= 0) return;
      const steps = Math.min(action.payload.steps, state.past.length);
      for (let i = 0; i < steps; i++) {
        state.past.pop();
      }
      state.future.push(action.payload.current);
      if (state.future.length > MAX_HISTORY_STEPS) {
        state.future.shift();
      }
      state.isApplying = true;
    },
    moveFutureToPastSteps: (
      state,
      action: PayloadAction<{ current: HistorySnapshot; steps: number }>
    ) => {
      if (state.future.length === 0 || action.payload.steps <= 0) return;
      const steps = Math.min(action.payload.steps, state.future.length);
      for (let i = 0; i < steps; i++) {
        state.future.pop();
      }
      state.past.push(action.payload.current);
      if (state.past.length > MAX_HISTORY_STEPS) {
        state.past.shift();
      }
      state.isApplying = true;
    },
    finishApplyingHistory: (state) => {
      state.isApplying = false;
    },
    flushPendingHistory: () => {
      // Middleware-driven action: reducer intentionally no-op.
    },
    beginHistoryTransaction: () => {
      // Middleware-driven action: reducer intentionally no-op.
    },
    endHistoryTransaction: () => {
      // Middleware-driven action: reducer intentionally no-op.
    },
    clearHistory: (state) => {
      state.past = [];
      state.future = [];
      state.isApplying = false;
    },
  },
});

const restoreSnapshot =
  (snapshot: HistorySnapshot): AppThunk =>
  async (dispatch, getState) => {
    // Clear only runtime scene graph; do not mutate Redux via delete tools.
    clearRuntimeSceneOnly(getState().scene.scene);

    dispatch(restoreDataState(snapshot.data));
    dispatch(restoreActiveDesignState(snapshot.activeDesign));
    dispatch(restoreActiveItemState(snapshot.activeItem));
    dispatch(restoreDesignSettingsState(snapshot.designSettings));

    // Rebuild 3D scene from restored Redux object data to keep 2D/3D/Redux in sync.
    const syncManager = new SyncManager(snapshot.data.objects, undefined, true);
    await syncManager.syncData();

    // Rebuild floors deterministically from restored floor objects.
    // This avoids cases where Redux restore recreated floor data but the floor
    // render pipeline skipped due to memoization in other components.
    const floorObjects = snapshot.data.objects.filter((obj: any) => obj.type === 'floor');
    const floorData = floorObjects
      .map((obj: any) => ({
        id: obj.id,
        points: obj.floorData?.points ?? [],
        walls: obj.floorData?.walls ?? [],
      }))
      .filter((f: any) => f.points?.length >= 3);

    const floorManager = new FloorManager(getState().scene.scene, floorData);
    await floorManager.syncData();

    // Safety pass: ensure invisible compartments always exist after undo/redo restore.
    // This covers grouped restore paths and async hierarchy rebuild edge-cases.
    const scene = getState().scene.scene;
    scene.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      if (!node.userData?.isMain) return;
      if (typeof node.name === 'string' && node.name.toLowerCase().includes('drawer')) return;
      generateCompartmentsFromMesh(node);
    });
  };

export const undoAction = (): AppThunk => async (dispatch, getState) => {
  dispatch(flushPendingHistory());
  const beforeUndo = getState();
  if (beforeUndo.history.past.length === 0 || beforeUndo.history.isApplying) return;

  const currentSnapshot = createHistorySnapshot(beforeUndo);
  const targetSnapshot = beforeUndo.history.past[beforeUndo.history.past.length - 1];

  dispatch(movePastToFuture(currentSnapshot));
  await dispatch(restoreSnapshot(targetSnapshot) as any);
  dispatch(finishApplyingHistory());
};

export const redoAction = (): AppThunk => async (dispatch, getState) => {
  dispatch(flushPendingHistory());
  const beforeRedo = getState();
  if (beforeRedo.history.future.length === 0 || beforeRedo.history.isApplying) return;

  const currentSnapshot = createHistorySnapshot(beforeRedo);
  const targetSnapshot = beforeRedo.history.future[beforeRedo.history.future.length - 1];

  dispatch(moveFutureToPast(currentSnapshot));
  await dispatch(restoreSnapshot(targetSnapshot) as any);
  dispatch(finishApplyingHistory());
};

export const {
  pushSnapshot,
  movePastToFuture,
  moveFutureToPast,
  finishApplyingHistory,
  flushPendingHistory,
  beginHistoryTransaction,
  endHistoryTransaction,
  clearHistory,
} = historySlice.actions;
export default historySlice.reducer;
