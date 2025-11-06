import catalogReducer from '@/components/3dmodel/store/catalogSlice';
import dataReducer from '@/components/3dmodel/store/dataSlice';
import designSettingsReducer from '@/components/3dmodel/store/designSettingsSlice';
import historyReducer from '@/components/3dmodel/store/historySlice';
import measurementReducer from '@/components/3dmodel/store/measurementSlice';
import sceneReducer from '@/components/3dmodel/store/sceneSlice';
import { Action, configureStore } from '@reduxjs/toolkit';
import { ThunkAction } from 'redux-thunk';

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
    }),
});

store.subscribe(() => {
  if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
    console.log('Updated store state:', store.getState());
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk = ThunkAction<void, RootState, unknown, Action<string>>;
