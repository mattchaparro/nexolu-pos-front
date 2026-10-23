import type { Product } from '@/types/product'

// Buscar por codigo (SKU) en Vender. Es lo que hace un lector de codigo de
// barras USB o Bluetooth: "escribe" el codigo en el buscador y manda Enter.
// Sin esto el buscador solo comparaba nombre y categoria, y el lector no
// servia para nada (el legacy si lo soportaba y el home lo seguia ofreciendo).

const normalize = (value: string | null | undefined): string => (value ?? '').trim().toLowerCase()

/** Si el texto aparece en el codigo del producto o en el de alguna de sus variaciones. */
export function codeIncludes(product: Product, term: string): boolean {
  const needle = normalize(term)
  if (!needle) {
    return false
  }

  return (
    normalize(product.sku).includes(needle) ||
    (product.variants ?? []).some((variant) => normalize(variant.sku).includes(needle))
  )
}

/**
 * El producto cuyo codigo es EXACTAMENTE el escaneado, o null. Exacto y unico
 * a proposito: el Enter del lector agrega al carrito sin confirmar, asi que
 * una coincidencia parcial (o dos productos con el mismo codigo) no puede
 * decidir sola - en esos casos el cajero elige de la grilla filtrada.
 */
export function findByExactCode(products: Product[], code: string): Product | null {
  const wanted = normalize(code)
  if (!wanted) {
    return null
  }

  const matches = products.filter(
    (product) =>
      product.is_active &&
      (normalize(product.sku) === wanted ||
        (product.variants ?? []).some((variant) => variant.is_active && normalize(variant.sku) === wanted)),
  )

  return matches.length === 1 ? matches[0]! : null
}
