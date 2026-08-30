import type { BlockDefinition, FieldDefinition } from '@/packages/block-editor'

import { STORE_ICONS } from './storeIcons'

/**
 * Presentación: cómo se COLOCA el bloque, no qué dice.
 *
 * Se agrega a TODOS los tipos al final (ver `conPresentacion` abajo) en vez
 * de repetirla en cada definición. Son las opciones que más cambian el
 * aspecto de una tienda, y a propósito son catálogos cerrados: un comerciante
 * eligiendo píxeles de espaciado produce una página inconsistente.
 *
 * Debe coincidir con `StoreHomeBlocks::presentationRules()` de la API.
 */
const PRESENTATION_FIELDS: FieldDefinition[] = [
  {
    key: 'width',
    label: 'Ancho',
    kind: 'select',
    options: [
      { value: 'contained', label: 'Angosto — para leer' },
      { value: 'wide', label: 'Normal' },
      { value: 'full', label: 'De borde a borde' },
    ],
  },
  {
    key: 'spacing',
    label: 'Aire alrededor',
    kind: 'select',
    options: [
      { value: 'compact', label: 'Poco' },
      { value: 'normal', label: 'Normal' },
      { value: 'spacious', label: 'Mucho' },
    ],
    help: 'Más aire se ve más caro. Menos aire mete más cosas en pantalla.',
  },
]

/** Solo para los bloques que muestran una imagen. */
const IMAGE_RATIO_FIELD: FieldDefinition = {
  key: 'image_ratio',
  label: 'Forma de la imagen',
  kind: 'select',
  options: [
    { value: 'auto', label: 'Como la subiste' },
    { value: 'square', label: 'Cuadrada' },
    { value: 'landscape', label: 'Panorámica' },
    { value: 'portrait', label: 'Vertical' },
  ],
  help: 'Recortar todas igual es lo que hace que una galería se vea ordenada.',
}

const BLOCKS_WITH_IMAGE = ['hero', 'story', 'text_image', 'gallery']

/** Agrega la presentación al final de cada bloque, sin repetirla arriba. */
function conPresentacion(blocks: BlockDefinition[]): BlockDefinition[] {
  return blocks.map((block) => ({
    ...block,
    fields: [
      ...block.fields,
      ...PRESENTATION_FIELDS,
      ...(BLOCKS_WITH_IMAGE.includes(block.type) ? [IMAGE_RATIO_FIELD] : []),
    ],
  }))
}

/**
 * El catálogo de bloques de la tienda online, en el vocabulario del
 * comerciante.
 *
 * Debe coincidir con `App\Support\StoreHomeBlocks` de la API: allá viven
 * las reglas de validación y los topes reales. Si algo se desincroniza, el
 * servidor rechaza y el comerciante ve el error — pero conviene revisarlos
 * juntos.
 *
 * Esto es lo ESPECÍFICO de Nexolú. El editor que lo consume
 * (`@/packages/block-editor`) no sabe nada de tiendas.
 */
const BASE_CATALOG: BlockDefinition[] = [
  {
    type: 'hero',
    label: 'Portada',
    description: 'Lo primero que ve quien entra.',
    icon: '🎬',
    // Uno solo: dos portadas seguidas no es personalización, es una página
    // rota. La API lo rechaza igual.
    max: 1,
    fields: [
      {
        key: 'eyebrow',
        label: 'Antetítulo',
        kind: 'text',
        maxLength: 80,
        placeholder: 'TUESTE DE LA SEMANA',
      },
      { key: 'title', label: 'Titular', kind: 'text', maxLength: 120 },
      {
        key: 'highlight',
        label: 'Parte a resaltar',
        kind: 'text',
        maxLength: 60,
        help: 'Debe ser un trozo exacto del titular. Se pinta con color.',
      },
      { key: 'subtitle', label: 'Bajada', kind: 'textarea', maxLength: 300 },
      { key: 'cta_label', label: 'Texto del botón', kind: 'text', maxLength: 40 },
      { key: 'image_id', label: 'Imagen', kind: 'image' },
    ],
  },
  {
    type: 'trust',
    label: 'Franja de confianza',
    description: 'Envíos, garantías, lo que tranquiliza antes de comprar.',
    icon: '✅',
    max: 1,
    fields: [
      {
        key: 'items',
        label: 'Puntos',
        kind: 'list',
        max: 4,
        addLabel: 'Agregar punto',
        itemFields: [
          { key: 'icon', label: 'Ícono', kind: 'icon', icons: STORE_ICONS },
          { key: 'title', label: 'Título', kind: 'text', maxLength: 60 },
          { key: 'text', label: 'Detalle', kind: 'text', maxLength: 120 },
        ],
      },
    ],
  },
  {
    type: 'story',
    label: 'Nuestra historia',
    description: 'Quién está detrás del negocio.',
    icon: '📖',
    fields: [
      { key: 'eyebrow', label: 'Antetítulo', kind: 'text', maxLength: 80 },
      { key: 'title', label: 'Título', kind: 'text', maxLength: 120 },
      { key: 'body', label: 'Texto', kind: 'textarea', maxLength: 1200 },
      { key: 'image_id', label: 'Imagen', kind: 'image' },
      {
        key: 'stats',
        label: 'Cifras',
        kind: 'list',
        max: 4,
        addLabel: 'Agregar cifra',
        itemFields: [
          { key: 'value', label: 'Número', kind: 'text', maxLength: 20, placeholder: '12' },
          {
            key: 'label',
            label: 'Qué es',
            kind: 'text',
            maxLength: 40,
            placeholder: 'años tostando',
          },
        ],
      },
    ],
  },
  {
    type: 'featured_products',
    label: 'Productos destacados',
    description: 'Los que quieres que vean primero.',
    icon: '⭐',
    fields: [
      { key: 'title', label: 'Título', kind: 'text', maxLength: 120, placeholder: 'Lo más pedido' },
      {
        key: 'product_ids',
        label: 'Productos',
        kind: 'entities',
        max: 8,
        help: 'Si no eliges ninguno, mostramos los primeros de tu catálogo.',
      },
    ],
  },
  {
    type: 'text_image',
    label: 'Texto con imagen',
    description: 'Una sección libre. Puedes repetirla las veces que quieras.',
    icon: '🖼️',
    defaults: { image_side: 'left' },
    fields: [
      { key: 'title', label: 'Título', kind: 'text', maxLength: 120 },
      { key: 'body', label: 'Texto', kind: 'textarea', maxLength: 1200 },
      { key: 'image_id', label: 'Imagen', kind: 'image' },
      {
        key: 'image_side',
        label: 'Lado de la imagen',
        kind: 'select',
        options: [
          { value: 'left', label: 'Izquierda' },
          { value: 'right', label: 'Derecha' },
        ],
        help: 'En celular la imagen va arriba siempre.',
      },
      { key: 'cta_label', label: 'Texto del botón', kind: 'text', maxLength: 40 },
      { key: 'cta_url', label: 'Enlace del botón', kind: 'url', maxLength: 255 },
    ],
  },
  {
    type: 'gallery',
    label: 'Galería',
    description: 'Fotos de tu local, tu equipo o tus productos.',
    icon: '📷',
    fields: [
      { key: 'title', label: 'Título', kind: 'text', maxLength: 120 },
      { key: 'image_ids', label: 'Imágenes', kind: 'images', max: 12 },
    ],
  },
  {
    type: 'testimonials',
    label: 'Testimonios',
    description: 'Lo que dicen tus clientes.',
    icon: '💬',
    fields: [
      { key: 'title', label: 'Título', kind: 'text', maxLength: 120 },
      {
        key: 'items',
        label: 'Testimonios',
        kind: 'list',
        max: 6,
        addLabel: 'Agregar testimonio',
        itemFields: [
          { key: 'quote', label: 'Qué dijo', kind: 'textarea', maxLength: 300 },
          { key: 'author', label: 'Quién', kind: 'text', maxLength: 60 },
          {
            key: 'role',
            label: 'Detalle',
            kind: 'text',
            maxLength: 60,
            placeholder: 'Cliente desde 2024',
          },
        ],
      },
    ],
  },
  {
    type: 'faq',
    label: 'Preguntas frecuentes',
    description: 'Responde antes de que pregunten por WhatsApp.',
    icon: '❓',
    fields: [
      { key: 'title', label: 'Título', kind: 'text', maxLength: 120 },
      {
        key: 'items',
        label: 'Preguntas',
        kind: 'list',
        max: 10,
        addLabel: 'Agregar pregunta',
        itemFields: [
          { key: 'question', label: 'Pregunta', kind: 'text', maxLength: 160 },
          { key: 'answer', label: 'Respuesta', kind: 'textarea', maxLength: 600 },
        ],
      },
    ],
  },
  {
    type: 'hours',
    label: 'Dónde y cuándo',
    description: 'Dirección y horario de atención.',
    icon: '📍',
    max: 1,
    fields: [
      { key: 'title', label: 'Título', kind: 'text', maxLength: 120, placeholder: 'Visítanos' },
      { key: 'address', label: 'Dirección', kind: 'text', maxLength: 200 },
      { key: 'hours', label: 'Horario', kind: 'textarea', maxLength: 200 },
      {
        key: 'map_url',
        label: 'Enlace al mapa',
        kind: 'url',
        maxLength: 500,
        help: 'Pega el enlace de Google Maps. Se muestra como botón "Cómo llegar".',
      },
    ],
  },
  {
    type: 'bento',
    label: 'Mosaico de fotos',
    description: 'Una retícula donde la primera foto manda. Se ve moderna sin esfuerzo.',
    icon: '🧩',
    fields: [
      { key: 'title', label: 'Título', kind: 'text', maxLength: 120 },
      {
        key: 'items',
        label: 'Fotos',
        kind: 'list',
        max: 5,
        addLabel: 'Agregar foto',
        itemFields: [
          { key: 'image_id', label: 'Foto', kind: 'image' },
          { key: 'title', label: 'Texto encima', kind: 'text', maxLength: 60 },
          { key: 'text', label: 'Detalle', kind: 'text', maxLength: 120 },
          { key: 'url', label: 'Enlace', kind: 'url', maxLength: 255 },
        ],
      },
    ],
  },
  {
    type: 'marquee',
    label: 'Cinta en movimiento',
    description: 'Una tira con tus mensajes cortos: envío gratis, medios de pago…',
    icon: '📢',
    max: 2,
    defaults: { speed: 'normal' },
    fields: [
      {
        key: 'items',
        label: 'Mensajes',
        kind: 'list',
        max: 6,
        addLabel: 'Agregar mensaje',
        itemFields: [
          {
            key: 'text',
            label: 'Mensaje',
            kind: 'text',
            maxLength: 80,
            placeholder: 'Envío gratis desde $80.000',
          },
        ],
      },
      {
        key: 'speed',
        label: 'Velocidad',
        kind: 'select',
        options: [
          { value: 'slow', label: 'Lenta' },
          { value: 'normal', label: 'Normal' },
          { value: 'fast', label: 'Rápida' },
        ],
      },
    ],
  },
  {
    type: 'categories',
    label: 'Categorías',
    description: 'Atajos para que encuentren lo que buscan sin recorrer todo.',
    icon: '🗂️',
    fields: [
      { key: 'title', label: 'Título', kind: 'text', maxLength: 120, placeholder: 'Explora' },
      {
        key: 'category_ids',
        label: 'Categorías',
        kind: 'entities',
        entityKind: 'category',
        max: 8,
        help: 'Si no eliges ninguna, mostramos las principales de tu catálogo.',
      },
    ],
  },
  {
    type: 'before_after',
    label: 'Antes y después',
    description: 'Dos fotos con un deslizador. Ideal para servicios y transformaciones.',
    icon: '🪞',
    fields: [
      { key: 'title', label: 'Título', kind: 'text', maxLength: 120 },
      { key: 'before_image_id', label: 'Foto "antes"', kind: 'image' },
      { key: 'after_image_id', label: 'Foto "después"', kind: 'image' },
      { key: 'before_label', label: 'Etiqueta izquierda', kind: 'text', maxLength: 30 },
      { key: 'after_label', label: 'Etiqueta derecha', kind: 'text', maxLength: 30 },
    ],
  },
  {
    type: 'cta',
    label: 'Llamado a la acción',
    description: 'Un cierre con un botón bien visible.',
    icon: '📣',
    fields: [
      { key: 'title', label: 'Título', kind: 'text', maxLength: 120 },
      { key: 'subtitle', label: 'Bajada', kind: 'text', maxLength: 200 },
      { key: 'cta_label', label: 'Texto del botón', kind: 'text', maxLength: 40 },
      { key: 'cta_url', label: 'Enlace del botón', kind: 'url', maxLength: 255 },
    ],
  },
]

export const HOME_BLOCK_CATALOG: BlockDefinition[] = conPresentacion(BASE_CATALOG)
