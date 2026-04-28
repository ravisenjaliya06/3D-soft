import activeDesignReducer, {
  clearActiveDesignOverrides,
} from '@/components/3dmodel/store/activeDesignSlice';
import activeItemReducer, {
  clearActiveItemOverrides,
} from '@/components/3dmodel/store/activeItemSlice';
import catalogReducer, { resetCatalog } from '@/components/3dmodel/store/catalogSlice';
import dataReducer, { resetData } from '@/components/3dmodel/store/dataSlice';
import designSettingsReducer from '@/components/3dmodel/store/designSettingsSlice';
import historyReducer, {
  beginHistoryTransaction,
  clearHistory,
  createHistorySnapshot,
  endHistoryTransaction,
  pushSnapshot,
} from '@/components/3dmodel/store/historySlice';
import measurementReducer, { resetMeasurement } from '@/components/3dmodel/store/measurementSlice';
import sceneReducer, { resetScene } from '@/components/3dmodel/store/sceneSlice';
import { Action, configureStore, Middleware } from '@reduxjs/toolkit';
import { setAutoFreeze } from 'immer';
import { ThunkAction } from 'redux-thunk';

// 🔥Important: Disable Immer auto-freeze or Three.js will crash at runtime.
// Do NOT remove or modify this — freezing breaks Three.js objects.
setAutoFreeze(false);

const HISTORY_EXCLUDED_ACTIONS = new Set([
  'data/setobjectSelected',
  'data/setSelectedChildObject',
  'data/setHoverdMesh',
  'data/setInvisibleBox',
  'history/pushSnapshot',
  'history/movePastToFuture',
  'history/moveFutureToPast',
  'history/finishApplyingHistory',
  'history/flushPendingHistory',
  'history/beginHistoryTransaction',
  'history/endHistoryTransaction',
  'history/clearHistory',
  'data/restoreDataState',
  'activeDesign/restoreActiveDesignState',
  'activeItem/restoreActiveItemState',
  'designSettings/restoreDesignSettingsState',
]);

const HISTORY_INCLUDED_PREFIXES = ['data/', 'activeDesign/', 'activeItem/', 'designSettings/'];
const HISTORY_COMMIT_DELAY_MS = 180;

let pendingSnapshot: ReturnType<typeof createHistorySnapshot> | null = null;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let transactionDepth = 0;

const clearPendingTimer = () => {
  if (!pendingTimer) return;
  clearTimeout(pendingTimer);
  pendingTimer = null;
};

const commitPendingSnapshot = (api: any) => {
  if (!pendingSnapshot) {
    clearPendingTimer();
    return;
  }
  api.dispatch(pushSnapshot(pendingSnapshot));
  pendingSnapshot = null;
  clearPendingTimer();
};

const isSignificantHistoryChange = (
  before: ReturnType<typeof createHistorySnapshot>,
  after: ReturnType<typeof createHistorySnapshot>
) => {
  const normalizeObjects = (objects: any[]) =>
    objects
      .filter((obj) => obj.type !== 'floor')
      .map((obj) => ({
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
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

  return (
    JSON.stringify(normalizeObjects(before.data.objects)) !==
      JSON.stringify(normalizeObjects(after.data.objects)) ||
    JSON.stringify(before.activeDesign) !== JSON.stringify(after.activeDesign) ||
    JSON.stringify(before.activeItem) !== JSON.stringify(after.activeItem) ||
    JSON.stringify(before.designSettings) !== JSON.stringify(after.designSettings)
  );
};

const historyTrackingMiddleware: Middleware = (api) => (next) => (action: any) => {
  const actionType = action?.type ?? '';
  if (actionType === 'history/clearHistory') {
    pendingSnapshot = null;
    clearPendingTimer();
    return next(action);
  }
  if (actionType === 'history/flushPendingHistory') {
    commitPendingSnapshot(api);
    return next(action);
  }
  if (actionType === beginHistoryTransaction.type) {
    transactionDepth += 1;
    return next(action);
  }
  if (actionType === endHistoryTransaction.type) {
    transactionDepth = Math.max(0, transactionDepth - 1);
    const result = next(action);
    if (transactionDepth === 0) {
      commitPendingSnapshot(api);
    }
    return result;
  }

  const isIncluded = HISTORY_INCLUDED_PREFIXES.some((prefix) => actionType.startsWith(prefix));

  if (!isIncluded || HISTORY_EXCLUDED_ACTIONS.has(actionType)) {
    return next(action);
  }

  const prevState = api.getState() as any;
  if (prevState.history.isApplying) {
    return next(action);
  }
  if (!pendingSnapshot) {
    pendingSnapshot = createHistorySnapshot(prevState);
  }
  const snapshotBeforeAction = pendingSnapshot;

  const result = next(action);
  const nextState = api.getState() as any;

  if (nextState.history.isApplying) {
    return result;
  }

  const hasChanged = isSignificantHistoryChange(snapshotBeforeAction, createHistorySnapshot(nextState));

  if (hasChanged) {
    if (transactionDepth > 0) {
      clearPendingTimer();
    } else {
      clearPendingTimer();
      pendingTimer = setTimeout(() => {
        commitPendingSnapshot(api);
      }, HISTORY_COMMIT_DELAY_MS);
    }
  }

  return result;
};

/* This is main store which i show in console in dev mode and using this store we can access all the states */
export const store = configureStore({
  reducer: {
    scene: sceneReducer,
    data: dataReducer,
    catalog: catalogReducer,
    history: historyReducer,
    measurement: measurementReducer,
    designSettings: designSettingsReducer,
    activeDesign: activeDesignReducer,
    activeItem: activeItemReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
    }).concat(historyTrackingMiddleware),
});

/* registers a callback function that runs every time the Redux store updates.*/
store.subscribe(() => {
  if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
    console.log('Updated store state:', store.getState());
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk = ThunkAction<void, RootState, unknown, Action<string>>;

/** Resets all design-specific store state when switching to a new design. */
export const resetStoreForNewDesign = (): AppThunk => (dispatch) => {
  dispatch(resetScene());
  dispatch(resetData());
  dispatch(resetCatalog());
  dispatch(clearHistory());
  dispatch(resetMeasurement());
  dispatch(clearActiveDesignOverrides());
  dispatch(clearActiveItemOverrides());
};
