import type { Ref } from 'vue'

import type { Sale } from '@/types/sale'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import type { useOpenTabMutations } from './useOpenTabMutations'

/**
 * Ajustar cantidad/quitar un item YA guardado de una cuenta abierta (sync
 * inmediato al backend) y eliminar la cuenta completa - compartido entre
 * la pantalla de Cuentas abiertas y el panel embebido en Vender, misma
 * logica en los dos lugares.
 */
export function useActiveTabItemActions(
  activeSale: Ref<Sale | null>,
  mutations: ReturnType<typeof useOpenTabMutations>,
  onError: (message: string) => void,
  onDestroyed: () => void,
) {
  function itemsWithOverride(sale: Sale, itemId: number, quantity: number) {
    return sale.items
      .map((item) => ({
        product_id: item.product.id,
        quantity: item.id === itemId ? quantity : item.quantity,
        unit_price: item.unit_price,
      }))
      .filter((item) => item.quantity > 0)
  }

  async function destroyActiveTab(): Promise<void> {
    if (!activeSale.value) {
      return
    }
    try {
      await mutations.deleteMutation.mutateAsync(activeSale.value.id)
      onDestroyed()
    } catch (error) {
      onError(extractErrorMessage(error, 'No pudimos eliminar la cuenta.'))
    }
  }

  function confirmDestroyActiveTab(): void {
    if (window.confirm('¿Eliminar esta cuenta abierta? Se restaurará el inventario de los productos.')) {
      destroyActiveTab()
    }
  }

  async function adjustItemQuantity(itemId: number, delta: number): Promise<void> {
    if (!activeSale.value) {
      return
    }
    const item = activeSale.value.items.find((i) => i.id === itemId)
    if (!item) {
      return
    }
    const newQuantity = item.quantity + delta

    if (newQuantity <= 0 && activeSale.value.items.length === 1) {
      if (window.confirm('Esto dejaría la cuenta sin productos. ¿Eliminar la cuenta completa en su lugar?')) {
        await destroyActiveTab()
      }
      return
    }

    try {
      await mutations.syncItemsMutation.mutateAsync({
        saleId: activeSale.value.id,
        payload: { items: itemsWithOverride(activeSale.value, itemId, newQuantity) },
      })
    } catch (error) {
      onError(extractErrorMessage(error, 'No pudimos actualizar la cantidad.'))
    }
  }

  return { adjustItemQuantity, destroyActiveTab, confirmDestroyActiveTab }
}
