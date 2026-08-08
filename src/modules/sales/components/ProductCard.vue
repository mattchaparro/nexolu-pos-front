<script setup lang="ts">
// Calcado de la tarjeta de producto de SalesTerminal.vue del legacy: mismo
// alto/densidad (2 bloques via justify-between, no un stack uniforme) y
// mismo stock SIEMPRE visible (no solo cuando esta bajo). Unica diferencia
// deliberada: el acento de color es indigo fijo para todas las categorias,
// no una paleta rotando por indice (ver README.md "Sistema de color") - el
// legacy no tenia ningun criterio para asignarlos, y ya se decidio no
// repetir esa falta de estandar en este frontend.
import { computed, ref } from 'vue'

import type { Product } from '@/types/product'
import { formatCop } from '@/utils/formatCop'

const props = defineProps<{ product: Product }>()

const emit = defineEmits<{ click: [] }>()

// Feedback visual del tap (borde+sombra, sin icono superpuesto - quitaba
// visibilidad al producto) ademas de la alerta de sistema (NxToast) que
// dispara la pantalla que escucha "click".
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
    <div class="flex min-w-0 items-start gap-2">
      <span class="material-icons mt-0.5 shrink-0 rounded-lg bg-indigo-50 p-1.5 text-lg text-indigo-600">
        {{ product.category?.icon || 'inventory_2' }}
      </span>
      <div class="min-w-0 flex-1">
        <span class="line-clamp-2 block text-sm font-semibold leading-tight text-slate-900">
          {{ product.name }}
        </span>
        <span
          v-if="product.category"
          class="mt-1 inline-block max-w-full truncate rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-indigo-600 capitalize"
        >
          {{ product.category.name }}
        </span>
      </div>
    </div>

    <div class="mt-2 flex items-end justify-between gap-1">
      <span class="text-base font-bold text-indigo-700">
        {{ product.price_varies_at_sale ? 'Variable' : formatCop(product.price) }}
      </span>
      <span :class="stockBadge.class" class="rounded-md px-1.5 py-0.5 text-xs font-semibold">
        {{ stockBadge.label }}
      </span>
    </div>
  </button>
</template>
