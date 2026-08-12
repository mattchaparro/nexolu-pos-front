// Lato self-hosted via @fontsource - igual que el legacy (resources/js
// no la carga por Google/Bunny Fonts, la empaqueta con @fontsource/lato).
import '@fontsource/lato/400.css'
import '@fontsource/lato/700.css'
import 'primeicons/primeicons.css'
// Material Icons (self-hosted, mismo paquete @fontsource que usa el legacy)
// SOLO para el icono de categoria de producto - PrimeIcons es el sistema de
// iconos de toda la UI (nav, botones, chrome), pero no tiene practicamente
// ningun icono de retail/comida/etc. Material Icons ya trae el vocabulario
// exacto que el legacy usa en product_categories.icon (ver
// CategoryIconResolver del lado del backend) - dos sistemas, cada uno donde
// de verdad aporta, no un reemplazo general de PrimeIcons.
import '@fontsource/material-icons'
import './style.css'

import { VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import { queryClient } from './services/query/queryClient'
import { nexoluPreset } from './theme/nexoluPreset'

const app = createApp(App)

app.use(createPinia())
app.use(router)
// Tema propio de PrimeVue (Aura + indigo de marca, ver theme/nexoluPreset.ts)
// en vez de unstyled: la identidad sobria que pide el producto es la que ya
// trae PrimeVue con su propio sistema de estilos, no una reconstruida a mano
// con Tailwind. darkModeSelector: false porque el resto de la app (Tailwind)
// no tiene modo oscuro - sin esto, Aura sigue prefers-color-scheme del SO.
app.use(PrimeVue, {
  theme: { preset: nexoluPreset, options: { darkModeSelector: false } },
  license: import.meta.env.VITE_PRIMEVUE_LICENSE_KEY,
})
app.use(VueQueryPlugin, { queryClient })
// Servicio de alertas de acciones del sistema (ver src/ui/NxToast.vue +
// src/composables/useSystemAlert.ts) - "producto agregado", etc.
app.use(ToastService)

app.mount('#app')

// Revela los iconos de Material Icons (ver .material-icons/.fonts-ready en
// style.css) recien cuando la fuente termino de cargar, para no mostrar el
// nombre crudo del icono como texto de respaldo (font-display: swap de
// @fontsource). Promise.race con un timeout: si document.fonts.ready no
// resuelve por lo que sea, los iconos igual se revelan a los 2s en vez de
// quedar invisibles para siempre.
Promise.race([
  document.fonts.ready,
  new Promise((resolve) => setTimeout(resolve, 2000)),
]).then(() => {
  document.documentElement.classList.add('fonts-ready')
})
