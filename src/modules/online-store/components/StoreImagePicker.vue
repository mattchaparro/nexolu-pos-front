<script setup lang="ts">
// Elegir una imagen de la biblioteca, o subir una nueva sin salir de aquí.
//
// Es lo que el editor genérico pide por el slot `image-picker`: el paquete
// no sabe de dónde salen las fotos, y así puede reusarse en otro producto
// con otra fuente.
import { computed, ref } from 'vue'

import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { useStoreImageLibrary } from '../composables/useStoreImageLibrary'

const props = defineProps<{
  /** Un id (selección simple) o varios (galería). */
  value: unknown
  multiple?: boolean
  max?: number
}>()
const emit = defineEmits<{ select: [value: unknown] }>()

const { imagesQuery, uploadMutation } = useStoreImageLibrary()
const fileInput = ref<HTMLInputElement | null>(null)
const errorMessage = ref<string | null>(null)

const selectedIds = computed<number[]>(() => {
  if (props.multiple) {
    return Array.isArray(props.value) ? (props.value as number[]) : []
  }
  return typeof props.value === 'number' ? [props.value] : []
})

function isSelected(id: number): boolean {
  return selectedIds.value.includes(id)
}

function toggle(id: number): void {
  if (!props.multiple) {
    // Volver a tocar la misma la deselecciona: es la única forma de dejar
    // un bloque sin imagen después de haberle puesto una.
    emit('select', isSelected(id) ? null : id)
    return
  }

  const current = selectedIds.value
  if (current.includes(id)) {
    emit(
      'select',
      current.filter((value) => value !== id),
    )
    return
  }
  if (props.max !== undefined && current.length >= props.max) {
    return
  }
  emit('select', [...current, id])
}

async function upload(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) {
    return
  }

  errorMessage.value = null
  try {
    const image = await uploadMutation.mutateAsync(file)
    // Recién subida se selecciona sola: subirla y tener que buscarla en la
    // grilla sería un paso de más.
    toggle(image.id)
  } catch (error) {
    errorMessage.value = extractErrorMessage(error, 'No pudimos subir la imagen.')
  } finally {
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="grid grid-cols-4 gap-2 sm:grid-cols-6">
      <button
        v-for="image in imagesQuery.data.value ?? []"
        :key="image.id"
        type="button"
        class="relative aspect-square overflow-hidden rounded-lg border-2 transition"
        :class="isSelected(image.id) ? 'border-indigo-600' : 'border-transparent hover:border-slate-300'"
        @click="toggle(image.id)"
      >
        <img :src="image.thumbnail_url ?? image.url ?? ''" :alt="image.alt ?? ''" class="h-full w-full object-cover" />
        <span
          v-if="multiple && isSelected(image.id)"
          class="absolute right-1 top-1 rounded-full bg-indigo-600 px-1.5 text-[10px] font-bold text-white"
        >
          {{ selectedIds.indexOf(image.id) + 1 }}
        </span>
      </button>

      <button
        type="button"
        class="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-indigo-400 hover:text-indigo-500"
        :disabled="uploadMutation.isPending.value"
        title="Subir imagen"
        @click="fileInput?.click()"
      >
        <i class="pi" :class="uploadMutation.isPending.value ? 'pi-spin pi-spinner' : 'pi-plus'" />
      </button>
    </div>

    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="upload" />

    <p v-if="errorMessage" class="text-xs text-red-600">{{ errorMessage }}</p>
    <p v-else-if="(imagesQuery.data.value ?? []).length === 0" class="text-[11px] text-slate-400">
      Todavía no has subido imágenes. Usa el + para agregar la primera.
    </p>
  </div>
</template>
