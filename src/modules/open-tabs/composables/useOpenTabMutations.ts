import { useMutation, useQueryClient } from '@tanstack/vue-query'

import type { Sale } from '@/types/sale'

import {
  addOpenTabItems,
  closeOpenTab,
  deleteOpenTab,
  openTab,
  recordPartialPayment,
  syncOpenTabItems,
} from '../services/openTabsService'
import type { CloseOpenTabPayload, OpenTabItemsPayload, OpenTabPayload, RecordPartialPaymentPayload } from '../types'

export function useOpenTabMutations() {
  const queryClient = useQueryClient()

  // Abrir/agregar/cerrar/eliminar cuentas mueve stock (catalogo) y crea
  // cuentas por cobrar (fiado) - se invalida todo lo que puede haber
  // cambiado en vez de refetch puntual, igual que useCreateSale.
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['tables'] })
    queryClient.invalidateQueries({ queryKey: ['open-tabs'] })
    queryClient.invalidateQueries({ queryKey: ['products', 'catalog'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] })
  }

  const openMutation = useMutation({
    mutationFn: (payload: OpenTabPayload) => openTab(payload),
    onSuccess: invalidateAll,
  })

  const addItemsMutation = useMutation({
    mutationFn: (params: { saleId: number; payload: OpenTabItemsPayload }) =>
      addOpenTabItems(params.saleId, params.payload),
    onSuccess: invalidateAll,
  })

  const syncItemsMutation = useMutation({
    mutationFn: (params: { saleId: number; payload: OpenTabItemsPayload }) =>
      syncOpenTabItems(params.saleId, params.payload),
    onSuccess: invalidateAll,
  })

  const partialPaymentMutation = useMutation({
    mutationFn: (params: { saleId: number; payload: RecordPartialPaymentPayload }) =>
      recordPartialPayment(params.saleId, params.payload),
    onSuccess: invalidateAll,
  })

  const closeMutation = useMutation({
    mutationFn: (params: { saleId: number; payload: CloseOpenTabPayload }): Promise<Sale> =>
      closeOpenTab(params.saleId, params.payload),
    onSuccess: invalidateAll,
  })

  const deleteMutation = useMutation({
    mutationFn: (saleId: number) => deleteOpenTab(saleId),
    onSuccess: invalidateAll,
  })

  return {
    openMutation,
    addItemsMutation,
    syncItemsMutation,
    partialPaymentMutation,
    closeMutation,
    deleteMutation,
  }
}
