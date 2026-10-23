import { describe, expect, it } from 'vitest'

import type { Product } from '@/types/product'

import { codeIncludes, findByExactCode } from './productCode'

const product = (id: number, sku: string | null, variantSkus: string[] = [], isActive = true): Product =>
  ({
    id,
    name: `Producto ${id}`,
    sku,
    is_active: isActive,
    variants: variantSkus.map((variantSku, index) => ({ id: id * 10 + index, sku: variantSku, is_active: true })),
  }) as unknown as Product

describe('productCode', () => {
  const catalog = [
    product(1, '7702004003508'),
    product(2, 'CEL-A15', ['CEL-A15-NEG', 'CEL-A15-AZU']),
    product(3, null),
    product(4, 'VIEJO-1', [], false),
  ]

  it('finds a product by its exact code, ignoring case and spaces', () => {
    expect(findByExactCode(catalog, ' 7702004003508 ')?.id).toBe(1)
    expect(findByExactCode(catalog, 'cel-a15')?.id).toBe(2)
  })

  it('finds the product when the scanned code belongs to one of its variations', () => {
    expect(findByExactCode(catalog, 'CEL-A15-AZU')?.id).toBe(2)
  })

  it('does not decide on partial, unknown, inactive or duplicated codes', () => {
    expect(findByExactCode(catalog, '77020')).toBeNull()
    expect(findByExactCode(catalog, 'NO-EXISTE')).toBeNull()
    expect(findByExactCode(catalog, 'VIEJO-1')).toBeNull()
    expect(findByExactCode([...catalog, product(5, '7702004003508')], '7702004003508')).toBeNull()
    expect(findByExactCode(catalog, '')).toBeNull()
  })

  it('matches partial codes for the search filter', () => {
    expect(codeIncludes(catalog[0]!, '00350')).toBe(true)
    expect(codeIncludes(catalog[1]!, 'azu')).toBe(true)
    expect(codeIncludes(catalog[2]!, 'algo')).toBe(false)
  })
})
