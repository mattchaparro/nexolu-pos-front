<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type { Product } from '@/types/product'
import { NxButton, NxInputNumber, NxModal } from '@/ui'

const props = defineProps<{
  modelValue: boolean
  product: Product | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [price: number]
}>()

const price = ref<number | null>(null)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      price.value = null
    }
  },
)

const parsedPrice = computed(() => (price.value !== null && price.value >= 0 ? price.value : null))

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
    <NxInputNumber v-model="price" label="Precio a cobrar" required :min="0" @keyup.enter="confirm" />

    <template #footer>
      <div class="flex justify-end gap-2">
        <NxButton variant="outline" @click="$emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton :disabled="parsedPrice === null" @click="confirm">Agregar</NxButton>
      </div>
    </template>
  </NxModal>
</template>
