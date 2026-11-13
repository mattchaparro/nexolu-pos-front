import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { fetchDeliveries } from '../services/deliveryService'

/**
 * Cuántos domicilios están listos para llevar, para el contador del menú.
 * Comparte caché con la pantalla de Domicilios (misma llave), que se
 * refresca más seguido mientras está abierta.
 */
export function useReadyDeliveryCount(enabled: Ref<boolean>) {
  const query = useQuery({
    queryKey: ['deliveries'],
    queryFn: fetchDeliveries,
    enabled,
    refetchInterval: 30_000,
  })

  return computed(() => (query.data.value ?? []).filter((d) => d.status === 'pending' && d.is_ready).length)
}
