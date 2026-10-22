import { fileURLToPath, URL } from 'node:url'

import { sentryVitePlugin } from '@sentry/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// Identificador de este build. Se compila dentro de la app (__APP_BUILD_ID__)
// y se publica aparte en /version.json: una pestana abierta compara los dos
// para saber si quedo corriendo una version vieja (ver services/appVersion.ts).
const buildId = new Date().toISOString()

function emitBuildVersion(id: string): Plugin {
  return {
    name: 'nexolu-build-version',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ buildId: id }),
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // SENTRY_AUTH_TOKEN sin prefijo VITE_ a proposito: asi nunca entra al bundle.
  // loadEnv con prefijo '' lo lee del .env del droplet, que es donde vive.
  const env = loadEnv(mode, process.cwd(), '')
  const sentryAuthToken = env.SENTRY_AUTH_TOKEN || process.env.SENTRY_AUTH_TOKEN
  const uploadSourceMaps = Boolean(sentryAuthToken)

  return {
    plugins: [
      vue(),
      tailwindcss(),
      emitBuildVersion(buildId),
      // Sube los source maps del build para que Sentry muestre el archivo y la
      // linea reales y no `index-CgLuVxhl.js:449:10120`. Sin token (local, o un
      // build sin configurar) no hace nada: el build sale igual que siempre.
      // Los .map se borran despues de subirlos: no deben quedar servidos en
      // produccion, exponen el codigo fuente.
      uploadSourceMaps &&
        sentryVitePlugin({
          org: 'renovacode',
          project: 'nexolu-pos-front',
          authToken: sentryAuthToken,
          release: { name: `nexolu-pos-front@${buildId}` },
          sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
          telemetry: false,
        }),
    ],
    build: {
      // 'hidden': genera los .map sin el comentario sourceMappingURL en el JS,
      // asi el navegador no los busca (y de todas formas se borran tras subir).
      sourcemap: uploadSourceMaps ? 'hidden' : false,
    },
    define: {
      __APP_BUILD_ID__: JSON.stringify(buildId),
    },
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
  }
})
