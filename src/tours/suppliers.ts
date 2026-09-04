import type { TourDefinition } from '@/types/tour'

export const SUPPLIERS_TOUR: TourDefinition = {
  key: 'suppliers',
  module: 'Proveedores',
  title: 'Tus proveedores',
  description: 'Para qué sirve tenerlos cargados, más allá del dato de contacto.',
  routeName: 'suppliers.index',
  steps: [
    {
      target: '',
      title: 'Quiénes te surten',
      body: 'Acá guardas a quién le compras. No es solo la agenda de teléfonos: es lo que hace que el sistema pueda decirte a quién le compras más y quién te subió los precios.',
    },
    {
      target: '[data-tour="new-supplier"]',
      title: 'Con el nombre alcanza',
      body: 'Lo único obligatorio es el nombre. El teléfono y el NIT los puedes completar después, cuando los necesites para un pedido o una factura.',
      placement: 'bottom',
    },
    {
      target: '',
      title: 'No lo crees dos veces',
      body: 'Si ya existe "Postobón", no crees "Postobon SA" aparte: se te parte el historial en dos y el total que le compraste deja de cuadrar.',
    },
  ],
}
