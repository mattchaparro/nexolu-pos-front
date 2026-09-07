<script setup lang="ts">
// Lista editable de items YA guardados de una cuenta abierta (sync
// inmediato al backend via useActiveTabItemActions) - +/-/cantidad/
// subtotal/quitar por fila. Extraida de ActiveTabItemsPanel.vue para
// reusarla tambien en TabInProgressPanel.vue (panel embebido en Vender):
// antes esos items se mostraban ahi como chips de solo lectura y para
// editarlos había que salir a la pantalla completa de Cuentas abiertas -
// el cajero no debería tener que salir de Vender para eso.
import { computed, ref } from 'vue'

import type { SaleItem } from '@/types/sale'
import { NxInput } from '@/ui'
import { formatCop } from '@/utils/formatCop'

const props = defineProps<{
  items: SaleItem[]
  syncing: boolean
}>()

const emit = defineEmits<{
  'increment-item': [item: SaleItem]
  'decrement-item': [item: SaleItem]
  'remove-item': [item: SaleItem]
}>()

// Buscador client-side sobre los items YA guardados: en una cuenta larga
// (una mesa de varias horas junta decenas de lineas) encontrar "esa"
// cerveza para sumarle una obligaba a scrollear toda la lista. Filtra en
// memoria lo que ya esta en pantalla, sin pedir nada al backend.
const search = ref('')

// Solo con lista larga: con pocos items se ven todos de un vistazo y el
// input seria ruido en un panel angosto.
const showSearch = computed(() => props.items.length > 6)

const visibleItems = computed<SaleItem[]>(() => {
  const q = search.value.trim().toLowerCase()
  // showSearch en la condicion: si la lista se achica por debajo del umbral
  // (se quitaron items) el buscador desaparece, y sin esto un filtro viejo
  // seguiria escondiendo filas sin caja de texto que lo explique.
  if (!showSearch.value || !q) {
    return props.items
  }
  return props.items.filter((item) => {
    if (item.product.name.toLowerCase().includes(q)) {
      return true
    }
    // Tambien por variante ("Talla M", "Roja") y por SKU, que es como
    // varios negocios identifican el articulo.
    const variant = item.product_variant
    if (!variant) {
      return false
    }
    return (
      variant.sku.toLowerCase().includes(q) ||
      variant.attribute_values.some((value) => value.value.toLowerCase().includes(q))
    )
  })
})
</script>

<template>
  <div>
    <NxInput
      v-if="showSearch"
      v-model="search"
      class="mb-2"
      size="sm"
      icon="pi pi-search"
      placeholder="Buscar en la cuenta…"
      clearable
      blur-after-typing
    />

    <p v-if="showSearch && visibleItems.length === 0" class="py-2 text-center text-xs text-amber-700">
      Ningún ítem de la cuenta coincide con "{{ search.trim() }}".
    </p>

    <div class="divide-y divide-slate-100">
      <div v-for="item in visibleItems" :key="item.id" class="flex items-center gap-2 py-2 text-sm">
      <span class="min-w-0 flex-1 truncate text-slate-700">{{ item.product.name }}</span>
      <!-- Los +/- editan un BORRADOR local (instantaneo, sin red - ver
           useActiveTabItemActions); `syncing` solo es verdadero durante el
           breve "Confirmar cambios", donde si conviene congelar la edicion
           hasta reconciliar con el servidor.
           select-none + touch-manipulation: tocar +/- rapido cuenta como
           doble tap, y el navegador respondia seleccionando la cifra de al
           lado y abriendo el menu de "Buscar en Google". En la caja, con
           afan, eso tapaba la pantalla a mitad de una venta. -->
      <div class="flex shrink-0 select-none touch-manipulation items-center gap-1">
        <button
          type="button"
          class="flex h-6 w-6 items-center justify-center rounded bg-slate-100 disabled:opacity-40"
          :disabled="syncing"
          @click="emit('decrement-item', item)"
        >
          <i class="pi pi-minus text-xs" />
        </button>
        <span class="w-5 text-center text-xs font-bold">{{ item.quantity }}</span>
        <button
          type="button"
          class="flex h-6 w-6 items-center justify-center rounded bg-slate-100 disabled:opacity-40"
          :disabled="syncing || (item.product.track_stock && item.product.stock <= 0)"
          @click="emit('increment-item', item)"
        >
          <i class="pi pi-plus text-xs" />
        </button>
      </div>
      <!-- pl-2: separacion real con el boton "+", que quedaba a un pelo. -->
      <span class="min-w-[64px] shrink-0 select-none pl-2 text-right font-semibold text-slate-900">
        {{ formatCop(item.subtotal) }}
      </span>
      <button
        type="button"
        class="shrink-0 text-red-400 hover:text-red-600 disabled:opacity-40"
        :disabled="syncing"
        @click="emit('remove-item', item)"
      >
        <i class="pi pi-trash text-sm" />
      </button>
      </div>
    </div>
  </div>
</template>
