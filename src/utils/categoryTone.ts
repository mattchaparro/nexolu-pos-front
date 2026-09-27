/**
 * Tonos de categoria para Vender (y donde se muestre un producto con su
 * categoria). Excepcion acordada al sistema de color (ver README.md
 * "Sistema de color"): el legacy pintaba cada categoria de un color y eso
 * ayudaba a ubicarse en la grilla; al pasarlas todas a indigo se perdio.
 *
 * Los seis tonos salen del degradado del logo de Nexolu (celeste -> azul ->
 * indigo -> violeta), mas fucsia y turquesa para abrir el rango. Quedan
 * fuera a proposito emerald, amber y red: son exito/advertencia/destructivo,
 * y un color de categoria no puede leerse como "stock bajo" o "agotado".
 *
 * Las clases van escritas completas (no armadas con template strings) para
 * que Tailwind las detecte al compilar.
 */
export interface CategoryTone {
  /** Punto del chip de filtro. */
  dot: string
  /** Fondo suave del icono y de la etiqueta. */
  softBg: string
  /** Icono sobre softBg. */
  iconText: string
  /** Texto de la etiqueta sobre softBg (un paso mas oscuro que el icono). */
  labelText: string
}

const CATEGORY_TONES: readonly CategoryTone[] = [
  { dot: 'bg-sky-600', softBg: 'bg-sky-50', iconText: 'text-sky-600', labelText: 'text-sky-700' },
  { dot: 'bg-blue-600', softBg: 'bg-blue-50', iconText: 'text-blue-600', labelText: 'text-blue-700' },
  { dot: 'bg-indigo-600', softBg: 'bg-indigo-50', iconText: 'text-indigo-600', labelText: 'text-indigo-700' },
  { dot: 'bg-violet-600', softBg: 'bg-violet-50', iconText: 'text-violet-600', labelText: 'text-violet-700' },
  { dot: 'bg-fuchsia-600', softBg: 'bg-fuchsia-50', iconText: 'text-fuchsia-600', labelText: 'text-fuchsia-700' },
  { dot: 'bg-teal-600', softBg: 'bg-teal-50', iconText: 'text-teal-700', labelText: 'text-teal-800' },
]

/** Productos sin categoria. */
export const NEUTRAL_CATEGORY_TONE: CategoryTone = {
  dot: 'bg-slate-400',
  softBg: 'bg-slate-100',
  iconText: 'text-slate-500',
  labelText: 'text-slate-600',
}

/**
 * Tono de cada categoria segun su orden de creacion (id) dentro del negocio,
 * no segun el id crudo: los ids son globales entre negocios, asi que con
 * `id % 6` dos categorias del mismo negocio podian caer en el mismo color
 * (le pasaba al legacy). Por orden, las primeras seis nunca se repiten, y
 * una categoria nueva va al final sin mover el color de las existentes.
 */
export function buildCategoryToneMap(categories: readonly { id: number }[]): Map<number, CategoryTone> {
  const ordered = [...categories].sort((a, b) => a.id - b.id)
  return new Map(ordered.map((category, index) => [category.id, CATEGORY_TONES[index % CATEGORY_TONES.length]!]))
}
