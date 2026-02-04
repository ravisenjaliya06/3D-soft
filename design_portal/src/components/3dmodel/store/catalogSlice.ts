import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CatalogWithChildren } from '../handler/interface';
import { InitialState } from '../interface';

const initialState = {
  catalog: [],
} as InitialState;

const catalogSlice = createSlice({
  name: 'catalog',
  initialState,
  reducers: {
    setObjects: (state, action: PayloadAction<CatalogWithChildren[]>) => {
      state.catalog.push(action.payload);
    },
    resetCatalog: () => {
      return { catalog: [] };
    },
  },
});

export const { setObjects, resetCatalog } = catalogSlice.actions;
export default catalogSlice.reducer;
