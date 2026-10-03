import type { Product, ProductOption, ProductOptionGroup } from '@/types/product'
import type { SaleItem } from '@/types/sale'

/** Opcion elegida en una linea del carrito (salsa, topping), con lo necesario para pintarla y mandarla. */
export interface ChosenOption {
  id: number
  group: string
  name: string
  extraPrice: number
}

export function activeOptionGroups(product: Product): ProductOptionGroup[] {
  return (product.option_groups ?? []).filter((g) => g.options.some((o) => o.is_active))
}

export function hasOptionGroups(product: Product): boolean {
  return activeOptionGroups(product).length > 0
}

export function toChosenOption(group: ProductOptionGroup, option: ProductOption): ChosenOption {
  return { id: option.id, group: group.name, name: option.name, extraPrice: Number(option.extra_price) }
}

/** Clave estable de una eleccion: dos lineas del mismo producto solo se fusionan si coincide. */
export function optionsKey(options: ChosenOption[] | undefined): string {
  return (options ?? [])
    .map((o) => o.id)
    .sort((a, b) => a - b)
    .join(',')
}

export function optionsExtraTotal(options: ChosenOption[] | undefined): number {
  return (options ?? []).reduce((sum, o) => sum + o.extraPrice, 0)
}

/** Resuelve ids guardados contra el catalogo actual; null si alguna ya no existe o se desactivo. */
export function resolveChosenOptions(product: Product, ids: number[]): ChosenOption[] | null {
  const chosen: ChosenOption[] = []
  for (const id of ids) {
    let found: ChosenOption | null = null
    for (const group of product.option_groups ?? []) {
      const option = group.options.find((o) => o.id === id && o.is_active)
      if (option) {
        found = toChosenOption(group, option)
        break
      }
    }
    if (!found) {
      return null
    }
    chosen.push(found)
  }
  return chosen
}

/** Recargo total de una linea ya guardada (los extras viajan dentro de unit_price). */
export function savedItemExtra(item: SaleItem): number {
  return (item.options ?? []).reduce((sum, o) => sum + Number(o.extra_price), 0)
}
