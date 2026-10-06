<script setup lang="ts">
// Financiacion: cuanto le debe cada financiadora (Addi, Banti...) al negocio
// por las ventas financiadas, cuales ya se atrasaron y cuales giraron. Cada
// credito nace de una venta (ver PaymentModal, pestaña "Financiado") y aca
// solo se marca pagado cuando llega el giro.
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, ref, watch } from 'vue'

import { useBusiness } from '@/composables/useBusiness'
import { useSystemAlert } from '@/composables/useSystemAlert'
import type { FinancingCredit, RegisterPayoutPayload } from '@/types/financing'
import { NxButton, NxColumn, NxDataTable, NxInput, NxPageHeader, NxSelect, NxStatCard } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { formatCop } from '@/utils/formatCop'

import FinancingProvidersModal from '../components/FinancingProvidersModal.vue'
import RegisterPayoutModal from '../components/RegisterPayoutModal.vue'
import {
  fetchFinancingCredits,
  fetchFinancingSummary,
  registerFinancingPayout,
  undoFinancingPayout,
  type FetchFinancingCreditsParams,
} from '../services/financingService'

type StatusFilter = '' | 'pending' | 'overdue' | 'paid'

const statusOptions: { label: string; value: StatusFilter }[] = [
  { label: 'Pendientes', value: 'pending' },
  { label: 'Atrasados', value: 'overdue' },
  { label: 'Pagados', value: 'paid' },
  { label: 'Todos', value: '' },
]

const status = ref<StatusFilter>('pending')
const providerId = ref<number | null>(null)
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
watch([status, providerId], () => {
  page.value = 1
})

const params = computed<FetchFinancingCreditsParams>(() => ({
  status: status.value || undefined,
  financing_provider_id: providerId.value ?? undefined,
  search: search.value || undefined,
  page: page.value,
}))

const creditsQuery = useQuery({
  queryKey: ['financing', 'credits', params],
  queryFn: () => fetchFinancingCredits(params.value),
})
const summaryQuery = useQuery({ queryKey: ['financing', 'summary'], queryFn: fetchFinancingSummary })
const meta = computed(() => creditsQuery.data.value?.meta)

const { data: business } = useBusiness()
const { notify } = useSystemAlert()
const queryClient = useQueryClient()

function selectProvider(id: number): void {
  providerId.value = providerId.value === id ? null : id
}

function showOverdue(): void {
  status.value = status.value === 'overdue' ? 'pending' : 'overdue'
}

function formatDate(iso: string | null): string {
  if (!iso) {
    return '—'
  }
  const date = iso.length === 10 ? new Date(`${iso}T00:00:00`) : new Date(iso)
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

function methodLabel(method: string | null): string {
  if (!method) {
    return ''
  }
  return business.value?.payment_method_labels?.[method] ?? method
}

const payoutCredit = ref<FinancingCredit | null>(null)
const payoutModalOpen = ref(false)
const payoutError = ref<string | null>(null)

function openPayout(credit: FinancingCredit): void {
  payoutCredit.value = credit
  payoutError.value = null
  payoutModalOpen.value = true
}

const invalidate = () => queryClient.invalidateQueries({ queryKey: ['financing'] })

const payoutMutation = useMutation({
  mutationFn: ({ id, payload }: { id: number; payload: RegisterPayoutPayload }) => registerFinancingPayout(id, payload),
  onSuccess: invalidate,
})

const undoMutation = useMutation({
  mutationFn: (id: number) => undoFinancingPayout(id),
  onSuccess: invalidate,
})

async function confirmPayout(payload: RegisterPayoutPayload): Promise<void> {
  if (!payoutCredit.value) {
    return
  }
  payoutError.value = null
  try {
    await payoutMutation.mutateAsync({ id: payoutCredit.value.id, payload })
    payoutModalOpen.value = false
    notify('Pago registrado')
  } catch (error) {
    payoutError.value = extractErrorMessage(error, 'No pudimos registrar el pago.')
  }
}

async function undoPayout(credit: FinancingCredit): Promise<void> {
  if (!window.confirm(`¿Volver a dejar pendiente el crédito de ${credit.customer_name || 'este cliente'}?`)) {
    return
  }
  try {
    await undoMutation.mutateAsync(credit.id)
    notify('El crédito volvió a pendiente')
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos deshacer el pago.'), 'error')
  }
}

const providersModalOpen = ref(false)

function onPage(event: { page: number }): void {
  page.value = event.page + 1
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <NxPageHeader title="Financiación" icon="pi pi-building-columns" compact />
      <NxButton variant="outline" icon="pi pi-cog" @click="providersModalOpen = true">Financiadoras</NxButton>
    </div>

    <div v-if="summaryQuery.data.value" class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <NxStatCard label="Me deben" :value="formatCop(summaryQuery.data.value.pending_amount)" icon="pi pi-wallet" />
      <NxStatCard
        label="Atrasado"
        :value="formatCop(summaryQuery.data.value.overdue_amount)"
        icon="pi pi-exclamation-triangle"
        clickable
        :active="status === 'overdue'"
        @click="showOverdue"
      />
      <NxStatCard label="Me giraron este mes" :value="formatCop(summaryQuery.data.value.paid_this_month_amount)" icon="pi pi-check-circle" />
    </div>

    <div v-if="summaryQuery.data.value?.providers.length" class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      <button
        v-for="provider in summaryQuery.data.value.providers"
        :key="provider.id"
        type="button"
        class="min-w-[11rem] shrink-0 rounded-xl border p-3 text-left transition-colors"
        :class="providerId === provider.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'"
        @click="selectProvider(provider.id)"
      >
        <p class="text-sm font-semibold text-slate-900">
          {{ provider.name }}
          <span v-if="!provider.is_active" class="text-xs font-normal text-slate-400">(inactiva)</span>
        </p>
        <p class="text-xs text-slate-500">
          Debe <strong class="text-slate-800">{{ formatCop(provider.pending_amount) }}</strong>
          ({{ provider.pending_count }})
        </p>
        <p v-if="provider.overdue_amount > 0" class="text-xs font-semibold text-red-600">
          Atrasado {{ formatCop(provider.overdue_amount) }}
        </p>
      </button>
    </div>

    <p
      v-else-if="summaryQuery.isSuccess.value"
      class="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500"
    >
      Agrega tus financiadoras (Addi, Banti...) con el botón "Financiadoras". Después, al cobrar en Vender, elige la
      pestaña "Financiado".
    </p>

    <div class="grid grid-cols-2 items-end gap-3 lg:flex lg:flex-wrap">
      <NxInput
        v-model="searchInput"
        label="Buscar cliente, teléfono, cédula o crédito"
        class="col-span-2 lg:min-w-[240px] lg:flex-1"
        icon="pi pi-search"
        clearable
        blur-on-enter
      />
      <NxSelect
        :model-value="status"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        label="Estado"
        class="col-span-2 lg:min-w-[180px]"
        @update:model-value="status = $event as StatusFilter"
      />
    </div>

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <NxDataTable
        :value="creditsQuery.data.value?.data ?? []"
        :loading="creditsQuery.isPending.value"
        paginator
        lazy
        :rows="20"
        :total-records="meta?.total ?? 0"
        :first="((meta?.current_page ?? 1) - 1) * 20"
        @page="onPage"
      >
        <template #empty>
          <p class="py-6 text-center text-sm text-slate-400">No hay créditos con estos filtros.</p>
        </template>
        <NxColumn header="Fecha">
          <template #body="{ data }: { data: FinancingCredit }">
            <p class="text-sm text-slate-700">{{ formatDate(data.created_at) }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Cliente">
          <template #body="{ data }: { data: FinancingCredit }">
            <p class="text-sm font-semibold text-slate-900">{{ data.customer_name || 'Sin nombre' }}</p>
            <p class="text-xs text-slate-400">
              {{ [data.customer_phone, data.invoice_number ? `Venta ${data.invoice_number}` : null].filter(Boolean).join(' · ') }}
            </p>
          </template>
        </NxColumn>
        <NxColumn header="Financiadora">
          <template #body="{ data }: { data: FinancingCredit }">
            <p class="text-sm text-slate-800">{{ data.provider.name }}</p>
            <p v-if="data.approval_number" class="text-xs text-slate-400">Crédito {{ data.approval_number }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Me debe">
          <template #body="{ data }: { data: FinancingCredit }">
            <p class="text-sm font-semibold text-slate-900">{{ formatCop(data.amount) }}</p>
            <p v-if="data.sale_total" class="text-xs text-slate-400">de una venta de {{ formatCop(data.sale_total) }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Estado">
          <template #body="{ data }: { data: FinancingCredit }">
            <template v-if="data.status === 'paid'">
              <span class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Pagado</span>
              <p class="mt-1 text-xs text-slate-500">
                {{ formatDate(data.paid_at) }}
                <span v-if="data.payout_method"> · {{ methodLabel(data.payout_method) }}</span>
                <span v-if="data.payout_reference"> · {{ data.payout_reference }}</span>
              </p>
            </template>
            <template v-else>
              <span
                class="rounded-full px-2 py-0.5 text-xs font-semibold"
                :class="data.is_overdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'"
              >
                {{ data.is_overdue ? 'Atrasado' : 'Pendiente' }}
              </span>
              <p v-if="data.expected_payout_date" class="mt-1 text-xs text-slate-500">
                {{ data.is_overdue ? 'Debía pagar el' : 'Paga a más tardar el' }} {{ formatDate(data.expected_payout_date) }}
              </p>
            </template>
          </template>
        </NxColumn>
        <NxColumn>
          <template #body="{ data }: { data: FinancingCredit }">
            <div class="flex justify-end">
              <NxButton v-if="data.status === 'pending'" size="sm" icon="pi pi-check" @click="openPayout(data)">
                Registrar pago
              </NxButton>
              <button
                v-else
                type="button"
                class="text-xs font-medium text-slate-500 hover:text-red-600"
                @click="undoPayout(data)"
              >
                Deshacer pago
              </button>
            </div>
          </template>
        </NxColumn>
      </NxDataTable>
    </div>

    <RegisterPayoutModal
      v-model="payoutModalOpen"
      :credit="payoutCredit"
      :business="business"
      :submitting="payoutMutation.isPending.value"
      :error="payoutError"
      @confirm="confirmPayout"
    />
    <FinancingProvidersModal v-model="providersModalOpen" />
  </div>
</template>
