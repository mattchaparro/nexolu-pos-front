<script setup lang="ts">
// Crear/editar producto - pagina completa en vez de modal (a diferencia de
// CategoryFormModal): son demasiados campos/secciones (tipo de producto,
// precio y costo, inventario, receta de insumos) para un modal sin que se
// sienta apretado, y el legacy tambien lo resolvia como pagina propia
// (Products/Save.vue), no un dialog.
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useBusiness } from '@/composables/useBusiness'
import { useSystemAlert } from '@/composables/useSystemAlert'
import type { ProductRecipeLineInput } from '@/types/product'
import { NxButton, NxInput, NxInputNumber, NxPageHeader, NxSelect, NxTextarea, NxToggleButton } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'

import ProductIngredientsEditor from '../components/ProductIngredientsEditor.vue'
import { useCategories } from '../composables/useCategories'
import { useIngredientOptions } from '../composables/useIngredientOptions'
import { useProduct } from '../composables/useProduct'
import { useProductMutations } from '../composables/useProductMutations'

const route = useRoute()
const router = useRouter()
const { notify } = useSystemAlert()
const { data: business } = useBusiness()

const productId = computed(() => (route.params.id ? Number(route.params.id) : null))
const isEdit = computed(() => productId.value !== null)

const categoriesQuery = useCategories()
const productQuery = useProduct(productId)
const ingredientsEnabled = computed(() => business.value?.feature_flags?.ingredients === true)
const ingredientOptionsQuery = useIngredientOptions(ingredientsEnabled)
const { createMutation, updateMutation } = useProductMutations()

const categoryOptions = computed(() => {
  const all = categoriesQuery.data.value ?? []
  return all.map((c) => ({
    id: c.id,
    label: c.parent_id ? `${all.find((p) => p.id === c.parent_id)?.name ?? ''} › ${c.name}` : c.name,
  }))
})

const name = ref('')
const description = ref('')
const showDescription = ref(false)
const howToUse = ref('')
const showHowToUse = ref(false)
const price = ref<number | null>(null)
const costPrice = ref<number | null>(null)
const stock = ref<number | null>(0)
const lowStockAlertThreshold = ref<number | null>(null)
const trackStock = ref(true)
const isSingleSale = ref(false)
const isService = ref(false)
const priceVariesAtSale = ref(false)
const durationMinutes = ref<number | null>(null)
const sku = ref('')
const isActive = ref(true)
const categoryId = ref<number | null>(null)
const ingredients = ref<ProductRecipeLineInput[]>([])
const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)

watch(
  () => productQuery.data.value,
  (product) => {
    if (!product) {
      return
    }
    name.value = product.name
    description.value = product.description ?? ''
    showDescription.value = Boolean(product.description)
    howToUse.value = product.how_to_use ?? ''
    showHowToUse.value = Boolean(product.how_to_use)
    price.value = Number(product.price)
    costPrice.value = Number(product.cost_price)
    stock.value = product.stock
    lowStockAlertThreshold.value = product.low_stock_alert_threshold
    trackStock.value = product.track_stock
    isSingleSale.value = product.is_single_sale
    isService.value = product.is_service
    priceVariesAtSale.value = product.price_varies_at_sale
    durationMinutes.value = product.duration_minutes
    sku.value = product.sku ?? ''
    isActive.value = product.is_active
    categoryId.value = product.category?.id ?? null
    ingredients.value = (product.ingredients ?? []).map((i) => ({ ingredient_id: i.id, quantity: i.quantity }))
  },
  { immediate: true },
)

// Reglas efectivas del backend (ver Store/UpdateProductRequest) reflejadas
// en vivo, para no dejar que el usuario arme una combinacion que el
// servidor va a rechazar.
watch(isService, (value) => {
  if (value) {
    isSingleSale.value = false
    trackStock.value = false
    ingredients.value = []
  }
})
watch(isSingleSale, (value) => {
  if (value) {
    isService.value = false
    trackStock.value = true
    ingredients.value = []
  }
})
watch(
  ingredients,
  (value) => {
    if (value.length > 0) {
      trackStock.value = true
    }
  },
  { deep: true },
)

// Con receta, el costo se calcula solo (Σ insumo.cost_price × cantidad) -
// mismo criterio que Product::syncRecipeCost() en el backend, que
// sobreescribe cualquier cost_price manual apenas hay ingredientes.
const recipeCost = computed(() => {
  if (ingredients.value.length === 0) {
    return null
  }
  const options = ingredientOptionsQuery.data.value ?? []
  return ingredients.value.reduce((sum, row) => {
    const ingredient = options.find((i) => i.id === row.ingredient_id)
    return sum + Number(ingredient?.cost_price ?? 0) * row.quantity
  }, 0)
})

const isSaving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)
const pageTitle = computed(() => (isEdit.value ? 'Editar producto' : 'Nuevo producto'))

async function submit(): Promise<void> {
  fieldErrors.value = {}
  formError.value = null

  if (!name.value.trim()) {
    fieldErrors.value.name = 'El nombre es obligatorio.'
    return
  }
  if (!categoryId.value) {
    fieldErrors.value.category_id = 'Elige una categoría.'
    return
  }
  if (price.value === null) {
    fieldErrors.value.price = 'El precio es obligatorio.'
    return
  }

  const payload = {
    name: name.value.trim(),
    description: showDescription.value ? description.value.trim() || null : null,
    how_to_use: showHowToUse.value ? howToUse.value.trim() || null : null,
    price: price.value,
    ...(recipeCost.value === null ? { cost_price: costPrice.value ?? 0 } : {}),
    ...(isEdit.value ? {} : { stock: stock.value ?? 0 }),
    low_stock_alert_threshold: isService.value ? null : lowStockAlertThreshold.value,
    track_stock: trackStock.value,
    is_single_sale: isSingleSale.value,
    is_service: isService.value,
    price_varies_at_sale: priceVariesAtSale.value,
    duration_minutes: isService.value ? durationMinutes.value : null,
    sku: sku.value.trim() || undefined,
    is_active: isActive.value,
    category_id: categoryId.value,
    ...(ingredientsEnabled.value ? { ingredients: ingredients.value } : {}),
  }

  try {
    if (isEdit.value && productId.value) {
      await updateMutation.mutateAsync({ id: productId.value, payload })
      notify('Producto actualizado')
    } else {
      await createMutation.mutateAsync(payload)
      notify('Producto creado')
    }
    router.push({ name: 'catalog.index' })
  } catch (error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) {
      fieldErrors.value = fields
    } else {
      formError.value = extractErrorMessage(error, 'No pudimos guardar el producto.')
    }
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <div class="flex items-center gap-2">
      <button type="button" class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" @click="router.push({ name: 'catalog.index' })">
        <i class="pi pi-arrow-left" />
      </button>
      <NxPageHeader :title="pageTitle" icon="pi pi-box" compact />
    </div>

    <p v-if="formError" class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{{ formError }}</p>

    <template v-if="isEdit && productQuery.isPending.value">
      <div class="h-64 animate-pulse rounded-xl bg-slate-100" />
    </template>

    <div v-else class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div class="flex flex-col gap-4">
        <div class="rounded-xl border border-slate-200 bg-white p-4">
          <p class="mb-3 text-sm font-semibold text-slate-700">Datos básicos</p>
          <div class="flex flex-col gap-3">
            <NxInput v-model="name" label="Nombre" required :error="fieldErrors.name" />
            <NxSelect
              :model-value="categoryId"
              :options="categoryOptions"
              option-label="label"
              option-value="id"
              label="Categoría"
              required
              :error="fieldErrors.category_id"
              @update:model-value="categoryId = $event as number | null"
            />
            <NxToggleButton v-model="showDescription" label="Descripción" icon="pi pi-align-left" />
            <NxTextarea v-if="showDescription" v-model="description" label="Descripción" :rows="2" />
            <NxToggleButton v-model="showHowToUse" label="Cómo usarlo" icon="pi pi-info-circle" />
            <NxTextarea v-if="showHowToUse" v-model="howToUse" label="Cómo usarlo" :rows="2" />
            <NxInput v-if="isEdit" v-model="sku" label="SKU" disabled />
          </div>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-4">
          <p class="mb-3 text-sm font-semibold text-slate-700">Precio y costo</p>
          <div class="flex flex-col gap-3">
            <NxInputNumber v-model="price" label="Precio de venta" :min="0" required :error="fieldErrors.price" />
            <NxInputNumber
              :model-value="recipeCost ?? costPrice"
              label="Costo"
              :min="0"
              :disabled="recipeCost !== null"
              @update:model-value="costPrice = $event"
            />
            <p v-if="recipeCost !== null" class="-mt-2 text-[11px] text-slate-400">
              Se calcula automático según la receta de insumos.
            </p>
            <NxToggleButton v-model="priceVariesAtSale" label="Precio varía al vender" icon="pi pi-sliders-h" />
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-4">
        <div class="rounded-xl border border-slate-200 bg-white p-4">
          <p class="mb-3 text-sm font-semibold text-slate-700">Tipo de producto</p>
          <div class="flex flex-col gap-3">
            <div class="grid grid-cols-2 gap-2">
              <NxToggleButton v-model="isService" label="Es un servicio" icon="pi pi-wrench" />
              <NxToggleButton v-model="isSingleSale" label="Venta única" icon="pi pi-verified" :disabled="isService" />
              <NxToggleButton
                v-model="trackStock"
                label="Controla inventario"
                icon="pi pi-box"
                :disabled="isService || isSingleSale || ingredients.length > 0"
              />
              <NxToggleButton v-model="isActive" label="Producto activo" icon="pi pi-check-circle" />
            </div>
            <NxInputNumber
              v-if="isService"
              v-model="durationMinutes"
              label="Duración (minutos, opcional)"
              :min="0"
              :currency="false"
            />
          </div>
        </div>

        <div v-if="!isService && trackStock" class="rounded-xl border border-slate-200 bg-white p-4">
          <p class="mb-3 text-sm font-semibold text-slate-700">Inventario</p>
          <div class="flex flex-col gap-3">
            <NxInputNumber
              v-if="!isEdit"
              v-model="stock"
              label="Stock inicial"
              :min="0"
              :currency="false"
              :disabled="ingredients.length > 0"
            />
            <p v-else class="text-xs text-slate-400">
              El stock se ajusta con movimientos de inventario, no editando el producto.
            </p>
            <NxInputNumber
              v-model="lowStockAlertThreshold"
              label="Alerta de stock bajo (opcional)"
              :min="0"
              :currency="false"
            />
          </div>
        </div>

        <div v-if="ingredientsEnabled && !isService && !isSingleSale" class="rounded-xl border border-slate-200 bg-white p-4">
          <p class="mb-3 text-sm font-semibold text-slate-700">Receta de insumos (opcional)</p>
          <ProductIngredientsEditor v-model="ingredients" :ingredients="ingredientOptionsQuery.data.value ?? []" />
        </div>
      </div>
    </div>

    <div class="flex gap-2">
      <NxButton variant="outline" class="flex-1" @click="router.push({ name: 'catalog.index' })">Cancelar</NxButton>
      <NxButton class="flex-1" :loading="isSaving" @click="submit">Guardar</NxButton>
    </div>
  </div>
</template>
