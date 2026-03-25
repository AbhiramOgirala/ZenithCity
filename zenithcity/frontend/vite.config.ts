import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Only use proxy in development when VITE_API_BASE_URL is not set
    proxy: process.env.VITE_API_BASE_URL ? {} : {
      '/api': 'http://127.0.0.1:3001',
      '/socket.io': {
        target: 'http://127.0.0.1:3001',
        ws: true,
      },
    },
  },
});
