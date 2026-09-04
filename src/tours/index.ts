import type { TourDefinition } from '@/types/tour'

import { CATALOG_TOUR } from './catalog'
import { PURCHASES_TOUR } from './purchases'
import { SELL_TOUR } from './sell'
import { STORE_EDITOR_TOUR } from './storeEditor'
import { SUPPLIERS_TOUR } from './suppliers'

/**
 * Catálogo de recorridos guiados de la app.
 *
 * Es la fuente única: la pantalla que los lista en el panel de SuperAdmin lee
 * de acá, así que no puede quedar desactualizada respecto de lo que el
 * comerciante realmente ve — que es justo lo que le pasó a las guías de ayuda
 * escritas a mano en la base de datos.
 *
 * Agregar un recorrido nuevo es: definirlo en su archivo, sumarlo a esta
 * lista, y llamar a useGuidedTour() desde su pantalla con las anclas
 * `data-tour` puestas en el marcado.
 */
// El orden es el del recorrido de un negocio nuevo: primero carga lo que
// vende, después a quién se lo compra, después vende, y al final publica.
export const TOURS: TourDefinition[] = [
  CATALOG_TOUR,
  SUPPLIERS_TOUR,
  PURCHASES_TOUR,
  SELL_TOUR,
  STORE_EDITOR_TOUR,
]

export { CATALOG_TOUR, PURCHASES_TOUR, SELL_TOUR, STORE_EDITOR_TOUR, SUPPLIERS_TOUR }
