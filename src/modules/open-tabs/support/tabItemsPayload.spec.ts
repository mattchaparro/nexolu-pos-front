import { describe, expect, it } from 'vitest'

import type { SaleItem } from '@/types/sale'

import { toSyncItemsPayload } from './tabItemsPayload'

function saleItem(overrides: Partial<SaleItem> = {}): SaleItem {
  return {
    id: 1,
    product: { id: 2286, name: 'Cigarros' },
    product_variant: null,
    quantity: 10,
    unit_price: 1200,
    subtotal: 12000,
    discount_id: null,
    discount_amount: 0,
    ...overrides,
  } as SaleItem
}

describe('toSyncItemsPayload', () => {
  // PUT /open-tabs/{id}/items REEMPLAZA el carrito: lo que no viaje, se borra.
  it('conserva el descuento de una linea ya guardada', () => {
    const payload = toSyncItemsPayload([saleItem({ discount_id: 21, discount_amount: 3500 })])

    expect(payload).toEqual([
      { product_id: 2286, product_variant_id: null, quantity: 10, unit_price: 1200, discount_id: 21 },
    ])
  })

  it('manda null cuando la linea no tiene descuento', () => {
    expect(toSyncItemsPayload([saleItem()])[0].discount_id).toBeNull()
  })

  it('conserva la variante elegida', () => {
    const conVariante = saleItem({ product_variant: { id: 77 } as SaleItem['product_variant'] })

    expect(toSyncItemsPayload([conVariante])[0].product_variant_id).toBe(77)
  })

  it('mantiene el orden y la cantidad de lineas', () => {
    const payload = toSyncItemsPayload([
      saleItem({ id: 1, quantity: 3 }),
      saleItem({ id: 2, quantity: 7, discount_id: 21 }),
    ])

    expect(payload.map((line) => line.quantity)).toEqual([3, 7])
    expect(payload.map((line) => line.discount_id)).toEqual([null, 21])
  })
})
