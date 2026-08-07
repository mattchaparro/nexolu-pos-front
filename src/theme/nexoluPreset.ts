import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

/**
 * Preset de PrimeVue basado en Aura, ajustado para que el color "primary"
 * del tema (usado por todos los componentes: foco, boton primario, checked
 * states, highlight de listas, etc.) sea el indigo de marca de Nexolu UI en
 * vez del emerald por defecto de Aura. `secondary` no se sobreescribe: Aura
 * ya lo resuelve sobre la escala `surface`, que a su vez usa slate en modo
 * claro - coincide con el neutro del sistema de color (ver style.css).
 */
export const nexoluPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{indigo.50}',
      100: '{indigo.100}',
      200: '{indigo.200}',
      300: '{indigo.300}',
      400: '{indigo.400}',
      500: '{indigo.500}',
      600: '{indigo.600}',
      700: '{indigo.700}',
      800: '{indigo.800}',
      900: '{indigo.900}',
      950: '{indigo.950}',
    },
  },
})
