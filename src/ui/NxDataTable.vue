<script setup lang="ts" generic="T extends object">
// Wrapper fino de DataTable de PrimeVue - listas con muchas filas
// (Catalogo: productos, insumos) en vez de tarjetas apiladas a mano.
// Compone con NxColumn (slot default = columnas, igual que el DataTable
// real). `lazy` + `@page` para paginacion server-side (misma pagina/params
// que ya maneja TanStack Query en el composable de la lista).
import PrimeDataTable, { type DataTablePageEvent } from 'primevue/datatable'

withDefaults(
  defineProps<{
    value: T[]
    loading?: boolean
    paginator?: boolean
    rows?: number
    totalRecords?: number
    lazy?: boolean
    first?: number
  }>(),
  {
    loading: false,
    paginator: false,
    rows: 20,
    totalRecords: 0,
    lazy: false,
    first: 0,
  },
)

const emit = defineEmits<{ page: [event: DataTablePageEvent] }>()
</script>

<template>
  <PrimeDataTable
    :value="value"
    :loading="loading"
    :paginator="paginator"
    :rows="rows"
    :total-records="totalRecords"
    :lazy="lazy"
    :first="first"
    striped-rows
    responsive-layout="scroll"
    class="text-sm"
    @page="emit('page', $event)"
  >
    <template #empty>
      <slot name="empty" />
    </template>
    <slot />
  </PrimeDataTable>
</template>
