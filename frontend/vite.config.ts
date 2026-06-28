import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: "vendor-react",   test: /node_modules\/(react|react-dom|react-router-dom)/ },
            { name: "vendor-charts",  test: /node_modules\/recharts/ },
            { name: "vendor-lucide",  test: /node_modules\/lucide-react/ },
            { name: "vendor-datefns", test: /node_modules\/date-fns/ },
          ],
        },
      },
    },
  },
})
