import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SyncManager } from '../sceneCreator/syncState';
import { AppThunk, RootState } from '../store';
import { restoreActiveDesignState } from './activeDesignSlice';
import { restoreActiveItemState } from './activeItemSlice';
import { restoreDataState } from './dataSlice';
import { restoreDesignSettingsState } from './designSettingsSlice';
import * as THREE from 'three';

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

type VisualComparableObject = {
  id: string;
  parent?: string | null;
  type?: string;
  position?: unknown;
  rotation?: unknown;
  scale?: unknown;
  dimensions?: unknown;
  material?: unknown;
  holes?: unknown;
  grooves?: unknown;
  panelDesign?: unknown;
  floorData?: unknown;
};

function buildVisualSignature(snapshot: HistorySnapshot): string {
  const comparable = snapshot.data.objects
    .filter((obj) => obj.type !== 'floor')
    .map(
      (obj) =>
        ({
          id: obj.id,
          parent: obj.parent ?? null,
          type: obj.type,
          position: obj.position,
          rotation: obj.rotation,
          scale: obj.scale,
          dimensions: obj.dimensions,
          material: obj.material,
          holes: obj.holes,
          grooves: obj.grooves,
          panelDesign: obj.panelDesign,
          floorData: obj.floorData,
        }) as VisualComparableObject
    )
    .sort((a, b) => a.id.localeCompare(b.id));

  return JSON.stringify(comparable);
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
  };

export const undoAction = (): AppThunk => async (dispatch, getState) => {
  dispatch(flushPendingHistory());
  const beforeUndo = getState();
  if (beforeUndo.history.past.length === 0 || beforeUndo.history.isApplying) return;

  const currentSnapshot = createHistorySnapshot(beforeUndo);
  const currentVisualSignature = buildVisualSignature(currentSnapshot);
  let steps = 1;
  let targetIndex = beforeUndo.history.past.length - 1;

  for (let i = beforeUndo.history.past.length - 1; i >= 0; i--) {
    const signature = buildVisualSignature(beforeUndo.history.past[i]);
    if (signature !== currentVisualSignature || i === 0) {
      targetIndex = i;
      steps = beforeUndo.history.past.length - i;
      break;
    }
  }
  const targetSnapshot = beforeUndo.history.past[targetIndex];

  dispatch(movePastToFutureSteps({ current: currentSnapshot, steps }));
  await dispatch(restoreSnapshot(targetSnapshot) as any);
  dispatch(finishApplyingHistory());
};

export const redoAction = (): AppThunk => async (dispatch, getState) => {
  dispatch(flushPendingHistory());
  const beforeRedo = getState();
  if (beforeRedo.history.future.length === 0 || beforeRedo.history.isApplying) return;

  const currentSnapshot = createHistorySnapshot(beforeRedo);
  const currentVisualSignature = buildVisualSignature(currentSnapshot);
  let steps = 1;
  let targetIndex = beforeRedo.history.future.length - 1;

  for (let i = beforeRedo.history.future.length - 1; i >= 0; i--) {
    const signature = buildVisualSignature(beforeRedo.history.future[i]);
    if (signature !== currentVisualSignature || i === 0) {
      targetIndex = i;
      steps = beforeRedo.history.future.length - i;
      break;
    }
  }
  const targetSnapshot = beforeRedo.history.future[targetIndex];

  dispatch(moveFutureToPastSteps({ current: currentSnapshot, steps }));
  await dispatch(restoreSnapshot(targetSnapshot) as any);
  dispatch(finishApplyingHistory());
};

export const {
  pushSnapshot,
  movePastToFuture,
  moveFutureToPast,
  movePastToFutureSteps,
  moveFutureToPastSteps,
  finishApplyingHistory,
  flushPendingHistory,
  beginHistoryTransaction,
  endHistoryTransaction,
  clearHistory,
} = historySlice.actions;
export default historySlice.reducer;
