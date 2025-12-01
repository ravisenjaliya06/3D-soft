import catalogReducer from '@/components/3dmodel/store/catalogSlice';
import dataReducer from '@/components/3dmodel/store/dataSlice';
import designSettingsReducer from '@/components/3dmodel/store/designSettingsSlice';
import historyReducer from '@/components/3dmodel/store/historySlice';
import measurementReducer from '@/components/3dmodel/store/measurementSlice';
import sceneReducer from '@/components/3dmodel/store/sceneSlice';
import { Action, configureStore } from '@reduxjs/toolkit';
import { setAutoFreeze } from 'immer';
import { ThunkAction } from 'redux-thunk';

// 🔥Important: Disable Immer auto-freeze or Three.js will crash at runtime.
// Do NOT remove or modify this — freezing breaks Three.js objects.
setAutoFreeze(false);

/* This is main store which i show in console in dev mode and using this store we can access all the states */
export const store = configureStore({
  reducer: {
    scene: sceneReducer,
    data: dataReducer,
    catalog: catalogReducer,
    history: historyReducer,
    measurement: measurementReducer,
    designSettings: designSettingsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
    }),
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
