import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Item-level overrides (Sidebar settings for selected object)
// null = use active design or design settings default
interface ActiveItemState {
  minifixDistance: number | null;
  minifixDiameterHole: number | null;
  camDepth: number | null;
  camDiameter: number | null;
  camHeight: number | null;
}

const initialState: ActiveItemState = {
  minifixDistance: null,
  minifixDiameterHole: null,
  camDepth: null,
  camDiameter: null,
  camHeight: null,
};

const activeItemSlice = createSlice({
  name: 'activeItem',
  initialState,
  reducers: {
    setActiveItemMinifixDistance: (state, action: PayloadAction<number>) => {
      state.minifixDistance = action.payload;
    },
    setActiveItemMinifixDiameterHole: (state, action: PayloadAction<number>) => {
      state.minifixDiameterHole = action.payload;
    },
    setActiveItemCamDepth: (state, action: PayloadAction<number>) => {
      state.camDepth = action.payload;
    },
    setActiveItemCamDiameter: (state, action: PayloadAction<number>) => {
      state.camDiameter = action.payload;
    },
    setActiveItemCamHeight: (state, action: PayloadAction<number>) => {
      state.camHeight = action.payload;
    },
    restoreActiveItemState: (state, action: PayloadAction<ActiveItemState>) => {
      return { ...state, ...action.payload };
    },
    clearActiveItemOverrides: (state) => {
      state.minifixDistance = null;
      state.minifixDiameterHole = null;
      state.camDepth = null;
      state.camDiameter = null;
      state.camHeight = null;
    },
  },
});

export const {
  setActiveItemMinifixDistance,
  setActiveItemMinifixDiameterHole,
  setActiveItemCamDepth,
  setActiveItemCamDiameter,
  setActiveItemCamHeight,
  restoreActiveItemState,
  clearActiveItemOverrides,
} = activeItemSlice.actions;

export default activeItemSlice.reducer;
