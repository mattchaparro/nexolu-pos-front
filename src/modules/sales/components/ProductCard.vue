<script setup lang="ts">
// Calcado de la tarjeta de producto de SalesTerminal.vue del legacy: mismo
// alto/densidad (2 bloques via justify-between, no un stack uniforme) y
// mismo stock SIEMPRE visible (no solo cuando esta bajo). El acento del
// icono y la etiqueta es el tono de la categoria (ver utils/categoryTone.ts):
// como en el legacy ayuda a ubicarse en la grilla, pero con una paleta
// acordada en vez de colores al azar por id.
import { computed, ref } from 'vue'

import type { Product } from '@/types/product'
import { NEUTRAL_CATEGORY_TONE, type CategoryTone } from '@/utils/categoryTone'
import { formatCop } from '@/utils/formatCop'

const props = defineProps<{ product: Product; tone?: CategoryTone }>()

const accent = computed(() => props.tone ?? NEUTRAL_CATEGORY_TONE)

const emit = defineEmits<{ click: [] }>()

// Feedback visual del tap: borde/sombra + un oscurecido breve de toda la
// card (mas notorio que la sombra sola) - sin icono superpuesto, eso le
// quitaba visibilidad al producto. Se suma a la alerta de sistema (NxToast)
// que dispara la pantalla que escucha "click".
const justAdded = ref(false)

function handleClick(): void {
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

const isDisabled = computed(() => props.product.track_stock && props.product.stock <= 0)
</script>

<template>
  <button
    type="button"
    class="relative flex min-h-[90px] flex-col justify-between rounded-xl border-2 bg-white p-3 text-left transition-all sm:min-h-[100px] sm:p-4"
    :class="[
      isDisabled
        ? 'cursor-not-allowed border-slate-100 opacity-50'
        : 'border-slate-200 hover:border-indigo-300 hover:shadow-md active:scale-95',
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
      <div v-if="justAdded" class="pointer-events-none absolute inset-0 rounded-xl bg-slate-900/15" />
    </Transition>
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
  </button>
</template>
