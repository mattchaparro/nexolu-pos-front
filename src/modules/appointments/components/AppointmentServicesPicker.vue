<script setup lang="ts">
// Selector de servicios de una cita (chips + agregar) - StoreAppointmentRequest
// exige al menos uno (services: required|array|min:1). custom_price solo
// aplica a servicios con price_varies_at_sale (ver
// AppointmentService::resolveServiceLines()).
import { computed } from 'vue'

import type { AppointmentServiceLineInput } from '@/types/appointment'
import type { Product } from '@/types/product'
import { NxInputNumber, NxSelect } from '@/ui'
import { formatCop } from '@/utils/formatCop'

const props = defineProps<{
  modelValue: AppointmentServiceLineInput[]
  services: Product[]
  error?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: AppointmentServiceLineInput[]] }>()

function serviceFor(id: number): Product | undefined {
  return props.services.find((s) => s.id === id)
}

function addService(id: number | null): void {
  if (id === null || props.modelValue.some((s) => s.id === id)) {
    return
  }
  emit('update:modelValue', [...props.modelValue, { id, custom_price: null }])
}

function removeService(id: number): void {
  emit(
    'update:modelValue',
    props.modelValue.filter((s) => s.id !== id),
  )
}

function updatePrice(id: number, price: number | null): void {
  emit(
    'update:modelValue',
    props.modelValue.map((s) => (s.id === id ? { ...s, custom_price: price } : s)),
  )
}

const availableServices = computed(() => props.services.filter((s) => !props.modelValue.some((sel) => sel.id === s.id)))
</script>

<template>
  <div class="flex flex-col gap-2">
    <NxSelect
      :model-value="null"
      :options="availableServices"
      option-label="name"
      option-value="id"
      label="Agregar servicio"
      filter
      :error="error"
      @update:model-value="addService($event as number | null)"
    />
    <div v-for="line in modelValue" :key="line.id" class="flex items-center gap-2 rounded-lg border border-slate-200 p-2">
      <span class="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{{ serviceFor(line.id)?.name }}</span>
      <NxInputNumber
        v-if="serviceFor(line.id)?.price_varies_at_sale"
        :model-value="line.custom_price"
        placeholder="Precio"
        size="sm"
        class="w-32"
        :min="0"
        @update:model-value="updatePrice(line.id, $event)"
      />
      <span v-else class="shrink-0 text-xs text-slate-400">{{ formatCop(serviceFor(line.id)?.price ?? 0) }}</span>
      <button type="button" class="shrink-0 text-slate-300 hover:text-red-500" title="Quitar" @click="removeService(line.id)">
        <i class="pi pi-times text-sm" />
      </button>
    </div>
  </div>
</template>
