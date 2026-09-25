import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Dev server must be reachable from the Arena preview proxy:
// - bind 0.0.0.0 so the port is exposed
// - allow any host (preview hostnames are proxied in)
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    strictPort: false,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
})
