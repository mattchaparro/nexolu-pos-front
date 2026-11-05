<script setup lang="ts">
// Listado de negocios - puerto de SuperAdmin/Businesses/Index.vue del
// legacy: busqueda + filtro de estado de suscripcion. Las acciones de
// edicion (activar, extender trial, cambiar plan, features) viven en el
// detalle de cada negocio (SuperAdminBusinessShowView.vue), no aca.
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import type { SuperAdminBusiness } from '@/types/superadmin/business'
import { NxButton, NxColumn, NxDataTable, NxInput, NxPageHeader, NxSelect } from '@/ui'
import { formatCop } from '@/utils/formatCop'
import { remainingClass, remainingLabel } from '@/utils/subscriptionRemaining'

import BusinessFormModal from '../components/BusinessFormModal.vue'
import { useBusinesses } from '../composables/useBusinesses'

const router = useRouter()

const searchInput = ref('')
const search = ref('')
const status = ref('')
const page = ref(1)
let debounce: number | undefined

const statusOptions = [
  { value: '', label: 'Todos los estados' },
  { value: 'in_use', label: 'En uso (vendieron esta semana)' },
  { value: 'idle', label: 'Sin ventas esta semana' },
  { value: 'trial', label: 'Prueba' },
  { value: 'paid', label: 'Pagando' },
  { value: 'expired', label: 'Vencido' },
  { value: 'inactive', label: 'Inactivo' },
]

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

const businessesQuery = useBusinesses(search, status, page)
const meta = computed(() => businessesQuery.data.value?.meta)
const summary = computed(() => businessesQuery.data.value?.summary)

// Resumen de arriba: cada casilla filtra la lista; tocarla otra vez la limpia.
const summaryTiles = computed(() => {
  const s = summary.value
  if (!s) {
    return []
  }
  return [
    { status: 'in_use', label: `En uso (últimos ${s.in_use_days} días)`, value: s.in_use, hint: `de ${s.total} negocios`, accent: 'text-emerald-700' },
    { status: 'paid', label: 'Pagando', value: s.paid, hint: 'suscripción al día', accent: 'text-slate-900' },
    { status: 'trial', label: 'En prueba', value: s.trial, hint: 'periodo gratis', accent: 'text-slate-900' },
    { status: 'expired', label: 'Vencidos', value: s.expired, hint: 'sin pagar', accent: 'text-red-700' },
    { status: 'inactive', label: 'Apagados', value: s.inactive, hint: 'desactivados', accent: 'text-slate-500' },
  ]
})

function toggleStatus(value: string): void {
  status.value = status.value === value ? '' : value
}

const IN_USE_MS = 7 * 24 * 60 * 60 * 1000

function isInUse(business: SuperAdminBusiness): boolean {
  return !!business.last_sale_at && Date.now() - new Date(business.last_sale_at).getTime() < IN_USE_MS
}

/** "Hoy", "Ayer", "Hace 5 días", "Hace 2 meses" o "Nunca". */
function lastSaleLabel(business: SuperAdminBusiness): string {
  if (!business.last_sale_at) {
    return 'Nunca'
  }
  const sale = new Date(business.last_sale_at)
  const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(sale).setHours(0, 0, 0, 0)) / 86_400_000)
  if (days <= 0) {
    return 'Hoy'
  }
  if (days === 1) {
    return 'Ayer'
  }
  if (days < 60) {
    return `Hace ${days} días`
  }
  return `Hace ${Math.floor(days / 30)} meses`
}

function onPage(event: { page: number }): void {
  page.value = event.page + 1
}

function openBusiness(business: SuperAdminBusiness): void {
  router.push({ name: 'superadmin.businesses.show', params: { id: business.id } })
}

// Recien creado se abre su detalle: es donde se ve el equipo, se impersona y
// se ajusta lo que haya quedado pendiente del alta.
const createModalOpen = ref(false)

/**
 * Hasta cuando esta cubierto: `paid_until` si esta pagando, `trial_ends_at`
 * si esta en prueba. Se muestra junto a los dias restantes porque son dos
 * preguntas distintas: cuanta urgencia hay, y que dia hay que cobrar.
 */
function renewalDate(business: SuperAdminBusiness): string | null {
  // Vencido: el dia en que se quedo sin cubrir, que es la fecha mas reciente
  // de las dos (si ya habia pagado, paid_until; si nunca pago, el trial).
  const iso =
    business.subscription_status === 'paid'
      ? business.paid_until
      : business.subscription_status === 'trial'
        ? business.trial_ends_at
        : [business.paid_until, business.trial_ends_at].filter(Boolean).sort().at(-1) ?? null

  if (!iso) {
    return null
  }

  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusBadge(business: SuperAdminBusiness): { label: string; class: string } {
  if (!business.active) {
    return { label: 'Inactivo', class: 'bg-slate-100 text-slate-500' }
  }
  return (
    {
      paid: { label: 'Pagando', class: 'bg-emerald-100 text-emerald-700' },
      trial: { label: 'Prueba', class: 'bg-sky-100 text-sky-700' },
      expired: { label: 'Vencido', class: 'bg-red-100 text-red-700' },
      inactive: { label: 'Inactivo', class: 'bg-slate-100 text-slate-500' },
    } as const
  )[business.subscription_status]
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between gap-2">
      <NxPageHeader title="Negocios" icon="pi pi-building" compact />
      <NxButton size="sm" icon="pi pi-plus" @click="createModalOpen = true">Crear negocio</NxButton>
    </div>

    <BusinessFormModal v-model="createModalOpen" @created="openBusiness" />

    <!-- Cuantos usan de verdad el POS, sobre todos los negocios. -->
    <div v-if="summaryTiles.length" class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      <button
        v-for="tile in summaryTiles"
        :key="tile.status"
        type="button"
        class="rounded-xl border bg-white p-3 text-left transition-colors hover:border-indigo-300"
        :class="status === tile.status ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200'"
        @click="toggleStatus(tile.status)"
      >
        <p class="text-xs font-medium text-slate-500">{{ tile.label }}</p>
        <p class="text-2xl font-bold" :class="tile.accent">{{ tile.value }}</p>
        <p class="text-[11px] text-slate-400">{{ tile.hint }}</p>
      </button>
    </div>

    <div class="flex flex-col gap-2 sm:flex-row">
      <NxInput
        v-model="searchInput"
        label="Buscar por nombre, dueño o teléfono"
        size="lg"
        icon="pi pi-search"
        clearable
        blur-on-enter
        class="flex-1"
      />
      <NxSelect
        v-model="status"
        label="Estado"
        size="lg"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        class="sm:w-56"
      />
    </div>

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <NxDataTable
        :value="businessesQuery.data.value?.data ?? []"
        :loading="businessesQuery.isPending.value"
        paginator
        lazy
        :rows="20"
        :total-records="meta?.total ?? 0"
        :first="((meta?.current_page ?? 1) - 1) * 20"
        @page="onPage"
        @row-click="openBusiness($event.data as SuperAdminBusiness)"
      >
        <template #empty>
          <p class="py-6 text-center text-sm text-slate-400">No encontramos negocios con esos criterios.</p>
        </template>
        <NxColumn header="ID">
          <template #body="{ data }: { data: SuperAdminBusiness }">
            <span class="font-mono text-xs text-slate-500">{{ data.id }}</span>
          </template>
        </NxColumn>
        <NxColumn header="Negocio">
          <template #body="{ data }: { data: SuperAdminBusiness }">
            <p class="cursor-pointer text-sm font-semibold text-slate-900 hover:text-indigo-600" @click="openBusiness(data)">
              {{ data.name }}
            </p>
            <p v-if="data.phone" class="text-xs text-slate-400">{{ data.phone }}</p>
          </template>
        </NxColumn>
        <NxColumn header="Dueño">
          <template #body="{ data }: { data: SuperAdminBusiness }">
            {{ data.owner_name }}
          </template>
        </NxColumn>
        <NxColumn header="Última venta">
          <template #body="{ data }: { data: SuperAdminBusiness }">
            <span class="inline-flex items-center gap-1.5 text-sm" :class="isInUse(data) ? 'text-emerald-700' : 'text-slate-400'">
              <span class="h-2 w-2 shrink-0 rounded-full" :class="isInUse(data) ? 'bg-emerald-500' : 'bg-slate-300'" />
              {{ lastSaleLabel(data) }}
            </span>
          </template>
        </NxColumn>
        <NxColumn header="Estado">
          <template #body="{ data }: { data: SuperAdminBusiness }">
            <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="statusBadge(data).class">
              {{ statusBadge(data).label }}
            </span>
          </template>
        </NxColumn>
        <NxColumn header="Le queda">
          <template #body="{ data }: { data: SuperAdminBusiness }">
            <p class="text-sm" :class="remainingClass(data.days_remaining, data.subscription_status)">
              {{ remainingLabel(data.days_remaining, data.subscription_status) }}
            </p>
            <!-- La fecha exacta debajo: "12 dias" contesta la urgencia, pero
                 para llamar a cobrar hace falta el dia concreto. -->
            <p v-if="renewalDate(data)" class="text-xs text-slate-400">
              {{ renewalDate(data) }}
            </p>
          </template>
        </NxColumn>
        <NxColumn header="Usuarios">
          <template #body="{ data }: { data: SuperAdminBusiness }">
            {{ data.users_count ?? 0 }}
          </template>
        </NxColumn>
        <NxColumn header="Precio custom">
          <template #body="{ data }: { data: SuperAdminBusiness }">
            {{ data.custom_price_cop != null ? formatCop(data.custom_price_cop) : '—' }}
          </template>
        </NxColumn>
      </NxDataTable>
    </div>
  </div>
</template>
