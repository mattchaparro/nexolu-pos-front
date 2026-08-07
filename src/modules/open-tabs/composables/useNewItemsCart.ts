import { computed, ref } from 'vue'

import type { Product } from '@/types/product'
import type { SaleItemInput } from '@/types/sale'

// Carrito simple para los items NUEVOS que se van a abrir/agregar a una
// cuenta - sin descuentos (a diferencia de useSaleCheckout de Vender): la
// vista simple de OpenTabs.vue del legacy tampoco los tiene aca, los
// descuentos de cuentas abiertas quedan fuera de este primer corte.
export interface NewCartLine {
  product: Product
  quantity: number
  unitPrice: number
}

export function useNewItemsCart() {
  const lines = ref<NewCartLine[]>([])

  function maxStockFor(product: Product): number {
    return product.track_stock ? product.stock : Number.MAX_SAFE_INTEGER
  }

  function addProduct(product: Product, unitPrice?: number): void {
    const maxStock = maxStockFor(product)
    const existing = lines.value.find((l) => l.product.id === product.id)
    if (existing) {
      if (existing.quantity < maxStock) {
        existing.quantity += 1
      }
      return
    }
    if (maxStock <= 0) {
      return
    }
    lines.value.push({ product, quantity: 1, unitPrice: unitPrice ?? product.price })
  }

  function setQuantity(productId: number, quantity: number): void {
    const line = lines.value.find((l) => l.product.id === productId)
    if (!line) {
      return
    }
    if (quantity <= 0) {
      removeLine(productId)
      return
    }
    line.quantity = Math.min(quantity, maxStockFor(line.product))
  }

  function removeLine(productId: number): void {
    lines.value = lines.value.filter((l) => l.product.id !== productId)
  }

  function reset(): void {
    lines.value = []
  }

  const itemCount = computed(() => lines.value.reduce((sum, l) => sum + l.quantity, 0))
  const total = computed(() => lines.value.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0))

  function toItemsPayload(): SaleItemInput[] {
    return lines.value.map((l) => ({
      product_id: l.product.id,
      quantity: l.quantity,
      ...(l.product.price_varies_at_sale ? { unit_price: l.unitPrice } : {}),
    }))
  }

  return { lines, addProduct, setQuantity, removeLine, reset, itemCount, total, toItemsPayload }
}
