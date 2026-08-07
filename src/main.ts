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
import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import { queryClient } from './services/query/queryClient'

const app = createApp(App)

app.use(createPinia())
app.use(router)
// unstyled: true - PrimeVue aporta comportamiento/accesibilidad, el
// estilo lo pone siempre Nexolu UI (src/ui) con Tailwind. Ver README.md.
app.use(PrimeVue, { unstyled: true, license: import.meta.env.VITE_PRIMEVUE_LICENSE_KEY })
app.use(VueQueryPlugin, { queryClient })

app.mount('#app')
