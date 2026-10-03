import { computed, ref } from 'vue'

import type { Product, ProductVariant } from '@/types/product'
import type { SaleItemInput } from '@/types/sale'

import { optionsExtraTotal, optionsKey, type ChosenOption } from '../../sales/support/productOptions'

// Carrito para los items NUEVOS que se van a abrir/agregar a una cuenta.
//
// Los descuentos por linea se quedaron fuera del primer corte, y eso dejo un
// hueco caro: el API SIEMPRE acepto discount_id en los items de una cuenta
// abierta (ver ValidatesSaleItems y OpenTabService en nexolu-pos-api), pero
// como aca no se mandaba, en Las Banquitas el descuento "Cigarrillo Media"
// se aplico en 8 de 13 ventas directas y en 0 de 92 lineas cobradas por
// cuenta abierta - que es como venden casi todos los cigarrillos.
export interface NewCartLine {
  product: Product
  /** Presente cuando product.has_variants - la variante concreta elegida. */
  variant?: ProductVariant | null
  /** Salsas/toppings elegidos; su recargo ya va sumado en unitPrice. */
  options?: ChosenOption[]
  quantity: number
  unitPrice: number
  /** Descuento de linea elegido por el cajero (scope 'item'), o null. */
  discountId: number | null
}

export function useNewItemsCart() {
  const lines = ref<NewCartLine[]>([])

  function maxStockFor(product: Product, variant?: ProductVariant | null): number {
    if (variant) {
      return variant.stock
    }
    return product.track_stock ? product.stock : Number.MAX_SAFE_INTEGER
  }

  // La clave de opciones distingue dos platos iguales con salsas distintas:
  // son lineas aparte (cada una sale asi en la comanda).
  function findLine(productId: number, variantId?: number | null, key = ''): NewCartLine | undefined {
    return lines.value.find(
      (l) =>
        l.product.id === productId && (l.variant?.id ?? null) === (variantId ?? null) && optionsKey(l.options) === key,
    )
  }

  function addProduct(product: Product, unitPrice?: number, options: ChosenOption[] = []): void {
    const maxStock = maxStockFor(product)
    const existing = findLine(product.id, null, optionsKey(options))
    if (existing) {
      if (existing.quantity < maxStock) {
        existing.quantity += 1
      }
      return
    }
    if (maxStock <= 0) {
      return
    }
    lines.value.push({
      product,
      options,
      quantity: 1,
      unitPrice: (unitPrice ?? Number(product.price)) + optionsExtraTotal(options),
      discountId: null,
    })
  }

  /**
   * Contraparte de addProduct() para un producto con variantes - dos
   * variantes distintas del mismo producto son lineas independientes,
   * mismo criterio que useSaleCheckout.addVariant() de Vender.
   */
  function addVariant(product: Product, variant: ProductVariant): void {
    const maxStock = maxStockFor(product, variant)
    const existing = findLine(product.id, variant.id)
    if (existing) {
      if (existing.quantity < maxStock) {
        existing.quantity += 1
      }
      return
    }
    if (maxStock <= 0) {
      return
    }
    lines.value.push({ product, variant, quantity: 1, unitPrice: Number(variant.price), discountId: null })
  }

  function setQuantity(productId: number, quantity: number, variantId: number | null = null, key = ''): void {
    const line = findLine(productId, variantId, key)
    if (!line) {
      return
    }
    if (quantity <= 0) {
      removeLine(productId, variantId, key)
      return
    }
    line.quantity = Math.min(quantity, maxStockFor(line.product, line.variant))
  }

  function setDiscount(productId: number, discountId: number | null, variantId: number | null = null, key = ''): void {
    const line = findLine(productId, variantId, key)
    if (!line) {
      return
    }
    line.discountId = discountId
  }

  function removeLine(productId: number, variantId: number | null = null, key = ''): void {
    lines.value = lines.value.filter(
      (l) =>
        !(l.product.id === productId && (l.variant?.id ?? null) === (variantId ?? null) && optionsKey(l.options) === key),
    )
  }

  function reset(): void {
    lines.value = []
  }

  const itemCount = computed(() => lines.value.reduce((sum, l) => sum + l.quantity, 0))
  const total = computed(() => lines.value.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0))

  function toItemsPayload(): SaleItemInput[] {
    return lines.value.map((l) => ({
      product_id: l.product.id,
      product_variant_id: l.variant?.id ?? null,
      quantity: l.quantity,
      ...(!l.variant && l.product.price_varies_at_sale ? { unit_price: l.unitPrice - optionsExtraTotal(l.options) } : {}),
      discount_id: l.discountId,
      ...(l.options?.length ? { options: l.options.map((o) => o.id) } : {}),
    }))
  }

  return { lines, addProduct, addVariant, setQuantity, setDiscount, removeLine, reset, itemCount, total, toItemsPayload }
}
