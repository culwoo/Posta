import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('firebase')) return 'firebase';
          if (id.includes('react') || id.includes('scheduler')) return 'react-vendor';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('@dnd-kit')) return 'dnd';
          if (id.includes('@zxing')) return 'scanner';
          if (id.includes('xlsx')) return 'xlsx';
          return 'vendor';
        },
      },
    },
  },
  server: {
    host: true, // 0.0.0.0 (Allow external access)
  },
})
