/**
 * Un paso de un recorrido guiado dentro de la app.
 *
 * IMPORTANTE: `target` es un selector CSS de un elemento REAL de la pantalla.
 * Por eso los recorridos viven en código y no en la base de datos: el ancla
 * está atada al componente, y si alguien edita el paso desde un panel y el
 * componente cambia, el recorrido no falla con un error — simplemente deja de
 * apuntar a nada, en silencio, que es el peor modo de romperse.
 */
export interface TourStep {
  /** Elemento al que se ancla. Vacío = paso centrado, sin ancla. */
  target: string
  title: string
  body: string
  /**
   * Preparación necesaria para que el ancla exista (abrir una sección,
   * cambiar de pestaña). Lo interpreta la pantalla dueña del recorrido.
   */
  section?: string
  placement?: 'right' | 'left' | 'bottom' | 'top'
}

/** Un recorrido completo, tal como lo lista el catálogo de ayuda. */
export interface TourDefinition {
  key: string
  /** Nombre del módulo tal como lo ve el usuario ("Catálogo", "Tienda online"). */
  module: string
  title: string
  description: string
  /** Ruta donde corre, para poder enlazarlo desde el catálogo. */
  routeName: string
  steps: TourStep[]
}
