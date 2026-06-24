import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev, proxy Socket.io traffic to the Express server on :3001.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
