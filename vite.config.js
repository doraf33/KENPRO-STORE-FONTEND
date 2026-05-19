import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    exclude: ['node_modules', 'dist', 'e2e'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/', 'src/__tests__/', 'dist/', 'e2e/',
        'src/App.jsx',        // monolithe 2300 lignes, couvert par E2E
        'src/main.jsx',
        'src/BarcodeScanner.jsx', // couvert par composant test dédié
      ],
      thresholds: { lines: 40 },
    },
  },
})
