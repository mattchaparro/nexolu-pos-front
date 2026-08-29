import type { ProductAttribute } from '@/types/product'

/**
 * Identidad estable de una variante por su combinacion de valores de
 * atributo, independiente del orden en que se hayan elegido.
 *
 * Es la unica forma de referirse a una variante que TODAVIA no existe: en el
 * formulario de un producto nuevo las variantes van anidadas y sin id, asi
 * que para colgarles algo (hoy, una foto) hace falta una clave que sobreviva
 * al viaje de ida y vuelta al backend. Al crear el producto, la respuesta
 * trae las variantes ya con id y sus attribute_values, y esta misma funcion
 * las vuelve a mapear - ver ProductFormView.vue.
 */
export function variantComboKey(ids: number[]): string {
  return [...ids].sort((a, b) => a - b).join(',')
}

/** Etiqueta legible de una combinacion, del estilo "S / Rojo". */
export function variantComboLabel(ids: number[], attributes: ProductAttribute[]): string {
  return ids
    .map((id) => attributes.flatMap((attribute) => attribute.values).find((value) => value.id === id)?.value)
    .filter((value): value is string => Boolean(value))
    .join(' / ')
}
