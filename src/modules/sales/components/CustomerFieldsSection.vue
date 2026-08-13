<script setup lang="ts">
// Seccion colapsable de datos del cliente (venta directa) - <details>/
// <summary> nativos para el comportamiento de abrir/cerrar, pero sin la
// flecha/triangulo nativo del navegador (se ve distinto en cada browser y
// queda pegada al texto a la izquierda): se oculta ese marker y se pinta un
// chevron propio a la derecha, mas claro como indicador de "colapsable".
import { ref, watch } from 'vue'

import ClientQuickAssociate from '@/modules/clients/components/ClientQuickAssociate.vue'
import type { ClientSearchResult } from '@/types/client'
import { NxInput } from '@/ui'

const props = defineProps<{
  name: string
  phone: string
  identification: string
  required: boolean
}>()

const emit = defineEmits<{
  'update:name': [value: string]
  'update:phone': [value: string]
  'update:identification': [value: string]
}>()

function applyClient(client: ClientSearchResult): void {
  emit('update:name', client.name)
  emit('update:phone', client.phone ?? '')
}

const isOpen = ref(props.required)

watch(
  () => props.required,
  (value) => {
    if (value) {
      isOpen.value = true
    }
  },
)
</script>

<template>
  <details class="rounded-lg border border-slate-200" :open="isOpen" @toggle="isOpen = ($event.target as HTMLDetailsElement).open">
    <summary
      class="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-medium text-slate-700 [&::-webkit-details-marker]:hidden"
    >
      <span>
        Datos del cliente
        <span v-if="required" class="text-red-600">(obligatorio para fiado)</span>
      </span>
      <i class="pi text-xs text-slate-400" :class="isOpen ? 'pi-chevron-up' : 'pi-chevron-down'" />
    </summary>
    <div class="flex flex-col gap-3 border-t border-slate-200 p-3">
      <NxInput
        :model-value="name"
        label="Nombre"
        @update:model-value="$emit('update:name', $event)"
      />
      <div class="grid grid-cols-2 gap-3">
        <NxInput
          :model-value="phone"
          label="Teléfono"
          @update:model-value="$emit('update:phone', $event)"
        />
        <NxInput
          :model-value="identification"
          label="Cédula"
          @update:model-value="$emit('update:identification', $event)"
        />
      </div>
      <ClientQuickAssociate :name="name" :phone="phone" @apply="applyClient" />
    </div>
  </details>
</template>
