import { describe, expect, it } from 'vitest'

import type { Product, ProductVariant } from '@/types/product'

import { useNewItemsCart } from './useNewItemsCart'

/**
 * El caso real que destapó esto (Las Banquitas, 2026-09-22): el descuento
 * "Cigarrillo Media" se aplicaba en las ventas directas y NUNCA en las
 * cuentas abiertas, porque este carrito no tenía descuento ni lo mandaba.
 */
function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 2286,
    name: 'Cigarros',
    price: 1200,
    stock: 100,
    track_stock: true,
    has_variants: false,
    price_varies_at_sale: false,
    ...overrides,
  } as Product
}

function variant(overrides: Partial<ProductVariant> = {}): ProductVariant {
  return { id: 77, price: 1500, stock: 10, ...overrides } as ProductVariant
}

describe('useNewItemsCart', () => {
  it('manda discount_id null mientras el cajero no elija descuento', () => {
    const cart = useNewItemsCart()
    cart.addProduct(product())

    expect(cart.toItemsPayload()).toEqual([
      { product_id: 2286, product_variant_id: null, quantity: 1, discount_id: null },
    ])
  })

  it('manda el descuento elegido para esa linea', () => {
    const cart = useNewItemsCart()
    cart.addProduct(product())
    cart.setQuantity(2286, 10)
    cart.setDiscount(2286, 21)

    expect(cart.toItemsPayload()).toEqual([
      { product_id: 2286, product_variant_id: null, quantity: 10, discount_id: 21 },
    ])
  })

  it('permite quitar el descuento volviendo a null', () => {
    const cart = useNewItemsCart()
    cart.addProduct(product())
    cart.setDiscount(2286, 21)
    cart.setDiscount(2286, null)

    expect(cart.toItemsPayload()[0].discount_id).toBeNull()
  })

  // Dos variantes del mismo producto son lineas independientes: el descuento
  // de una no puede arrastrar a la otra.
  it('aplica el descuento solo a la variante indicada', () => {
    const cart = useNewItemsCart()
    const conVariantes = product({ has_variants: true })
    cart.addVariant(conVariantes, variant({ id: 77 }))
    cart.addVariant(conVariantes, variant({ id: 88 }))
    cart.setDiscount(2286, 21, 77)

    const payload = cart.toItemsPayload()
    expect(payload.find((l) => l.product_variant_id === 77)?.discount_id).toBe(21)
    expect(payload.find((l) => l.product_variant_id === 88)?.discount_id).toBeNull()
  })

  it('ignora un descuento sobre una linea que no esta en el carrito', () => {
    const cart = useNewItemsCart()
    cart.addProduct(product())
    cart.setDiscount(9999, 21)

    expect(cart.toItemsPayload()[0].discount_id).toBeNull()
  })

  it('no pierde el descuento al cambiar la cantidad', () => {
    const cart = useNewItemsCart()
    cart.addProduct(product())
    cart.setDiscount(2286, 21)
    cart.setQuantity(2286, 10)

    expect(cart.toItemsPayload()[0]).toMatchObject({ quantity: 10, discount_id: 21 })
  })

  it('el precio solo viaja cuando el producto lo define al vender', () => {
    const cart = useNewItemsCart()
    cart.addProduct(product({ price_varies_at_sale: true }), 5000)

    expect(cart.toItemsPayload()[0]).toMatchObject({ unit_price: 5000, discount_id: null })
  })
})
