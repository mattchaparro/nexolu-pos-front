<script setup lang="ts">
// Cerrar turno: contar el efectivo real y compararlo contra lo esperado en
// vivo, en lenguaje llano (sobra/falta/cuadra) en vez de solo un numero -
// para que un cajero sin experiencia contable entienda de inmediato si algo
// no cuadra antes de confirmar.
import { computed, ref, watch } from 'vue'

import type { CashShift } from '@/types/cashShift'
import { NxButton, NxInputNumber, NxModal, NxTextarea } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { formatCop } from '@/utils/formatCop'

import { useCashDifference } from '../composables/useCashDifference'
import { useCashShiftMutations } from '../composables/useCashShiftMutations'

const props = defineProps<{
  modelValue: boolean
  shift: CashShift | null
  expectedCash: number
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const countedCash = ref<number | null>(null)
const closingNote = ref('')
const formError = ref<string | null>(null)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      countedCash.value = null
      closingNote.value = ''
      formError.value = null
    }
  },
)

const expectedCash = computed(() => props.expectedCash)
const { tone: differenceTone, message: differenceMessage } = useCashDifference(countedCash, expectedCash)

const { closeMutation } = useCashShiftMutations()

async function submit(): Promise<void> {
  if (!props.shift || countedCash.value === null) {
    return
  }
  formError.value = null
  try {
    await closeMutation.mutateAsync({
      id: props.shift.id,
      payload: { counted_cash: countedCash.value, closing_note: closingNote.value.trim() || undefined },
    })
    emit('update:modelValue', false)
  } catch (error) {
    formError.value = extractErrorMessage(error, 'No pudimos cerrar el turno.')
  }
}
</script>

<template>
  <NxModal :model-value="modelValue" title="Cerrar mi turno" size="md" @update:model-value="emit('update:modelValue', $event)">
    <div class="flex flex-col gap-4">
      <p class="text-sm text-slate-500">
        Efectivo esperado en caja: <strong class="text-slate-900">{{ formatCop(expectedCash) }}</strong>
      </p>

      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>

      <NxInputNumber v-model="countedCash" label="Efectivo real contado" required />

      <p
        v-if="differenceMessage"
        class="rounded-lg px-3 py-2 text-xs"
        :class="{
          'bg-emerald-50 text-emerald-700': differenceTone === 'ok',
          'bg-amber-50 text-amber-700': differenceTone === 'over',
          'bg-red-50 text-red-700': differenceTone === 'short',
        }"
      >
        {{ differenceMessage }}
      </p>

      <NxTextarea v-model="closingNote" label="Nota (opcional)" :rows="2" />
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-none" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-1" :disabled="countedCash === null" :loading="closeMutation.isPending.value" @click="submit">
          Confirmar cierre
        </NxButton>
      </div>
    </template>
  </NxModal>
</template>
