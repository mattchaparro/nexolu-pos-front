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
import type {
  PendingProductImage,
  Product,
  ProductRecipeLineInput,
  ProductVariantInput,
  VariantPhotoTarget,
} from '@/types/product'
import { NxButton, NxInput, NxInputNumber, NxPageHeader, NxSelect, NxTextarea, NxToggleButton } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'
import { hasFeature } from '@/utils/hasFeature'

import ProductImagesEditor from '../components/ProductImagesEditor.vue'
import ProductQuickViewModal from '../components/ProductQuickViewModal.vue'
import ProductIngredientsEditor from '../components/ProductIngredientsEditor.vue'
import ProductVariantsEditor from '../components/ProductVariantsEditor.vue'
import { useCategories } from '../composables/useCategories'
import { useIngredientOptions } from '../composables/useIngredientOptions'
import { useProduct } from '../composables/useProduct'
import { useProductAttributes } from '../composables/useProductAttributes'
import { useProductMutations } from '../composables/useProductMutations'
import { uploadProductImage } from '../services/productImageService'
import { variantComboKey, variantComboLabel } from '../support/variantCombo'

const route = useRoute()
const router = useRouter()
const { notify } = useSystemAlert()
const { data: business } = useBusiness()

const productId = computed(() => (route.params.id ? Number(route.params.id) : null))
const isEdit = computed(() => productId.value !== null)
// Entrar por "Nuevo servicio" fuerza is_service=true y bloquea el toggle -
// al editar, is_service ya lo trae el producto cargado (mismo formulario
// para ambos casos, la ruta solo importa para una creacion nueva).
const forcedService = computed(() => !isEdit.value && route.name === 'catalog.services.create')

const categoriesQuery = useCategories()
const productQuery = useProduct(productId)
const ingredientsEnabled = computed(() => business.value?.feature_flags?.ingredients === true)
const ingredientOptionsQuery = useIngredientOptions(ingredientsEnabled)
// hasFeature() (resolved_features, ya resuelto por el backend) y no el JSON
// crudo: un negocio Full anterior a esta bandera no tiene la clave en
// feature_flags pero si la funcion habilitada por el default de su plan -
// leyendo el JSON crudo, la seccion de Variaciones quedaba invisible justo
// para los negocios que ya existian, que son los que van a activarla.
const variantsEnabled = computed(() => hasFeature(business.value, 'variants'))
// Las fotos del catalogo existen para publicarlas en la tienda online, asi
// que la seccion entera vive detras de ese modulo (las rutas de imagenes
// tambien estan gateadas por `feature:online_store` en el backend).
const onlineStoreEnabled = computed(() => hasFeature(business.value, 'online_store'))
const productAttributesQuery = useProductAttributes(variantsEnabled)
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
const isService = ref(forcedService.value)
const priceVariesAtSale = ref(false)
const durationMinutes = ref<number | null>(null)
const sku = ref('')
const isActive = ref(true)
const categoryId = ref<number | null>(null)
const ingredients = ref<ProductRecipeLineInput[]>([])
const variants = ref<ProductVariantInput[]>([])
const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)

// Fotos elegidas antes de que el producto exista: se quedan en el navegador
// y se suben despues de crearlo, porque el endpoint cuelga de
// /products/{id}/images y necesita un id real.
const pendingImages = ref<PendingProductImage[]>([])

/**
 * Opciones del selector "a que variante pertenece esta foto". Al editar son
 * ids reales; al crear, la combinacion de valores de atributo, que es lo
 * unico que identifica a una variante que todavia no existe.
 */
const variantPhotoTargets = computed<VariantPhotoTarget[]>(() => {
  if (!variantsEnabled.value) {
    return []
  }

  if (isEdit.value) {
    return (productQuery.data.value?.variants ?? []).map((variant) => ({
      key: String(variant.id),
      label: variant.attribute_values.map((value) => value.value).join(' / '),
    }))
  }

  const attributes = productAttributesQuery.data.value ?? []
  return variants.value.map((variant) => ({
    key: variantComboKey(variant.attribute_value_ids),
    label: variantComboLabel(variant.attribute_value_ids, attributes),
  }))
})

// --- Vista previa ---
// Mismo modal que usa el listado del Catalogo. Las fotos salen de las
// pendientes (previews locales, producto sin guardar) o de las ya subidas.
const previewOpen = ref(false)

const previewPhotos = computed(() => {
  if (pendingImages.value.length > 0) {
    return pendingImages.value.map((image) => image.previewUrl)
  }
  const uploaded = productQuery.data.value?.images ?? []
  return uploaded.length > 0 ? uploaded.map((image) => image.url) : []
})

const previewVariants = computed(() =>
  variants.value.map((variant) => ({
    label: variantComboLabel(variant.attribute_value_ids, productAttributesQuery.data.value ?? []),
    sku: variant.sku || null,
    price: variant.price,
    stock: variant.stock ?? 0,
    isActive: variant.is_active !== false,
  })),
)

/**
 * Sube las fotos que estaban esperando a que el producto existiera.
 *
 * Un fallo aca no invalida el producto, que ya quedo creado: se avisa y se
 * sigue, en vez de dejar al comerciante creyendo que no se guardo nada.
 */
async function uploadPendingImages(created: Product): Promise<void> {
  if (pendingImages.value.length === 0) {
    return
  }

  // La respuesta de creacion trae las variantes ya con id: se mapean por su
  // combinacion de valores, no por posicion, que no es ninguna garantia.
  const variantIdByCombo = new Map<string, number>(
    (created.variants ?? []).map((variant) => [
      variantComboKey(variant.attribute_values.map((value) => value.product_attribute_value_id)),
      variant.id,
    ]),
  )

  let failed = 0
  // Secuencial: el orden de las fotos es el orden en que llegan.
  for (const image of pendingImages.value) {
    try {
      await uploadProductImage(created.id, image.file, {
        variantId: image.variantKey === null ? null : (variantIdByCombo.get(image.variantKey) ?? null),
      })
    } catch {
      failed += 1
    }
  }

  pendingImages.value.forEach((image) => URL.revokeObjectURL(image.previewUrl))
  pendingImages.value = []

  if (failed > 0) {
    notify(`El producto se creó, pero ${failed} foto(s) no se pudieron subir.`)
  }
}

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
    variants.value = (product.variants ?? []).map((v) => ({
      id: v.id,
      sku: v.sku,
      price: Number(v.price),
      cost_price: v.cost_price !== null ? Number(v.cost_price) : undefined,
      stock: v.stock,
      low_stock_alert_threshold: v.low_stock_alert_threshold,
      is_active: v.is_active,
      attribute_value_ids: v.attribute_values.map((av) => av.product_attribute_value_id),
    }))
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
    variants.value = []
  }
})
watch(isSingleSale, (value) => {
  if (value) {
    isService.value = false
    trackStock.value = true
    ingredients.value = []
    variants.value = []
  }
})
watch(
  ingredients,
  (value) => {
    if (value.length > 0) {
      trackStock.value = true
      variants.value = []
    }
  },
  { deep: true },
)
watch(
  variants,
  (value) => {
    if (value.length > 0) {
      trackStock.value = true
      ingredients.value = []
      priceVariesAtSale.value = false
    }
  },
  { deep: true },
)

// Con receta, el costo se calcula solo (Σ insumo.cost_price × cantidad) -
// mismo criterio que Product::syncRecipeCost() en el backend, que
// sobreescribe cualquier cost_price manual apenas hay ingredientes.
// Con variantes, el precio/costo del producto padre deja de ser editable a
// mano (cada variante tiene el suyo) - se muestra el mas barato como
// referencia, mismo criterio visual que "Precio de referencia" para
// price_varies_at_sale. 'price' sigue siendo requerido por el backend
// (StoreProductRequest), asi que submit() manda este valor en vez del
// campo deshabilitado.
const cheapestVariantPrice = computed(() => {
  if (variants.value.length === 0) {
    return null
  }
  return Math.min(...variants.value.map((v) => Number(v.price) || 0))
})

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
// Un servicio vuelve a la pestaña Servicios, no a Catalogo - isService ya
// refleja el producto cargado en edicion, o la ruta forzada en creacion.
const returnRoute = computed(() => ({ name: isService.value ? 'services.index' : 'catalog.index' }))
const pageTitle = computed(() => {
  if (isEdit.value) {
    return isService.value ? 'Editar servicio' : 'Editar producto'
  }
  return isService.value ? 'Nuevo servicio' : 'Nuevo producto'
})

/**
 * Campos que tienen un input propio capaz de mostrar su error debajo. Todo
 * lo que el backend rechace fuera de esta lista se muestra en el banner.
 */
const INLINE_ERROR_FIELDS = [
  'name',
  'category_id',
  'price',
  'cost_price',
  'stock',
  'sku',
  'low_stock_alert_threshold',
  'duration_minutes',
  'description',
  'how_to_use',
]

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
  // Con variantes, el precio del producto NO se escribe a mano: sale de la
  // variante mas barata y su campo esta deshabilitado (ver el template), asi
  // que `price` se queda en null aunque la pantalla muestre un valor.
  // Validar `price` a secas rechazaba con "El precio es obligatorio" sobre un
  // campo deshabilitado que ya mostraba el precio - y hacia imposible crear
  // un producto con variantes salvo que se escribiera el precio ANTES de
  // agregarlas. El payload de abajo ya usaba el precio efectivo; era solo
  // esta guarda la que se habia quedado atras.
  const effectivePrice = cheapestVariantPrice.value ?? price.value
  if (effectivePrice === null) {
    fieldErrors.value.price = 'El precio es obligatorio.'
    return
  }

  const payload = {
    name: name.value.trim(),
    description: showDescription.value ? description.value.trim() || null : null,
    how_to_use: showHowToUse.value ? howToUse.value.trim() || null : null,
    price: effectivePrice,
    ...(recipeCost.value === null && cheapestVariantPrice.value === null ? { cost_price: costPrice.value ?? 0 } : {}),
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
    ...(variantsEnabled.value ? { variants: variants.value } : {}),
  }

  try {
    if (isEdit.value && productId.value) {
      await updateMutation.mutateAsync({ id: productId.value, payload })
      notify('Producto actualizado')
    } else {
      const created = await createMutation.mutateAsync(payload)
      notify('Producto creado')
      await uploadPendingImages(created)
    }
    router.push(returnRoute.value)
  } catch (error) {
    const fields = extractFieldErrors(error)
    fieldErrors.value = fields

    // Un 422 sobre un campo anidado (variants.0.sku, ingredients.2.quantity)
    // no tiene input propio al que colgarle el mensaje, asi que antes se
    // guardaba en fieldErrors y no lo veia nadie: el formulario se quedaba
    // mudo tras pulsar Guardar. Si ninguno de los campos devueltos se
    // renderiza, el error sube al banner.
    const surfacedInline = Object.keys(fields).some((field) => INLINE_ERROR_FIELDS.includes(field))
    if (!surfacedInline) {
      formError.value = extractErrorMessage(error, 'No pudimos guardar el producto.')
    }
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <div class="flex items-center gap-2">
      <button type="button" class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" @click="router.push(returnRoute)">
        <i class="pi pi-arrow-left" />
      </button>
      <NxPageHeader :title="pageTitle" :icon="isService ? 'pi pi-wrench' : 'pi pi-box'" compact />
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

        <div v-if="onlineStoreEnabled" class="rounded-xl border border-slate-200 bg-white p-4">
          <p class="mb-3 text-sm font-semibold text-slate-700">Fotos</p>
          <ProductImagesEditor
            v-model:pending="pendingImages"
            :product-id="productId"
            :variant-targets="variantPhotoTargets"
          />
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-4">
          <p class="mb-3 text-sm font-semibold text-slate-700">Precio y costo</p>
          <div class="flex flex-col gap-3">
            <NxInputNumber
              :model-value="cheapestVariantPrice ?? price"
              :label="variants.length > 0 ? 'Precio (desde)' : priceVariesAtSale ? 'Precio de referencia' : 'Precio de venta'"
              :min="0"
              required
              :disabled="variants.length > 0"
              :error="fieldErrors.price"
              @update:model-value="price = $event ?? 0"
            />
            <p v-if="variants.length > 0" class="-mt-2 text-[11px] text-slate-400">
              Cada variante tiene su propio precio, más abajo.
            </p>
            <template v-if="!isService">
              <NxInputNumber
                :model-value="recipeCost ?? costPrice"
                label="Costo"
                :min="0"
                :disabled="recipeCost !== null || variants.length > 0"
                @update:model-value="costPrice = $event"
              />
              <p v-if="recipeCost !== null" class="-mt-2 text-[11px] text-slate-400">
                Se calcula automático según la receta de insumos.
              </p>
            </template>
            <NxToggleButton
              v-model="priceVariesAtSale"
              label="Precio varía al vender"
              icon="pi pi-sliders-h"
              :disabled="variants.length > 0"
            />
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-4">
        <div class="rounded-xl border border-slate-200 bg-white p-4">
          <p class="mb-3 text-sm font-semibold text-slate-700">Tipo de producto</p>
          <div class="flex flex-col gap-3">
            <div class="grid grid-cols-2 gap-2">
              <NxToggleButton v-model="isService" label="Es un servicio" icon="pi pi-wrench" :disabled="forcedService" />
              <template v-if="!isService">
                <NxToggleButton v-model="isSingleSale" label="Venta única" icon="pi pi-verified" />
                <NxToggleButton
                  v-model="trackStock"
                  label="Controla inventario"
                  icon="pi pi-box"
                  :disabled="isSingleSale || ingredients.length > 0 || variants.length > 0"
                />
              </template>
              <NxToggleButton v-model="isActive" :label="isService ? 'Servicio activo' : 'Producto activo'" icon="pi pi-check-circle" />
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

        <div v-if="!isService && trackStock && variants.length === 0" class="rounded-xl border border-slate-200 bg-white p-4">
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

        <div v-if="variantsEnabled && !isService && !isSingleSale" class="rounded-xl border border-slate-200 bg-white p-4">
          <p class="mb-3 text-sm font-semibold text-slate-700">Variaciones (opcional)</p>
          <ProductVariantsEditor v-model="variants" :attributes="productAttributesQuery.data.value ?? []" />
        </div>
      </div>
    </div>

    <div class="flex gap-2">
      <NxButton variant="outline" class="flex-1" @click="router.push({ name: 'catalog.index' })">Cancelar</NxButton>
      <NxButton variant="outline" icon="pi pi-eye" @click="previewOpen = true">Vista previa</NxButton>
      <NxButton class="flex-1" :loading="isSaving" @click="submit">Guardar</NxButton>
    </div>

    <ProductQuickViewModal
      v-model="previewOpen"
      :name="name"
      :category-name="categoryOptions.find((option) => option.id === categoryId)?.label"
      :description="description"
      :price="cheapestVariantPrice ?? price"
      :price-varies-at-sale="priceVariesAtSale"
      :photos="previewPhotos"
      :variants="previewVariants"
      :stock="stock"
      :track-stock="trackStock"
      :is-active="isActive"
      :is-service="isService"
    />
  </div>
</template>
