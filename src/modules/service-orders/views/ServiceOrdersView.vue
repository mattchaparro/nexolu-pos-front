<script setup lang="ts">
// Ordenes de servicio - listado con filtro de estado + busqueda. Puerto de
// Admin/ServiceOrders/Index.vue del legacy. La columna de etapa solo
// aparece si el negocio tiene un ServiceWorkflow asignado (ver
// useServiceWorkflow) - igual que el legacy, que tampoco la muestra sin uno.
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import StageBadge from '@/components/StageBadge.vue'
import { useServiceWorkflow } from '@/composables/useServiceWorkflow'
import type { ServiceOrder, ServiceOrderStatus } from '@/types/serviceOrder'
import { NxButton, NxColumn, NxDataTable, NxInput, NxPageHeader, NxSelect } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import PayServiceOrderModal from '../components/PayServiceOrderModal.vue'
import { useServiceOrders } from '../composables/useServiceOrders'

const router = useRouter()

const workflowQuery = useServiceWorkflow()
const hasWorkflow = computed(() => (workflowQuery.data.value?.stages.length ?? 0) > 0)

const statusOptions = [
  { label: 'Todos', value: '' },
  { label: 'Pendiente', value: 'pending' },
  { label: 'Abonado', value: 'partial' },
  { label: 'Pagado', value: 'paid' },
  { label: 'Cancelado', value: 'cancelled' },
]

const status = ref<ServiceOrderStatus | ''>('')
const searchInput = ref('')
const search = ref('')
const page = ref(1)
let debounce: number | undefined

watch(searchInput, (value) => {
  window.clearTimeout(debounce)
  debounce = window.setTimeout(() => {
    search.value = value
    page.value = 1
  }, 300)
})
watch(status, () => {
  page.value = 1
})

const ordersQuery = useServiceOrders(status, search, page)
const meta = computed(() => ordersQuery.data.value?.meta)

function onPage(event: { page: number }): void {
  page.value = event.page + 1
}

const payModalOpen = ref(false)
const payingOrder = ref<ServiceOrder | null>(null)

function openPay(order: ServiceOrder): void {
  payingOrder.value = order
  payModalOpen.value = true
}

function statusBadgeClass(order: ServiceOrder): string {
  if (order.status === 'paid') {
    return 'bg-emerald-100 text-emerald-700'
  }
  if (order.status === 'cancelled') {
    return 'bg-slate-100 text-slate-500'
  }
  if (order.status === 'partial') {
    return 'bg-sky-100 text-sky-700'
  }
  return 'bg-amber-100 text-amber-700'
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <div class="flex items-center justify-between gap-3">
      <NxPageHeader title="Órdenes de servicio" icon="pi pi-wrench" compact />
      <NxButton icon="pi pi-plus" @click="router.push({ name: 'service-orders.create' })">Nueva orden</NxButton>
    </div>

    <div class="flex flex-wrap gap-3">
      <NxInput v-model="searchInput" label="Buscar por servicio o cliente" class="min-w-[220px] flex-1" icon="pi pi-search" clearable />
      <NxSelect
        :model-value="status"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        label="Estado"
        class="min-w-[180px]"
        @update:model-value="status = $event as ServiceOrderStatus | ''"
      />
    </div>

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <NxDataTable
        :value="ordersQuery.data.value?.data ?? []"
        :loading="ordersQuery.isPending.value"
        paginator
        lazy
        :rows="25"
        :total-records="meta?.total ?? 0"
        :first="((meta?.current_page ?? 1) - 1) * 25"
        @page="onPage"
      >
        <template #empty>
          <p class="py-6 text-center text-sm text-slate-400">Todavía no hay órdenes de servicio.</p>
        </template>
        <NxColumn header="Servicio">
          <template #body="{ data }: { data: ServiceOrder }">
            <p class="text-sm font-semibold text-slate-900">{{ data.service_name }}</p>
            <p class="text-xs text-slate-400">{{ data.client?.id != null ? data.client.name : 'Sin cliente' }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Total / Saldo">
          <template #body="{ data }: { data: ServiceOrder }">
            <p class="text-sm font-semibold text-slate-900">{{ formatCop(data.total) }}</p>
            <p v-if="data.balance > 0" class="text-xs font-semibold text-amber-600">Saldo: {{ formatCop(data.balance) }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Estado">
          <template #body="{ data }: { data: ServiceOrder }">
            <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="statusBadgeClass(data)">
              {{ data.status_label }}
            </span>
          </template>
        </NxColumn>
        <NxColumn v-if="hasWorkflow" header="Etapa">
          <template #body="{ data }: { data: ServiceOrder }">
            <StageBadge :stage="data.stage" />
          </template>
        </NxColumn>
        <NxColumn>
          <template #body="{ data }: { data: ServiceOrder }">
            <div class="flex items-center justify-end gap-3">
              <button
                v-if="data.status === 'pending' || data.status === 'partial'"
                type="button"
                class="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                @click="openPay(data)"
              >
                Abonar
              </button>
              <RouterLink
                :to="{ name: 'service-orders.show', params: { id: data.id } }"
                class="text-sm font-medium text-slate-600 hover:text-slate-800"
              >
                Ver
              </RouterLink>
            </div>
          </template>
        </NxColumn>
      </NxDataTable>
    </div>

    <PayServiceOrderModal v-model="payModalOpen" :order="payingOrder" />
  </div>
</template>
