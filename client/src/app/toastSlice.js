import { createSlice, nanoid } from '@reduxjs/toolkit';

const toastSlice = createSlice({
  name: 'toasts',
  initialState: [],
  reducers: {
    showToast: {
      reducer(state, action) {
        state.push(action.payload);
        if (state.length > 4) state.shift();
      },
      prepare({ message, tone = 'info' }) {
        return { payload: { id: nanoid(), message, tone } };
      },
    },
    dismissToast(state, action) {
      return state.filter((t) => t.id !== action.payload);
    },
  },
});

export const { showToast, dismissToast } = toastSlice.actions;
export default toastSlice.reducer;
