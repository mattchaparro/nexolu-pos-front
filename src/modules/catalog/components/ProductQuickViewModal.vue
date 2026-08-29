<script setup lang="ts">
// Ficha del producto de un vistazo: galeria, precio, descripcion, variantes
// y stock. Se usa desde el listado del Catalogo (boton "Ver") y desde el
// formulario de crear/editar como vista previa.
//
// Recibe los datos ya armados y no consulta nada: en el formulario el
// producto todavia puede no existir, y las fotos ser previews locales que
// solo viven en el navegador. Por eso `photos` llega como una lista de URLs
// y no como ProductImage[].
//
// Deliberadamente NO imita la ficha publica de la tienda online: cuando
// exista nexolu-store-front, "ver como se veria" sera abrir la URL publica
// real, no una copia del diseño mantenida en dos repos.
import { computed, ref, watch } from 'vue'

import { NxModal } from '@/ui'
import { formatCop } from '@/utils/formatCop'

export interface QuickViewVariant {
  label: string
  sku?: string | null
  price?: number | null
  stock?: number | null
  isActive?: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    name: string
    categoryName?: string | null
    description?: string | null
    price?: number | null
    priceVariesAtSale?: boolean
    photos?: string[]
    variants?: QuickViewVariant[]
    stock?: number | null
    trackStock?: boolean
    isActive?: boolean
    isService?: boolean
  }>(),
  {
    photos: () => [],
    variants: () => [],
    categoryName: null,
    description: null,
    price: null,
    stock: null,
    priceVariesAtSale: false,
    trackStock: true,
    isActive: true,
    isService: false,
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const open = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const selectedPhoto = ref(0)
watch(
  () => [props.modelValue, props.photos.length],
  () => {
    selectedPhoto.value = 0
  },
)

const hasVariants = computed(() => props.variants.length > 0)

/** Con variantes el precio del producto es "desde": el de la mas barata. */
const displayPrice = computed(() => {
  if (props.priceVariesAtSale) {
    return 'Variable'
  }
  if (hasVariants.value) {
    const prices = props.variants.map((v) => Number(v.price) || 0).filter((p) => p > 0)
    return prices.length > 0 ? `Desde ${formatCop(Math.min(...prices))}` : formatCop(props.price ?? 0)
  }
  return formatCop(props.price ?? 0)
})

const totalStock = computed(() => {
  if (hasVariants.value) {
    return props.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)
  }
  return props.stock ?? 0
})
</script>

<template>
  <NxModal v-model="open" :title="name || 'Producto sin nombre'" size="lg">
    <div class="flex flex-col gap-4 sm:flex-row">
      <div class="w-full shrink-0 sm:w-64">
        <div class="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <img
            v-if="photos.length > 0"
            :src="photos[selectedPhoto]"
            :alt="name"
            class="aspect-square w-full object-cover"
          />
          <div v-else class="flex aspect-square w-full items-center justify-center text-slate-300">
            <i class="pi pi-image" style="font-size: 2.5rem" />
          </div>
        </div>

        <div v-if="photos.length > 1" class="mt-2 flex gap-2 overflow-x-auto">
          <button
            v-for="(photo, index) in photos"
            :key="index"
            type="button"
            class="shrink-0 overflow-hidden rounded-lg border-2"
            :class="index === selectedPhoto ? 'border-indigo-600' : 'border-transparent'"
            @click="selectedPhoto = index"
          >
            <img :src="photo" :alt="`${name} ${index + 1}`" class="h-12 w-12 object-cover" />
          </button>
        </div>
      </div>

      <div class="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <p class="flex flex-wrap items-center gap-2">
            <span class="text-lg font-semibold text-slate-900">{{ displayPrice }}</span>
            <span
              v-if="isActive === false"
              class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500"
            >
              Pausado
            </span>
            <span
              v-if="isService"
              class="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600"
            >
              Servicio
            </span>
          </p>
          <p class="mt-0.5 text-xs text-slate-400">{{ categoryName || 'Sin categoría' }}</p>
        </div>

        <p v-if="description" class="text-sm whitespace-pre-line text-slate-600">{{ description }}</p>
        <p v-else class="text-sm text-slate-300 italic">Sin descripción.</p>

        <div v-if="!isService" class="rounded-lg border border-slate-200 px-3 py-2">
          <p class="text-xs text-slate-400">Inventario</p>
          <p class="text-sm font-semibold text-slate-800">
            <template v-if="trackStock === false">No controla inventario</template>
            <template v-else>{{ totalStock }} unidades</template>
          </p>
        </div>

        <div v-if="hasVariants" class="flex flex-col gap-1.5">
          <p class="text-xs font-semibold tracking-wide text-slate-400 uppercase">Variaciones</p>
          <div
            v-for="(variant, index) in variants"
            :key="index"
            class="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
            :class="variant.isActive === false ? 'opacity-50' : ''"
          >
            <span class="min-w-0 truncate font-medium text-slate-700">
              {{ variant.label }}
              <span v-if="variant.sku" class="ml-1 text-[11px] font-normal text-slate-400">{{ variant.sku }}</span>
            </span>
            <span class="shrink-0 text-slate-500">
              {{ formatCop(variant.price ?? 0) }}
              <span class="ml-1 text-xs text-slate-400">· {{ variant.stock ?? 0 }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </NxModal>
</template>
