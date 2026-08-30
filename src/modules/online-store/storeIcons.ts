import type { IconOption } from '@/packages/block-editor'

/**
 * Catálogo cerrado de íconos para los bloques de la tienda.
 *
 * Se guarda la CLAVE, nunca el emoji: quien pinta la tienda decide con qué
 * glifo se dibuja (ver StoreTrustStrip.vue en nexolu-store-front). Así se
 * puede cambiar de emoji a SVG algún día sin migrar lo que ya guardaron los
 * comerciantes, y no hay forma de que un texto arbitrario del comerciante
 * termine renderizado en una página pública.
 *
 * OJO: este catálogo tiene que mantenerse en sintonía con el mapa de
 * `nexolu-store-front`. Son repos distintos, así que no pueden compartir el
 * archivo. Una clave que exista acá y no allá se dibuja con el check
 * genérico — se degrada, no se rompe.
 */
export const STORE_ICONS: IconOption[] = [
  // Entrega
  { value: 'truck', label: 'Envío', glyph: '🚚', group: 'Entrega' },
  { value: 'store', label: 'Recoger en tienda', glyph: '🏪', group: 'Entrega' },
  { value: 'motorcycle', label: 'Domicilio', glyph: '🛵', group: 'Entrega' },
  { value: 'package', label: 'Paquete', glyph: '📦', group: 'Entrega' },
  { value: 'pin', label: 'Ubicación', glyph: '📍', group: 'Entrega' },
  { value: 'globe', label: 'Todo el país', glyph: '🌎', group: 'Entrega' },

  // Confianza
  { value: 'shield', label: 'Garantía', glyph: '🛡️', group: 'Confianza' },
  { value: 'check', label: 'Verificado', glyph: '✅', group: 'Confianza' },
  { value: 'star', label: 'Calidad', glyph: '⭐', group: 'Confianza' },
  { value: 'medal', label: 'Premiado', glyph: '🏅', group: 'Confianza' },
  { value: 'lock', label: 'Pago seguro', glyph: '🔒', group: 'Confianza' },
  { value: 'refresh', label: 'Cambios', glyph: '🔄', group: 'Confianza' },

  // Pago
  { value: 'card', label: 'Tarjeta', glyph: '💳', group: 'Pago' },
  { value: 'cash', label: 'Efectivo', glyph: '💵', group: 'Pago' },
  { value: 'phone-pay', label: 'Pago por celular', glyph: '📲', group: 'Pago' },
  { value: 'tag', label: 'Descuento', glyph: '🏷️', group: 'Pago' },

  // Atención
  { value: 'clock', label: 'Horario', glyph: '⏱️', group: 'Atención' },
  { value: 'calendar', label: 'Agenda', glyph: '📅', group: 'Atención' },
  { value: 'phone', label: 'Teléfono', glyph: '📱', group: 'Atención' },
  { value: 'chat', label: 'WhatsApp', glyph: '💬', group: 'Atención' },
  { value: 'heart', label: 'Atención personal', glyph: '💚', group: 'Atención' },
  { value: 'people', label: 'Equipo', glyph: '👥', group: 'Atención' },

  // Producto
  { value: 'sparkles', label: 'Novedad', glyph: '✨', group: 'Producto' },
  { value: 'fire', label: 'Lo más vendido', glyph: '🔥', group: 'Producto' },
  { value: 'leaf', label: 'Natural', glyph: '🌿', group: 'Producto' },
  { value: 'recycle', label: 'Sostenible', glyph: '♻️', group: 'Producto' },
  { value: 'gift', label: 'Regalo', glyph: '🎁', group: 'Producto' },
  { value: 'handmade', label: 'Hecho a mano', glyph: '🧵', group: 'Producto' },
  { value: 'coffee', label: 'Café', glyph: '☕', group: 'Producto' },
  { value: 'food', label: 'Comida', glyph: '🍽️', group: 'Producto' },
]
