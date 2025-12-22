import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Note: Tailwind v3 uses PostCSS, no vite plugin needed here.

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
