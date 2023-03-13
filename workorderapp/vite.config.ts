import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/track-patch/',
  plugins: [react() ],
  server: {
    open: true
  },
  resolve: {
    alias: {
      'node-fetch': 'isomorphic-fetch',
    },
  },
})
