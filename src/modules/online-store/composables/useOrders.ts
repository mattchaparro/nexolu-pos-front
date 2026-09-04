import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import type { OrderStatus } from '@/types/order'

import {
  fetchOrder,
  fetchOrders,
  fetchPendingOrderCount,
  updateOrderStatus,
} from '../services/orderService'

export function useOrders(status: Ref<string>, page: Ref<number>, search: Ref<string>) {
  return useQuery({
    queryKey: computed(() => ['orders', 'list', status.value, page.value, search.value] as const),
    queryFn: () =>
      fetchOrders({
        status: status.value || undefined,
        page: page.value,
        search: search.value.trim() || undefined,
      }),
    placeholderData: keepPreviousData,
    // Un pedido entra sin que nadie toque el POS. Sin websockets en el stack
    // (BROADCAST_CONNECTION=log), la bandeja se refresca sola cada minuto -
    // mismo criterio que la comandera.
    refetchInterval: 60_000,
  })
}

/** Detalle: trae items e historial, que el listado no carga. */
export function useOrder(id: Ref<number | null>) {
  return useQuery({
    queryKey: computed(() => ['orders', 'detail', id.value] as const),
    queryFn: () => fetchOrder(id.value as number),
    enabled: computed(() => id.value !== null),
  })
}

export function useOrderMutations() {
  const queryClient = useQueryClient()

  const statusMutation = useMutation({
    mutationFn: (params: {
      id: number
      status: OrderStatus
      note?: string
      paymentMethod?: string
    }) => updateOrderStatus(params.id, params.status, params.note, params.paymentMethod),
    onSuccess: (order) => {
      queryClient.setQueryData(['orders', 'detail', order.id], order)
      void queryClient.invalidateQueries({ queryKey: ['orders', 'list'] })
      void queryClient.invalidateQueries({ queryKey: ['orders', 'pending-count'] })
      // Confirmar mueve stock y crea una venta: lo que muestre el catalogo o
      // el historial de ventas quedo viejo.
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      void queryClient.invalidateQueries({ queryKey: ['sales'] })
    },
  })

  return { statusMutation }
}

export function usePendingOrderCount(enabled: Ref<boolean>) {
  return useQuery({
    queryKey: ['orders', 'pending-count'],
    queryFn: fetchPendingOrderCount,
    enabled,
    refetchInterval: 60_000,
  })
}
