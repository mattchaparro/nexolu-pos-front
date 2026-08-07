<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type { Product } from '@/types/product'
import { NxButton, NxFormField, NxInput, NxModal } from '@/ui'

const props = defineProps<{
  modelValue: boolean
  product: Product | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [price: number]
}>()

const priceInput = ref('')

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      priceInput.value = ''
    }
  },
)

const parsedPrice = computed(() => {
  const value = Number(priceInput.value)
  return Number.isFinite(value) && value >= 0 ? value : null
})

function confirm(): void {
  if (parsedPrice.value === null) {
    return
  }
  emit('confirm', parsedPrice.value)
  emit('update:modelValue', false)
}
</script>

<template>
  <NxModal
    :model-value="modelValue"
    :title="product?.name ?? 'Precio'"
    size="sm"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <NxFormField label="Precio a cobrar" required>
      <NxInput
        v-model="priceInput"
        type="number"
        placeholder="0"
        autocomplete="off"
        @keyup.enter="confirm"
      />
    </NxFormField>

    <template #footer>
      <div class="flex justify-end gap-2">
        <NxButton variant="outline" @click="$emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton :disabled="parsedPrice === null" @click="confirm">Agregar</NxButton>
      </div>
    </template>
  </NxModal>
</template>
