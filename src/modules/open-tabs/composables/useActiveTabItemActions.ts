import { computed, ref, watch } from 'vue'
import type { Ref } from 'vue'

import type { Sale, SaleItem } from '@/types/sale'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import type { useOpenTabMutations } from './useOpenTabMutations'
import type { DiscountDraft, QuantityDraft } from '../support/tabDraft'
import {
  applyDraftToItems,
  draftQuantityOf as draftQuantity,
  hasDraftChanges as draftHasChanges,
} from '../support/tabDraft'
import { toSyncItemsPayload } from '../support/tabItemsPayload'

/**
 * Edicion de los items YA guardados de una cuenta abierta, con la semantica
 * del legacy (SalesTerminal.vue): los +/-/quitar se acumulan en un BORRADOR
 * local y solo se persisten al tocar "Confirmar cambios" - un unico sync con
 * la lista completa deseada. Salir de la cuenta (o cambiar a otra) descarta
 * el borrador, asi un dedazo nunca queda escrito sin querer.
 *
 * Primero se probo sync-inmediato por clic y fallo por las dos puntas: se
 * sentia lento (un round-trip por clic) y era peligroso (el error quedaba
 * persistido y tocaba deshacerlo a mano). El borrador resuelve ambas: los
 * clics son instantaneos y gratis, y nada toca el backend hasta confirmar.
 *
 * Compartido entre la pantalla de Cuentas abiertas y el panel embebido en
 * Vender - misma logica en los dos lugares.
 */
export function useActiveTabItemActions(
  activeSale: Ref<Sale | null>,
  mutations: ReturnType<typeof useOpenTabMutations>,
  onError: (message: string) => void,
  onDestroyed: () => void,
) {
  /** itemId -> cantidad deseada. Solo guarda los items tocados. */
  const draft = ref<QuantityDraft>({})
  /**
   * itemId -> descuento deseado. Va aparte de las cantidades porque su
   * "sin cambios" no es un numero sino la ausencia de la clave (null es un
   * valor valido: "quitale el descuento").
   */
  const discountDraft = ref<DiscountDraft>({})

  // Cambiar de cuenta (o salir: id -> undefined) descarta el borrador -
  // exactamente el comportamiento del legacy que protege del dedazo.
  watch(
    () => activeSale.value?.id,
    () => {
      draft.value = {}
      discountDraft.value = {}
    },
  )

  function draftQuantityOf(item: SaleItem): number {
    return draftQuantity(item, draft.value)
  }

  /**
   * Los items guardados con el borrador ya aplicado - lo que la UI debe
   * pintar. Un item llevado a 0 desaparece de la lista (y reaparece si se
   * descarta el borrador).
   */
  const draftItems = computed<SaleItem[]>(() =>
    activeSale.value ? applyDraftToItems(activeSale.value.items, draft.value, discountDraft.value) : [],
  )

  const hasDraftChanges = computed(() =>
    activeSale.value ? draftHasChanges(activeSale.value.items, draft.value, discountDraft.value) : false,
  )

  /** Cuanto sube/baja el total de la cuenta con el borrador aplicado. */
  const draftTotalDelta = computed(() => {
    if (!activeSale.value) {
      return 0
    }
    return activeSale.value.items.reduce(
      (sum, item) => sum + (draftQuantityOf(item) - item.quantity) * Number(item.unit_price),
      0,
    )
  })

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

  /**
   * Ajusta el borrador, sin tocar el backend. Instantaneo a proposito.
   */
  function adjustItemQuantity(itemId: number, delta: number): void {
    const sale = activeSale.value
    if (!sale) {
      return
    }
    const item = sale.items.find((i) => i.id === itemId)
    if (!item) {
      return
    }
    const newQuantity = Math.max(0, draftQuantityOf(item) + delta)

    // Si el ajuste dejaria la cuenta entera vacia, eso ya no es "editar
    // items": es eliminar la cuenta, y eso se decide explicito.
    const wouldBeEmpty = sale.items.every((i) => (i.id === itemId ? newQuantity : draftQuantityOf(i)) <= 0)
    if (wouldBeEmpty) {
      if (window.confirm('Esto dejaría la cuenta sin productos. ¿Eliminar la cuenta completa en su lugar?')) {
        destroyActiveTab()
      }
      return
    }

    if (newQuantity === item.quantity) {
      // Volvio al valor guardado: fuera del borrador, no es un cambio.
      const rest = { ...draft.value }
      delete rest[itemId]
      draft.value = rest
    } else {
      draft.value = { ...draft.value, [itemId]: newQuantity }
    }
  }

  /**
   * Persiste el borrador completo en un solo sync (replace de la lista,
   * igual que "Guardar cambios" del legacy) y reconcilia con la respuesta
   * real del servidor. Si falla (ej. sin stock), el borrador queda intacto
   * para corregir o descartar - nada quedo escrito.
   */
  /**
   * Elige (o quita) el descuento de una linea YA guardada. Mismo borrador
   * que las cantidades: instantaneo, sin red, y solo se persiste al
   * confirmar. Sin esto, un cajero que ya guardo los 10 cigarrillos no tenia
   * forma de aplicarles el descuento sin borrar la linea y volver a armarla.
   */
  function setItemDiscount(itemId: number, discountId: number | null): void {
    const item = activeSale.value?.items.find((i) => i.id === itemId)
    if (!item) {
      return
    }

    if (discountId === item.discount_id) {
      // Volvio al valor guardado: fuera del borrador, no es un cambio.
      const rest = { ...discountDraft.value }
      delete rest[itemId]
      discountDraft.value = rest
      return
    }

    discountDraft.value = { ...discountDraft.value, [itemId]: discountId }
  }

  async function confirmDraftChanges(): Promise<void> {
    const sale = activeSale.value
    if (!sale || !hasDraftChanges.value) {
      return
    }
    try {
      const updated = await mutations.syncItemsMutation.mutateAsync({
        saleId: sale.id,
        payload: { items: toSyncItemsPayload(draftItems.value) },
      })
      activeSale.value = updated
      draft.value = {}
      discountDraft.value = {}
    } catch (error) {
      onError(extractErrorMessage(error, 'No pudimos guardar los cambios de la cuenta.'))
    }
  }

  /** Vuelve la cuenta a como estaba guardada, sin tocar el backend. */
  function discardDraftChanges(): void {
    draft.value = {}
    discountDraft.value = {}
  }

  return {
    draftItems,
    hasDraftChanges,
    draftTotalDelta,
    adjustItemQuantity,
    setItemDiscount,
    confirmDraftChanges,
    discardDraftChanges,
    destroyActiveTab,
    confirmDestroyActiveTab,
  }
}
