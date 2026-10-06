import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // En desarrollo, las peticiones a /api se redirigen al backend de Django
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
})
