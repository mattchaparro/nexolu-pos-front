<script setup lang="ts">
// Selector rapido de variante al tocar un producto con has_variants en
// Vender - reemplaza el "agregar directo" del resto de tarjetas (ver
// SellView::handleSelectProduct). Las variantes ya vienen embebidas en
// product.variants (ProductController::sellable() las carga cuando el
// negocio tiene la feature "variants"), sin ida y vuelta al backend.
import type { Product, ProductVariant } from '@/types/product'
import { NxModal } from '@/ui'
import { formatCop } from '@/utils/formatCop'

defineProps<{
  modelValue: boolean
  product: Product | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  select: [variant: ProductVariant]
}>()

function choose(variant: ProductVariant): void {
  if (!variant.is_active || variant.stock <= 0) {
    return
  }
  emit('select', variant)
  emit('update:modelValue', false)
}
</script>

<template>
  <NxModal
    :model-value="modelValue"
    :title="product?.name ?? 'Elegir variante'"
    size="sm"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-2">
      <button
        v-for="variant in product?.variants ?? []"
        :key="variant.id"
        type="button"
        class="flex items-center justify-between gap-3 rounded-xl border-2 p-3 text-left transition-colors"
        :class="
          !variant.is_active || variant.stock <= 0
            ? 'cursor-not-allowed border-slate-100 opacity-50'
            : 'border-slate-200 hover:border-indigo-300'
        "
        :disabled="!variant.is_active || variant.stock <= 0"
        @click="choose(variant)"
      >
        <span class="text-sm font-semibold text-slate-900">
          {{ variant.attribute_values.map((av) => av.value).join(' / ') }}
        </span>
        <span class="flex items-center gap-2">
          <span class="text-sm font-bold text-indigo-700">{{ formatCop(variant.price) }}</span>
          <span
            class="rounded-md px-1.5 py-0.5 text-xs font-semibold"
            :class="variant.stock <= 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'"
          >
            {{ variant.stock }}
          </span>
        </span>
      </button>
      <p v-if="(product?.variants ?? []).length === 0" class="py-6 text-center text-sm text-slate-400">
        Este producto no tiene variantes activas.
      </p>
    </div>
  </NxModal>
</template>
