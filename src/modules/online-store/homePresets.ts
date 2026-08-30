import type { Block } from '@/packages/block-editor'

/**
 * Plantillas de inicio: una página armada según el rubro, para que el
 * comerciante empiece con algo que ya se ve bien en vez de con una hoja en
 * blanco.
 *
 * Los textos son de relleno a propósito: se espera que los edite. Lo que
 * aporta la plantilla es la ESTRUCTURA — qué bloques y en qué orden — que
 * es justo la decisión que un tendero no tiene por qué saber tomar.
 *
 * Vive en el frontend y no en la API porque es copy y disposición, no
 * reglas: cambiar una plantilla no debería requerir tocar el backend.
 */
export interface HomePreset {
  id: string
  label: string
  description: string
  icon: string
  /** Semillas del tema, para que la plantilla se vea coherente de una. */
  theme: { primary: string; surface: string; accent: string; font: string }
  blocks: Omit<Block, 'id'>[]
}

export const HOME_PRESETS: HomePreset[] = [
  {
    id: 'cafeteria',
    label: 'Cafetería o restaurante',
    description: 'Portada apetitosa, lo más pedido y dónde encontrarte.',
    icon: '☕',
    theme: { primary: '#5f7d34', surface: '#fdfaf4', accent: '#c2410c', font: 'calida' },
    blocks: [
      {
        type: 'hero',
        eyebrow: 'RECIÉN HECHO',
        title: 'Sabor de siempre, cerca de ti',
        highlight: 'cerca de ti',
        subtitle: 'Preparamos todo el día, con ingredientes frescos del mercado.',
        cta_label: 'Ver la carta',
      },
      {
        type: 'trust',
        items: [
          { icon: 'truck', title: 'Domicilio', text: 'Te lo llevamos calientito.' },
          { icon: 'store', title: 'Para recoger', text: 'Pide y pasa cuando quieras.' },
          { icon: 'calendar', title: 'Todos los días', text: 'Abierto de martes a domingo.' },
        ],
      },
      { type: 'featured_products', title: 'Lo más pedido' },
      {
        type: 'text_image',
        title: 'Nuestra cocina',
        body: 'Cuenta aquí la historia del negocio: quién cocina, desde cuándo, qué lo hace distinto.',
        image_side: 'left',
      },
      { type: 'hours', title: 'Visítanos', address: 'Tu dirección', hours: 'Mar-Dom, 8:00-19:00' },
      {
        type: 'cta',
        title: '¿Antojado?',
        subtitle: 'Escríbenos y te ayudamos con tu pedido.',
        cta_label: 'Escribir por WhatsApp',
      },
    ],
  },
  {
    id: 'retail',
    label: 'Tienda de productos',
    description: 'Vitrina con galería, destacados y opiniones de clientes.',
    icon: '🛍️',
    theme: { primary: '#4f46e5', surface: '#ffffff', accent: '#0ea5e9', font: 'moderna' },
    blocks: [
      {
        type: 'hero',
        eyebrow: 'NUEVA COLECCIÓN',
        title: 'Encuentra lo que buscas, sin salir de casa',
        highlight: 'sin salir de casa',
        subtitle: 'Envíos a todo el país y cambios sin complicaciones.',
        cta_label: 'Ver catálogo',
      },
      {
        type: 'trust',
        items: [
          { icon: 'truck', title: 'Envío a todo el país', text: 'Llega en 2 a 5 días hábiles.' },
          { icon: 'shield', title: 'Cambios fáciles', text: 'Tienes 8 días para cambiarlo.' },
          { icon: 'store', title: 'Recoge en tienda', text: 'Sin costo de envío.' },
        ],
      },
      { type: 'featured_products', title: 'Destacados de la semana' },
      { type: 'gallery', title: 'Así se ven' },
      {
        type: 'testimonials',
        title: 'Lo que dicen quienes ya compraron',
        items: [
          { quote: 'Llegó rápido y tal cual la foto.', author: 'Escribe aquí un cliente real' },
        ],
      },
      {
        type: 'cta',
        title: '¿Dudas antes de comprar?',
        subtitle: 'Escríbenos y te asesoramos.',
        cta_label: 'Escribir por WhatsApp',
      },
    ],
  },
  {
    id: 'servicios',
    label: 'Servicios o belleza',
    description: 'Qué haces, quién lo hace y por qué confiar en ti.',
    icon: '💇',
    theme: { primary: '#9d174d', surface: '#fffafc', accent: '#7c3aed', font: 'editorial' },
    blocks: [
      {
        type: 'hero',
        eyebrow: 'AGENDA TU CITA',
        title: 'Te atendemos como te mereces',
        highlight: 'como te mereces',
        subtitle: 'Profesionales con experiencia y productos de primera.',
        cta_label: 'Ver servicios',
      },
      {
        type: 'trust',
        items: [
          { icon: 'calendar', title: 'Con cita previa', text: 'Sin esperas ni filas.' },
          { icon: 'shield', title: 'Productos de marca', text: 'Cuidamos lo que usamos.' },
          { icon: 'store', title: 'Espacio propio', text: 'Cómodo y tranquilo.' },
        ],
      },
      {
        type: 'text_image',
        title: 'Quiénes somos',
        body: 'Presenta a tu equipo: cuántos años de experiencia, qué los caracteriza.',
        image_side: 'right',
      },
      { type: 'featured_products', title: 'Nuestros servicios' },
      {
        type: 'testimonials',
        title: 'Nuestras clientas',
        items: [{ quote: 'Salí feliz con el resultado.', author: 'Escribe aquí una clienta real' }],
      },
      {
        type: 'faq',
        title: 'Preguntas frecuentes',
        items: [
          {
            question: '¿Necesito cita?',
            answer: 'Recomendamos agendar, pero atendemos sin cita según disponibilidad.',
          },
        ],
      },
      {
        type: 'hours',
        title: 'Dónde estamos',
        address: 'Tu dirección',
        hours: 'Lun-Sáb, 9:00-18:00',
      },
    ],
  },
  {
    id: 'simple',
    label: 'Lo básico',
    description: 'Portada, tus productos y cómo contactarte. Nada más.',
    icon: '✨',
    theme: { primary: '#0f172a', surface: '#ffffff', accent: '#4f46e5', font: 'moderna' },
    blocks: [
      {
        type: 'hero',
        title: 'Bienvenido a nuestra tienda',
        subtitle: 'Mira lo que tenemos disponible.',
        cta_label: 'Ver productos',
      },
      { type: 'featured_products', title: 'Nuestros productos' },
      { type: 'hours', title: 'Dónde encontrarnos', address: 'Tu dirección', hours: 'Tu horario' },
    ],
  },
]

/**
 * Instancia una plantilla. Cada bloque necesita su propio `id`: es la llave
 * con la que el editor reordena y con la que Vue no reusa el DOM del bloque
 * equivocado.
 */
export function instantiate(preset: HomePreset): Block[] {
  return preset.blocks.map((block, index): Block => ({
    ...block,
    // El tipo viene de la definición y siempre está; el `Omit<Block,'id'>`
    // lo pierde de vista porque `type` es index-signature ahí.
    type: String(block.type),
    id: `blk_${preset.id}_${index}_${Math.random().toString(36).slice(2, 8)}`,
    enabled: true,
  }))
}
