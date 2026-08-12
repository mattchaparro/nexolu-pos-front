<script setup lang="ts">
// Filas del desglose por items de una orden de servicio. El selector de
// "Servicio del catálogo" es un atajo opcional que autocompleta
// nombre/precio (ver useServiceOptions) - el nombre en si queda como texto
// libre porque StoreServiceOrderRequest no exige que cada item sea un
// producto real (ver items.*.name: string, sin product_id por item).
import { computed } from 'vue'

import type { StaffOption } from '@/composables/useStaffOptions'
import type { Product } from '@/types/product'
import { NxInput, NxInputNumber, NxSelect } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import { newServiceOrderLineRow, type ServiceOrderLineRow } from '../support/serviceOrderLine'

const props = defineProps<{
  modelValue: ServiceOrderLineRow[]
  services: Product[]
  staff: StaffOption[]
  errors?: Record<string, string>
}>()

const emit = defineEmits<{ 'update:modelValue': [value: ServiceOrderLineRow[]] }>()

const rows = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

function applyServicePreset(row: ServiceOrderLineRow, serviceId: number | null): void {
  const service = props.services.find((s) => s.id === serviceId)
  if (!service) {
    return
  }
  row.name = service.name
  if (!service.price_varies_at_sale) {
    row.unit_price = Number(service.price)
  }
}

function subtotalLabel(row: ServiceOrderLineRow): string {
  const price = Number(row.unit_price) || 0
  return formatCop(price * row.quantity)
}

function addRow(): void {
  rows.value = [...rows.value, newServiceOrderLineRow()]
}

function removeRow(index: number): void {
  if (rows.value.length === 1) {
    return
  }
  rows.value = rows.value.filter((_, i) => i !== index)
}

function errorFor(index: number, field: string): string | undefined {
  return props.errors?.[`items.${index}.${field}`]
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-for="(row, index) in rows" :key="row.uid" class="rounded-xl border border-slate-200 p-3">
      <div class="flex items-start gap-2">
        <span class="mt-3 shrink-0 text-xs font-bold text-slate-400">#{{ index + 1 }}</span>
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <div class="flex flex-col gap-2 sm:flex-row">
            <NxSelect
              v-if="services.length > 0"
              :model-value="null"
              :options="services"
              option-label="name"
              option-value="id"
              label="Servicio del catálogo (opcional)"
              size="sm"
              filter
              class="min-w-0 flex-1"
              @update:model-value="applyServicePreset(row, $event as number | null)"
            />
            <NxInput v-model="row.name" label="Nombre" size="sm" class="min-w-0 flex-1" :error="errorFor(index, 'name')" />
          </div>

          <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:items-end">
            <NxInputNumber
              :model-value="row.quantity"
              label="Cantidad"
              size="sm"
              :currency="false"
              :min="0.01"
              :error="errorFor(index, 'quantity')"
              @update:model-value="row.quantity = $event ?? 1"
            />
            <NxInputNumber
              :model-value="row.unit_price"
              label="Precio unitario"
              size="sm"
              :min="0"
              :error="errorFor(index, 'unit_price')"
              @update:model-value="row.unit_price = $event"
            />
            <NxSelect
              :model-value="row.user_id"
              :options="staff"
              option-label="name"
              option-value="id"
              label="Atendió (opcional)"
              size="sm"
              @update:model-value="row.user_id = $event as number | null"
            />
            <div class="flex flex-col gap-1">
              <p class="text-xs font-medium text-slate-500">Subtotal</p>
              <p class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right text-sm tabular-nums text-slate-600">
                {{ subtotalLabel(row) }}
              </p>
            </div>
          </div>
          <NxInput v-model="row.notes" label="Nota (opcional)" size="sm" />
        </div>
        <button
          type="button"
          class="mt-3 shrink-0 text-slate-300 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="rows.length === 1"
          title="Eliminar fila"
          @click="removeRow(index)"
        >
          <i class="pi pi-times" />
        </button>
      </div>
    </div>

    <button type="button" class="self-start text-sm font-semibold text-indigo-600 hover:text-indigo-800" @click="addRow">
      + Añadir fila
    </button>
  </div>
</template>
