import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CatalogWithChildren } from '../handler/interface';
import { InitialState } from '../interface';
import { MeshObjectData } from '../sceneCreator/interface';

const initialState = {
  catalog: [],
  catalogItems: [] as MeshObjectData[][],
} as InitialState & { catalogItems: MeshObjectData[][] };

const catalogSlice = createSlice({
  name: 'catalog',
  initialState,
  reducers: {
    setObjects: (state, action: PayloadAction<CatalogWithChildren[]>) => {
      state.catalog.push(action.payload);
    },
    setCatalogItems: (state, action: PayloadAction<MeshObjectData[][]>) => {
      state.catalogItems = action.payload;
    },
    resetCatalog: () => {
      return { catalog: [], catalogItems: [] };
    },
  },
});

export const { setObjects, setCatalogItems, resetCatalog } = catalogSlice.actions;
export default catalogSlice.reducer;
