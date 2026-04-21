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
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('@dnd-kit')) return 'dnd';
          if (id.includes('@zxing')) return 'scanner';
          if (
            id.includes('exceljs') ||
            id.includes('jszip') ||
            id.includes('saxes') ||
            id.includes('fast-csv') ||
            id.includes('unzipper') ||
            id.includes('readable-stream') ||
            id.includes('archiver')
          ) return 'excel';
          return undefined;
        },
      },
    },
  },
  server: {
    host: true, // 0.0.0.0 (Allow external access)
  },
})
