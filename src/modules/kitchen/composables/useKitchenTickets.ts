import { useQuery } from '@tanstack/vue-query'

import { fetchKitchenTickets } from '../services/kitchenService'

// Mismo intervalo que el polling de KitchenBoard.vue del legacy
// (setInterval 3000ms + router.reload) - sin websockets/broadcast en el
// backend, asi que un refetch periodico es la unica forma de ver comandas
// nuevas sin recargar la pagina.
const POLL_INTERVAL_MS = 3000

export function useKitchenTickets() {
  return useQuery({
    queryKey: ['kitchen-tickets'],
    queryFn: fetchKitchenTickets,
    refetchInterval: POLL_INTERVAL_MS,
  })
}
