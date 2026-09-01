// Estado completo de una venta directa en construccion: carrito, cliente,
// metodo de pago, domicilio, cortesia, descuentos y cargos - equivalente
// al estado de mode==='quick' en SalesTerminal.vue del legacy, pero sin
// mode==='tab'/'new-tab' (cuentas abiertas es un modulo aparte, ver
// docs/BACKEND_READINESS.md). Vive en un composable y no en el componente
// de la vista para poder testear/razonar la aritmetica de dinero sin
// montar el DOM.
import { computed, ref, watch, type Ref } from 'vue'

import type { ClientSearchResult } from '@/types/client'
import type { Business } from '@/types/business'
import type { Discount } from '@/types/discount'
import type { Product, ProductVariant } from '@/types/product'
import type { CreateSalePayload } from '@/types/sale'
import { hasFeature } from '@/utils/hasFeature'

import { clearSaleDraft, isDraftEmpty, loadSaleDraft, saveSaleDraft } from '../support/saleDraftStorage'
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
  const clientId = ref<number | null>(null)

  /** Vincula la venta a un Client real (ClientQuickAssociate) y prellena nombre/telefono/cedula. */
  function applyClient(client: ClientSearchResult): void {
    customerName.value = client.name
    customerPhone.value = client.phone ?? ''
    customerIdentification.value = client.identification ?? ''
    clientId.value = client.id
  }

  /**
   * Editar nombre/telefono/cedula a mano invalida el vinculo con el Client
   * aplicado: ya no es certeza de que el texto siga describiendo a esa
   * misma persona, y guardar un client_id que ya no corresponde es peor que
   * no guardar ninguno.
   */
  function setCustomerName(value: string): void {
    customerName.value = value
    clientId.value = null
  }

  function setCustomerPhone(value: string): void {
    customerPhone.value = value
    clientId.value = null
  }

  function setCustomerIdentification(value: string): void {
    customerIdentification.value = value
    clientId.value = null
  }

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

  function availableStock(product: Product, variant?: ProductVariant | null): number {
    if (variant) {
      const reserved = lines.value
        .filter((l) => l.variant?.id === variant.id)
        .reduce((sum, l) => sum + l.quantity, 0)
      return variant.stock - reserved
    }
    if (!product.track_stock) {
      return Number.POSITIVE_INFINITY
    }
    const reserved = lines.value
      .filter((l) => l.product.id === product.id && !l.variant)
      .reduce((sum, l) => sum + l.quantity, 0)
    return product.stock - reserved
  }

  /** Para productos de precio fijo: si ya esta en el carrito, suma cantidad. */
  function addProduct(product: Product, unitPrice?: number): void {
    if (product.track_stock && availableStock(product) <= 0) {
      return
    }

    if (!product.price_varies_at_sale) {
      const existing = lines.value.find((l) => l.product.id === product.id && !l.variant)
      if (existing) {
        existing.quantity += 1
        return
      }
    }

    lines.value.push({
      cartKey: crypto.randomUUID(),
      product,
      quantity: 1,
      // Number() explicito: product.price llega como string (ver el tipo).
      // Funcionaba por accidente porque la primera operacion del carrito es
      // una multiplicacion, que coacciona; una suma habria concatenado.
      unitPrice: product.price_varies_at_sale ? (unitPrice ?? Number(product.price)) : Number(product.price),
      discountId: null,
    })
  }

  /**
   * Contraparte de addProduct() para un producto con variantes
   * (product.has_variants) - siempre precio fijo (variant.price, nunca
   * price_varies_at_sale), y el "ya esta en el carrito" compara tambien la
   * variante: dos variantes distintas del mismo producto (ej. Talla S y
   * Talla M) son lineas independientes, nunca se fusionan entre si.
   */
  function addVariant(product: Product, variant: ProductVariant): void {
    if (availableStock(product, variant) <= 0) {
      return
    }

    const existing = lines.value.find((l) => l.product.id === product.id && l.variant?.id === variant.id)
    if (existing) {
      existing.quantity += 1
      return
    }

    lines.value.push({
      cartKey: crypto.randomUUID(),
      product,
      variant,
      quantity: 1,
      unitPrice: Number(variant.price),
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
    if (line.variant) {
      if (quantity > line.variant.stock) {
        return
      }
    } else if (line.product.track_stock && quantity > line.product.stock) {
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
        product_variant_id: l.variant?.id ?? null,
        quantity: l.quantity,
        unit_price: l.product.price_varies_at_sale ? l.unitPrice : undefined,
        discount_id: l.discountId,
      })),
      customer_name: customerName.value || undefined,
      customer_phone: customerPhone.value || undefined,
      customer_identification: customerIdentification.value || undefined,
      client_id: clientId.value,
      is_delivery: isDelivery.value,
      cart_discount_id: cartDiscountId.value,
    }
  }

  function reset(): void {
    lines.value = []
    customerName.value = ''
    customerPhone.value = ''
    customerIdentification.value = ''
    clientId.value = null
    isDelivery.value = false
    cartDiscountId.value = null
    if (business.value) {
      clearSaleDraft(business.value.id)
    }
  }

  // Persistencia del carrito en localStorage - sobrevive que el navegador
  // descarte la pestaña en segundo plano (Safari/Chrome moviles, no hay
  // app nativa/PWA instalada aca) y la recargue de cero al volver, algo
  // que pasa seguido si el cajero cambia a WhatsApp un momento a mitad de
  // una venta. Ver saleDraftStorage.ts para el detalle.
  let isRestoring = false

  watch(
    [lines, customerName, customerPhone, customerIdentification, clientId, isDelivery, cartDiscountId],
    () => {
      if (isRestoring || !business.value) {
        return
      }
      const draft = {
        lines: lines.value.map((l) => ({
          productId: l.product.id,
          productVariantId: l.variant?.id ?? null,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountId: l.discountId,
        })),
        customerName: customerName.value,
        customerPhone: customerPhone.value,
        customerIdentification: customerIdentification.value,
        clientId: clientId.value,
        isDelivery: isDelivery.value,
        cartDiscountId: cartDiscountId.value,
      }
      if (isDraftEmpty(draft)) {
        clearSaleDraft(business.value.id)
        return
      }
      saveSaleDraft(business.value.id, draft)
    },
    { deep: true },
  )

  /**
   * Llamar una vez que el catalogo de productos ya cargo (SellView, cuando
   * productsQuery.data.value deja de estar vacio) - resuelve cada linea
   * guardada contra el Product ACTUAL (precio/stock de ahora, nunca un
   * snapshot viejo). Un producto borrado/desactivado desde que se guardo
   * el borrador se descarta en silencio en vez de restaurarse roto.
   * Devuelve true si de verdad restauro algo, para que SellView pueda
   * avisarle al cajero que retomo una venta en curso.
   */
  function restoreDraft(products: Product[]): boolean {
    if (!business.value) {
      return false
    }
    const draft = loadSaleDraft(business.value.id)
    if (!draft) {
      return false
    }

    isRestoring = true
    try {
      const restoredLines: CartLine[] = draft.lines
        .map((l): CartLine | null => {
          const product = products.find((p) => p.id === l.productId)
          if (!product) {
            return null
          }
          // Un producto con variantes SIEMPRE resuelve contra el catalogo
          // actual, nunca contra un snapshot viejo (mismo criterio que el
          // producto mismo, arriba) - si la variante ya no existe o se
          // desactivo desde que se guardo el borrador, se descarta esa
          // linea en vez de restaurarla rota.
          let variant: ProductVariant | null = null
          if (l.productVariantId) {
            const found = product.variants?.find((v) => v.id === l.productVariantId && v.is_active)
            if (!found) {
              return null
            }
            variant = found
          }
          return {
            cartKey: crypto.randomUUID(),
            product,
            variant,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountId: l.discountId,
          }
        })
        .filter((l): l is CartLine => l !== null)

      if (restoredLines.length === 0 && isDraftEmpty(draft)) {
        return false
      }

      lines.value = restoredLines
      customerName.value = draft.customerName
      customerPhone.value = draft.customerPhone
      customerIdentification.value = draft.customerIdentification
      clientId.value = draft.clientId
      isDelivery.value = draft.isDelivery
      cartDiscountId.value = draft.cartDiscountId

      return true
    } finally {
      isRestoring = false
    }
  }

  return {
    lines,
    customerName,
    customerPhone,
    customerIdentification,
    clientId,
    applyClient,
    setCustomerName,
    setCustomerPhone,
    setCustomerIdentification,
    isDelivery,
    cartDiscountId,
    itemDiscounts,
    cartDiscounts,
    itemCount,
    totals,
    canSubmit,
    availableStock,
    addProduct,
    addVariant,
    removeLine,
    setQuantity,
    setLineDiscount,
    setLineUnitPrice,
    buildPayload,
    reset,
    restoreDraft,
  }
}
