import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      "Cross-Origin-Embedder-Policy": "unsafe-none",
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5249',
        changeOrigin: true,
        secure: false,
      },
      '/drafthub': {
        target: 'http://localhost:5249',
        changeOrigin: true,
        secure: false,
        ws: true
      },
      '/matchuphub': {
        target: 'http://localhost:5249',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  },
});
