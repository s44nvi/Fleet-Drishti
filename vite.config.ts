import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // maplibre-gl loads its tile-decoding worker as a separate chunk at
  // runtime; Vite's dep pre-bundler doesn't follow that dynamic Worker
  // import, which leaves the built chunk missing (404) in dev unless the
  // package is excluded from pre-bundling.
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
})
