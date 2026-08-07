<script setup lang="ts">
import { NxFormField, NxInput } from '@/ui'

defineProps<{
  name: string
  phone: string
  identification: string
  required: boolean
}>()

defineEmits<{
  'update:name': [value: string]
  'update:phone': [value: string]
  'update:identification': [value: string]
}>()
</script>

<template>
  <details class="rounded-lg border border-slate-200" :open="required">
    <summary class="cursor-pointer select-none px-3 py-2 text-sm font-medium text-slate-700">
      Datos del cliente
      <span v-if="required" class="text-red-600">(obligatorio para fiado)</span>
    </summary>
    <div class="flex flex-col gap-3 border-t border-slate-200 p-3">
      <NxFormField label="Nombre">
        <NxInput
          :model-value="name"
          placeholder="Nombre del cliente"
          @update:model-value="$emit('update:name', $event)"
        />
      </NxFormField>
      <div class="grid grid-cols-2 gap-3">
        <NxFormField label="Teléfono">
          <NxInput
            :model-value="phone"
            placeholder="300 000 0000"
            @update:model-value="$emit('update:phone', $event)"
          />
        </NxFormField>
        <NxFormField label="Cédula">
          <NxInput
            :model-value="identification"
            placeholder="Documento"
            @update:model-value="$emit('update:identification', $event)"
          />
        </NxFormField>
      </div>
    </div>
  </details>
</template>
