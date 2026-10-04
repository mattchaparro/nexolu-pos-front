<script setup lang="ts">
// Productos del apartado: mini version del display de Vender (buscador,
// categorias y cajitas) arriba, y debajo las lineas elegidas. El precio sale
// del catalogo y no se edita (el backend tambien lo ignora), salvo en los
// productos de precio variable.
import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'

import { fetchProductCategories } from '@/modules/sales/services/salesService'
import ProductGrid from '@/modules/sales/components/ProductGrid.vue'
import type { Product } from '@/types/product'
import { NxInputNumber, NxSelect } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import { newLayawayLineRow, type LayawayLineRow } from '../support/layawayLine'

const props = defineProps<{
  modelValue: LayawayLineRow[]
  products: Product[]
  errors?: Record<string, string>
}>()

const emit = defineEmits<{ 'update:modelValue': [value: LayawayLineRow[]] }>()

const categoriesQuery = useQuery({
  queryKey: ['product-categories'],
  queryFn: fetchProductCategories,
})

const rows = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

function productFor(row: LayawayLineRow): Product | undefined {
  return props.products.find((p) => p.id === row.product_id)
}

function priceVaries(row: LayawayLineRow): boolean {
  return productFor(row)?.price_varies_at_sale === true
}

function subtotalLabel(row: LayawayLineRow): string {
  return formatCop((Number(row.unit_price) || 0) * row.quantity)
}

function hasVariants(row: LayawayLineRow): boolean {
  return productFor(row)?.has_variants === true
}

function variantOptionsFor(row: LayawayLineRow): { id: number; label: string }[] {
  const variants = productFor(row)?.variants ?? []
  return variants.map((v) => ({ id: v.id, label: v.attribute_values.map((av) => av.value).join(' / ') }))
}

function onVariantChange(row: LayawayLineRow, variantId: number | null): void {
  row.product_variant_id = variantId
  const variant = productFor(row)?.variants?.find((v) => v.id === variantId)
  row.unit_price = variant ? Number(variant.price) : null
}

function addProduct(product: Product): void {
  const existing = rows.value.find((r) => r.product_id === product.id && !product.has_variants)
  if (existing) {
    existing.quantity += 1
    return
  }
  const row = newLayawayLineRow()
  row.product_id = product.id
  row.unit_price = !product.has_variants && !product.price_varies_at_sale ? Number(product.price) : null
  rows.value = [...rows.value, row]
}

function removeRow(index: number): void {
  rows.value = rows.value.filter((_, i) => i !== index)
}

function errorFor(index: number, field: string): string | undefined {
  return props.errors?.[`items.${index}.${field}`]
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="h-[22rem] rounded-xl border border-slate-200 bg-slate-50/50 p-3">
      <ProductGrid :products="products" :categories="categoriesQuery.data.value ?? []" @select="addProduct" />
    </div>

    <p v-if="rows.length === 0" class="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
      Toca un producto para añadirlo al apartado.
    </p>

    <div v-for="(row, index) in rows" :key="row.uid" class="rounded-xl border border-slate-200 p-3">
      <div class="flex items-start gap-2">
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <p class="truncate text-sm font-semibold text-slate-800">{{ productFor(row)?.name ?? 'Producto' }}</p>
          <p v-if="errorFor(index, 'product_id')" class="text-xs text-red-600">{{ errorFor(index, 'product_id') }}</p>

          <NxSelect
            v-if="hasVariants(row)"
            :model-value="row.product_variant_id"
            :options="variantOptionsFor(row)"
            option-label="label"
            option-value="id"
            label="Variante"
            size="sm"
            :error="errorFor(index, 'product_variant_id')"
            @update:model-value="onVariantChange(row, $event as number | null)"
          />

          <div class="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:items-end">
            <NxInputNumber
              :model-value="row.quantity"
              label="Cantidad"
              size="sm"
              :currency="false"
              :min="1"
              :error="errorFor(index, 'quantity')"
              @update:model-value="row.quantity = $event ?? 1"
            />
            <NxInputNumber
              v-if="priceVaries(row)"
              :model-value="row.unit_price"
              label="Precio (requerido)"
              size="sm"
              :min="0"
              :error="errorFor(index, 'unit_price')"
              @update:model-value="row.unit_price = $event"
            />
            <div v-else class="flex flex-col gap-1">
              <p class="text-xs font-medium text-slate-500">Precio unitario</p>
              <p class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right text-sm tabular-nums text-slate-600">
                {{ formatCop(Number(row.unit_price) || 0) }}
              </p>
            </div>
            <div class="col-span-2 flex flex-col gap-1 sm:col-span-2">
              <p class="text-xs font-medium text-slate-500">Subtotal</p>
              <p class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right text-sm tabular-nums text-slate-600">
                {{ subtotalLabel(row) }}
              </p>
            </div>
          </div>
        </div>
        <button type="button" class="mt-1 shrink-0 text-slate-300 hover:text-red-500" title="Quitar" @click="removeRow(index)">
          <i class="pi pi-times" />
        </button>
      </div>
    </div>
  </div>
</template>
