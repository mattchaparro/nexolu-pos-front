<script setup lang="ts">
// Cambiar los productos de un apartado - puerto del modal "Editar items"
// de Layaways/Show.vue. Reusa el mismo editor de filas que Create, solo
// cambia el destino (PUT /layaways/{id}/items en vez de POST /layaways).
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { Layaway, LayawayItemInput } from '@/types/layaway'
import { NxButton, NxModal } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'
import { formatCop } from '@/utils/formatCop'

import { useLayawayMutations } from '../composables/useLayawayMutations'
import { useLayawayProductOptions } from '../composables/useLayawayProductOptions'
import { newLayawayLineRow, type LayawayLineRow } from '../support/layawayLine'
import LayawayLinesEditor from './LayawayLinesEditor.vue'

const props = defineProps<{
  modelValue: boolean
  layaway: Layaway | null
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { notify } = useSystemAlert()
const { updateItemsMutation } = useLayawayMutations()
const productsQuery = useLayawayProductOptions()

const rows = ref<LayawayLineRow[]>([newLayawayLineRow()])
const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)

watch(
  () => props.modelValue,
  (open) => {
    if (!open || !props.layaway) {
      return
    }
    rows.value = props.layaway.items.length
      ? props.layaway.items.map((item) => ({
          uid: crypto.randomUUID(),
          product_id: item.product?.id ?? null,
          quantity: item.quantity,
          // LayawayItem.unit_price es decimal:2 en el backend (llega como
          // string "3000.00") - Number() para que NxInputNumber reciba un
          // numero real.
          unit_price: Number(item.unit_price),
        }))
      : [newLayawayLineRow()]
    fieldErrors.value = {}
    formError.value = null
  },
)

const newTotal = computed(() =>
  rows.value.reduce((sum, row) => sum + (Number(row.unit_price) || 0) * row.quantity, 0),
)
const newBalance = computed(() => Math.max(0, newTotal.value - (props.layaway?.paid ?? 0)))

async function submit(): Promise<void> {
  if (!props.layaway) {
    return
  }
  fieldErrors.value = {}
  formError.value = null

  const items: LayawayItemInput[] = rows.value.map((row) => ({
    product_id: row.product_id as number,
    quantity: row.quantity,
    unit_price: row.unit_price,
  }))

  try {
    await updateItemsMutation.mutateAsync({ id: props.layaway.id, items })
    notify('Productos actualizados')
    emit('update:modelValue', false)
  } catch (error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) {
      fieldErrors.value = fields
    } else {
      formError.value = extractErrorMessage(error, 'No pudimos actualizar los productos.')
    }
  }
}
</script>

<template>
  <NxModal :model-value="modelValue" title="Cambiar productos" size="lg" @update:model-value="emit('update:modelValue', $event)">
    <div v-if="layaway" class="flex flex-col gap-4">
      <p class="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
        El stock se ajustará según los cambios: se libera lo que ya no aplica y se reserva lo nuevo.
      </p>
      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>

      <LayawayLinesEditor v-model="rows" :products="productsQuery.data.value ?? []" :errors="fieldErrors" />
      <p v-if="fieldErrors.items" class="text-xs text-red-600">{{ fieldErrors.items }}</p>

      <div class="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
        <span class="text-slate-500">Nuevo total: <strong class="text-slate-900">{{ formatCop(newTotal) }}</strong></span>
        <span class="text-slate-500">Nuevo saldo: <strong class="text-slate-900">{{ formatCop(newBalance) }}</strong></span>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-none" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-1" :loading="updateItemsMutation.isPending.value" @click="submit">Guardar cambios</NxButton>
      </div>
    </template>
  </NxModal>
</template>
