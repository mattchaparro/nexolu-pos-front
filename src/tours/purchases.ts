import type { TourDefinition } from '@/types/tour'

/**
 * Compras. El orden importa: el proveedor primero, porque una compra sin
 * proveedor no se puede reasignar después y deja el historial partido.
 */
export const PURCHASES_TOUR: TourDefinition = {
  key: 'purchases',
  module: 'Compras',
  title: 'Registrar tus compras',
  description: 'Cómo cargar una compra y por qué conviene hacerlo aunque ya tengas la mercancía.',
  routeName: 'purchases.index',
  steps: [
    {
      target: '',
      title: 'Acá registras lo que le compras a tus proveedores',
      body: 'Cargar la compra hace tres cosas de una: te suma el stock, te actualiza el costo del producto y te deja el historial para reclamar si te suben el precio.',
    },
    {
      target: '[data-tour="catalog-hub"]',
      title: 'Primero tus proveedores',
      body: 'Créalos en la pestaña Proveedores antes de registrar compras. Una compra sin proveedor no se puede reasignar después y te parte el historial de a quién le compras.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="new-purchase"]',
      title: 'Registrar una compra',
      body: 'Eliges el proveedor, agregas los productos con la cantidad y lo que pagaste en total por cada línea. El costo unitario lo calcula solo.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="new-purchase"]',
      title: 'Si la compra quedó a crédito, márcala',
      body: 'Por defecto la compra se registra como pagada. Si le quedaste debiendo, márcala como crédito: así aparece en Cuentas por pagar y no se te olvida.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="purchase-dates"]',
      title: 'Buscar una compra vieja',
      body: 'Filtra por fechas para encontrar cuánto pagaste la última vez. Es la forma rápida de saber si un proveedor te subió el precio.',
      placement: 'bottom',
    },
  ],
}
