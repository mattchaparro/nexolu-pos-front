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
  const iso = business.subscription_status === 'paid' ? business.paid_until : business.trial_ends_at

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

    <div class="flex flex-col gap-2 sm:flex-row">
      <NxInput
        v-model="searchInput"
        label="Buscar por nombre, dueño o teléfono"
        size="lg"
        icon="pi pi-search"
        clearable
        blur-after-typing
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
