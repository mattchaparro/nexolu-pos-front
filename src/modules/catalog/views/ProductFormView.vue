<script setup lang="ts">
// Crear/editar producto - pagina completa en vez de modal (a diferencia de
// CategoryFormModal): son demasiados campos/secciones (tipo de producto,
// precio y costo, inventario, receta de insumos) para un modal sin que se
// sienta apretado, y el legacy tambien lo resolvia como pagina propia
// (Products/Save.vue), no un dialog.
import { useQuery } from '@tanstack/vue-query'
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useBranches } from '@/composables/useBranches'
import { useBusiness } from '@/composables/useBusiness'
import { useChannelName } from '@/modules/link-page/composables/useChannelName'
import { useSystemAlert } from '@/composables/useSystemAlert'
import { fetchBranchPrices, updateBranchPrices } from '@/services/branches'
import type {
  PendingProductImage,
  Product,
  ProductComponentInput,
  ProductOptionGroupInput,
  ProductRecipeLineInput,
  ProductVariantInput,
  VariantPhotoTarget,
} from '@/types/product'
import { NxButton, NxInput, NxInputNumber, NxSelect, NxTextarea, NxToggleButton } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'
import { formatCop } from '@/utils/formatCop'
import CrossSellPicker from '../components/CrossSellPicker.vue'
import { fetchCrossSells, saveCrossSells } from '../services/catalogService'
import { hasFeature } from '@/utils/hasFeature'

import ProductFormExtra from '../components/ProductFormExtra.vue'
import ProductFormSection from '../components/ProductFormSection.vue'
import ProductImagesEditor from '../components/ProductImagesEditor.vue'
import ProductQuickViewModal from '../components/ProductQuickViewModal.vue'
import ProductComponentsEditor from '../components/ProductComponentsEditor.vue'
import ProductIngredientsEditor from '../components/ProductIngredientsEditor.vue'
import ProductOptionGroupsEditor from '../components/ProductOptionGroupsEditor.vue'
import ProductVariantsEditor from '../components/ProductVariantsEditor.vue'
import { useCategories } from '../composables/useCategories'
import { useIngredientOptions } from '../composables/useIngredientOptions'
import { useOptionGroupLibrary } from '../composables/useOptionGroupLibrary'
import { useProduct } from '../composables/useProduct'
import { useProductAttributes } from '../composables/useProductAttributes'
import { useProductMutations } from '../composables/useProductMutations'
import { uploadProductImage } from '../services/productImageService'
import { variantComboKey, variantComboLabel } from '../support/variantCombo'
import { confirmAction } from '@/composables/useConfirm'

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
const productOptionsEnabled = computed(() => hasFeature(business.value, 'product_options'))
const optionLibraryQuery = useOptionGroupLibrary(productOptionsEnabled)
// Las fotos del catalogo existen para publicarlas en la tienda online, asi
// que la seccion entera vive detras de ese modulo (las rutas de imagenes
// tambien estan gateadas por `feature:online_store` en el backend).
// El menú digital también muestra la foto de cada plato.
const channelName = useChannelName()
const onlineStoreEnabled = computed(() =>
  hasFeature(business.value, ['online_store', 'digital_menu']),
)
// Las ventas cruzadas («Va bien con») sí son solo de la tienda online: su
// endpoint responde 403 a un restaurante que solo tiene el menú digital.
const crossSellsEnabled = computed(() => hasFeature(business.value, 'online_store'))
// Sin el módulo de Servicios no hay nada que elegir: todo lo que se crea es un
// producto, así que el selector de tipo no se muestra. (Un servicio ya
// existente se sigue editando como servicio: isService lo trae el producto.)
const servicesEnabled = computed(() => hasFeature(business.value, 'services'))
const productAttributesQuery = useProductAttributes(variantsEnabled)
const { createMutation, updateMutation } = useProductMutations()

const categoryOptions = computed(() => {
  const all = categoriesQuery.data.value ?? []
  return all.map((c) => ({
    id: c.id,
    label: c.parent_id
      ? `${all.find((p) => p.id === c.parent_id)?.name ?? ''} › ${c.name}`
      : c.name,
  }))
})

const name = ref('')
const description = ref('')
const crossSellIds = ref<number[]>([])
const MAX_CROSS_SELLS = 6

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
// Un solo precio o por variaciones: ver «Un solo precio…» más abajo.
const priceMode = ref<'single' | 'variants'>('single')
const optionGroups = ref<ProductOptionGroupInput[]>([])
const components = ref<ProductComponentInput[]>([])
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

// --- Precio por sede ---
// Vive junto al precio general (en Variaciones o bajo "Precio de venta"), no
// en un cuadro aparte: antes el mismo precio se tocaba en dos sitios. La sede
// principal usa el precio general; las demas pueden tener uno propio, y vacio
// = el general. Se guarda despues del producto (su endpoint cuelga del id),
// asi que tambien sirve al crear.
const { branches } = useBranches()
const pricedBranches = computed(() =>
  hasFeature(business.value, 'multi_branch') && !isService.value
    ? branches.value.filter((b) => !b.is_main).map((b) => ({ id: b.id, name: b.name }))
    : [],
)
/** "sede:objetivo" -> precio propio; objetivo = combinacion de la variante, o 'product'. */
const branchPrices = ref<Record<string, number | null>>({})
const PRODUCT_TARGET = 'product'

function branchPriceKey(branchId: number, target: string): string {
  return `${branchId}:${target}`
}

const branchPricesQuery = useQuery({
  queryKey: computed(() => ['products', productId.value, 'branch-prices'] as const),
  queryFn: () => fetchBranchPrices(productId.value as number),
  enabled: computed(() => isEdit.value && !!productId.value && pricedBranches.value.length > 0),
})

watch(
  () => [branchPricesQuery.data.value, productQuery.data.value] as const,
  ([data, product]) => {
    if (!data || !product) {
      return
    }
    const comboByVariant = new Map(
      (product.variants ?? []).map((v) => [
        v.id,
        variantComboKey(v.attribute_values.map((av) => av.product_attribute_value_id)),
      ]),
    )
    const next: Record<string, number | null> = {}
    for (const row of data.branch_prices) {
      const target =
        row.product_variant_id === null ? PRODUCT_TARGET : comboByVariant.get(row.product_variant_id)
      if (target) {
        next[branchPriceKey(row.branch_id, target)] = row.price
      }
    }
    branchPrices.value = next
  },
  { immediate: true },
)

async function saveBranchPrices(saved: Product): Promise<void> {
  if (pricedBranches.value.length === 0) {
    return
  }
  const savedVariants = saved.variants ?? []
  type BranchPriceRow = { branch_id: number; product_variant_id: number | null; price: number | null }
  const rows = pricedBranches.value.flatMap((branch): BranchPriceRow[] =>
    savedVariants.length > 0
      ? savedVariants.map((v) => ({
          branch_id: branch.id,
          product_variant_id: v.id,
          price:
            branchPrices.value[
              branchPriceKey(
                branch.id,
                variantComboKey(v.attribute_values.map((av) => av.product_attribute_value_id)),
              )
            ] ?? null,
        }))
      : [
          {
            branch_id: branch.id,
            product_variant_id: null,
            price: branchPrices.value[branchPriceKey(branch.id, PRODUCT_TARGET)] ?? null,
          },
        ],
  )
  try {
    await updateBranchPrices(saved.id, rows)
  } catch (error) {
    // El producto ya quedo guardado: no se pierde por un precio de sede.
    notify(extractErrorMessage(error, 'El producto se guardó, pero no los precios por sede.'), 'error')
  }
}

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
  // El motivo del PRIMER fallo. Un contador a secas deja al comerciante sin
  // nada que hacer ni que reportar: pasó de verdad que el servidor rechazaba
  // todas las fotos por un problema suyo y el aviso solo decía "no se
  // pudieron subir", así que nadie se enteró de que había algo roto.
  let reason: string | null = null

  // Secuencial: el orden de las fotos es el orden en que llegan.
  for (const image of pendingImages.value) {
    try {
      await uploadProductImage(created.id, image.file, {
        variantId:
          image.variantKey === null ? null : (variantIdByCombo.get(image.variantKey) ?? null),
      })
    } catch (error) {
      failed += 1
      reason ??= extractErrorMessage(error, '')
    }
  }

  pendingImages.value.forEach((image) => URL.revokeObjectURL(image.previewUrl))
  pendingImages.value = []

  if (failed > 0) {
    notify(
      `El producto se creó, pero ${failed} foto(s) no se pudieron subir.` +
        (reason ? ` ${reason}` : ''),
    )
  }
}

// Las cruzadas viven en su propio endpoint (son relacion, no atributo) y ese
// endpoint solo existe con tienda online: sin ella responde 403 y el aviso
// "modulo no habilitado" salia al abrir cualquier producto.
watch(
  [() => productQuery.data.value?.id, crossSellsEnabled],
  ([id, enabled]) => {
    if (id && enabled) {
      void fetchCrossSells(id).then((related) => {
        crossSellIds.value = related.map((item) => item.id)
      })
    }
  },
  { immediate: true },
)

watch(
  () => productQuery.data.value,
  (product) => {
    if (!product) {
      return
    }
    name.value = product.name
    description.value = product.description ?? ''
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
    ingredients.value = (product.ingredients ?? []).map((i) => ({
      ingredient_id: i.id,
      quantity: i.quantity,
    }))
    optionGroups.value = (product.option_groups ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      min_choices: g.min_choices,
      max_choices: g.max_choices,
      allow_repeat: g.allow_repeat,
      options: g.options.map((o) => ({
        id: o.id,
        name: o.name,
        extra_price: Number(o.extra_price),
        ingredient_id: o.ingredient_id,
        ingredient_quantity: o.ingredient_quantity,
        is_active: o.is_active,
      })),
    }))
    components.value = (product.components ?? []).map((c) => ({
      component_product_id: c.component_product_id,
      ingredient_id: c.ingredient_id,
      quantity: Number(c.quantity),
    }))
    priceMode.value = (product.variants ?? []).length > 0 ? 'variants' : 'single'
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
      components.value = []
    }
  },
  { deep: true },
)
// Un combo no lleva stock propio: se descuenta de sus piezas al venderlo.
watch(
  components,
  (value) => {
    if (value.length > 0) {
      trackStock.value = false
      ingredients.value = []
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

// --- Un solo precio o por variaciones ---
// Se elige ANTES de escribir el precio. Antes el campo "Precio" estaba arriba
// y las variaciones al final: al marcar una, el precio de arriba se ponía
// gris sin explicar por qué. Ahora el comerciante dice primero cómo vende el
// producto y solo ve los campos de ese modo.
// (`priceMode` se declara más arriba, junto a las demás: el watch que carga el
// producto la escribe al montar, y declararla después daba «Cannot access
// before initialization» al abrir un producto ya en caché.)

const canHaveVariants = computed(
  () =>
    variantsEnabled.value &&
    !isService.value &&
    !isSingleSale.value &&
    ingredients.value.length === 0 &&
    components.value.length === 0,
)

// Servicio, venta única, receta o combo no admiten variaciones: si se activan
// después, el modo vuelve a un solo precio (los watchers de arriba ya
// vaciaron las variantes).
watch(canHaveVariants, (allowed) => {
  if (!allowed) {
    priceMode.value = 'single'
  }
})

async function setPriceMode(mode: 'single' | 'variants'): Promise<void> {
  if (mode === priceMode.value) {
    return
  }
  if (mode === 'single' && variants.value.length > 0) {
    const ok = await confirmAction(
      `Se quitarán las ${variants.value.length} combinaciones que marcaste. ¿Pasar a un solo precio?`,
    )
    if (!ok) {
      return
    }
    variants.value = []
  }
  priceMode.value = mode
}

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

// Los números de las secciones se corren cuando una no aplica (sin tienda
// online no hay Fotos; un servicio no lleva Inventario).
const sectionSteps = computed(() => {
  let step = 1
  return {
    info: step++,
    photos: onlineStoreEnabled.value ? step++ : 0,
    price: step++,
    stock: !isService.value ? step++ : 0,
    extras: step++,
  }
})

const hasExtras = computed(
  () =>
    crossSellsEnabled.value ||
    (ingredientsEnabled.value && !isService.value && !isSingleSale.value) ||
    (productOptionsEnabled.value && !isService.value),
)

/** Ganancia por unidad con un solo precio, para que el costo diga algo. */
const margin = computed(() => {
  if (isService.value || priceVariesAtSale.value) {
    return null
  }
  const sale = Number(price.value) || 0
  const cost = Number(recipeCost.value ?? costPrice.value) || 0
  if (sale <= 0 || cost <= 0) {
    return null
  }
  return { amount: sale - cost, percent: Math.round(((sale - cost) / sale) * 100) }
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

/** Lleva la pantalla a la sección con el error: en el celular quedaba fuera de vista. */
function revealSection(id: string): void {
  void nextTick(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

async function submit(): Promise<void> {
  fieldErrors.value = {}
  formError.value = null

  if (!name.value.trim()) {
    fieldErrors.value.name = 'El nombre es obligatorio.'
    revealSection('product-info')
    return
  }
  if (!categoryId.value) {
    fieldErrors.value.category_id = 'Elige una categoría.'
    revealSection('product-info')
    return
  }
  if (priceMode.value === 'variants') {
    if (variants.value.length === 0) {
      fieldErrors.value.variants =
        'Marca al menos una combinación, o elige «Un solo precio».'
      revealSection('product-price')
      return
    }
    if (variants.value.some((variant) => !(Number(variant.price) > 0))) {
      fieldErrors.value.variants = 'Ponle precio a todas las combinaciones marcadas.'
      revealSection('product-price')
      return
    }
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
    revealSection('product-price')
    return
  }

  const payload = {
    name: name.value.trim(),
    // La descripción ya no se esconde detrás de un botón: lo escrito se guarda.
    description: description.value.trim() || null,
    how_to_use: showHowToUse.value ? howToUse.value.trim() || null : null,
    price: effectivePrice,
    ...(recipeCost.value === null && cheapestVariantPrice.value === null
      ? { cost_price: costPrice.value ?? 0 }
      : {}),
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
    ...(productOptionsEnabled.value ? { option_groups: isService.value ? [] : optionGroups.value } : {}),
    ...(productOptionsEnabled.value
      ? { components: isService.value || isSingleSale.value ? [] : components.value }
      : {}),
  }

  try {
    if (isEdit.value && productId.value) {
      const updated = await updateMutation.mutateAsync({ id: productId.value, payload })
      await saveBranchPrices(updated)
      // Despues del producto: es una relacion aparte, y si fallara no debe
      // impedir que el producto se guarde.
      if (crossSellsEnabled.value) {
        await saveCrossSells(productId.value, crossSellIds.value)
      }
      notify('Producto actualizado')
    } else {
      const created = await createMutation.mutateAsync(payload)
      await saveBranchPrices(created)
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
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-24 sm:pb-4">
    <!-- Encabezado: en computador las acciones también van arriba, como en
         cualquier editor; en el celular quedan en la barra de abajo. -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
        aria-label="Volver"
        @click="router.push(returnRoute)"
      >
        <i class="pi pi-arrow-left" />
      </button>
      <h1 class="min-w-0 flex-1 truncate text-lg font-bold text-slate-800 sm:text-xl">
        {{ pageTitle }}
      </h1>
      <div class="hidden items-center gap-2 sm:flex">
        <NxButton variant="outline" size="sm" icon="pi pi-eye" @click="previewOpen = true">
          Vista previa
        </NxButton>
        <NxButton size="sm" :loading="isSaving" @click="submit">Guardar</NxButton>
      </div>
    </div>

    <p v-if="formError" class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ formError }}
    </p>

    <div v-if="isEdit && productQuery.isPending.value" class="h-64 animate-pulse rounded-xl bg-slate-100" />

    <template v-else>
      <!-- 1. Qué es -->
      <ProductFormSection
        id="product-info"
        :step="sectionSteps.info"
        title="¿Qué vas a vender?"
        :subtitle="
          servicesEnabled
            ? 'Lo que identifica al producto: tipo, nombre, categoría y descripción.'
            : 'Lo que identifica al producto: nombre, categoría y descripción.'
        "
        class="scroll-mt-4"
      >
        <!-- El tipo va primero porque decide qué se pide después: un servicio
             no lleva inventario ni variaciones. -->
        <div
          v-if="!forcedService && servicesEnabled"
          class="grid grid-cols-2 gap-2"
          role="radiogroup"
          aria-label="Tipo"
        >
          <button
            v-for="option in [
              { value: false, label: 'Producto', hint: 'Algo que se entrega', icon: 'pi pi-box' },
              { value: true, label: 'Servicio', hint: 'Algo que se hace', icon: 'pi pi-wrench' },
            ]"
            :key="option.label"
            type="button"
            role="radio"
            :aria-checked="isService === option.value"
            class="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors"
            :class="
              isService === option.value
                ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-400'
                : 'border-slate-200 hover:border-indigo-300'
            "
            @click="isService = option.value"
          >
            <i
              :class="[option.icon, isService === option.value ? 'text-indigo-600' : 'text-slate-400']"
            />
            <span class="min-w-0">
              <span class="block text-sm font-semibold text-slate-800">{{ option.label }}</span>
              <span class="block text-xs text-slate-500">{{ option.hint }}</span>
            </span>
          </button>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        </div>

        <NxInputNumber
          v-if="isService"
          v-model="durationMinutes"
          label="Duración en minutos (opcional)"
          :min="0"
          :currency="false"
          class="sm:max-w-xs"
        />

        <NxTextarea
          v-model="description"
          label="Descripción (opcional)"
          :rows="3"
          placeholder="Material, medidas, para quién es…"
        />

        <NxTextarea
          v-if="showHowToUse"
          v-model="howToUse"
          label="Cómo se usa (opcional)"
          :rows="2"
        />
        <button
          v-else
          type="button"
          class="-mt-1 self-start text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          @click="showHowToUse = true"
        >
          + Agregar modo de uso
        </button>

        <div class="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <NxToggleButton
            v-model="isActive"
            :label="isService ? 'Servicio activo' : 'Producto activo'"
            icon="pi pi-check-circle"
          />
          <p class="min-w-0 flex-1 text-xs text-slate-500">
            {{
              isActive
                ? 'Se puede vender y aparece en el catálogo.'
                : 'Queda guardado, pero no aparece para vender.'
            }}
          </p>
          <NxInput v-if="isEdit && sku" v-model="sku" label="SKU" size="sm" disabled class="w-40" />
        </div>
      </ProductFormSection>

      <!-- 2. Fotos -->
      <ProductFormSection
        v-if="onlineStoreEnabled"
        :step="sectionSteps.photos"
        title="Fotos"
        :subtitle="`La primera es la portada en ${channelName}.`"
      >
        <ProductImagesEditor
          v-model:pending="pendingImages"
          :product-id="productId"
          :variant-targets="variantPhotoTargets"
        />
      </ProductFormSection>

      <!-- 3. Precio (y variaciones) -->
      <ProductFormSection
        id="product-price"
        :step="sectionSteps.price"
        title="Precio"
        :subtitle="
          canHaveVariants
            ? 'Primero dinos si tiene un solo precio o si cambia por talla, color u otra opción.'
            : 'Lo que cobras y lo que te cuesta.'
        "
        class="scroll-mt-4"
      >
        <div
          v-if="canHaveVariants"
          class="grid grid-cols-1 gap-2 sm:grid-cols-2"
          role="radiogroup"
          aria-label="Cómo se vende"
        >
          <button
            v-for="option in [
              {
                value: 'single' as const,
                label: 'Un solo precio',
                hint: 'Todas las unidades son iguales',
                icon: 'pi pi-tag',
              },
              {
                value: 'variants' as const,
                label: 'Con variaciones',
                hint: 'Cambia por talla, color, tamaño…',
                icon: 'pi pi-th-large',
              },
            ]"
            :key="option.value"
            type="button"
            role="radio"
            :aria-checked="priceMode === option.value"
            class="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors"
            :class="
              priceMode === option.value
                ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-400'
                : 'border-slate-200 hover:border-indigo-300'
            "
            @click="setPriceMode(option.value)"
          >
            <i
              :class="[option.icon, priceMode === option.value ? 'text-indigo-600' : 'text-slate-400']"
            />
            <span class="min-w-0">
              <span class="block text-sm font-semibold text-slate-800">{{ option.label }}</span>
              <span class="block text-xs text-slate-500">{{ option.hint }}</span>
            </span>
          </button>
        </div>

        <!-- Con variaciones: cada combinación trae su precio, costo y stock. -->
        <template v-if="priceMode === 'variants' && canHaveVariants">
          <ProductVariantsEditor
            v-model="variants"
            v-model:branch-prices="branchPrices"
            :attributes="productAttributesQuery.data.value ?? []"
            :branches="pricedBranches"
          />
          <p
            v-if="fieldErrors.variants"
            class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {{ fieldErrors.variants }}
          </p>
          <p
            v-else-if="cheapestVariantPrice !== null && cheapestVariantPrice > 0"
            class="text-xs text-slate-500"
          >
            En el catálogo y la tienda se muestra
            <strong class="text-slate-700">desde {{ formatCop(cheapestVariantPrice) }}</strong>.
          </p>
        </template>

        <!-- Un solo precio -->
        <template v-else>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NxInputNumber
              :model-value="price"
              :label="priceVariesAtSale ? 'Precio de referencia' : 'Precio de venta'"
              :min="0"
              required
              :error="fieldErrors.price"
              @update:model-value="price = $event ?? 0"
            />
            <template v-if="!isService">
              <NxInputNumber
                v-if="recipeCost === null"
                v-model="costPrice"
                label="Costo (opcional)"
                :min="0"
              />
              <div v-else class="rounded-lg bg-slate-50 px-3 py-2">
                <p class="text-xs text-slate-500">Costo según la receta</p>
                <p class="text-sm font-semibold text-slate-800">{{ formatCop(recipeCost) }}</p>
              </div>
            </template>
          </div>

          <p v-if="margin !== null" class="-mt-1 text-xs text-slate-500">
            Ganas <strong class="text-slate-700">{{ formatCop(margin.amount) }}</strong> por unidad
            ({{ margin.percent }}% del precio).
          </p>

          <div
            v-if="pricedBranches.length > 0"
            class="flex flex-col gap-2 rounded-lg bg-slate-50 p-3"
          >
            <p class="text-xs text-slate-500">
              Ese es el precio de la sede principal. En las otras sedes, déjalo vacío para cobrar lo
              mismo.
            </p>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <NxInputNumber
                v-for="branch in pricedBranches"
                :key="branch.id"
                v-model="branchPrices[branchPriceKey(branch.id, PRODUCT_TARGET)]"
                :label="`Precio en ${branch.name}`"
                size="sm"
                :min="0"
                placeholder="Igual al de venta"
              />
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <NxToggleButton
              v-model="priceVariesAtSale"
              label="El precio se pone al vender"
              icon="pi pi-sliders-h"
            />
            <p class="min-w-0 flex-1 text-xs text-slate-500">
              Para lo que se cobra distinto cada vez (por peso, a convenir…).
            </p>
          </div>
        </template>
      </ProductFormSection>

      <!-- 4. Inventario -->
      <ProductFormSection
        v-if="!isService"
        :step="sectionSteps.stock"
        title="Inventario"
        subtitle="Cuántas unidades tienes y cuándo avisarte que se acaban."
      >
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <NxToggleButton
            v-model="trackStock"
            label="Controlar inventario"
            icon="pi pi-box"
            :disabled="isSingleSale || ingredients.length > 0 || variants.length > 0 || components.length > 0"
          />
          <NxToggleButton v-model="isSingleSale" label="Venta única" icon="pi pi-verified" />
        </div>
        <p v-if="isSingleSale" class="-mt-2 text-xs text-slate-500">
          Venta única: un artículo que se vende una sola vez. No lleva variaciones ni receta.
        </p>

        <p
          v-if="priceMode === 'variants' && canHaveVariants"
          class="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600"
        >
          El stock se lleva por combinación: lo pones en cada una, en <strong>Precio</strong>.
        </p>
        <p
          v-else-if="components.length > 0"
          class="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600"
        >
          Un combo no lleva stock propio: se descuenta de sus piezas al venderlo.
        </p>
        <div v-else-if="trackStock" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <NxInputNumber
            v-if="!isEdit"
            v-model="stock"
            label="Unidades que tienes hoy"
            :min="0"
            :currency="false"
            :disabled="ingredients.length > 0"
          />
          <p v-else class="self-center text-xs text-slate-500">
            El stock se ajusta con movimientos de inventario, no editando el producto.
          </p>
          <NxInputNumber
            v-model="lowStockAlertThreshold"
            label="Avisarme cuando queden (opcional)"
            :min="0"
            :currency="false"
          />
        </div>
      </ProductFormSection>

      <!-- 5. Extras opcionales -->
      <ProductFormSection
        v-if="hasExtras"
        :step="sectionSteps.extras"
        title="Extras (opcional)"
        subtitle="La mayoría de productos no los necesita. Ábrelos solo si aplican."
      >
        <ProductFormExtra
          v-if="ingredientsEnabled && !isService && !isSingleSale"
          title="Receta de insumos"
          hint="Descuenta insumos del inventario al vender y calcula el costo solo."
          icon="pi pi-list"
          :in-use="ingredients.length > 0"
        >
          <ProductIngredientsEditor
            v-model="ingredients"
            :ingredients="ingredientOptionsQuery.data.value ?? []"
          />
        </ProductFormExtra>

        <ProductFormExtra
          v-if="
            productOptionsEnabled &&
            !isService &&
            !isSingleSale &&
            ingredients.length === 0 &&
            variants.length === 0
          "
          title="Combo"
          hint="Un producto armado con otros (ej. hamburguesa + papas + gaseosa)."
          icon="pi pi-th-large"
          :in-use="components.length > 0"
        >
          <ProductComponentsEditor
            v-model="components"
            :ingredients="ingredientOptionsQuery.data.value ?? []"
            :current-product-id="productId"
          />
        </ProductFormExtra>

        <ProductFormExtra
          v-if="productOptionsEnabled && !isService"
          title="Opciones para elegir al vender"
          hint="Lo que el cliente escoge: término de la carne, salsas, adiciones…"
          icon="pi pi-check-square"
          :in-use="optionGroups.length > 0"
        >
          <ProductOptionGroupsEditor
            v-model="optionGroups"
            :library="optionLibraryQuery.data.value ?? []"
            :current-product-id="productId"
            :ingredients="ingredientOptionsQuery.data.value ?? []"
            :ingredients-enabled="ingredientsEnabled"
          />
        </ProductFormExtra>

        <!-- Solo con tienda online: las ventas cruzadas son exclusivas de la
             tienda (desde 2026-09-04). Sin tienda no hay donde se muestren. -->
        <ProductFormExtra
          v-if="crossSellsEnabled"
          title="Se vende bien con"
          hint="Lo que aparece como «Va bien con» en la ficha de tu tienda online."
          icon="pi pi-link"
          :in-use="crossSellIds.length > 0"
        >
          <CrossSellPicker
            v-model="crossSellIds"
            :product-id="isEdit ? productId : null"
            :max="MAX_CROSS_SELLS"
          />
        </ProductFormExtra>
      </ProductFormSection>
    </template>

    <!-- Acciones. En el celular quedan fijas abajo, encima del menú
         inferior, para no tener que bajar hasta el final a guardar. Es
         `fixed` y no `sticky`: el body del POS tiene overflow-x oculto y con
         eso `sticky` nunca se pega. -->
    <div
      class="fixed inset-x-3 bottom-[78px] z-10 flex gap-2 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none"
    >
      <NxButton variant="outline" class="flex-1 sm:flex-none" @click="router.push(returnRoute)">
        Cancelar
      </NxButton>
      <NxButton variant="outline" icon="pi pi-eye" aria-label="Vista previa" @click="previewOpen = true">
        <span class="hidden sm:inline">Vista previa</span>
      </NxButton>
      <NxButton class="flex-1 sm:ml-auto sm:flex-none sm:px-8" :loading="isSaving" @click="submit">
        Guardar
      </NxButton>
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
