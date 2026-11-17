import { configureStore } from '@reduxjs/toolkit';
import { api } from './api';
import authReducer from '../features/auth/authSlice';
import toastReducer from './toastSlice';

export function makeStore(preloadedState) {
  return configureStore({
    reducer: {
      auth: authReducer,
      toasts: toastReducer,
      [api.reducerPath]: api.reducer,
    },
    middleware: (getDefault) => getDefault().concat(api.middleware),
    preloadedState,
  });
}

export const store = makeStore();
