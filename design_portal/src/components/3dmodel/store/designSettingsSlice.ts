import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Global default design settings
interface DesignSettingsState {
  minifixDistance: number;
  minifixDiameterHole: number;
  camDepth: number;
  camHeight: number;
  edgeBandingDistance: number;
  // Minifix Standards
  screwDiameter: number;
  screwLength: number;
  camDiameter: number;
  dowelDiameter: number;
  dowelLength: number;
  dowelDistance: number;
}

const initialState: DesignSettingsState = {
  minifixDistance: 320,
  minifixDiameterHole: 8,
  camDepth: 12,
  camHeight: 32,
  edgeBandingDistance: 2,
  // Minifix Standards Defaults
  screwDiameter: 8,
  screwLength: 25,
  camDiameter: 15,
  dowelDiameter: 8,
  dowelLength: 24,
  dowelDistance: 32,
};

const designSettingsSlice = createSlice({
  name: 'designSettings',
  initialState,
  reducers: {
    updateDesignSettings: (state, action: PayloadAction<Partial<DesignSettingsState>>) => {
      return { ...state, ...action.payload };
    },
    updateMinifixDistance: (state, action: PayloadAction<number>) => {
      state.minifixDistance = action.payload;
    },
    updateMinifixDiameterHole: (state, action: PayloadAction<number>) => {
      state.minifixDiameterHole = action.payload;
    },
    updateCamDiameter: (state, action: PayloadAction<number>) => {
      state.camDiameter = action.payload;
    },
    updateCamDepth: (state, action: PayloadAction<number>) => {
      state.camDepth = action.payload;
    },
    updateCamHeight: (state, action: PayloadAction<number>) => {
      state.camHeight = action.payload;
    },
    updateEdgeBandingDistance: (state, action: PayloadAction<number>) => {
      state.edgeBandingDistance = action.payload;
    },
    updateScrewDiameter: (state, action: PayloadAction<number>) => {
      state.screwDiameter = action.payload;
    },
    updateScrewLength: (state, action: PayloadAction<number>) => {
      state.screwLength = action.payload;
    },

    updateDowelDiameter: (state, action: PayloadAction<number>) => {
      state.dowelDiameter = action.payload;
    },
    updateDowelLength: (state, action: PayloadAction<number>) => {
      state.dowelLength = action.payload;
    },
    updateDowelDistance: (state, action: PayloadAction<number>) => {
      state.dowelDistance = action.payload;
    },
  },
});

export const {
  updateDesignSettings,
  updateMinifixDistance,
  updateMinifixDiameterHole,
  updateCamDepth,
  updateCamHeight,
  updateEdgeBandingDistance,
  updateScrewDiameter,
  updateScrewLength,
  updateCamDiameter,
  updateDowelDiameter,
  updateDowelLength,
  updateDowelDistance,
} = designSettingsSlice.actions;

export default designSettingsSlice.reducer;
