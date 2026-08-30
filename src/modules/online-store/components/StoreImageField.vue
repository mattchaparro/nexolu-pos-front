<script setup lang="ts">
// Una ranura de imagen de la tienda (logo, banner, hero, historia). Sube y
// reemplaza en el acto: no hay "guardar" porque el archivo ya viajó.
import { ref } from 'vue'

import type { StoreImageSlot } from '@/types/store'
import { NxButton } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { useStoreSettings } from '../composables/useStoreSettings'

// `imageSlot` y no `slot`: `slot` es un atributo reservado de Vue y como
// nombre de prop es una trampa esperando a pasar.
const props = defineProps<{
  imageSlot: StoreImageSlot
  label: string
  hint?: string
  url: string | null
  /** Los logos se ven mejor cuadrados; banner y hero, apaisados. */
  aspect?: 'square' | 'wide'
}>()

const { uploadImageMutation, deleteImageMutation } = useStoreSettings()
const input = ref<HTMLInputElement | null>(null)
const error = ref<string | null>(null)

async function onPicked(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  error.value = null
  if (!file) {
    return
  }
  try {
    await uploadImageMutation.mutateAsync({ slot: props.imageSlot, file })
  } catch (e) {
    error.value = extractErrorMessage(e, 'No pudimos subir la imagen.')
  }
  target.value = ''
}

async function remove(): Promise<void> {
  error.value = null
  try {
    await deleteImageMutation.mutateAsync(props.imageSlot)
  } catch (e) {
    error.value = extractErrorMessage(e, 'No pudimos quitar la imagen.')
  }
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <p class="text-xs font-semibold text-slate-600">{{ label }}</p>

    <div
      class="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
      :class="aspect === 'wide' ? 'aspect-[3/1]' : 'h-24 w-24'"
    >
      <img v-if="url" :src="url" :alt="label" class="h-full w-full object-cover" />
      <div v-else class="flex h-full w-full items-center justify-center text-slate-300">
        <i class="pi pi-image" />
      </div>
    </div>

    <input
      ref="input"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="hidden"
      @change="onPicked"
    />

    <div class="flex items-center gap-2">
      <NxButton
        variant="outline"
        size="sm"
        :disabled="uploadImageMutation.isPending.value"
        @click="input?.click()"
      >
        {{ url ? 'Cambiar' : 'Subir' }}
      </NxButton>
      <button
        v-if="url"
        type="button"
        class="text-xs font-semibold text-red-500 hover:text-red-700"
        :disabled="deleteImageMutation.isPending.value"
        @click="remove"
      >
        Quitar
      </button>
    </div>

    <p v-if="hint" class="text-[11px] text-slate-400">{{ hint }}</p>
    <p v-if="error" class="text-[11px] text-red-600">{{ error }}</p>
  </div>
</template>
