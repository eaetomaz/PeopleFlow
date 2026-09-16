import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5195,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:5341', changeOrigin: false },
      '/health': { target: 'http://localhost:5341', changeOrigin: false },
    },
  },
  preview: {
    port: 5196,
    strictPort: true,
  },
  build: {
    chunkSizeWarningLimit: 900,
  },
})
