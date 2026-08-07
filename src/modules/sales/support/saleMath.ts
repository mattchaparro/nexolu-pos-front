// Espejo exacto de la aritmetica de dinero de SaleService (createSale,
// applyItems, applyCartDiscount, resolveCharges) y Discount::computeAmount
// en nexolu-pos-api. El servidor es la fuente de verdad final (recalcula
// todo bajo lock al confirmar), pero el carrito tiene que mostrar el mismo
// numero que va a cobrar o el cajero pierde confianza en la pantalla.
import type { Business, BusinessChargesConfig } from '@/types/business'
import type { Discount } from '@/types/discount'
import type { Product } from '@/types/product'

export interface CartLine {
  cartKey: string
  product: Product
  quantity: number
  /** Precio unitario efectivo: fijo = product.price, variable = editable. */
  unitPrice: number
  discountId: number | null
}

export interface CartLineTotals extends CartLine {
  subtotal: number
  discountAmount: number
  total: number
}

export interface SaleTotals {
  lines: CartLineTotals[]
  itemsSubtotal: number
  itemDiscountsTotal: number
  itemsTotal: number
  cartDiscountAmount: number
  subtotalAfterCartDiscount: number
  serviceChargeAmount: number
  ipoconsumoAmount: number
  deliveryFee: number
  grandTotal: number
}

/** round(x, 2) con redondeo "half up", igual que PHP round() para montos positivos. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function computeDiscountAmount(discount: Discount | undefined, subtotal: number): number {
  if (!discount) {
    return 0
  }

  const amount =
    discount.type === 'percentage' ? round2((subtotal * discount.value) / 100) : discount.value

  return Math.min(amount, subtotal)
}

export interface ComputeSaleTotalsInput {
  lines: CartLine[]
  discounts: Discount[]
  cartDiscountId: number | null
  discountsEnabled: boolean
  charges: BusinessChargesConfig
  chargesEnabled: boolean
  applyServiceCharge: boolean
  applyIpoconsumo: boolean
  isDelivery: boolean
  business: Business
}

export function computeSaleTotals(input: ComputeSaleTotalsInput): SaleTotals {
  const discountsById = new Map(input.discounts.map((d) => [d.id, d]))

  const lines: CartLineTotals[] = input.lines.map((line) => {
    const subtotal = round2(line.unitPrice * line.quantity)
    const discount =
      input.discountsEnabled && line.discountId ? discountsById.get(line.discountId) : undefined
    const discountAmount = computeDiscountAmount(discount, subtotal)

    return { ...line, subtotal, discountAmount, total: round2(subtotal - discountAmount) }
  })

  const itemsSubtotal = round2(lines.reduce((sum, l) => sum + l.subtotal, 0))
  const itemDiscountsTotal = round2(lines.reduce((sum, l) => sum + l.discountAmount, 0))
  const itemsTotal = round2(itemsSubtotal - itemDiscountsTotal)

  const cartDiscount =
    input.discountsEnabled && input.cartDiscountId
      ? discountsById.get(input.cartDiscountId)
      : undefined
  const cartDiscountAmount = computeDiscountAmount(cartDiscount, itemsTotal)
  const subtotalAfterCartDiscount = round2(itemsTotal - cartDiscountAmount)

  const serviceChargeAmount =
    input.chargesEnabled && input.charges.service_charge_enabled && input.applyServiceCharge
      ? round2((subtotalAfterCartDiscount * input.charges.service_charge_rate) / 100)
      : 0
  const ipoconsumoAmount =
    input.chargesEnabled && input.charges.ipoconsumo_enabled && input.applyIpoconsumo
      ? round2((subtotalAfterCartDiscount * input.charges.ipoconsumo_rate) / 100)
      : 0

  const deliveryFee =
    input.isDelivery && input.business.delivery_enabled ? Number(input.business.delivery_fee) : 0

  const grandTotal = round2(
    subtotalAfterCartDiscount + serviceChargeAmount + ipoconsumoAmount + deliveryFee,
  )

  return {
    lines,
    itemsSubtotal,
    itemDiscountsTotal,
    itemsTotal,
    cartDiscountAmount,
    subtotalAfterCartDiscount,
    serviceChargeAmount,
    ipoconsumoAmount,
    deliveryFee,
    grandTotal,
  }
}
