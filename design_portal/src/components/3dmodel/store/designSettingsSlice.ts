import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CatalogApiResponse } from '../interface';

const initialState: Record<string, CatalogApiResponse[]> = {
  settings: [],
};

const designSettingsSlice = createSlice({
  name: 'designSettings',
  initialState,
  reducers: {
    setSettings: (state, action: PayloadAction<CatalogApiResponse>) => {
      state.settings.push(action.payload);
    },
  },
});

export const { setSettings } = designSettingsSlice.actions;
export default designSettingsSlice.reducer;
