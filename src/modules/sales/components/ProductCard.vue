<script setup lang="ts">
// Calcado de la tarjeta de producto de SalesTerminal.vue del legacy: mismo
// alto/densidad (2 bloques via justify-between, no un stack uniforme) y
// mismo stock SIEMPRE visible (no solo cuando esta bajo). El acento del
// icono y la etiqueta es el tono de la categoria (ver utils/categoryTone.ts):
// como en el legacy ayuda a ubicarse en la grilla, pero con una paleta
// acordada en vez de colores al azar por id.
//
// Dos presentaciones, segun Ajustes › Ventas › "Mostrar fotos":
//  - la de siempre (icono de categoria, nombre, categoria, precio y stock);
//  - con foto: cuadrada arriba (la miniatura de 400 px), nombre y precio abajo.
import { computed, ref } from 'vue'

import type { Product } from '@/types/product'
import { NEUTRAL_CATEGORY_TONE, type CategoryTone } from '@/utils/categoryTone'
import { formatCop } from '@/utils/formatCop'

const props = withDefaults(
  defineProps<{
    product: Product
    tone?: CategoryTone
    /** Foto cuadrada arriba, nombre y precio abajo. */
    showPhoto?: boolean
    /** Modo "Organizar": tocar la tarjeta fija/suelta el producto en vez de venderlo. */
    organizing?: boolean
    pinned?: boolean
    canMoveEarlier?: boolean
    canMoveLater?: boolean
  }>(),
  { tone: undefined, showPhoto: false, organizing: false, pinned: false, canMoveEarlier: false, canMoveLater: false },
)

const accent = computed(() => props.tone ?? NEUTRAL_CATEGORY_TONE)

const emit = defineEmits<{ click: []; 'toggle-pin': []; move: [offset: -1 | 1] }>()

// Si la foto no carga (enlace roto, sin red) se cae al icono de categoria.
const imageFailed = ref(false)
const photoUrl = computed(() => (imageFailed.value ? null : (props.product.image_thumbnail ?? props.product.image)))

// Feedback visual del tap: borde/sombra + un oscurecido breve de toda la
// card (mas notorio que la sombra sola) - sin icono superpuesto, eso le
// quitaba visibilidad al producto. Se suma a la alerta de sistema (NxToast)
// que dispara la pantalla que escucha "click".
const justAdded = ref(false)

function handleClick(): void {
  if (props.organizing) {
    emit('toggle-pin')
    return
  }

  emit('click')
  justAdded.value = true
  window.setTimeout(() => {
    justAdded.value = false
  }, 450)
}

const stockBadge = computed(() => {
  if (!props.product.track_stock) {
    return { label: '∞', class: 'bg-slate-100 text-slate-500' }
  }
  if (props.product.stock <= 0) {
    return { label: '0', class: 'bg-red-100 text-red-600' }
  }
  // null = usa el umbral por defecto del negocio (ver low_stock_alert_threshold
  // en Business, default 5 del lado del backend).
  if (props.product.stock <= (props.product.low_stock_alert_threshold ?? 5)) {
    return { label: String(props.product.stock), class: 'bg-amber-100 text-amber-600' }
  }
  return { label: String(props.product.stock), class: 'bg-slate-100 text-slate-500' }
})

// Organizando, un producto sin stock tambien se puede fijar.
const isDisabled = computed(() => !props.organizing && props.product.track_stock && props.product.stock <= 0)
</script>

<template>
  <div class="relative">
    <button
      type="button"
      class="relative flex h-full w-full flex-col rounded-xl border-2 bg-white text-left transition-all"
      :class="[
        showPhoto ? 'overflow-hidden' : 'min-h-[90px] justify-between p-3 sm:min-h-[100px] sm:p-4',
        isDisabled
          ? 'cursor-not-allowed border-slate-100 opacity-50'
          : 'border-slate-200 hover:border-indigo-300 hover:shadow-md active:scale-95',
        organizing && pinned ? 'border-indigo-400 ring-2 ring-indigo-200' : '',
        justAdded ? 'border-indigo-400 shadow-md' : '',
      ]"
      :disabled="isDisabled"
      @click="handleClick"
    >
      <Transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-300 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="justAdded" class="pointer-events-none absolute inset-0 z-10 rounded-xl bg-slate-900/15" />
      </Transition>

      <!-- Con foto: cuadrada (aspect-square + object-cover), el stock encima. -->
      <template v-if="showPhoto">
        <div class="relative aspect-square w-full bg-slate-100">
          <img
            v-if="photoUrl"
            :src="photoUrl"
            :alt="product.name"
            loading="lazy"
            decoding="async"
            class="h-full w-full object-cover"
            @error="imageFailed = true"
          />
          <div v-else class="flex h-full w-full items-center justify-center" :class="accent.softBg">
            <span class="material-icons text-4xl" :class="accent.iconText">
              {{ product.category?.icon || 'inventory_2' }}
            </span>
          </div>
          <span
            :class="stockBadge.class"
            class="absolute right-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-xs font-semibold shadow-sm"
          >
            {{ stockBadge.label }}
          </span>
        </div>
        <div class="flex min-w-0 flex-1 flex-col justify-between gap-1 p-2.5">
          <span class="line-clamp-2 block text-sm font-semibold leading-tight text-slate-900">
            {{ product.name }}
          </span>
          <span class="text-base font-bold text-indigo-700">
            <template v-if="product.has_variants">Desde {{ formatCop(product.price) }}</template>
            <template v-else>{{ product.price_varies_at_sale ? 'Variable' : formatCop(product.price) }}</template>
          </span>
        </div>
      </template>

      <template v-else>
        <div class="flex min-w-0 items-start gap-2">
          <span class="material-icons mt-0.5 shrink-0 rounded-lg p-1.5 text-lg" :class="[accent.softBg, accent.iconText]">
            {{ product.category?.icon || 'inventory_2' }}
          </span>
          <div class="min-w-0 flex-1">
            <span class="line-clamp-2 block text-sm font-semibold leading-tight text-slate-900">
              {{ product.name }}
            </span>
            <span
              v-if="product.category"
              class="mt-1 inline-block max-w-full truncate rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide capitalize"
              :class="[accent.softBg, accent.labelText]"
            >
              {{ product.category.name }}
            </span>
          </div>
        </div>

        <div class="mt-2 flex items-end justify-between gap-1">
          <span class="text-base font-bold text-indigo-700">
            <template v-if="product.has_variants">Desde {{ formatCop(product.price) }}</template>
            <template v-else>{{ product.price_varies_at_sale ? 'Variable' : formatCop(product.price) }}</template>
          </span>
          <span :class="stockBadge.class" class="rounded-md px-1.5 py-0.5 text-xs font-semibold">
            {{ stockBadge.label }}
          </span>
        </div>
      </template>
    </button>

    <!-- Modo Organizar: el pin y las flechas son hermanos del boton (no hijos:
         un boton dentro de otro no es HTML valido). Las flechas mueven entre
         los fijados, igual que en las fotos del catalogo: arrastrar con el
         dedo es poco confiable en tablet. -->
    <template v-if="organizing">
      <span
        class="pointer-events-none absolute left-1.5 top-1.5 z-20 flex h-7 w-7 items-center justify-center rounded-full shadow-sm"
        :class="pinned ? 'bg-indigo-600 text-white' : 'bg-white/90 text-slate-400'"
      >
        <i class="pi text-xs" :class="pinned ? 'pi-bookmark-fill' : 'pi-bookmark'" />
      </span>
      <div v-if="pinned" class="absolute inset-x-1.5 bottom-1.5 z-20 flex justify-between">
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700 shadow-md disabled:opacity-30"
          aria-label="Mover antes"
          :disabled="!canMoveEarlier"
          @click.stop="emit('move', -1)"
        >
          <i class="pi pi-chevron-left text-xs" />
        </button>
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700 shadow-md disabled:opacity-30"
          aria-label="Mover después"
          :disabled="!canMoveLater"
          @click.stop="emit('move', 1)"
        >
          <i class="pi pi-chevron-right text-xs" />
        </button>
      </div>
    </template>
  </div>
</template>
