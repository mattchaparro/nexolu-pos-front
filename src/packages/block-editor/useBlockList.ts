import { computed, type Ref } from 'vue'

import type { Block, BlockDefinition } from './types'

/**
 * Las operaciones sobre la lista. Fuera de los componentes para que la
 * lógica de orden y límites se pueda probar sin montar nada.
 *
 * Siempre reemplaza el array entero en vez de mutarlo en sitio: el
 * `v-model` del anfitrión puede ser un `computed` sobre otro estado, y
 * mutar en sitio no lo notificaría.
 */
export function useBlockList(blocks: Ref<Block[]>, catalog: Ref<BlockDefinition[]>) {
  const byType = computed(() => new Map(catalog.value.map((d) => [d.type, d])))

  function definition(type: string): BlockDefinition | undefined {
    return byType.value.get(type)
  }

  /** Cuántos hay de ese tipo, para respetar `max`. */
  function countOf(type: string): number {
    return blocks.value.filter((block) => block.type === type).length
  }

  function canAdd(type: string): boolean {
    const max = definition(type)?.max
    return max === undefined || countOf(type) < max
  }

  function add(type: string): void {
    if (!canAdd(type)) {
      return
    }
    const def = definition(type)
    blocks.value = [
      ...blocks.value,
      {
        // Suficientemente único para una lista de 20 y estable mientras
        // viva el bloque: es la llave con la que Vue no reusa el DOM del
        // bloque equivocado al reordenar.
        id: `blk_${Math.random().toString(36).slice(2, 10)}`,
        type,
        enabled: true,
        ...(def?.defaults ?? {}),
      },
    ]
  }

  function remove(index: number): void {
    blocks.value = blocks.value.filter((_, i) => i !== index)
  }

  /**
   * Copia un bloque justo debajo del original.
   *
   * Respeta `max`: duplicar un hero cuando solo se permite uno no crea una
   * segunda portada, no hace nada. El `id` es nuevo — copiar el mismo id
   * haría que Vue reusara el DOM del original y el editor mostraría el
   * bloque equivocado al editar la copia.
   */
  function duplicate(index: number): void {
    const original = blocks.value[index]
    if (!original || !canAdd(original.type)) {
      return
    }

    const copy: Block = {
      ...structuredClone(original),
      id: `blk_${Math.random().toString(36).slice(2, 10)}`,
    }

    const next = [...blocks.value]
    next.splice(index + 1, 0, copy)
    blocks.value = next
  }

  function move(from: number, to: number): void {
    if (from === to || to < 0 || to >= blocks.value.length) {
      return
    }
    const next = [...blocks.value]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    blocks.value = next
  }

  function update(index: number, patch: Record<string, unknown>): void {
    blocks.value = blocks.value.map((block, i) => (i === index ? { ...block, ...patch } : block))
  }

  return { definition, countOf, canAdd, add, remove, duplicate, move, update }
}
