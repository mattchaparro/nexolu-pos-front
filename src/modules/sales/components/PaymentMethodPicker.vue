<script setup lang="ts">
import type { BusinessPaymentMethod } from '@/types/business'

defineProps<{
  methods: BusinessPaymentMethod[]
  modelValue: string | null
}>()

defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
    <button
      v-for="method in methods"
      :key="method.id"
      type="button"
      class="rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
      :class="
        modelValue === method.id
          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
          : 'border-slate-200 text-slate-600 hover:border-slate-300'
      "
      @click="$emit('update:modelValue', method.id)"
    >
      {{ method.label }}
    </button>
  </div>
</template>
