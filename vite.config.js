// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  base: '',
  build: {
    outDir: 'docs',
  },
  server: {
    port: 40414,
  },
})
