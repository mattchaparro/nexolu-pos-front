<script setup lang="ts">
// Galeria de fotos de un producto, en dos modos:
//
// - Producto ya guardado (`productId`): cada accion pega contra la API en el
//   momento. El estado vive en la query de useProductImages.
// - Producto todavia sin guardar (`productId === null`): las fotos se quedan
//   en el navegador con una preview local y las sube ProductFormView despues
//   de crear el producto - el endpoint cuelga de /products/{id}/images y
//   necesita un id real. Sin esto, cargar fotos obligaria a guardar y volver
//   a entrar al producto.
//
// El reordenamiento es con flechas y no arrastrando: el catalogo se
// administra tanto o mas desde el celular que desde el escritorio, y el
// drag & drop tactil es poco confiable ahi.
import { computed, onBeforeUnmount, ref } from 'vue'

import type { PendingProductImage, ProductImage, VariantPhotoTarget } from '@/types/product'
import { NxButton } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { useProductImages } from '../composables/useProductImages'

const props = withDefaults(
  defineProps<{
    productId: number | null
    variantTargets?: VariantPhotoTarget[]
  }>(),
  { variantTargets: () => [] },
)

/**
 * defineModel y no props+emit: cada mutacion reconstruye la lista entera, y
 * leyendo la prop dos cambios seguidos dentro del mismo tick partian los dos
 * de la MISMA version (las props no se actualizan de forma sincrona), asi
 * que el segundo pisaba al primero - asignar dos fotos a dos variantes de
 * corrido perdia la primera asignacion. defineModel mantiene el valor local
 * al dia en la misma escritura.
 */
const pending = defineModel<PendingProductImage[]>('pending', { required: true })

const productId = computed(() => props.productId)
const isPersisted = computed(() => props.productId !== null)

const { imagesQuery, uploadMutation, deleteMutation, updateMutation, reorderMutation } = useProductImages(productId)

const fileInput = ref<HTMLInputElement | null>(null)
const errorMessage = ref<string | null>(null)

const isBusy = computed(
  () =>
    uploadMutation.isPending.value ||
    deleteMutation.isPending.value ||
    updateMutation.isPending.value ||
    reorderMutation.isPending.value,
)

/** Fila de la grilla, agnostica del modo. */
interface PhotoRow {
  key: string
  previewUrl: string
  alt: string
  variantKey: string | null
}

const rows = computed<PhotoRow[]>(() => {
  if (isPersisted.value) {
    return (imagesQuery.data.value ?? []).map((image: ProductImage) => ({
      key: String(image.id),
      previewUrl: image.thumbnail_url,
      alt: image.alt ?? '',
      variantKey: image.product_variant_id === null ? null : String(image.product_variant_id),
    }))
  }

  return pending.value.map((image, index) => ({
    key: `pending-${index}`,
    previewUrl: image.previewUrl,
    alt: '',
    variantKey: image.variantKey,
  }))
})

async function onFilesPicked(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  errorMessage.value = null

  if (!isPersisted.value) {
    pending.value.push(
      ...files.map((file) => ({ file, previewUrl: URL.createObjectURL(file), variantKey: null })),
    )
    input.value = ''
    return
  }

  // Secuencial y no en paralelo: el orden de las fotos lo define el orden de
  // llegada, y varias subidas simultaneas lo dejarian al azar.
  for (const file of files) {
    try {
      await uploadMutation.mutateAsync({ file })
    } catch (error) {
      errorMessage.value = extractErrorMessage(error, 'No se pudo subir la foto.')
      break
    }
  }

  // Permite volver a elegir el mismo archivo despues de un error.
  input.value = ''
}

async function remove(index: number): Promise<void> {
  errorMessage.value = null

  if (!isPersisted.value) {
    URL.revokeObjectURL(pending.value[index].previewUrl)
    pending.value.splice(index, 1)
    return
  }

  try {
    await deleteMutation.mutateAsync(Number(rows.value[index].key))
  } catch (error) {
    errorMessage.value = extractErrorMessage(error, 'No se pudo eliminar la foto.')
  }
}

async function move(index: number, offset: number): Promise<void> {
  const target = index + offset
  if (target < 0 || target >= rows.value.length) {
    return
  }
  errorMessage.value = null

  if (!isPersisted.value) {
    // En sitio, mismo motivo que assignVariant().
    const list = pending.value
    ;[list[index], list[target]] = [list[target], list[index]]
    return
  }

  const ids = rows.value.map((row) => Number(row.key))
  ;[ids[index], ids[target]] = [ids[target], ids[index]]

  try {
    await reorderMutation.mutateAsync(ids)
  } catch (error) {
    errorMessage.value = extractErrorMessage(error, 'No se pudo reordenar las fotos.')
  }
}

async function assignVariant(index: number, rawValue: string): Promise<void> {
  const variantKey = rawValue === '' ? null : rawValue
  errorMessage.value = null

  if (!isPersisted.value) {
    // En sitio, y no reconstruyendo la lista: reemplazar el array entero
    // hacia que dos asignaciones dentro del mismo tick partieran ambas de la
    // version vieja y la segunda pisara a la primera (asignar dos fotos a dos
    // variantes seguidas perdia la primera). Mutar el elemento es visible al
    // instante para el padre, que comparte el mismo array.
    pending.value[index] = { ...pending.value[index], variantKey }
    return
  }

  try {
    await updateMutation.mutateAsync({
      imageId: Number(rows.value[index].key),
      variantId: variantKey === null ? null : Number(variantKey),
    })
  } catch (error) {
    errorMessage.value = extractErrorMessage(error, 'No se pudo asignar la foto a la variante.')
  }
}

// Las previews locales son object URLs: sin revocarlas quedan reteniendo el
// archivo en memoria hasta que se recargue la pagina.
onBeforeUnmount(() => {
  pending.value.forEach((image) => URL.revokeObjectURL(image.previewUrl))
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-if="isPersisted && imagesQuery.isPending.value" class="text-xs text-slate-400">Cargando fotos...</div>

    <div
      v-else-if="rows.length === 0"
      class="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400"
    >
      Sin fotos. La primera que subas será la principal.
    </div>

    <ul v-else class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <li
        v-for="(row, index) in rows"
        :key="row.key"
        class="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
      >
        <img :src="row.previewUrl" :alt="row.alt" class="aspect-square w-full object-cover" />

        <span
          v-if="index === 0"
          class="absolute left-1.5 top-1.5 rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white"
        >
          Principal
        </span>

        <button
          type="button"
          class="absolute right-1.5 top-1.5 rounded bg-white/90 p-1 text-slate-500 hover:text-red-600"
          :disabled="isBusy"
          aria-label="Eliminar foto"
          @click="remove(index)"
        >
          <i class="pi pi-trash text-xs" />
        </button>

        <div class="flex flex-col gap-1 border-t border-slate-200 bg-white px-1.5 py-1">
          <select
            v-if="variantTargets.length > 0"
            :value="row.variantKey ?? ''"
            :disabled="isBusy"
            class="w-full rounded border border-slate-200 px-1 py-0.5 text-[11px] text-slate-600"
            aria-label="Variante de la foto"
            @change="assignVariant(index, ($event.target as HTMLSelectElement).value)"
          >
            <option value="">Todo el producto</option>
            <option v-for="target in variantTargets" :key="target.key" :value="target.key">{{ target.label }}</option>
          </select>

          <div class="flex items-center justify-between">
            <button
              type="button"
              class="rounded p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"
              :disabled="index === 0 || isBusy"
              aria-label="Mover a la izquierda"
              @click="move(index, -1)"
            >
              <i class="pi pi-chevron-left text-xs" />
            </button>
            <button
              type="button"
              class="rounded p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"
              :disabled="index === rows.length - 1 || isBusy"
              aria-label="Mover a la derecha"
              @click="move(index, 1)"
            >
              <i class="pi pi-chevron-right text-xs" />
            </button>
          </div>
        </div>
      </li>
    </ul>

    <p v-if="errorMessage" class="text-xs text-red-600">{{ errorMessage }}</p>

    <p v-if="!isPersisted && rows.length > 0" class="text-xs text-slate-400">
      Se subirán al guardar el producto.
    </p>

    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      multiple
      class="hidden"
      @change="onFilesPicked"
    />

    <div class="flex items-center gap-2">
      <NxButton variant="outline" size="sm" :disabled="isBusy" @click="fileInput?.click()">
        <i class="pi pi-image mr-1.5 text-xs" />
        {{ uploadMutation.isPending.value ? 'Subiendo...' : 'Agregar fotos' }}
      </NxButton>
      <span class="text-xs text-slate-400">JPG, PNG o WebP. Hasta 10 MB cada una.</span>
    </div>
  </div>
</template>
