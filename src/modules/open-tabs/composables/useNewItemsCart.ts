import { computed, ref } from 'vue'

import type { Product, ProductVariant } from '@/types/product'
import type { SaleItemInput } from '@/types/sale'

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

  function findLine(productId: number, variantId?: number | null): NewCartLine | undefined {
    return lines.value.find((l) => l.product.id === productId && (l.variant?.id ?? null) === (variantId ?? null))
  }

  function addProduct(product: Product, unitPrice?: number): void {
    const maxStock = maxStockFor(product)
    const existing = findLine(product.id, null)
    if (existing) {
      if (existing.quantity < maxStock) {
        existing.quantity += 1
      }
      return
    }
    if (maxStock <= 0) {
      return
    }
    lines.value.push({ product, quantity: 1, unitPrice: unitPrice ?? Number(product.price), discountId: null })
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

  function setQuantity(productId: number, quantity: number, variantId: number | null = null): void {
    const line = findLine(productId, variantId)
    if (!line) {
      return
    }
    if (quantity <= 0) {
      removeLine(productId, variantId)
      return
    }
    line.quantity = Math.min(quantity, maxStockFor(line.product, line.variant))
  }

  function setDiscount(productId: number, discountId: number | null, variantId: number | null = null): void {
    const line = findLine(productId, variantId)
    if (!line) {
      return
    }
    line.discountId = discountId
  }

  function removeLine(productId: number, variantId: number | null = null): void {
    lines.value = lines.value.filter(
      (l) => !(l.product.id === productId && (l.variant?.id ?? null) === (variantId ?? null)),
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
      ...(!l.variant && l.product.price_varies_at_sale ? { unit_price: l.unitPrice } : {}),
      discount_id: l.discountId,
    }))
  }

  return { lines, addProduct, addVariant, setQuantity, setDiscount, removeLine, reset, itemCount, total, toItemsPayload }
}
