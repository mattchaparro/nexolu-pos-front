<script setup lang="ts">
// Apartados - listado con filtro de estado + busqueda. Puerto de
// Admin/Layaways/Index.vue del legacy.
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import type { Layaway, LayawayStatus } from '@/types/layaway'
import { NxButton, NxColumn, NxDataTable, NxDatePicker, NxInput, NxPageHeader, NxSelect } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import AddLayawayPaymentModal from '../components/AddLayawayPaymentModal.vue'
import { useLayaways } from '../composables/useLayaways'

const router = useRouter()

const statusOptions = [
  { label: 'Todos', value: '' },
  { label: 'Pendiente', value: 'open' },
  { label: 'Completado', value: 'completed' },
  { label: 'Cancelado', value: 'cancelled' },
]

const status = ref<LayawayStatus | ''>('')
const searchInput = ref('')
const search = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const page = ref(1)
let debounce: number | undefined

watch(searchInput, (value) => {
  window.clearTimeout(debounce)
  debounce = window.setTimeout(() => {
    search.value = value
    page.value = 1
  }, 300)
})
watch([status, dateFrom, dateTo], () => {
  page.value = 1
})

const layawaysQuery = useLayaways(status, search, page, dateFrom, dateTo)
const meta = computed(() => layawaysQuery.data.value?.meta)

function onPage(event: { page: number }): void {
  page.value = event.page + 1
}

const payModalOpen = ref(false)
const payingLayaway = ref<Layaway | null>(null)

function openPay(layaway: Layaway): void {
  payingLayaway.value = layaway
  payModalOpen.value = true
}

function firstItemsLabel(layaway: Layaway): string {
  if (layaway.items.length === 0) {
    return 'Sin productos'
  }
  const first = layaway.items[0]?.product?.name ?? 'Producto'
  return layaway.items.length > 1 ? `${first} + ${layaway.items.length - 1} más` : first
}

function statusBadgeClass(layaway: Layaway): string {
  if (layaway.status === 'completed') {
    return 'bg-emerald-100 text-emerald-700'
  }
  if (layaway.status === 'cancelled') {
    return 'bg-slate-100 text-slate-500'
  }
  return 'bg-amber-100 text-amber-700'
}

function statusLabel(layaway: Layaway): string {
  if (layaway.status === 'completed') {
    return 'Completado'
  }
  if (layaway.status === 'cancelled') {
    return 'Cancelado'
  }
  return 'Pendiente'
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <div class="flex items-center justify-between gap-3">
      <NxPageHeader title="Apartados" icon="pi pi-bookmark" compact />
      <NxButton icon="pi pi-plus" @click="router.push({ name: 'layaways.create' })">Nuevo apartado</NxButton>
    </div>

    <div class="flex flex-wrap gap-3">
      <NxInput v-model="searchInput" label="Buscar por cliente o teléfono" class="min-w-[220px] flex-1" icon="pi pi-search" clearable blur-after-typing />
      <NxSelect
        :model-value="status"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        label="Estado"
        class="min-w-[180px]"
        @update:model-value="status = $event as LayawayStatus | ''"
      />
      <NxDatePicker v-model="dateFrom" label="Desde" class="min-w-[160px]" />
      <NxDatePicker v-model="dateTo" label="Hasta" class="min-w-[160px]" />
    </div>

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <NxDataTable
        :value="layawaysQuery.data.value?.data ?? []"
        :loading="layawaysQuery.isPending.value"
        paginator
        lazy
        :rows="15"
        :total-records="meta?.total ?? 0"
        :first="((meta?.current_page ?? 1) - 1) * 15"
        @page="onPage"
      >
        <template #empty>
          <p class="py-6 text-center text-sm text-slate-400">Todavía no hay apartados.</p>
        </template>
        <NxColumn header="Productos">
          <template #body="{ data }: { data: Layaway }">
            <p class="text-sm font-semibold text-slate-900">{{ firstItemsLabel(data) }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Cliente">
          <template #body="{ data }: { data: Layaway }">
            <p class="text-sm text-slate-700">{{ data.customer_name || 'Sin nombre' }}</p>
            <p v-if="data.customer_phone" class="text-xs text-slate-400">{{ data.customer_phone }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Total / Saldo">
          <template #body="{ data }: { data: Layaway }">
            <p class="text-sm font-semibold text-slate-900">{{ formatCop(data.total) }}</p>
            <p v-if="data.status === 'open' && data.balance > 0" class="text-xs font-semibold text-amber-600">
              Saldo: {{ formatCop(data.balance) }}
            </p>
            <p v-else-if="data.status === 'open'" class="text-xs font-semibold text-emerald-600">Pagado</p>
          </template>
        </NxColumn>
        <NxColumn header="Estado">
          <template #body="{ data }: { data: Layaway }">
            <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="statusBadgeClass(data)">
              {{ statusLabel(data) }}
            </span>
          </template>
        </NxColumn>
        <NxColumn>
          <template #body="{ data }: { data: Layaway }">
            <div class="flex items-center justify-end gap-3">
              <button
                v-if="data.status === 'open' && data.balance > 0"
                type="button"
                class="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                @click="openPay(data)"
              >
                Abonar
              </button>
              <RouterLink
                :to="{ name: 'layaways.show', params: { id: data.id } }"
                class="text-sm font-medium text-slate-600 hover:text-slate-800"
              >
                Ver
              </RouterLink>
            </div>
          </template>
        </NxColumn>
      </NxDataTable>
    </div>

    <AddLayawayPaymentModal v-model="payModalOpen" :layaway="payingLayaway" />
  </div>
</template>
