<script setup lang="ts">
// Ajustar stock (entrada/salida/ajuste) para un producto o un insumo -
// mismo modal para los dos casos (subject.kind decide el endpoint real via
// useStockMovements). "Entrada" y "Ajuste" tienen un solo motivo posible
// (manual_in/adjustment) asi que no se pide elegirlo - "Salida" si, porque
// la distincion desperdicio/daño es la que de verdad importa para
// trazabilidad (ver StockMovementReasonSeeder). Sin motivo elegido el
// backend cae en un default sensato por tipo de todas formas.
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { StockMovementType } from '@/types/inventory'
import { NxButton, NxInput, NxInputNumber, NxModal, NxSelect } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { useStockMovementReasons } from '../composables/useStockMovementReasons'
import { type StockSubjectKind, useStockMovements } from '../composables/useStockMovements'

export interface StockSubject {
  kind: StockSubjectKind
  id: number
  name: string
  stock: number
  unit?: string
}

const props = defineProps<{
  modelValue: boolean
  subject: StockSubject | null
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { notify } = useSystemAlert()
const reasonsQuery = useStockMovementReasons()

const kind = computed<StockSubjectKind>(() => props.subject?.kind ?? 'product')
const subjectId = computed(() => props.subject?.id ?? null)
const { movementsQuery, createMutation } = useStockMovements(kind, subjectId)

const type = ref<StockMovementType>('entry')
const quantity = ref<number | null>(null)
const reasonId = ref<number | null>(null)
const unitCost = ref<number | null>(null)
const notes = ref('')
const formError = ref<string | null>(null)

function resetForm(): void {
  type.value = 'entry'
  quantity.value = null
  reasonId.value = null
  unitCost.value = null
  notes.value = ''
  formError.value = null
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      resetForm()
    }
  },
)

// Codigos permitidos por tipo (ver docblock arriba) - entry/adjustment
// tienen uno solo, exit ofrece elegir entre desperdicio/daño.
const EXIT_REASON_CODES = ['waste', 'damage']

const exitReasonOptions = computed(
  () => reasonsQuery.data.value?.filter((r) => EXIT_REASON_CODES.includes(r.code)) ?? [],
)

watch(type, (value) => {
  reasonId.value = value === 'exit' ? (exitReasonOptions.value[0]?.id ?? null) : null
  unitCost.value = null
})

const unitLabel = computed(() => props.subject?.unit ?? 'unidades')

const quantityLabel = computed(() => {
  if (type.value === 'adjustment') {
    return 'Nuevo stock'
  }
  return type.value === 'entry' ? `Cantidad a agregar (${unitLabel.value})` : `Cantidad a retirar (${unitLabel.value})`
})

const canSubmit = computed(() => quantity.value !== null && quantity.value >= 0)

async function submit(): Promise<void> {
  formError.value = null
  if (!canSubmit.value || quantity.value === null) {
    return
  }

  try {
    await createMutation.mutateAsync({
      type: type.value,
      quantity: quantity.value,
      unit_cost_cop: type.value === 'entry' ? (unitCost.value ?? undefined) : undefined,
      stock_movement_reason_id: reasonId.value ?? undefined,
      notes: notes.value.trim() || undefined,
    })
    notify('Movimiento de stock registrado')
    quantity.value = null
    notes.value = ''
  } catch (error) {
    formError.value = extractErrorMessage(error, 'No pudimos registrar el movimiento.')
  }
}

function movementIcon(movementType: StockMovementType): string {
  if (movementType === 'entry') {
    return 'pi pi-arrow-down text-emerald-600'
  }
  if (movementType === 'exit') {
    return 'pi pi-arrow-up text-red-500'
  }
  return 'pi pi-sliders-h text-slate-500'
}
</script>

<template>
  <NxModal
    :model-value="modelValue"
    :title="subject ? `Ajustar stock — ${subject.name}` : 'Ajustar stock'"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="subject" class="flex flex-col gap-4">
      <p class="text-sm text-slate-500">
        Stock actual: <strong class="text-slate-900">{{ subject.stock }} {{ unitLabel }}</strong>
      </p>

      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>

      <div class="grid grid-cols-3 gap-2">
        <button
          type="button"
          class="flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors"
          :class="type === 'entry' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'"
          @click="type = 'entry'"
        >
          <i class="pi pi-arrow-down text-base" /> Entrada
        </button>
        <button
          type="button"
          class="flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors"
          :class="type === 'exit' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'"
          @click="type = 'exit'"
        >
          <i class="pi pi-arrow-up text-base" /> Salida
        </button>
        <button
          type="button"
          class="flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors"
          :class="type === 'adjustment' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'"
          @click="type = 'adjustment'"
        >
          <i class="pi pi-sliders-h text-base" /> Ajuste
        </button>
      </div>

      <NxInputNumber v-model="quantity" :label="quantityLabel" :min="0" :currency="false" />

      <NxSelect
        v-if="type === 'exit'"
        :model-value="reasonId"
        :options="exitReasonOptions"
        option-label="label"
        option-value="id"
        label="Motivo"
        @update:model-value="reasonId = $event as number | null"
      />

      <NxInputNumber v-if="type === 'entry'" v-model="unitCost" label="Costo unitario (opcional)" :min="0" />

      <NxInput v-model="notes" label="Notas (opcional)" />

      <div v-if="movementsQuery.data.value?.data.length" class="flex flex-col gap-1.5">
        <p class="text-xs font-semibold text-slate-500">Últimos movimientos</p>
        <div class="flex flex-col divide-y divide-slate-100 rounded-lg border border-slate-200">
          <div
            v-for="movement in movementsQuery.data.value.data.slice(0, 5)"
            :key="movement.id"
            class="flex items-center gap-2 px-3 py-2 text-xs"
          >
            <i :class="movementIcon(movement.type)" />
            <span class="flex-1 truncate text-slate-600">
              {{ movement.reason?.label ?? movement.type }}
              <span v-if="movement.notes" class="text-slate-400">· {{ movement.notes }}</span>
            </span>
            <span class="shrink-0 font-semibold text-slate-900">{{ movement.quantity }}</span>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-1" @click="emit('update:modelValue', false)">Cerrar</NxButton>
        <NxButton class="flex-1" :disabled="!canSubmit" :loading="createMutation.isPending.value" @click="submit">
          Registrar
        </NxButton>
      </div>
    </template>
  </NxModal>
</template>
