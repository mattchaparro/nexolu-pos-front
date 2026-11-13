import { computed } from 'vue'

import { useBusiness } from '@/composables/useBusiness'
import { hasFeature } from '@/utils/hasFeature'

/**
 * Cómo se llama la vitrina del negocio en los textos: un restaurante tiene
 * "tu menú", un comercio "tu tienda". Decirle "tienda" a un restaurante
 * mezcla dos módulos que son distintos.
 */
export function useChannelName() {
  const { data: business } = useBusiness()
  return computed(() => (hasFeature(business.value, 'digital_menu') ? 'tu menú' : 'tu tienda'))
}
