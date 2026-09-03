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

  /**
   * Copia de la cuenta con la cantidad de un item ya ajustada, para pintar
   * el cambio ANTES de que el servidor responda. Solo toca lo que la UI
   * muestra (cantidad, subtotal de la fila y total de la cuenta); el estado
   * definitivo lo pone la respuesta real del sync al llegar.
   */
  function optimisticAdjust(sale: Sale, itemId: number, quantity: number): Sale {
    const current = sale.items.find((i) => i.id === itemId)
    if (!current) {
      return sale
    }
    const diff = (quantity - current.quantity) * Number(current.unit_price)
    return {
      ...sale,
      total: Number(sale.total) + diff,
      items: sale.items
        .map((item) =>
          item.id === itemId ? { ...item, quantity, subtotal: quantity * Number(item.unit_price) } : item,
        )
        .filter((item) => item.quantity > 0),
    }
  }

  // Syncs en vuelo. Cada clic manda la LISTA COMPLETA deseada (no un delta),
  // asi que el ultimo request siempre lleva el estado final acumulado y no
  // importa que haya varios en el aire: gana el ultimo. Este contador evita
  // que la respuesta de un sync viejo pise el estado optimista de un clic
  // mas nuevo.
  let pendingSyncs = 0

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

    // Optimista: pintar el cambio YA y confirmar con el servidor por
    // detras. Esperar el round-trip para recien ahi actualizar la pantalla
    // hacia sentir lento cada +/- (reportado por un negocio real); con esto
    // el numero cambia al instante y clics rapidos se acumulan sin esperar.
    const snapshot = activeSale.value
    activeSale.value = optimisticAdjust(activeSale.value, itemId, newQuantity)

    pendingSyncs++
    try {
      const updated = await mutations.syncItemsMutation.mutateAsync({
        saleId: snapshot.id,
        payload: { items: itemsWithOverride(activeSale.value, itemId, newQuantity) },
      })
      // Solo el sync MAS RECIENTE reconcilia con la verdad del servidor -
      // una respuesta vieja llegando tarde no debe pisar el estado
      // optimista de un clic posterior.
      if (pendingSyncs === 1) {
        activeSale.value = updated
      }
    } catch (error) {
      // Rollback solo si no hay un sync mas nuevo en el aire (ese va a
      // reconciliar el estado real al resolver; restaurar aca pisaria su
      // estado optimista con uno mas viejo todavia).
      if (pendingSyncs === 1) {
        activeSale.value = snapshot
      }
      onError(extractErrorMessage(error, 'No pudimos actualizar la cantidad.'))
    } finally {
      pendingSyncs--
    }
  }

  return { adjustItemQuantity, destroyActiveTab, confirmDestroyActiveTab }
}
