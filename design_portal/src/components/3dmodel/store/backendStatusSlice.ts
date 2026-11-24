import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface BackendStatusState {
  isDown: boolean;
  lastChecked: string | null;
}

const initialState: BackendStatusState = {
  isDown: false,
  lastChecked: null,
};

const backendStatusSlice = createSlice({
  name: 'backendStatus',
  initialState,
  reducers: {
    setBackendDown: (state, action: PayloadAction<boolean>) => {
      state.isDown = action.payload;
      state.lastChecked = new Date().toISOString();
    },
    resetBackendStatus: (state) => {
      state.isDown = false;
      state.lastChecked = new Date().toISOString();
    },
  },
});

export const { setBackendDown, resetBackendStatus } = backendStatusSlice.actions;
export default backendStatusSlice.reducer;
