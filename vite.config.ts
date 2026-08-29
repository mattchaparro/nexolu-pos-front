import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    allowedHosts: true,
    // Vite no lee PORT por su cuenta. Respetarlo permite levantar una segunda
    // instancia (otra sesion, otra rama) sin chocar con la que ya ocupa 5173.
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
})
