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
  | 'text'
  | 'textarea'
  | 'select'
  | 'url'
  | 'image'
  | 'images'
  | 'entities'
  | 'list'

export interface FieldOption {
  value: string
  label: string
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
