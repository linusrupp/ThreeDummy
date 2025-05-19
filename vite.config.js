import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: true,
    host: true // Allow external access
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  preview: {
    port: 3000,
    host: true
  }
}); 