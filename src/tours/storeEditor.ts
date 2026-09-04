import type { TourDefinition } from '@/types/tour'

export const STORE_EDITOR_TOUR: TourDefinition = {
  key: 'store-editor',
  module: 'Tienda online',
  title: 'Armar tu tienda',
  description: 'Dónde está cada cosa del editor y qué se publica cuándo.',
  routeName: 'online-store.index',
  steps: [
    {
      target: '',
      title: 'Esta es tu tienda',
      body: 'En esta pantalla armas la página que van a ver tus clientes. Te muestro dónde está cada cosa — son 6 pasos y puedes salir cuando quieras.',
    },
    {
      target: '[data-tour="rail"]',
      title: 'Todo se edita desde acá',
      body: 'Cada ícono es una parte de tu tienda: lo que se ve, los colores, la letra, tus datos, el envío y cómo apareces en Google.',
      placement: 'right',
    },
    {
      target: '[data-tour="preview"]',
      title: 'Lo que ves es tu tienda de verdad',
      body: 'No es un dibujo aproximado: es tu tienda, actualizándose mientras editas. Toca cualquier parte para editar justo eso.',
      placement: 'left',
    },
    {
      target: '[data-tour="section-plantillas"]',
      title: 'Empieza por una plantilla',
      body: 'Es el camino más rápido: eliges una y tu tienda queda armada. Después cambias lo que quieras.',
      section: 'plantillas',
      placement: 'right',
    },
    {
      target: '[data-tour="checklist"]',
      title: 'Qué te falta para abrir',
      body: 'Acá ves lo que le falta a tu tienda. Toca cualquier punto pendiente y te llevo al lugar donde se arregla.',
      placement: 'left',
    },
    {
      target: '[data-tour="save"]',
      title: 'Nada se publica hasta que guardes',
      body: 'Puedes probar con confianza: mientras no toques Guardar, tus clientes siguen viendo la tienda como estaba.',
      placement: 'bottom',
    },
  ],
}
