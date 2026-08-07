// Lato self-hosted via @fontsource - igual que el legacy (resources/js
// no la carga por Google/Bunny Fonts, la empaqueta con @fontsource/lato).
import '@fontsource/lato/400.css'
import '@fontsource/lato/700.css'
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
