import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5799,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:8898', changeOrigin: true },
    },
  },
});
