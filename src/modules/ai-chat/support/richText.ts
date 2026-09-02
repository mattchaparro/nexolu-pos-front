/**
 * Trozos de texto del Asistente, marcando cual va en negrita.
 *
 * El modelo responde con markdown ligero -- casi siempre `**cifras**` -- y
 * pintarlo crudo dejaba los asteriscos a la vista ("En **agosto de 2026**
 * vendiste **$16,500**").
 *
 * No se usa `marked` ni ninguna libreria (el legacy si, ver su package.json):
 * eso obliga a inyectar HTML con v-html, y lo que se inyectaria es la salida
 * de un modelo de lenguaje. Un `<img onerror=...>` en esa respuesta seria XSS
 * ejecutandose en la sesion del dueño del negocio. Aca no se genera HTML en
 * ningun momento: se devuelven trozos que la plantilla pinta como texto, asi
 * que el problema no puede existir.
 *
 * Cubre negrita (`**x**` y `__x__`), que es lo unico que el modelo emite en
 * la practica. Si algun dia hace falta mas (listas, tablas), se agrega aqui
 * con la misma regla: nunca HTML.
 */
export interface RichTextChunk {
  text: string
  bold: boolean
}

const BOLD = /\*\*(.+?)\*\*|__(.+?)__/gs

export function parseRichText(input: string): RichTextChunk[] {
  const chunks: RichTextChunk[] = []
  let lastIndex = 0

  for (const match of input.matchAll(BOLD)) {
    const start = match.index ?? 0

    if (start > lastIndex) {
      chunks.push({ text: input.slice(lastIndex, start), bold: false })
    }

    chunks.push({ text: match[1] ?? match[2] ?? '', bold: true })
    lastIndex = start + match[0].length
  }

  if (lastIndex < input.length) {
    chunks.push({ text: input.slice(lastIndex), bold: false })
  }

  // Sin marcas: un solo trozo, para que la plantilla no tenga un caso aparte.
  return chunks.length > 0 ? chunks : [{ text: input, bold: false }]
}
