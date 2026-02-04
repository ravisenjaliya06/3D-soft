import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MeasurementState, UnitType } from './interface';

const initialState: MeasurementState = {
  isActive: false,
  unitType: 'mm', // Default unit (supports 'mm' | 'cm' | 'm' | 'in' | 'ft')
  lastMeasurement: null,
};

const measurementSlice = createSlice({
  name: 'measurement',
  initialState,
  reducers: {
    toggleMeasurementTool: (state) => {
      state.isActive = !state.isActive;
      // Reset last measurement when toggling
      if (state.isActive) {
        state.lastMeasurement = null;
      }
    },
    setMeasurementActive: (state, action: PayloadAction<boolean>) => {
      state.isActive = action.payload;
      if (state.isActive) {
        state.lastMeasurement = null;
      }
    },
    setUnitType: (state, action: PayloadAction<UnitType>) => {
      state.unitType = action.payload;
    },
    setLastMeasurement: (state, action: PayloadAction<number | null>) => {
      state.lastMeasurement = action.payload;
    },
    resetMeasurement: () => {
      return { ...initialState };
    },
  },
});

export const {
  toggleMeasurementTool,
  setMeasurementActive,
  setUnitType,
  setLastMeasurement,
  resetMeasurement,
} = measurementSlice.actions;

export default measurementSlice.reducer;
