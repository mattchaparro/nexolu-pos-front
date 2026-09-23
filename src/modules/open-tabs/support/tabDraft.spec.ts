import { describe, expect, it } from 'vitest'

import type { SaleItem } from '@/types/sale'

import { applyDraftToItems, draftDiscountOf, hasDraftChanges } from './tabDraft'
import { toSyncItemsPayload } from './tabItemsPayload'

function item(overrides: Partial<SaleItem> = {}): SaleItem {
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

describe('borrador de items guardados', () => {
  // El caso de la foto: los 10 cigarrillos YA estaban guardados en la mesa,
  // asi que el selector de los items nuevos no servia para nada.
  it('aplica un descuento a una linea ya guardada', () => {
    const items = [item()]
    const conDescuento = applyDraftToItems(items, {}, { 1: 21 })

    expect(conDescuento[0].discount_id).toBe(21)
    expect(hasDraftChanges(items, {}, { 1: 21 })).toBe(true)
  })

  it('permite quitar el descuento de una linea que ya lo tenia', () => {
    const items = [item({ discount_id: 21, discount_amount: 3500 })]

    expect(applyDraftToItems(items, {}, { 1: null })[0].discount_id).toBeNull()
    expect(hasDraftChanges(items, {}, { 1: null })).toBe(true)
  })

  // null es un valor legitimo del borrador: con `??` en vez de `in` esto
  // volveria al descuento guardado y "quitar" no funcionaria nunca.
  it('distingue "sin descuento" de "sin tocar"', () => {
    const guardado = item({ discount_id: 21 })

    expect(draftDiscountOf(guardado, { 1: null })).toBeNull()
    expect(draftDiscountOf(guardado, {})).toBe(21)
  })

  it('no reporta cambios cuando el descuento vuelve al valor guardado', () => {
    const items = [item({ discount_id: 21 })]

    expect(hasDraftChanges(items, {}, { 1: 21 })).toBe(false)
  })

  it('combina cambio de cantidad y de descuento en la misma linea', () => {
    const [linea] = applyDraftToItems([item()], { 1: 11 }, { 1: 21 })

    expect(linea).toMatchObject({ quantity: 11, discount_id: 21, subtotal: 13200 })
  })

  it('el descuento del borrador llega al payload que se guarda', () => {
    const payload = toSyncItemsPayload(applyDraftToItems([item()], { 1: 11 }, { 1: 21 }))

    expect(payload).toEqual([
      { product_id: 2286, product_variant_id: null, quantity: 11, unit_price: 1200, discount_id: 21 },
    ])
  })

  it('una linea llevada a cero sale de la lista', () => {
    expect(applyDraftToItems([item()], { 1: 0 }, {})).toEqual([])
  })

  it('no toca las lineas que el borrador no menciona', () => {
    const items = [item({ id: 1 }), item({ id: 2, discount_id: 21 })]
    const resultado = applyDraftToItems(items, {}, { 1: 21 })

    expect(resultado[1]).toBe(items[1])
    expect(hasDraftChanges([items[1]], {}, {})).toBe(false)
  })
})
