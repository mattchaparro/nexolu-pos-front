import type { TourDefinition } from '@/types/tour'

/**
 * Vender. Es la pantalla que más se usa y la que más gente distinta toca
 * (el dueño la configura, el cajero la usa ocho horas), así que el recorrido
 * apunta a lo operativo, no a la configuración.
 */
export const SELL_TOUR: TourDefinition = {
  key: 'sell',
  module: 'Vender',
  title: 'Registrar una venta',
  description: 'El flujo de cobro y cuándo conviene abrir una cuenta en vez de cobrar de una.',
  routeName: 'sales.create',
  steps: [
    {
      target: '',
      title: 'Esta es tu caja',
      body: 'Acá registras lo que vendes. Son 5 pasos y puedes salir cuando quieras.',
    },
    {
      target: '[data-tour="product-grid"]',
      title: 'Toca lo que te piden',
      body: 'Cada toque agrega una unidad al carrito. Filtra por categoría o busca por nombre cuando tengas muchos productos.',
      placement: 'right',
    },
    {
      target: '[data-tour="cart"]',
      title: 'Revisa antes de cobrar',
      body: 'Acá ves lo que llevas, cambias cantidades y aplicas descuentos. El total se actualiza solo.',
      placement: 'left',
    },
    {
      target: '[data-tour="cart"]',
      title: 'Cobrar',
      body: 'Al cobrar eliges el medio de pago, y puedes dividirlo entre varios (una parte en efectivo y otra por transferencia). Si es fiado, queda registrado a nombre del cliente.',
      placement: 'left',
    },
    {
      target: '[data-tour="tab-switcher"]',
      title: 'Cuando no cobras de una',
      body: 'Si el cliente va a seguir pidiendo, abre una cuenta o una mesa en vez de cobrar. Le vas agregando y cobras todo junto al final.',
      placement: 'bottom',
    },
  ],
}
