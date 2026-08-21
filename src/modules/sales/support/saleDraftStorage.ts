// Persiste el carrito/datos de cliente de una venta directa en curso, para
// sobrevivir una recarga real de la pestaña - no algo que dispare la app
// (no hay ningun location.reload() ni service worker aca), sino el
// navegador mismo descartando la pestaña en segundo plano por memoria
// (comun en Safari/Chrome moviles con cualquier sitio no instalado como
// PWA: el cajero cambia a WhatsApp un momento y al volver perdia toda la
// venta que tenia armada). localStorage sobrevive esa recarga porque es
// disco, no memoria de la pestaña - el estado en memoria (Pinia, refs) no.
//
// Solo se guardan datos serializables (productId, no el Product completo):
// al restaurar, se resuelve contra el catalogo YA cargado en ese momento
// (precio/stock actuales), nunca contra un snapshot viejo - un producto
// borrado o desactivado desde que se guardo el borrador simplemente se
// descarta en vez de restaurarse roto.
const STORAGE_PREFIX = 'nexolu_sale_draft_'
// Un borrador mas viejo que esto no se restaura - evita reaparecer con
// precios/stock de hace dias si el cajero nunca volvio a intentar esa
// venta (abandono real, no un cambio de pestaña momentaneo).
const MAX_AGE_MS = 12 * 60 * 60 * 1000

export interface SaleDraftLine {
  productId: number
  quantity: number
  unitPrice: number
  discountId: number | null
}

export interface SaleDraft {
  savedAt: number
  lines: SaleDraftLine[]
  customerName: string
  customerPhone: string
  customerIdentification: string
  clientId: number | null
  isDelivery: boolean
  cartDiscountId: number | null
}

function storageKey(businessId: number): string {
  return `${STORAGE_PREFIX}${businessId}`
}

export function saveSaleDraft(businessId: number, draft: Omit<SaleDraft, 'savedAt'>): void {
  try {
    localStorage.setItem(storageKey(businessId), JSON.stringify({ ...draft, savedAt: Date.now() }))
  } catch {
    // localStorage lleno/deshabilitado (modo privado en algunos navegadores)
    // - perder la persistencia no debe romper la venta en curso.
  }
}

export function loadSaleDraft(businessId: number): SaleDraft | null {
  try {
    const raw = localStorage.getItem(storageKey(businessId))
    if (!raw) {
      return null
    }
    const draft = JSON.parse(raw) as SaleDraft
    if (Date.now() - draft.savedAt > MAX_AGE_MS) {
      clearSaleDraft(businessId)
      return null
    }
    return draft
  } catch {
    return null
  }
}

export function clearSaleDraft(businessId: number): void {
  try {
    localStorage.removeItem(storageKey(businessId))
  } catch {
    // ver saveSaleDraft
  }
}

export function isDraftEmpty(draft: Pick<SaleDraft, 'lines' | 'customerName' | 'customerPhone'>): boolean {
  return draft.lines.length === 0 && !draft.customerName && !draft.customerPhone
}
