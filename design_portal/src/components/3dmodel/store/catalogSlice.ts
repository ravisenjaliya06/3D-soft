import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CatalogWithChildren } from '../handler/items';
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
  },
});

export const { setObjects } = catalogSlice.actions;
export default catalogSlice.reducer;
