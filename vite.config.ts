import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: process.env.BACKEND_DEV_URL || 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), tailwindcss(), nodePolyfills({
    exclude: ['fs'],
    globals: {
      Buffer: true,
      global: true,
      process: true,
    },
    protocolImports: true,
  })],
})
