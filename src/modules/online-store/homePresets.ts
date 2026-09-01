import type { Block, FieldDefinition } from '@/packages/block-editor'

import { HOME_BLOCK_CATALOG } from './homeBlockCatalog'

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
 *
 * ## Dos cosas que hay que respetar al editarlas
 *
 * **Nada de datos del negocio quemados.** Antes decían "Envío a todo el
 * país" y "Llega en 2 a 5 días hábiles": un negocio que solo reparte en su
 * barrio quedaba prometiendo cobertura nacional hasta que se acordara de
 * editar cada bloque a mano. Esos datos se citan con tokens — `{envio}`,
 * `{entrega}`, `{tienda}`, `{minimo}` — y salen de la configuración de la
 * tienda, donde ya vive el costo del envío. Se edita una vez y cambia en
 * toda la página (ver `useStoreTokens` en nexolu-store-front).
 *
 * **Los bloques de imagen van vacíos.** Bento, galería y antes/después se
 * incluyen sin fotos: en el editor aparecen como un espacio listo para
 * llenar, y en la página pública se ocultan solos mientras no tengan
 * contenido. Sembrarlos con fotos de archivo sería mentirle al comprador
 * sobre lo que vende el negocio.
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
      { type: 'announcement', text: '{envio} · Pide por WhatsApp', tone: 'primary' },
      {
        type: 'hero',
        eyebrow: 'RECIÉN HECHO',
        title: 'Sabor de siempre, cerca de ti',
        highlight: 'cerca de ti',
        subtitle: 'Preparamos todo el día, con ingredientes frescos del mercado.',
        cta_label: 'Ver la carta',
        width: 'full',
        spacing: 'spacious',
        image_ratio: 'landscape',
      },
      {
        type: 'trust',
        items: [
          { icon: 'truck', title: 'Domicilio', text: '{envio}' },
          { icon: 'store', title: 'Para recoger', text: 'Pide y pasa cuando quieras.' },
          { icon: 'calendar', title: 'Todos los días', text: 'Abierto de martes a domingo.' },
        ],
        spacing: 'compact',
      },
      { type: 'categories', title: 'Nuestra carta', spacing: 'normal' },
      { type: 'featured_products', title: 'Lo más pedido', spacing: 'normal' },
      // Vacío a propósito: es el espacio para las fotos del plato, que solo
      // el negocio tiene. Se oculta solo mientras no las suba.
      { type: 'bento', title: 'Así se ve', width: 'wide', spacing: 'normal' },
      {
        type: 'text_image',
        title: 'Nuestra cocina',
        body: 'Cuenta aquí la historia del negocio: quién cocina, desde cuándo, qué lo hace distinto.',
        image_side: 'left',
        width: 'contained',
        spacing: 'spacious',
        image_ratio: 'square',
      },
      {
        type: 'hours',
        title: 'Visítanos',
        address: 'Tu dirección',
        hours: 'Mar-Dom, 8:00-19:00',
        spacing: 'normal',
      },
      {
        type: 'cta',
        title: '¿Antojado?',
        subtitle: 'Escríbenos y te ayudamos con tu pedido.',
        cta_label: 'Escribir por WhatsApp',
        width: 'wide',
        spacing: 'spacious',
      },
    ],
  },
  {
    id: 'retail',
    label: 'Tienda de productos',
    description: 'Vitrina con mosaico, destacados y opiniones de clientes.',
    icon: '🛍️',
    theme: { primary: '#4f46e5', surface: '#ffffff', accent: '#0ea5e9', font: 'moderna' },
    blocks: [
      { type: 'announcement', text: '{envio}', tone: 'dark' },
      {
        type: 'hero',
        eyebrow: 'NUEVA COLECCIÓN',
        title: 'Encuentra lo que buscas, sin salir de casa',
        highlight: 'sin salir de casa',
        subtitle: 'Cambios sin complicaciones y atención por WhatsApp.',
        cta_label: 'Ver catálogo',
        width: 'full',
        spacing: 'spacious',
        image_ratio: 'landscape',
      },
      {
        type: 'marquee',
        items: [
          { text: '{envio}' },
          { text: 'Pago seguro en línea' },
          { text: 'Cambios hasta 8 días' },
        ],
        speed: 'normal',
      },
      { type: 'categories', title: 'Explora', spacing: 'normal' },
      { type: 'featured_products', title: 'Destacados de la semana', spacing: 'normal' },
      { type: 'bento', title: 'Así se ven', width: 'wide', spacing: 'normal' },
      {
        type: 'trust',
        items: [
          { icon: 'truck', title: 'Envíos', text: '{envio}' },
          { icon: 'shield', title: 'Cambios fáciles', text: 'Tienes 8 días para cambiarlo.' },
          { icon: 'store', title: 'Recoge en tienda', text: 'Sin costo de envío.' },
        ],
        spacing: 'compact',
      },
      {
        type: 'testimonials',
        title: 'Lo que dicen quienes ya compraron',
        items: [
          { quote: 'Llegó rápido y tal cual la foto.', author: 'Escribe aquí un cliente real' },
        ],
        width: 'contained',
        spacing: 'spacious',
      },
      {
        type: 'faq',
        title: 'Antes de comprar',
        items: [
          { question: '¿Cuánto cuesta el envío?', answer: '{envio}' },
          { question: '¿Cuánto se demora en llegar?', answer: '{entrega}' },
        ],
        width: 'contained',
        spacing: 'normal',
      },
      {
        type: 'cta',
        title: '¿Dudas antes de comprar?',
        subtitle: 'Escríbenos y te asesoramos.',
        cta_label: 'Escribir por WhatsApp',
        width: 'wide',
        spacing: 'spacious',
      },
    ],
  },
  {
    id: 'servicios',
    label: 'Servicios o belleza',
    description: 'Qué haces, el antes y después, y por qué confiar en ti.',
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
        width: 'full',
        spacing: 'spacious',
        image_ratio: 'landscape',
      },
      {
        type: 'trust',
        items: [
          { icon: 'calendar', title: 'Con cita previa', text: 'Sin esperas ni filas.' },
          { icon: 'shield', title: 'Productos de marca', text: 'Cuidamos lo que usamos.' },
          { icon: 'store', title: 'Espacio propio', text: 'Cómodo y tranquilo.' },
        ],
        spacing: 'compact',
      },
      // El bloque que mejor vende un servicio: el resultado. Va vacío hasta
      // que suba las dos fotos, y hasta entonces no se muestra.
      {
        type: 'before_after',
        title: 'El resultado',
        before_label: 'Antes',
        after_label: 'Después',
        width: 'contained',
        spacing: 'spacious',
      },
      {
        type: 'text_image',
        title: 'Quiénes somos',
        body: 'Presenta a tu equipo: cuántos años de experiencia, qué los caracteriza.',
        image_side: 'right',
        width: 'contained',
        spacing: 'normal',
        image_ratio: 'portrait',
      },
      { type: 'featured_products', title: 'Nuestros servicios', spacing: 'normal' },
      {
        type: 'testimonials',
        title: 'Nuestras clientas',
        items: [{ quote: 'Salí feliz con el resultado.', author: 'Escribe aquí una clienta real' }],
        width: 'contained',
        spacing: 'spacious',
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
        width: 'contained',
        spacing: 'normal',
      },
      {
        type: 'hours',
        title: 'Dónde estamos',
        address: 'Tu dirección',
        hours: 'Lun-Sáb, 9:00-18:00',
        spacing: 'normal',
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
        title: 'Bienvenido a {tienda}',
        subtitle: 'Mira lo que tenemos disponible.',
        cta_label: 'Ver productos',
        width: 'wide',
        spacing: 'spacious',
      },
      { type: 'categories', title: 'Explora', spacing: 'normal' },
      { type: 'featured_products', title: 'Nuestros productos', spacing: 'normal' },
      {
        type: 'hours',
        title: 'Dónde encontrarnos',
        address: 'Tu dirección',
        hours: 'Tu horario',
        spacing: 'normal',
      },
    ],
  },
]

/**
 * Instancia una plantilla. Cada bloque necesita su propio `id`: es la llave
 * con la que el editor reordena y con la que Vue no reusa el DOM del bloque
 * equivocado.
 */
export function instantiate(preset: HomePreset): Block[] {
  return preset.blocks
    .filter((block) => conocido(String(block.type), preset.id))
    .map((block, index): Block => {
      const permitidas = clavesDe(String(block.type))

      return {
        ...limpiar(block, permitidas, preset.id, String(block.type)),
        // El tipo viene de la definición y siempre está; el `Omit<Block,'id'>`
        // lo pierde de vista porque `type` es index-signature ahí.
        type: String(block.type),
        id: `blk_${preset.id}_${index}_${Math.random().toString(36).slice(2, 8)}`,
        enabled: true,
      }
    })
}

/**
 * Las plantillas se validan contra el catálogo REAL del editor.
 *
 * Son datos escritos a mano en otro archivo: cuando se renombra un campo o
 * se retira un tipo de bloque, nada obliga a actualizarlas. Antes de esto,
 * una plantilla desactualizada se aplicaba igual y fallaba después, al
 * guardar, con un 422 del backend sobre un bloque que el comerciante nunca
 * tocó — o peor, el campo se perdía en silencio en el `prune()` de la API y
 * el bloque quedaba a medio llenar.
 *
 * Aquí se descarta lo que el catálogo no conoce y se avisa fuerte en
 * desarrollo, que es cuando se puede arreglar.
 */
function avisar(mensaje: string): void {
  if (import.meta.env.DEV) {
    console.error(`[homePresets] ${mensaje}`)
  }
}

function conocido(type: string, presetId: string): boolean {
  const existe = HOME_BLOCK_CATALOG.some((definicion) => definicion.type === type)
  if (!existe) {
    avisar(`La plantilla "${presetId}" usa el bloque "${type}", que ya no existe en el catálogo.`)
  }

  return existe
}

/** Las claves que acepta un tipo de bloque, incluidas las de presentación. */
function clavesDe(type: string): Set<string> {
  const definicion = HOME_BLOCK_CATALOG.find((item) => item.type === type)

  return new Set([
    'type',
    'enabled',
    ...(definicion?.fields ?? []).map((f: FieldDefinition) => f.key),
  ])
}

function limpiar(
  block: Omit<Block, 'id'>,
  permitidas: Set<string>,
  presetId: string,
  type: string,
): Omit<Block, 'id'> {
  return Object.fromEntries(
    Object.entries(block).filter(([clave]) => {
      if (permitidas.has(clave)) return true
      avisar(`La plantilla "${presetId}" define "${clave}" en el bloque "${type}", que no existe.`)

      return false
    }),
  ) as Omit<Block, 'id'>
}
