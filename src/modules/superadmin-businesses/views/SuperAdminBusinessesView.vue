<script setup lang="ts">
// Listado de negocios (solo lectura) - puerto acotado de
// SuperAdmin/Businesses/Index.vue del legacy: busqueda + estado de
// suscripcion, sin las acciones de edicion (activar, extender trial,
// cambiar plan) que ese modulo tambien tiene - ver la conversacion sobre
// alcance de este panel.
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import type { SuperAdminBusiness } from '@/types/superadmin/business'
import { NxColumn, NxDataTable, NxInput, NxPageHeader } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import { useBusinesses } from '../composables/useBusinesses'

const router = useRouter()

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

const businessesQuery = useBusinesses(search, page)
const meta = computed(() => businessesQuery.data.value?.meta)

function onPage(event: { page: number }): void {
  page.value = event.page + 1
}

function openBusiness(business: SuperAdminBusiness): void {
  router.push({ name: 'superadmin.businesses.show', params: { id: business.id } })
}

function statusBadge(business: SuperAdminBusiness): { label: string; class: string } {
  if (!business.active) {
    return { label: 'Inactivo', class: 'bg-slate-100 text-slate-500' }
  }
  return (
    {
      paid: { label: 'Pagando', class: 'bg-emerald-100 text-emerald-700' },
      trial: { label: `Prueba (${business.days_remaining}d)`, class: 'bg-sky-100 text-sky-700' },
      expired: { label: 'Vencido', class: 'bg-red-100 text-red-700' },
      inactive: { label: 'Inactivo', class: 'bg-slate-100 text-slate-500' },
    } as const
  )[business.subscription_status]
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <NxPageHeader title="Negocios" icon="pi pi-building" compact />

    <NxInput v-model="searchInput" label="Buscar por nombre, dueño o teléfono" size="lg" icon="pi pi-search" clearable blur-after-typing />

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
