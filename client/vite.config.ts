import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// No API proxy is configured in Stage 1 because this stage has no backend calls.
export default defineConfig({
  plugins: [react()],
})
