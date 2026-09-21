import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  base: './',
  // viteSingleFile inlines all JS/CSS into a single self-contained dist/index.html
  // so the dashboard opens by double-click on file:// (Chrome blocks ES modules there).
  plugins: [react(), tailwindcss(), viteSingleFile()],
})
