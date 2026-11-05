import { describe, expect, it } from 'vitest'

import { newPurchaseLineRow, unusualCostReference } from './purchaseLine'

function row(quantity: number, total: number) {
  return { ...newPurchaseLineRow('product'), product_id: 1, quantity, line_total_cop: total }
}

describe('unusualCostReference', () => {
  it('flags a total with extra zeros against the current cost', () => {
    // El caso real: 37 bolsas de Papas por $59.447.000 en vez de $59.447.
    expect(unusualCostReference(row(37, 59_447_000), { price: '2500.00', cost_price: '1790.85' })).toBe(1790.85)
  })

  it('accepts a normal purchase, even if a bit more expensive', () => {
    expect(unusualCostReference(row(37, 59_447), { price: '2500.00', cost_price: '1790.85' })).toBeNull()
    expect(unusualCostReference(row(10, 30_000), { price: '2500.00', cost_price: '1790.85' })).toBeNull()
  })

  it('falls back to the sale price when the product has no cost yet', () => {
    expect(unusualCostReference(row(1, 34_000), { price: '2000.00', cost_price: '0.00' })).toBe(2000)
    expect(unusualCostReference(row(1, 1_500), { price: '2000.00', cost_price: null })).toBeNull()
  })

  it('says nothing while the row is incomplete or the item has no reference', () => {
    expect(unusualCostReference(row(0, 59_447_000), { price: '2500', cost_price: '1790' })).toBeNull()
    expect(unusualCostReference(row(37, 0), { price: '2500', cost_price: '1790' })).toBeNull()
    expect(unusualCostReference(row(37, 59_447_000), undefined)).toBeNull()
    expect(unusualCostReference(row(37, 59_447_000), { price: '0', cost_price: '0' })).toBeNull()
  })
})
