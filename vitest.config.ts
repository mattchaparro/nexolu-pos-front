import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'

// Tests de logica pura (composables y helpers de payload): no montan
// componentes, asi que no hace falta un DOM ni @vue/test-utils. Si algun dia
// se testea una pantalla, ahi si agregar jsdom/happy-dom.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
})
