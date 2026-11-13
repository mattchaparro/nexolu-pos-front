<script setup lang="ts">
// Seccion colapsable de datos del cliente (venta directa) - <details>/
// <summary> nativos para el comportamiento de abrir/cerrar, pero sin la
// flecha/triangulo nativo del navegador (se ve distinto en cada browser y
// queda pegada al texto a la izquierda): se oculta ese marker y se pinta un
// chevron propio a la derecha, mas claro como indicador de "colapsable".
//
// La direccion es la de ESTA entrega. Si el cliente viene de su ficha
// arranca con la habitual; cambiarla aqui no toca la ficha, salvo que se
// marque "guardar como su direccion".
import { computed, ref, watch } from 'vue'

import ClientQuickAssociate from '@/modules/clients/components/ClientQuickAssociate.vue'
import type { ClientSearchResult } from '@/types/client'
import { NxInput } from '@/ui'

const props = withDefaults(
  defineProps<{
    name: string
    phone: string
    identification: string
    required: boolean
    address?: string
    /** La direccion habitual del cliente vinculado (null = sin cliente). */
    clientAddress?: string | null
    saveAddress?: boolean
    /** Es domicilio: la seccion se abre y la direccion pasa al frente. */
    delivery?: boolean
  }>(),
  { address: '', clientAddress: null, saveAddress: false, delivery: false },
)

const emit = defineEmits<{
  'update:name': [value: string]
  'update:phone': [value: string]
  'update:identification': [value: string]
  'update:address': [value: string]
  'update:saveAddress': [value: boolean]
  'select-client': [client: ClientSearchResult]
}>()

const isOpen = ref(props.required || props.delivery)

watch(
  () => [props.required, props.delivery] as const,
  ([required, delivery]) => {
    if (required || delivery) {
      isOpen.value = true
    }
  },
)

// Lo que ya se lleno, para verlo sin abrir la seccion.
const summary = computed(() =>
  [props.name, props.phone, props.delivery ? props.address : ''].map((v) => v.trim()).filter(Boolean).join(' · '),
)

// Solo se ofrece cuando el cliente ya tenia otra direccion: si no tenia,
// la de esta entrega se le guarda sola.
const addressDiffers = computed(
  () => props.clientAddress !== null && props.clientAddress.trim() !== '' && props.address.trim() !== '' && props.address.trim() !== props.clientAddress.trim(),
)
</script>

<template>
  <details class="rounded-xl border border-slate-200 bg-white" :open="isOpen" @toggle="isOpen = ($event.target as HTMLDetailsElement).open">
    <summary
      class="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden"
    >
      <span class="flex min-w-0 items-center gap-2.5">
        <i class="pi pi-user text-base text-slate-500" />
        <span class="min-w-0">
          <span class="block text-sm font-semibold text-slate-800">
            Datos del cliente
            <span v-if="required" class="font-medium text-red-600">(obligatorio para fiado)</span>
            <span v-else-if="delivery" class="font-medium text-indigo-600">· domicilio</span>
          </span>
          <span v-if="!isOpen && summary" class="block truncate text-xs text-slate-500">{{ summary }}</span>
        </span>
      </span>
      <i class="pi text-sm text-slate-400" :class="isOpen ? 'pi-chevron-up' : 'pi-chevron-down'" />
    </summary>
    <div class="flex flex-col gap-3 border-t border-slate-200 p-4">
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
      <ClientQuickAssociate auto-creates :name="name" :phone="phone" :identification="identification" @apply="emit('select-client', $event)" />
      <div v-if="delivery" class="flex flex-col gap-1.5">
        <NxInput
          :model-value="address"
          label="Dirección de entrega"
          placeholder="Calle 10 # 5-20, apto 301"
          @update:model-value="$emit('update:address', $event)"
        />
        <p v-if="clientAddress && !addressDiffers" class="text-xs text-slate-500">
          Es la dirección guardada del cliente. Si hoy pidió a otra parte, cámbiala solo para esta entrega.
        </p>
        <label v-if="addressDiffers" class="flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            class="h-4 w-4 rounded accent-indigo-600"
            :checked="saveAddress"
            @change="emit('update:saveAddress', ($event.target as HTMLInputElement).checked)"
          />
          Guardar como su nueva dirección (antes: {{ clientAddress }})
        </label>
      </div>
    </div>
  </details>
</template>
