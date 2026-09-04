import type { TourDefinition } from '@/types/tour'

/**
 * El recorrido de Catálogo. Enseña el orden en que hay que hacer las cosas,
 * que es lo que más se equivoca al empezar: se crean productos sueltos, sin
 * categoría y sin costo, y después los reportes de margen no sirven.
 */
export const CATALOG_TOUR: TourDefinition = {
  key: 'catalog',
  module: 'Catálogo',
  title: 'Cargar tu catálogo',
  description: 'Cómo crear tu primer producto y en qué orden conviene hacerlo.',
  routeName: 'catalog.index',
  steps: [
    {
      target: '',
      title: 'Acá vive lo que vendes',
      body: 'El catálogo es la base de todo: sin productos no puedes vender, ni ver reportes, ni abrir la tienda online. Son 5 pasos y puedes salir cuando quieras.',
    },
    {
      target: '[data-tour="catalog-hub"]',
      title: 'Empieza por las categorías',
      body: 'Antes de cargar productos, crea tus categorías acá (Bebidas, Panadería, lo que uses). Después puedes agrupar, filtrar y ver qué categoría te deja más plata.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="new-product"]',
      title: 'Crear un producto',
      body: 'Con este botón agregas uno. Lo mínimo es nombre y precio de venta; el resto lo puedes completar después.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="new-product"]',
      title: 'No te saltes el costo',
      body: 'Al crearlo, carga también cuánto te cuesta a ti. Es el único dato que no se puede deducir después: sin él, los reportes te muestran toda la venta como ganancia.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="article-tabs"]',
      title: 'Productos e ingredientes',
      body: 'Si preparas lo que vendes, los ingredientes van en la otra pestaña. Se cargan una vez y el stock de tus platos se descuenta solo al vender.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="product-search"]',
      title: 'Encontrar lo que buscas',
      body: 'Con muchos productos, busca por nombre o SKU y filtra por stock bajo, agotados o inactivos. No hace falta recorrer la lista.',
      placement: 'bottom',
    },
  ],
}
