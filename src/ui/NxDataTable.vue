<script setup lang="ts" generic="T extends object">
// Wrapper fino de DataTable de PrimeVue - listas con muchas filas
// (Catalogo: productos, insumos) en vez de tarjetas apiladas a mano.
// Compone con NxColumn (slot default = columnas, igual que el DataTable
// real). `lazy` + `@page` para paginacion server-side (misma pagina/params
// que ya maneja TanStack Query en el composable de la lista).
import PrimeDataTable, { type DataTablePageEvent, type DataTableSortEvent } from 'primevue/datatable'

withDefaults(
  defineProps<{
    value: T[]
    loading?: boolean
    paginator?: boolean
    rows?: number
    totalRecords?: number
    lazy?: boolean
    first?: number
    // Sin sortField/sortOrder: cada NxColumn con `sortable` ordena `value`
    // en el navegador solo (PrimeVue lo maneja internamente) - alcanza para
    // tablas que ya traen todo de una (ej. Margenes). Pasar estas dos como
    // prop controlada + escuchar @sort es para el caso server-side (misma
    // idea que ya usa `lazy` + `@page` para paginacion - ver
    // StockMovementsTab.vue).
    sortField?: string
    sortOrder?: number | null
    /** Tercer click en el header quita el orden en vez de ciclar para siempre entre asc/desc. */
    removableSort?: boolean
    /** Filas desplegables: con `dataKey` + `expandedRows` y el slot `expansion`. */
    dataKey?: string
    expandedRows?: Record<string, boolean>
  }>(),
  {
    loading: false,
    paginator: false,
    rows: 20,
    totalRecords: 0,
    lazy: false,
    first: 0,
    sortField: undefined,
    sortOrder: undefined,
    removableSort: true,
    dataKey: undefined,
    expandedRows: undefined,
  },
)

const emit = defineEmits<{
  page: [event: DataTablePageEvent]
  sort: [event: DataTableSortEvent]
  'update:expandedRows': [rows: Record<string, boolean>]
}>()
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
    :sort-field="sortField"
    :sort-order="sortOrder ?? undefined"
    :removable-sort="removableSort"
    :data-key="dataKey"
    :expanded-rows="expandedRows"
    striped-rows
    responsive-layout="scroll"
    class="text-sm"
    @page="emit('page', $event)"
    @sort="emit('sort', $event)"
    @update:expanded-rows="emit('update:expandedRows', $event as Record<string, boolean>)"
  >
    <template #empty>
      <slot name="empty" />
    </template>
    <slot />
    <template v-if="$slots.expansion" #expansion="slotProps">
      <slot name="expansion" v-bind="slotProps" />
    </template>
  </PrimeDataTable>
</template>
