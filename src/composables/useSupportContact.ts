import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'

import { httpClient } from '@/services/http/client'
import { useAuthStore } from '@/stores/auth.store'

interface SupportContact {
  whatsapp_number: string
  whatsapp_url: string
}

/**
 * Enlace de soporte por WhatsApp, armado por el backend con quien escribe y
 * de que negocio (ver App\Http\Controllers\Api\V1\SupportController).
 *
 * No se arma en el frontend porque el numero es configurable desde
 * system_config: quemarlo en el bundle obligaria a un despliegue para
 * cambiarlo.
 */
export function useSupportContact() {
  const auth = useAuthStore()

  const query = useQuery({
    queryKey: ['support-contact'],
    queryFn: async (): Promise<SupportContact> => {
      const { data } = await httpClient.get<SupportContact>('/support/contact')
      return data
    },
    // El numero no cambia entre pantallas: una sola vez por sesion alcanza.
    staleTime: Infinity,
    enabled: computed(() => auth.isAuthenticated),
    // Que soporte no cargue no puede llenar la pantalla de reintentos: el
    // resto de la app funciona igual sin este enlace.
    retry: false,
  })

  return computed(() => query.data.value?.whatsapp_url ?? null)
}
