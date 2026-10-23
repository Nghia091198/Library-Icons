import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const API_SERVER_ORIGIN = 'http://localhost:8787';
// Thư viện nền ít thay đổi giữa các lần deploy: tách gói riêng để trình duyệt giữ cache lâu.
const REACT_VENDOR_PATTERN = /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|@remix-run|scheduler)[\\/]/;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: { '/api': API_SERVER_ORIGIN },
  },
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (REACT_VENDOR_PATTERN.test(id)) return 'vendor-react';
          return undefined;
        },
      },
    },
  },
});
