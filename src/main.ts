// El negocio recien migrado llega aca redirigido desde legacy con
// ?bienvenida=1 en la URL (ver CheckBusinessMigrationStatus en
// pos-saas), pero todavia sin sesion en esta SPA - el guard del router
// manda a /iniciar-sesion, que NO preserva query params, asi que el flag
// se perderia si no se guarda ahora mismo, antes de cualquier navegacion
// (ver useWelcomeExperience.ts para donde se consume, ya autenticado).
import { stashSsoTokenFromUrl } from '@/services/http/tokenStorage'

import { stashPendingWelcomeFromUrl } from '@/composables/useWelcomeExperience'

stashPendingWelcomeFromUrl()
stashSsoTokenFromUrl()

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
import { initSentry } from './sentry'
import { useAuthStore } from './stores/auth.store'
import { nexoluPreset } from './theme/nexoluPreset'

const app = createApp(App)

app.use(createPinia())
app.use(router)
// Despues de Pinia+router (los necesita: tagea business_id/user del store
// de auth en cada navegacion, ver src/sentry.ts) y antes de mount() - no-op
// si VITE_SENTRY_DSN_PUBLIC esta vacio.
initSentry(app, router)
// Tema propio de PrimeVue (Aura + indigo de marca, ver theme/nexoluPreset.ts)
// en vez de unstyled: la identidad sobria que pide el producto es la que ya
// trae PrimeVue con su propio sistema de estilos, no una reconstruida a mano
// con Tailwind. darkModeSelector: false porque el resto de la app (Tailwind)
// no tiene modo oscuro - sin esto, Aura sigue prefers-color-scheme del SO.
app.use(PrimeVue, {
  theme: { preset: nexoluPreset, options: { darkModeSelector: false } },
  license: import.meta.env.VITE_PRIMEVUE_LICENSE_KEY,
  // Sin esto, componentes con texto propio (DatePicker: nombres de mes/dia,
  // "Hoy"/"Limpiar"; Select: mensajes vacios) salen en ingles por defecto -
  // toda la app es en espanol.
  locale: {
    monthNames: [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ],
    monthNamesShort: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
    dayNames: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
    dayNamesShort: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
    dayNamesMin: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
    today: 'Hoy',
    clear: 'Limpiar',
    weekHeader: 'Sem',
    firstDayOfWeek: 1,
    emptyMessage: 'Sin resultados',
    emptyFilterMessage: 'Sin resultados',
    // Aria-labels de navegacion del DatePicker (mes/año anterior-siguiente,
    // selector de mes/año) - sin esto salen en ingles aunque el calendario
    // visible ya este en espanol.
    chooseYear: 'Elegir año',
    chooseMonth: 'Elegir mes',
    chooseDate: 'Elegir fecha',
    prevDecade: 'Década anterior',
    nextDecade: 'Década siguiente',
    prevYear: 'Año anterior',
    nextYear: 'Año siguiente',
    prevMonth: 'Mes anterior',
    nextMonth: 'Mes siguiente',
    am: 'a. m.',
    pm: 'p. m.',
  },
})
app.use(VueQueryPlugin, { queryClient })
// Servicio de alertas de acciones del sistema (ver src/ui/NxToast.vue +
// src/composables/useSystemAlert.ts) - "producto agregado", etc.
app.use(ToastService)

app.mount('#app')

// Revalida la sesion apenas la pestaña vuelve a estar visible (usuario
// volvio de background, pantalla bloqueada, cambio de app en el celular).
// TanStack Query ya reintenta las queries activas al recuperar el foco
// (refetchOnWindowFocus, ver services/query/queryClient.ts), pero eso
// depende de que haya una query montada en ese momento Y de que el
// navegador dispare el evento de foco a tiempo - poco confiable en mobile
// (iOS Safari en particular suspende pestañas en background sin avisar).
// Sin este chequeo explicito, una sesion vencida mientras la pestaña
// estaba oculta dejaba a la app sin ningun pedido al servidor que
// disparara el interceptor de 401 (ver services/http/client.ts) hasta que
// el usuario tocara algo que pidiera datos nuevos - "no me deja hacer
// click en nada" reportado (la app se veia trabada con datos viejos, no
// deslogueada).
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') {
    return
  }
  const auth = useAuthStore()
  if (auth.isAuthenticated) {
    // 401 lo maneja el interceptor de axios (clearSession + redirect a
    // login) - cualquier otro error (ej. la red todavia reconectando) no
    // debe deslogear a nadie, se ignora aca.
    auth.fetchCurrentUser().catch(() => {})
  }
})

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
