<script setup lang="ts">
// Edicion masiva tipo hoja de calculo - doble clic en una celda para
// editarla, Tab/Shift+Tab para moverse a la siguiente/anterior sin soltar
// el mouse, Enter confirma, Escape cancela. Puerto de
// Admin/Products/BulkStock.vue del legacy (con Tab agregado - el legacy
// solo tenia doble clic/blur/enter/escape).
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { useBusiness } from '@/composables/useBusiness'
import { useSystemAlert } from '@/composables/useSystemAlert'
import type { BulkUpdateIngredientItem, BulkUpdateProductItem } from '@/types/bulkStockUpdate'
import type { Ingredient, Product } from '@/types/product'
import { NxButton, NxInput, NxPageHeader, NxSelect } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { formatCop } from '@/utils/formatCop'

import { useBulkEditableIngredients, useBulkEditableProducts } from '../composables/useBulkEditableCatalog'
import { useBulkStockUpdate } from '../composables/useBulkStockUpdate'

const router = useRouter()
const { notify } = useSystemAlert()
const { data: business } = useBusiness()
const ingredientsEnabled = computed(() => business.value?.feature_flags?.ingredients === true)

type Entity = 'products' | 'ingredients'
const activeEntity = ref<Entity>('products')

interface ProductRow {
  product_id: number
  name: string
  category: string
  current_stock: number
  current_cost: number
  current_price: number
  // Falso para venta-unica y productos con receta: su stock no se puede
  // editar a mano (ver ProductResource/StockService en nexolu-pos-api) -
  // editar esta celda igual dejaria el guardado entero rechazado con 422.
  can_manage_stock: boolean
  new_name: string | null
  new_stock: number | null
  new_cost: number | null
  new_price: number | null
}

interface IngredientRow {
  ingredient_id: number
  name: string
  unit: string
  current_stock: number
  current_cost: number
  new_name: string | null
  new_stock: number | null
  new_cost: number | null
}

function toProductRow(product: Product): ProductRow {
  return {
    product_id: product.id,
    name: product.name,
    category: product.category?.name ?? '',
    current_stock: Number(product.stock),
    current_cost: Number(product.cost_price),
    current_price: Number(product.price),
    can_manage_stock: product.can_manage_stock !== false,
    new_name: null,
    new_stock: null,
    new_cost: null,
    new_price: null,
  }
}

function toIngredientRow(ingredient: Ingredient): IngredientRow {
  return {
    ingredient_id: ingredient.id,
    name: ingredient.name,
    unit: ingredient.unit,
    current_stock: Number(ingredient.stock),
    current_cost: Number(ingredient.cost_price ?? 0),
    new_name: null,
    new_stock: null,
    new_cost: null,
  }
}

const productsQuery = useBulkEditableProducts(computed(() => activeEntity.value === 'products'))
const ingredientsQuery = useBulkEditableIngredients(
  computed(() => ingredientsEnabled.value && activeEntity.value === 'ingredients'),
)

const productRows = ref<ProductRow[]>([])
const ingredientRows = ref<IngredientRow[]>([])

watch(productsQuery.data, (products) => {
  if (products) {
    productRows.value = products.map(toProductRow)
  }
})
watch(ingredientsQuery.data, (ingredients) => {
  if (ingredients) {
    ingredientRows.value = ingredients.map(toIngredientRow)
  }
})

const search = ref('')
const categoryFilter = ref('')
const notes = ref('')

const categoryOptions = computed(() => {
  const seen = new Set<string>()
  for (const row of productRows.value) {
    if (row.category) {
      seen.add(row.category)
    }
  }
  return [...seen].sort().map((name) => ({ label: name, value: name }))
})

const filteredProducts = computed(() => {
  let rows = productRows.value
  if (search.value) {
    const q = search.value.toLowerCase()
    rows = rows.filter((r) => r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q))
  }
  if (categoryFilter.value) {
    rows = rows.filter((r) => r.category === categoryFilter.value)
  }
  return rows
})

const filteredIngredients = computed(() => {
  if (!search.value) {
    return ingredientRows.value
  }
  const q = search.value.toLowerCase()
  return ingredientRows.value.filter((r) => r.name.toLowerCase().includes(q))
})

// --- Edicion inline (doble clic + tab) ---
type ProductField = 'name' | 'stock' | 'cost' | 'price'
type IngredientField = 'name' | 'stock' | 'cost'
const PRODUCT_FIELDS: ProductField[] = ['name', 'stock', 'cost', 'price']
const INGREDIENT_FIELDS: IngredientField[] = ['name', 'stock', 'cost']

const editingId = ref<number | null>(null)
const editingField = ref<string | null>(null)
const editValue = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)

function dispName(row: ProductRow | IngredientRow): string {
  return row.new_name ?? row.name
}
function dispStock(row: ProductRow | IngredientRow): number {
  return row.new_stock ?? row.current_stock
}
function dispCost(row: ProductRow | IngredientRow): number {
  return row.new_cost ?? row.current_cost
}
function dispPrice(row: ProductRow): number {
  return row.new_price ?? row.current_price
}

function isEditing(row: ProductRow | IngredientRow, field: string): boolean {
  const id = 'product_id' in row ? row.product_id : row.ingredient_id
  return editingId.value === id && editingField.value === field
}

function focusEditInput(): void {
  nextTick(() => {
    editInputRef.value?.focus()
    editInputRef.value?.select()
  })
}

function startEdit(row: ProductRow | IngredientRow, field: string): void {
  if (field === 'stock' && 'can_manage_stock' in row && !row.can_manage_stock) {
    return
  }
  const id = 'product_id' in row ? row.product_id : row.ingredient_id
  if (editingId.value === id && editingField.value === field) {
    return
  }
  if (editingId.value !== null) {
    commitEdit()
  }

  let value: string
  if (field === 'name') {
    value = dispName(row)
  } else if (field === 'stock') {
    value = String(dispStock(row))
  } else if (field === 'cost') {
    value = String(dispCost(row))
  } else {
    value = String(dispPrice(row as ProductRow))
  }

  editValue.value = value
  editingId.value = id
  editingField.value = field
  focusEditInput()
}

function commitEdit(): void {
  if (editingId.value === null || editingField.value === null) {
    return
  }
  const field = editingField.value
  const val = editValue.value

  if (activeEntity.value === 'products') {
    const row = productRows.value.find((r) => r.product_id === editingId.value)
    if (row) {
      applyProductEdit(row, field as ProductField, val)
    }
  } else {
    const row = ingredientRows.value.find((r) => r.ingredient_id === editingId.value)
    if (row) {
      applyIngredientEdit(row, field as IngredientField, val)
    }
  }

  editingId.value = null
  editingField.value = null
  editValue.value = ''
}

function applyProductEdit(row: ProductRow, field: ProductField, val: string): void {
  if (field === 'name') {
    const trimmed = val.trim()
    row.new_name = trimmed && trimmed !== row.name ? trimmed : null
    return
  }
  if (field === 'stock') {
    const n = parseInt(val.replace(/\D/g, ''), 10)
    row.new_stock = Number.isFinite(n) ? Math.max(0, n) : null
    return
  }
  const n = parseFloat(val.replace(/[^\d.]/g, ''))
  const parsed = Number.isFinite(n) ? Math.max(0, n) : null
  if (field === 'cost') {
    row.new_cost = parsed
  } else {
    row.new_price = parsed
  }
}

function applyIngredientEdit(row: IngredientRow, field: IngredientField, val: string): void {
  if (field === 'name') {
    const trimmed = val.trim()
    row.new_name = trimmed && trimmed !== row.name ? trimmed : null
    return
  }
  const n = parseFloat(val.replace(/[^\d.]/g, ''))
  const parsed = Number.isFinite(n) ? Math.max(0, n) : null
  if (field === 'cost') {
    row.new_cost = parsed
  } else {
    row.new_stock = parsed
  }
}

function cancelEdit(): void {
  editingId.value = null
  editingField.value = null
  editValue.value = ''
}

function handleTab(event: KeyboardEvent, row: ProductRow | IngredientRow, field: string): void {
  event.preventDefault()
  const fields = activeEntity.value === 'products' ? PRODUCT_FIELDS : INGREDIENT_FIELDS
  const rows = activeEntity.value === 'products' ? filteredProducts.value : filteredIngredients.value
  const rowIndex = rows.findIndex((r) => ('product_id' in r ? r.product_id : r.ingredient_id) === ('product_id' in row ? row.product_id : row.ingredient_id))

  commitEdit()

  const direction = event.shiftKey ? -1 : 1
  let fieldIndex = fields.indexOf(field as never) + direction
  let nextRowIndex = rowIndex
  if (fieldIndex >= fields.length) {
    fieldIndex = 0
    nextRowIndex += 1
  } else if (fieldIndex < 0) {
    fieldIndex = fields.length - 1
    nextRowIndex -= 1
  }

  if (nextRowIndex < 0 || nextRowIndex >= rows.length) {
    return
  }

  const nextRow = rows[nextRowIndex]
  const nextField = fields[fieldIndex]
  nextTick(() => startEdit(nextRow, nextField))
}

// --- Deteccion de cambios ---
function productRowHasChange(row: ProductRow): boolean {
  return (
    (row.new_name !== null && row.new_name !== row.name) ||
    (row.new_stock !== null && row.new_stock !== row.current_stock) ||
    (row.new_cost !== null && row.new_cost !== row.current_cost) ||
    (row.new_price !== null && row.new_price !== row.current_price)
  )
}
function ingredientRowHasChange(row: IngredientRow): boolean {
  return (
    (row.new_name !== null && row.new_name !== row.name) ||
    (row.new_stock !== null && row.new_stock !== row.current_stock) ||
    (row.new_cost !== null && row.new_cost !== row.current_cost)
  )
}

const pendingCount = computed(() =>
  activeEntity.value === 'products'
    ? productRows.value.filter(productRowHasChange).length
    : ingredientRows.value.filter(ingredientRowHasChange).length,
)

const { productsMutation, ingredientsMutation } = useBulkStockUpdate()
const isSaving = computed(() => productsMutation.isPending.value || ingredientsMutation.isPending.value)
const canSubmit = computed(() => pendingCount.value > 0 && !isSaving.value)
const submitError = ref<string | null>(null)

async function submit(): Promise<void> {
  if (editingId.value !== null) {
    commitEdit()
  }
  submitError.value = null

  try {
    if (activeEntity.value === 'products') {
      const items: BulkUpdateProductItem[] = productRows.value.filter(productRowHasChange).map((row) => ({
        product_id: row.product_id,
        ...(row.new_name !== null && row.new_name !== row.name ? { new_name: row.new_name } : {}),
        ...(row.new_stock !== null && row.new_stock !== row.current_stock ? { new_stock: row.new_stock } : {}),
        ...(row.new_cost !== null && row.new_cost !== row.current_cost ? { new_cost: row.new_cost } : {}),
        ...(row.new_price !== null && row.new_price !== row.current_price ? { new_price: row.new_price } : {}),
      }))
      if (items.length === 0) {
        return
      }
      const result = await productsMutation.mutateAsync({ items, notes: notes.value.trim() || undefined })
      notify(summarizeProductResult(result))
    } else {
      const items: BulkUpdateIngredientItem[] = ingredientRows.value.filter(ingredientRowHasChange).map((row) => ({
        ingredient_id: row.ingredient_id,
        ...(row.new_name !== null && row.new_name !== row.name ? { new_name: row.new_name } : {}),
        ...(row.new_stock !== null && row.new_stock !== row.current_stock ? { new_stock: row.new_stock } : {}),
        ...(row.new_cost !== null && row.new_cost !== row.current_cost ? { new_cost: row.new_cost } : {}),
      }))
      if (items.length === 0) {
        return
      }
      const result = await ingredientsMutation.mutateAsync({ items, notes: notes.value.trim() || undefined })
      notify(summarizeIngredientResult(result))
    }
    notes.value = ''
  } catch (error) {
    submitError.value = extractErrorMessage(error, 'No pudimos guardar los cambios.')
  }
}

function summarizeProductResult(result: { name_count: number; stock_count: number; cost_count: number; price_count: number }): string {
  const parts: string[] = []
  if (result.name_count > 0) parts.push(`nombre en ${result.name_count}`)
  if (result.stock_count > 0) parts.push(`stock en ${result.stock_count}`)
  if (result.cost_count > 0) parts.push(`costo en ${result.cost_count}`)
  if (result.price_count > 0) parts.push(`precio en ${result.price_count}`)
  return `Ajuste aplicado: ${parts.join(', ')} producto(s).`
}

function summarizeIngredientResult(result: { name_count: number; stock_count: number; cost_count: number }): string {
  const parts: string[] = []
  if (result.name_count > 0) parts.push(`nombre en ${result.name_count}`)
  if (result.stock_count > 0) parts.push(`stock en ${result.stock_count}`)
  if (result.cost_count > 0) parts.push(`costo en ${result.cost_count}`)
  return `Ajuste aplicado: ${parts.join(', ')} insumo(s).`
}

function goBack(): void {
  router.push({ name: 'catalog.index' })
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-24 lg:pb-0">
    <div class="flex items-center gap-2">
      <button type="button" class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" @click="goBack">
        <i class="pi pi-arrow-left" />
      </button>
      <NxPageHeader
        title="Edición masiva"
        subtitle="Doble clic en una celda para editarla · Tab para pasar a la siguiente"
        icon="pi pi-table"
        compact
      />
    </div>

    <div v-if="ingredientsEnabled" class="inline-flex gap-2 rounded-xl border border-slate-200 bg-white p-1.5">
      <button
        type="button"
        class="rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
        :class="activeEntity === 'products' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'"
        @click="activeEntity = 'products'"
      >
        Productos
      </button>
      <button
        type="button"
        class="rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
        :class="activeEntity === 'ingredients' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'"
        @click="activeEntity = 'ingredients'"
      >
        Ingredientes
      </button>
    </div>

    <div class="flex flex-wrap items-end gap-3">
      <div class="min-w-[200px] max-w-sm flex-1">
        <NxInput v-model="search" label="Buscar por nombre" icon="pi pi-search" clearable blur-after-typing />
      </div>
      <div v-if="activeEntity === 'products' && categoryOptions.length > 0" class="min-w-[180px]">
        <NxSelect
          :model-value="categoryFilter || null"
          :options="categoryOptions"
          option-label="label"
          option-value="value"
          label="Categoría"
          @update:model-value="categoryFilter = ($event as string | null) ?? ''"
        />
      </div>
    </div>

    <p v-if="submitError" class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{{ submitError }}</p>

    <div v-if="activeEntity === 'products'" class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table class="w-full min-w-[560px] text-sm">
        <thead class="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-4 py-3 text-left">Producto</th>
            <th class="w-24 px-4 py-3 text-center">Stock</th>
            <th class="w-32 px-4 py-3 text-center">Costo</th>
            <th class="w-32 px-4 py-3 text-center">Precio</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr
            v-for="row in filteredProducts"
            :key="row.product_id"
            :class="productRowHasChange(row) ? 'bg-amber-50' : 'hover:bg-slate-50/60'"
          >
            <td class="cursor-default select-none px-4 py-2.5" @dblclick="startEdit(row, 'name')">
              <input
                v-if="isEditing(row, 'name')"
                ref="editInputRef"
                v-model="editValue"
                type="text"
                class="w-full rounded-lg border border-indigo-500 px-2 py-1 font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
                @blur="commitEdit"
                @keydown.enter.prevent="commitEdit"
                @keydown.escape="cancelEdit"
                @keydown.tab="handleTab($event, row, 'name')"
              />
              <template v-else>
                <p class="font-medium leading-tight text-slate-900">{{ dispName(row) }}</p>
                <p class="text-xs text-slate-400">{{ row.category }}</p>
              </template>
            </td>
            <td
              class="select-none px-4 py-2.5 text-center"
              :class="row.can_manage_stock ? 'cursor-default' : 'cursor-not-allowed'"
              :title="row.can_manage_stock ? undefined : 'El stock de este producto se calcula desde sus ingredientes y no se puede editar aquí.'"
              @dblclick="startEdit(row, 'stock')"
            >
              <input
                v-if="isEditing(row, 'stock')"
                ref="editInputRef"
                v-model="editValue"
                type="text"
                inputmode="numeric"
                class="w-full rounded-lg border border-indigo-500 px-2 py-1 text-center font-semibold outline-none focus:ring-2 focus:ring-indigo-200"
                @blur="commitEdit"
                @keydown.enter.prevent="commitEdit"
                @keydown.escape="cancelEdit"
                @keydown.tab="handleTab($event, row, 'stock')"
              />
              <span v-else class="font-semibold" :class="row.can_manage_stock ? 'text-slate-800' : 'text-slate-300'">{{
                dispStock(row)
              }}</span>
            </td>
            <td class="cursor-default select-none px-4 py-2.5 text-center" @dblclick="startEdit(row, 'cost')">
              <input
                v-if="isEditing(row, 'cost')"
                ref="editInputRef"
                v-model="editValue"
                type="text"
                inputmode="numeric"
                class="w-full rounded-lg border border-indigo-500 px-2 py-1 text-right tabular-nums outline-none focus:ring-2 focus:ring-indigo-200"
                @blur="commitEdit"
                @keydown.enter.prevent="commitEdit"
                @keydown.escape="cancelEdit"
                @keydown.tab="handleTab($event, row, 'cost')"
              />
              <span v-else class="tabular-nums text-slate-700">{{ formatCop(dispCost(row)) }}</span>
            </td>
            <td class="cursor-default select-none px-4 py-2.5 text-center" @dblclick="startEdit(row, 'price')">
              <input
                v-if="isEditing(row, 'price')"
                ref="editInputRef"
                v-model="editValue"
                type="text"
                inputmode="numeric"
                class="w-full rounded-lg border border-indigo-500 px-2 py-1 text-right tabular-nums outline-none focus:ring-2 focus:ring-indigo-200"
                @blur="commitEdit"
                @keydown.enter.prevent="commitEdit"
                @keydown.escape="cancelEdit"
                @keydown.tab="handleTab($event, row, 'price')"
              />
              <span v-else class="font-semibold tabular-nums text-slate-900">{{ formatCop(dispPrice(row)) }}</span>
            </td>
          </tr>
          <tr v-if="!filteredProducts.length">
            <td colspan="4" class="px-4 py-10 text-center text-sm text-slate-400">Sin resultados.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table class="w-full min-w-[420px] text-sm">
        <thead class="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-4 py-3 text-left">Insumo</th>
            <th class="w-20 px-4 py-3 text-center">Unidad</th>
            <th class="w-28 px-4 py-3 text-center">Stock</th>
            <th class="w-32 px-4 py-3 text-center">Costo</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr
            v-for="row in filteredIngredients"
            :key="row.ingredient_id"
            :class="ingredientRowHasChange(row) ? 'bg-amber-50' : 'hover:bg-slate-50/60'"
          >
            <td class="cursor-default select-none px-4 py-2.5" @dblclick="startEdit(row, 'name')">
              <input
                v-if="isEditing(row, 'name')"
                ref="editInputRef"
                v-model="editValue"
                type="text"
                class="w-full rounded-lg border border-indigo-500 px-2 py-1 font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
                @blur="commitEdit"
                @keydown.enter.prevent="commitEdit"
                @keydown.escape="cancelEdit"
                @keydown.tab="handleTab($event, row, 'name')"
              />
              <p v-else class="font-medium text-slate-900">{{ dispName(row) }}</p>
            </td>
            <td class="px-4 py-2.5 text-center text-slate-500">{{ row.unit || '—' }}</td>
            <td class="cursor-default select-none px-4 py-2.5 text-center" @dblclick="startEdit(row, 'stock')">
              <input
                v-if="isEditing(row, 'stock')"
                ref="editInputRef"
                v-model="editValue"
                type="text"
                inputmode="decimal"
                class="w-full rounded-lg border border-indigo-500 px-2 py-1 text-center font-semibold outline-none focus:ring-2 focus:ring-indigo-200"
                @blur="commitEdit"
                @keydown.enter.prevent="commitEdit"
                @keydown.escape="cancelEdit"
                @keydown.tab="handleTab($event, row, 'stock')"
              />
              <span v-else class="font-semibold text-slate-800">{{ dispStock(row) }}</span>
            </td>
            <td class="cursor-default select-none px-4 py-2.5 text-center" @dblclick="startEdit(row, 'cost')">
              <input
                v-if="isEditing(row, 'cost')"
                ref="editInputRef"
                v-model="editValue"
                type="text"
                inputmode="numeric"
                class="w-full rounded-lg border border-indigo-500 px-2 py-1 text-right tabular-nums outline-none focus:ring-2 focus:ring-indigo-200"
                @blur="commitEdit"
                @keydown.enter.prevent="commitEdit"
                @keydown.escape="cancelEdit"
                @keydown.tab="handleTab($event, row, 'cost')"
              />
              <span v-else class="tabular-nums text-slate-700">{{ formatCop(dispCost(row)) }}</span>
            </td>
          </tr>
          <tr v-if="!filteredIngredients.length">
            <td colspan="4" class="px-4 py-10 text-center text-sm text-slate-400">Sin resultados.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <NxInput v-model="notes" label="Nota general (opcional)" />

    <p v-if="pendingCount > 0" class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
      {{ pendingCount }} {{ pendingCount === 1 ? 'fila modificada' : 'filas modificadas' }} — se guardan como ajuste manual.
    </p>

    <NxButton :disabled="!canSubmit" :loading="isSaving" @click="submit">
      Guardar cambios{{ pendingCount > 0 ? ` (${pendingCount})` : '' }}
    </NxButton>
  </div>
</template>
