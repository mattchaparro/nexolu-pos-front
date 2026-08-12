<script setup lang="ts">
// Servicios - pestaña propia del hub de Catalogo para productos con
// is_service=true (cortes, consultas, etc: sin stock/costo/receta).
// Puerto de ProductsController::servicesIndex() + Admin/Products/Index.vue
// (catalogKind='services') del legacy - misma tabla Product, listado y
// formulario (ver ProductFormView.vue) aparte porque los campos relevantes
// y las acciones (sin ajuste de stock) son distintos a los de Productos.
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import type { Product } from '@/types/product'
import { NxButton, NxColumn, NxDataTable, NxInput, NxPageHeader, NxStatCard } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { formatCop } from '@/utils/formatCop'

import CatalogHubTabs from '../components/CatalogHubTabs.vue'
import { useServicesSummary } from '../composables/useCatalogSummary'
import { useProductMutations } from '../composables/useProductMutations'
import { useServices } from '../composables/useProducts'

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

const servicesQuery = useServices(search, page)
const meta = computed(() => servicesQuery.data.value?.meta)
const summaryQuery = useServicesSummary(computed(() => true))
const { deleteMutation } = useProductMutations()

function onPage(event: { page: number }): void {
  page.value = event.page + 1
}

async function removeService(service: Product): Promise<void> {
  if (!window.confirm(`¿Eliminar "${service.name}"?`)) {
    return
  }
  try {
    await deleteMutation.mutateAsync(service.id)
  } catch (error) {
    window.alert(extractErrorMessage(error, 'No pudimos eliminar el servicio.'))
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <div class="flex items-center justify-between gap-3">
      <NxPageHeader title="Servicios" icon="pi pi-wrench" compact />
      <NxButton icon="pi pi-plus" @click="router.push({ name: 'catalog.services.create' })">Servicio</NxButton>
    </div>

    <CatalogHubTabs />

    <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <NxStatCard v-if="meta" label="Total servicios" :value="String(meta.total)" icon="pi pi-wrench" />
      <template v-if="summaryQuery.data.value">
        <NxStatCard label="Precio variable" :value="String(summaryQuery.data.value.variable_price_count)" icon="pi pi-sliders-h" />
        <NxStatCard label="Precio fijo" :value="String(summaryQuery.data.value.fixed_price_count)" icon="pi pi-tag" />
      </template>
    </div>

    <NxInput v-model="searchInput" label="Buscar por nombre o categoría" size="lg" icon="pi pi-search" clearable />

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <NxDataTable
        :value="servicesQuery.data.value?.data ?? []"
        :loading="servicesQuery.isPending.value"
        paginator
        lazy
        :rows="20"
        :total-records="meta?.total ?? 0"
        :first="((meta?.current_page ?? 1) - 1) * 20"
        @page="onPage"
      >
        <template #empty>
          <p class="py-6 text-center text-sm text-slate-400">
            {{ search ? 'Sin resultados para tu búsqueda.' : 'Todavía no hay servicios.' }}
          </p>
        </template>
        <NxColumn header="Servicio">
          <template #body="{ data }: { data: Product }">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-slate-900">
                {{ data.name }}
                <span v-if="!data.is_active" class="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                  Inactivo
                </span>
              </p>
              <p class="truncate text-xs text-slate-400">{{ data.category?.name ?? 'Sin categoría' }}</p>
            </div>
          </template>
        </NxColumn>
        <NxColumn header="Precio">
          <template #body="{ data }: { data: Product }">
            <span v-if="data.price_varies_at_sale" class="text-xs text-slate-500">
              Variable<span v-if="Number(data.price) > 0"> · ref. {{ formatCop(data.price) }}</span>
            </span>
            <span v-else>{{ formatCop(data.price) }}</span>
          </template>
        </NxColumn>
        <NxColumn header="Duración">
          <template #body="{ data }: { data: Product }">
            {{ data.duration_minutes ? `${data.duration_minutes} min` : '—' }}
          </template>
        </NxColumn>
        <NxColumn>
          <template #body="{ data }: { data: Product }">
            <div class="flex flex-wrap items-center justify-end gap-x-2 gap-y-1.5">
              <button
                type="button"
                class="text-slate-400 hover:text-indigo-600"
                title="Editar"
                @click="router.push({ name: 'catalog.products.edit', params: { id: data.id } })"
              >
                <i class="pi pi-pencil text-sm" />
              </button>
              <button
                type="button"
                class="text-slate-300 hover:text-red-500"
                title="Eliminar"
                :disabled="deleteMutation.isPending.value"
                @click="removeService(data)"
              >
                <i class="pi pi-trash text-sm" />
              </button>
            </div>
          </template>
        </NxColumn>
      </NxDataTable>
    </div>
  </div>
</template>
