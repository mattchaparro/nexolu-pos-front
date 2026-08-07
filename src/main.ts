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
app.use(PrimeVue, { unstyled: true })
app.use(VueQueryPlugin, { queryClient })

app.mount('#app')
