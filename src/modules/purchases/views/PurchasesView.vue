<script setup lang="ts">
// Compras - listado con filtro de fechas + estado de pago. Puerto de
// Admin/Purchases/Index.vue del legacy.
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import type { Purchase, PurchasePaymentStatus } from '@/types/purchase'
import { NxButton, NxColumn, NxDataTable, NxInput, NxPageHeader } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import CatalogHubTabs from '../../catalog/components/CatalogHubTabs.vue'
import PayPurchaseModal from '../components/PayPurchaseModal.vue'
import { usePurchases } from '../composables/usePurchases'

const router = useRouter()

const from = ref('')
const to = ref('')
const paymentStatus = ref<PurchasePaymentStatus | ''>('')
const page = ref(1)

const purchasesQuery = usePurchases(from, to, paymentStatus, page)
const meta = computed(() => purchasesQuery.data.value?.meta)

function onPage(event: { page: number }): void {
  page.value = event.page + 1
}

const payModalOpen = ref(false)
const payingPurchase = ref<Purchase | null>(null)

function openPay(purchase: Purchase): void {
  payingPurchase.value = purchase
  payModalOpen.value = true
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <div class="flex items-center justify-between gap-3">
      <NxPageHeader title="Compras" icon="pi pi-shopping-cart" compact />
      <NxButton icon="pi pi-plus" @click="router.push({ name: 'purchases.create' })">Registrar compra</NxButton>
    </div>

    <CatalogHubTabs />

    <div class="flex flex-wrap gap-3">
      <NxInput v-model="from" type="date" label="Desde" class="min-w-[160px]" />
      <NxInput v-model="to" type="date" label="Hasta" class="min-w-[160px]" />
    </div>

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <NxDataTable
        :value="purchasesQuery.data.value?.data ?? []"
        :loading="purchasesQuery.isPending.value"
        paginator
        lazy
        :rows="20"
        :total-records="meta?.total ?? 0"
        :first="((meta?.current_page ?? 1) - 1) * 20"
        @page="onPage"
      >
        <template #empty>
          <p class="py-6 text-center text-sm text-slate-400">Todavía no hay compras registradas.</p>
        </template>
        <NxColumn header="Fecha">
          <template #body="{ data }: { data: Purchase }">
            {{ formatDate(data.purchased_at) }}
          </template>
        </NxColumn>
        <NxColumn header="Proveedor">
          <template #body="{ data }: { data: Purchase }">
            {{ data.supplier?.id ? data.supplier.name : 'Sin proveedor' }}
          </template>
        </NxColumn>
        <NxColumn header="Factura">
          <template #body="{ data }: { data: Purchase }">
            {{ data.invoice_number || '—' }}
          </template>
        </NxColumn>
        <NxColumn header="Total">
          <template #body="{ data }: { data: Purchase }">
            {{ formatCop(data.total) }}
          </template>
        </NxColumn>
        <NxColumn header="Estado">
          <template #body="{ data }: { data: Purchase }">
            <span
              v-if="data.payment_status === 'paid'"
              class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700"
            >
              Pagada
            </span>
            <button
              v-else
              type="button"
              class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 hover:bg-amber-200"
              @click="openPay(data)"
            >
              A crédito · debes {{ formatCop(data.balance) }}
            </button>
          </template>
        </NxColumn>
        <NxColumn>
          <template #body="{ data }: { data: Purchase }">
            <div class="flex items-center justify-end">
              <RouterLink
                :to="{ name: 'purchases.show', params: { id: data.id } }"
                class="text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                Ver
              </RouterLink>
            </div>
          </template>
        </NxColumn>
      </NxDataTable>
    </div>

    <PayPurchaseModal v-model="payModalOpen" :purchase="payingPurchase" />
  </div>
</template>
