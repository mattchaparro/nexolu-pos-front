<script setup lang="ts">
// Descuentos - CRUD basico (listar/buscar/crear/editar/eliminar), mismo
// patron que ClientsView.vue. Puerto de Admin/Discounts/Index.vue del
// legacy. El consumo real (aplicar un descuento al vender) vive en el
// modulo sales (CartLineRow.vue / CartCheckoutSection.vue), que ya lee de
// useActiveDiscounts() - esta pantalla es solo el catalogo administrativo.
import { computed, ref, watch } from 'vue'

import type { Discount } from '@/types/discount'
import { NxButton, NxColumn, NxDataTable, NxInput, NxPageHeader } from '@/ui'
import { formatCop } from '@/utils/formatCop'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import DiscountFormModal from '../components/DiscountFormModal.vue'
import { useDiscountMutations } from '../composables/useDiscountMutations'
import { useDiscounts } from '../composables/useDiscounts'

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

const discountsQuery = useDiscounts(search, page)
const meta = computed(() => discountsQuery.data.value?.meta)
const { deleteMutation } = useDiscountMutations()

function onPage(event: { page: number }): void {
  page.value = event.page + 1
}

function formatValue(discount: Discount): string {
  return discount.type === 'percentage' ? `${discount.value}%` : formatCop(discount.value)
}

function scopeLabel(discount: Discount): string {
  if (discount.scope === 'cart') {
    return 'Cuenta completa'
  }
  return discount.product ? `Producto: ${discount.product.name}` : 'Cualquier producto'
}

const formModalOpen = ref(false)
const editingDiscount = ref<Discount | null>(null)

function openNewDiscount(): void {
  editingDiscount.value = null
  formModalOpen.value = true
}

function openEditDiscount(discount: Discount): void {
  editingDiscount.value = discount
  formModalOpen.value = true
}

async function removeDiscount(discount: Discount): Promise<void> {
  if (!window.confirm(`¿Eliminar "${discount.name}"?`)) {
    return
  }
  try {
    await deleteMutation.mutateAsync(discount.id)
  } catch (error) {
    window.alert(extractErrorMessage(error, 'No pudimos eliminar el descuento.'))
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <div class="flex items-center justify-between gap-3">
      <NxPageHeader title="Descuentos" icon="pi pi-tag" compact />
      <NxButton icon="pi pi-plus" @click="openNewDiscount">Descuento</NxButton>
    </div>

    <NxInput
      v-model="searchInput"
      label="Buscar por nombre"
      size="lg"
      icon="pi pi-search"
      clearable
      blur-after-typing
    />

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <NxDataTable
        :value="discountsQuery.data.value?.data ?? []"
        :loading="discountsQuery.isPending.value"
        paginator
        lazy
        :rows="20"
        :total-records="meta?.total ?? 0"
        :first="((meta?.current_page ?? 1) - 1) * 20"
        @page="onPage"
      >
        <template #empty>
          <p class="py-6 text-center text-sm text-slate-400">
            {{
              search
                ? 'Sin resultados para tu búsqueda.'
                : 'Todavía no hay descuentos configurados.'
            }}
          </p>
        </template>
        <NxColumn header="Nombre">
          <template #body="{ data }: { data: Discount }">
            <p class="text-sm font-semibold text-slate-900">{{ data.name }}</p>
            <p v-if="!data.is_active" class="text-xs text-slate-400">Inactivo</p>
          </template>
        </NxColumn>
        <NxColumn header="Valor">
          <template #body="{ data }: { data: Discount }">
            {{ formatValue(data) }}
          </template>
        </NxColumn>
        <NxColumn header="Se aplica a">
          <template #body="{ data }: { data: Discount }">
            {{ scopeLabel(data) }}
          </template>
        </NxColumn>
        <NxColumn>
          <template #body="{ data }: { data: Discount }">
            <div class="flex flex-wrap items-center justify-end gap-x-2 gap-y-1.5">
              <button
                type="button"
                class="text-slate-400 hover:text-indigo-600"
                title="Editar"
                @click="openEditDiscount(data)"
              >
                <i class="pi pi-pencil text-sm" />
              </button>
              <button
                type="button"
                class="text-slate-300 hover:text-red-500"
                title="Eliminar"
                :disabled="deleteMutation.isPending.value"
                @click="removeDiscount(data)"
              >
                <i class="pi pi-trash text-sm" />
              </button>
            </div>
          </template>
        </NxColumn>
      </NxDataTable>
    </div>

    <DiscountFormModal v-model="formModalOpen" :discount="editingDiscount" />
  </div>
</template>
