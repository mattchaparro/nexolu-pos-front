<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { NxButton, NxFormField, NxInput, NxModal } from '@/ui'
import { formatCop } from '@/utils/formatCop'

const props = defineProps<{
  modelValue: boolean
  total: number
  submitting: boolean
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()

const receivedInput = ref('')

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      receivedInput.value = String(Math.round(props.total))
    }
  },
)

const received = computed(() => {
  const value = Number(receivedInput.value)
  return Number.isFinite(value) ? value : 0
})

const change = computed(() => received.value - props.total)
const canConfirm = computed(() => change.value >= -0.01)
</script>

<template>
  <NxModal
    :model-value="modelValue"
    title="Cobrar en efectivo"
    size="sm"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-4">
      <p class="text-center text-2xl font-bold text-slate-900">{{ formatCop(total) }}</p>

      <NxFormField label="Monto recibido">
        <NxInput
          v-model="receivedInput"
          type="number"
          autocomplete="off"
          @keyup.enter="canConfirm && $emit('confirm')"
        />
      </NxFormField>

      <button
        type="button"
        class="self-start text-xs font-medium text-indigo-600 hover:text-indigo-700"
        @click="receivedInput = String(Math.round(total))"
      >
        Monto exacto
      </button>

      <p
        class="rounded-lg px-3 py-2 text-center text-sm font-semibold"
        :class="canConfirm ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'"
      >
        {{ canConfirm ? `Vueltas: ${formatCop(change)}` : `Falta ${formatCop(-change)}` }}
      </p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <NxButton
          variant="outline"
          :disabled="submitting"
          @click="$emit('update:modelValue', false)"
          >Cancelar</NxButton
        >
        <NxButton :disabled="!canConfirm" :loading="submitting" @click="$emit('confirm')"
          >Confirmar cobro</NxButton
        >
      </div>
    </template>
  </NxModal>
</template>
