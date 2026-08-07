<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
    error?: string
    for?: string
    required?: boolean
  }>(),
  {
    label: undefined,
    error: undefined,
    for: undefined,
    required: false,
  },
)
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" :for="$props.for" class="text-sm font-medium text-slate-700">
      {{ label }}<span v-if="required" class="text-red-600"> *</span>
    </label>
    <slot />
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
  </div>
</template>
