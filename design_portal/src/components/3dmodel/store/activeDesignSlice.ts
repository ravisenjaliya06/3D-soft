import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Design-level overrides (Header settings)
// null = use design settings default
interface ActiveDesignState {
  minifixDistance: number | null;
  minifixDiameterHole: number | null;
  camDepth: number | null;
  camDiameter: number | null;
  camHeight: number | null;
}

const initialState: ActiveDesignState = {
  minifixDistance: null,
  minifixDiameterHole: null,
  camDepth: null,
  camDiameter: null,
  camHeight: null,
};

const activeDesignSlice = createSlice({
  name: 'activeDesign',
  initialState,
  reducers: {
    setActiveDesignMinifixDistance: (state, action: PayloadAction<number>) => {
      state.minifixDistance = action.payload;
    },
    setActiveDesignMinifixDiameterHole: (state, action: PayloadAction<number>) => {
      state.minifixDiameterHole = action.payload;
    },
    setActiveDesignCamDepth: (state, action: PayloadAction<number>) => {
      state.camDepth = action.payload;
    },
    setActiveDesignCamDiameter: (state, action: PayloadAction<number>) => {
      state.camDiameter = action.payload;
    },
    setActiveDesignCamHeight: (state, action: PayloadAction<number>) => {
      state.camHeight = action.payload;
    },
    clearActiveDesignOverrides: (state) => {
      state.minifixDistance = null;
      state.minifixDiameterHole = null;
      state.camDepth = null;
      state.camDiameter = null;
      state.camHeight = null;
    },
  },
});

export const {
  setActiveDesignMinifixDistance,
  setActiveDesignMinifixDiameterHole,
  setActiveDesignCamDepth,
  setActiveDesignCamDiameter,
  setActiveDesignCamHeight,
  clearActiveDesignOverrides,
} = activeDesignSlice.actions;

export default activeDesignSlice.reducer;
