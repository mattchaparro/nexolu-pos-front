/**
 * Un bloque cualquiera. `id` y `type` son lo único que el editor exige;
 * el resto de las claves las define el catálogo del anfitrión.
 */
export interface Block {
  id: string
  type: string
  enabled?: boolean
  [key: string]: unknown
}

/** Cómo se edita un campo. El editor dibuja el control según esto. */
export type FieldKind =
  'text' | 'textarea' | 'select' | 'url' | 'image' | 'images' | 'entities' | 'list' | 'icon'

export interface FieldOption {
  value: string
  label: string
}

/**
 * Un icono del catálogo. `value` es lo que se guarda (una clave, nunca el
 * glifo): quien pinta la página decide con qué se dibuja esa clave, así que
 * cambiar el set no rompe lo ya guardado.
 *
 * El catálogo lo aporta el anfitrión en la definición del campo — este
 * paquete no trae iconos propios, igual que no trae colores ni tipografías.
 */
export interface IconOption {
  value: string
  label: string
  /** Lo que se dibuja en el selector: un emoji, una letra, lo que sea. */
  glyph: string
  /** Para agrupar el selector. Sin grupo, todos van juntos. */
  group?: string
}

export interface FieldDefinition {
  key: string
  label: string
  kind: FieldKind
  placeholder?: string
  help?: string
  maxLength?: number
  /** Solo para `select`. */
  options?: FieldOption[]
  /** Solo para `icon`: el catálogo cerrado de iconos disponibles. */
  icons?: IconOption[]
  /** Solo para `list`: los campos de cada elemento. */
  itemFields?: FieldDefinition[]
  /** Solo para `list` e `images`. */
  max?: number
  /** Texto del botón de agregar en un `list`. */
  addLabel?: string
}

export interface BlockDefinition {
  type: string
  label: string
  /** Una frase que explique para qué sirve, al elegirlo. */
  description?: string
  icon?: string
  fields: FieldDefinition[]
  /** Cuántas veces puede repetirse. Sin límite si se omite. */
  max?: number
  /** Valores con los que nace un bloque nuevo de este tipo. */
  defaults?: Record<string, unknown>
}
