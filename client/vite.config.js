import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_TARGET = process.env.VITE_DEV_API_TARGET || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Same-origin API in development, so the refresh cookie works.
    // Socket.io connects straight to the API (see .env.development).
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
    },
  },
  build: {
    sourcemap: false,
  },
});