// Estado completo de una venta directa en construccion: carrito, cliente,
// metodo de pago, domicilio, cortesia, descuentos y cargos - equivalente
// al estado de mode==='quick' en SalesTerminal.vue del legacy, pero sin
// mode==='tab'/'new-tab' (cuentas abiertas es un modulo aparte, ver
// docs/BACKEND_READINESS.md). Vive en un composable y no en el componente
// de la vista para poder testear/razonar la aritmetica de dinero sin
// montar el DOM.
import { computed, ref, type Ref } from 'vue'

import type { Business } from '@/types/business'
import type { Discount } from '@/types/discount'
import type { Product } from '@/types/product'
import type { CreateSalePayload } from '@/types/sale'
import { hasFeature } from '@/utils/hasFeature'

import { computeSaleTotals, type CartLine } from '../support/saleMath'

// Cortesia/cargos (servicio/ipoconsumo)/metodo de pago (unico o dividido)
// ya NO viven aca: se resuelven y se muestran en PaymentModal (compartido
// con el cierre de cuentas abiertas) al tocar "Cobrar", no antes - el
// carrito (SaleTotalsSummary) solo muestra el total de lo que hay en el
// carrito, sin duplicar esa cuenta con un preview que el propio carrito no
// puede des/activar. Domicilio y descuento de cuenta si se deciden aca
// (isDelivery/cartDiscountId): son datos de la venta, no del cobro, y el
// modal los recibe ya resueltos via props/payload.
export function useSaleCheckout(business: Ref<Business | undefined>, discounts: Ref<Discount[]>) {
  const lines = ref<CartLine[]>([])

  const customerName = ref('')
  const customerPhone = ref('')
  const customerIdentification = ref('')

  const isDelivery = ref(false)

  const cartDiscountId = ref<number | null>(null)

  const itemDiscounts = computed(() => discounts.value.filter((d) => d.scope === 'item'))
  const cartDiscounts = computed(() => discounts.value.filter((d) => d.scope === 'cart'))

  const itemCount = computed(() => lines.value.reduce((sum, l) => sum + l.quantity, 0))

  const totals = computed(() => {
    if (!business.value) {
      return null
    }

    return computeSaleTotals({
      lines: lines.value,
      discounts: discounts.value,
      cartDiscountId: cartDiscountId.value,
      discountsEnabled: hasFeature(business.value, 'discounts'),
      isDelivery: isDelivery.value,
      business: business.value,
    })
  })

  function findLine(cartKey: string) {
    return lines.value.find((l) => l.cartKey === cartKey)
  }

  function availableStock(product: Product): number {
    if (!product.track_stock) {
      return Number.POSITIVE_INFINITY
    }
    const reserved = lines.value
      .filter((l) => l.product.id === product.id)
      .reduce((sum, l) => sum + l.quantity, 0)
    return product.stock - reserved
  }

  /** Para productos de precio fijo: si ya esta en el carrito, suma cantidad. */
  function addProduct(product: Product, unitPrice?: number): void {
    if (product.track_stock && availableStock(product) <= 0) {
      return
    }

    if (!product.price_varies_at_sale) {
      const existing = lines.value.find((l) => l.product.id === product.id)
      if (existing) {
        existing.quantity += 1
        return
      }
    }

    lines.value.push({
      cartKey: crypto.randomUUID(),
      product,
      quantity: 1,
      unitPrice: product.price_varies_at_sale ? (unitPrice ?? product.price) : product.price,
      discountId: null,
    })
  }

  function removeLine(cartKey: string): void {
    lines.value = lines.value.filter((l) => l.cartKey !== cartKey)
  }

  function setQuantity(cartKey: string, quantity: number): void {
    const line = findLine(cartKey)
    if (!line || quantity < 1) {
      return
    }
    if (line.product.track_stock && quantity > line.product.stock) {
      return
    }
    line.quantity = quantity
  }

  function setLineDiscount(cartKey: string, discountId: number | null): void {
    const line = findLine(cartKey)
    if (line) {
      line.discountId = discountId
    }
  }

  function setLineUnitPrice(cartKey: string, unitPrice: number): void {
    const line = findLine(cartKey)
    if (line) {
      line.unitPrice = Math.max(0, unitPrice)
    }
  }

  const canSubmit = computed(() => lines.value.length > 0)

  /**
   * Payload base (items, cliente, domicilio, descuento de carrito) - a esto
   * se le mezclan encima los campos que resuelve PaymentModal (cortesia,
   * cargos, payment_method o payment_splits) antes de enviarlo.
   */
  function buildPayload(): CreateSalePayload {
    return {
      items: lines.value.map((l) => ({
        product_id: l.product.id,
        quantity: l.quantity,
        unit_price: l.product.price_varies_at_sale ? l.unitPrice : undefined,
        discount_id: l.discountId,
      })),
      customer_name: customerName.value || undefined,
      customer_phone: customerPhone.value || undefined,
      customer_identification: customerIdentification.value || undefined,
      is_delivery: isDelivery.value,
      cart_discount_id: cartDiscountId.value,
    }
  }

  function reset(): void {
    lines.value = []
    customerName.value = ''
    customerPhone.value = ''
    customerIdentification.value = ''
    isDelivery.value = false
    cartDiscountId.value = null
  }

  return {
    lines,
    customerName,
    customerPhone,
    customerIdentification,
    isDelivery,
    cartDiscountId,
    itemDiscounts,
    cartDiscounts,
    itemCount,
    totals,
    canSubmit,
    availableStock,
    addProduct,
    removeLine,
    setQuantity,
    setLineDiscount,
    setLineUnitPrice,
    buildPayload,
    reset,
  }
}
