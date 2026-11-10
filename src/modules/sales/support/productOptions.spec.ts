import { describe, expect, it } from 'vitest'

import type { Product } from '@/types/product'

import { optionsExtraTotal, optionsKey, optionsLabel, resolveChosenOptions } from './productOptions'

const product = {
  option_groups: [
    {
      id: 1,
      name: 'Salsa',
      min_choices: 1,
      max_choices: 1,
      options: [
        { id: 10, name: 'BBQ', extra_price: '0.00', ingredient_id: null, ingredient_quantity: null, is_active: true },
        { id: 11, name: 'Picante', extra_price: '1000.00', ingredient_id: null, ingredient_quantity: null, is_active: true },
        { id: 12, name: 'Vieja', extra_price: '0.00', ingredient_id: null, ingredient_quantity: null, is_active: false },
      ],
    },
  ],
} as unknown as Product

describe('productOptions', () => {
  it('resolves saved ids against the catalogue and sums the extras', () => {
    const chosen = resolveChosenOptions(product, [11])
    expect(chosen?.[0]).toMatchObject({ id: 11, group: 'Salsa', name: 'Picante', extraPrice: 1000 })
    expect(optionsExtraTotal(chosen ?? [])).toBe(1000)
  })

  it('returns null when an option was removed or deactivated', () => {
    expect(resolveChosenOptions(product, [99])).toBeNull()
    expect(resolveChosenOptions(product, [12])).toBeNull()
  })

  it('builds the same key regardless of choice order', () => {
    const a = resolveChosenOptions(product, [10, 11]) ?? []
    const b = resolveChosenOptions(product, [11, 10]) ?? []
    expect(optionsKey(a)).toBe(optionsKey(b))
    expect(optionsKey([])).toBe('')
  })

  it('groups repeated portions in the short label, keeping the order they were chosen', () => {
    const jack = { group: 'Tragos', name: 'Jack Daniels' }
    const tamarindo = { group: 'Tragos', name: 'Tamarindo' }
    expect(optionsLabel([jack, tamarindo, jack])).toBe('Jack Daniels ×2, Tamarindo')
    expect(optionsLabel([])).toBe('')
  })

  it('keeps repeated portions in the merge key so a double shot is its own line', () => {
    expect(optionsKey([{ id: 10 }, { id: 10 }] as never)).toBe('10,10')
    expect(optionsKey([{ id: 10 }] as never)).not.toBe(optionsKey([{ id: 10 }, { id: 10 }] as never))
  })
})
