<script setup lang="ts">
// Buscador + chips de categoria + grid de productos. Simplificacion
// deliberada sobre el legacy: categorias en una sola fila plana (por
// nombre), sin el drill-down padre/hijo de SalesTerminal.vue - ese
// filtrado de 2 niveles estaba hardcodeado (el propio comentario del
// legacy lo confirmaba, no soporta un 3er nivel) y no vale la pena
// repetirlo sin evidencia de que el negocio lo necesite.
import { computed, ref } from 'vue'

import { useBusiness } from '@/composables/useBusiness'
import { useSystemAlert } from '@/composables/useSystemAlert'
import { useUpdateBusinessMutation } from '@/composables/useUpdateBusinessMutation'
import type { ProductCategory } from '@/types/product'
import type { Product } from '@/types/product'
import { NxButton, NxInput, NxSwitch } from '@/ui'
import { buildCategoryToneMap } from '@/utils/categoryTone'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { usePinnedProducts } from '../composables/usePinnedProducts'
import { codeIncludes, findByExactCode } from '../support/productCode'
import ProductCard from './ProductCard.vue'

const props = withDefaults(
  defineProps<{
    products: Product[]
    categories: ProductCategory[]
    /** Ids de lo que mas rota, de mayor a menor - ver useProductCatalog. */
    frequentIds?: number[]
    /** Columnas segun el ancho de la caja y no de la pantalla (ej. dentro de un modal). */
    fitContainer?: boolean
    /** Ofrece "Organizar" (fijar productos y elegir fotos). Solo para quien edita el catalogo. */
    organizable?: boolean
  }>(),
  { frequentIds: () => [], fitContainer: false, organizable: false },
)

const { data: business } = useBusiness()
const { notify } = useSystemAlert()

// Ajustes › Ventas › "Mostrar fotos": lo decide el negocio, no el cajero.
const showPhotos = computed(() => business.value?.sell_show_photos === true)

const pinMutation = usePinnedProducts()
const updateBusiness = useUpdateBusinessMutation()

// "Organizar": tocar un producto lo fija/suelta; las flechas ordenan los
// fijados. Mientras esta activo, tocar NO agrega a la venta.
const organizing = ref(false)

/** Ids fijados, en su orden. Sale del catalogo (pinned_order), asi que es del negocio. */
const pinnedIds = computed(() =>
  props.products
    .filter((p) => p.pinned_order !== null && p.pinned_order !== undefined)
    .sort((a, b) => (a.pinned_order ?? 0) - (b.pinned_order ?? 0))
    .map((p) => p.id),
)

function savePinned(ids: number[]): void {
  pinMutation.mutate(ids, {
    onError: (error) => notify(extractErrorMessage(error, 'No pudimos guardar el orden.'), 'error'),
  })
}

function togglePin(product: Product): void {
  const ids = pinnedIds.value
  savePinned(ids.includes(product.id) ? ids.filter((id) => id !== product.id) : [...ids, product.id])
}

function movePinned(product: Product, offset: -1 | 1): void {
  const ids = [...pinnedIds.value]
  const from = ids.indexOf(product.id)
  const to = from + offset
  if (from === -1 || to < 0 || to >= ids.length) {
    return
  }
  ;[ids[from], ids[to]] = [ids[to]!, ids[from]!]
  savePinned(ids)
}

function pinnedPosition(product: Product): number {
  return pinnedIds.value.indexOf(product.id)
}

async function setShowPhotos(value: boolean): Promise<void> {
  try {
    await updateBusiness.mutateAsync({ sell_show_photos: value })
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos guardar el cambio.'), 'error')
  }
}

const emit = defineEmits<{ select: [product: Product] }>()

const search = ref('')
const searchInput = ref<InstanceType<typeof NxInput> | null>(null)
const selectedCategoryId = ref<number | null>(null)
// Filtro "Frecuentes": vive aparte de selectedCategoryId porque no es una
// categoria del negocio sino un corte por rotacion, y los dos son
// excluyentes (elegir uno apaga el otro).
const frequentSelected = ref(false)

const categoriesInUse = computed(() => {
  const idsWithProducts = new Set(props.products.map((p) => p.category?.id).filter(Boolean))
  return props.categories.filter((c) => idsWithProducts.has(c.id))
})

// Sobre TODAS las categorias del negocio, no solo las que tienen productos
// activos: si no, el color de una categoria cambiaria al vaciarse otra.
const categoryTones = computed(() => buildCategoryToneMap(props.categories))

// Solo se ofrece si hay historial que respalde el atajo: un negocio recien
// migrado (o recien abierto) no tiene "frecuentes" que mostrar.
const hasFrequent = computed(() => props.frequentIds.length > 0)

/** Posicion en el ranking, para ordenar la grilla por rotacion. */
const frequentRank = computed(() => new Map(props.frequentIds.map((id, index) => [id, index])))

const filteredProducts = computed(() => {
  const term = search.value.trim().toLowerCase()

  const list = props.products.filter((product) => {
    if (!product.is_active) {
      return false
    }
    if (frequentSelected.value && !frequentRank.value.has(product.id)) {
      return false
    }
    if (selectedCategoryId.value !== null && product.category?.id !== selectedCategoryId.value) {
      return false
    }
    // Como en el legacy: el texto busca por nombre del producto, de su
    // categoria o por codigo (el de un lector de codigo de barras).
    if (
      term &&
      !product.name.toLowerCase().includes(term) &&
      !(product.category?.name ?? '').toLowerCase().includes(term) &&
      !codeIncludes(product, term)
    ) {
      return false
    }
    return true
  })

  // Con "Frecuentes" activo el orden ES la informacion: lo que mas se vende
  // tiene que quedar arriba, no en orden alfabetico.
  if (frequentSelected.value) {
    return [...list].sort(
      (a, b) => (frequentRank.value.get(a.id) ?? Infinity) - (frequentRank.value.get(b.id) ?? Infinity),
    )
  }

  // Los fijados van primero, en el orden que les dio el negocio; el resto
  // conserva el suyo (alfabetico, ya viene asi del servidor).
  const pinnedRank = new Map(pinnedIds.value.map((id, index) => [id, index]))
  if (pinnedRank.size === 0) {
    return list
  }

  const last = Number.MAX_SAFE_INTEGER
  return [...list].sort((a, b) => (pinnedRank.get(a.id) ?? last) - (pinnedRank.get(b.id) ?? last))
})

/**
 * Enter en el buscador: si lo escrito es exactamente el codigo de un producto
 * (lo que manda un lector de codigo de barras), se agrega de una y el
 * buscador queda limpio y con el foco para el siguiente escaneo.
 */
function addScannedCode(): void {
  const product = findByExactCode(props.products, search.value)
  if (!product) {
    return
  }

  emit('select', product)
  search.value = ''
  searchInput.value?.focus()
}

function selectCategory(id: number | null): void {
  frequentSelected.value = false
  selectedCategoryId.value = selectedCategoryId.value === id ? null : id
}

function toggleFrequent(): void {
  frequentSelected.value = !frequentSelected.value
  if (frequentSelected.value) {
    selectedCategoryId.value = null
  }
}
</script>

<template>
  <div class="flex h-full flex-col gap-3">
    <div class="flex items-start gap-2">
      <NxInput
        ref="searchInput"
        v-model="search"
        class="min-w-0 flex-1"
        label="Buscar producto o escanear código"
        size="lg"
        icon="pi pi-search"
        clearable
        blur-on-enter
        @keydown.enter="addScannedCode"
      />
      <button
        v-if="organizable"
        type="button"
        class="flex h-12 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors"
        :class="
          organizing
            ? 'border-indigo-600 bg-indigo-600 text-white'
            : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-700'
        "
        :aria-pressed="organizing"
        aria-label="Organizar productos"
        @click="organizing = !organizing"
      >
        <i class="pi pi-bookmark" />
        <span class="hidden sm:inline">{{ organizing ? 'Listo' : 'Organizar' }}</span>
      </button>
    </div>

    <!-- Organizar: que se ve y en que orden. Tocar no vende. -->
    <div
      v-if="organizing"
      class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3"
    >
      <p class="min-w-0 flex-1 basis-56 text-sm text-indigo-900">
        <span class="font-semibold">Toca un producto para fijarlo arriba.</span>
        Con las flechas eliges su lugar entre los fijados.
      </p>
      <label class="flex items-center gap-2 text-sm font-medium text-indigo-900">
        <NxSwitch :model-value="showPhotos" :disabled="updateBusiness.isPending.value" @update:model-value="setShowPhotos" />
        Mostrar fotos
      </label>
      <NxButton size="sm" @click="organizing = false">Listo</NxButton>
    </div>

    <div v-if="categoriesInUse.length > 0 || hasFrequent" class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      <!-- Primero de la fila: en un mostrador el 80% de lo que se cobra son
           los mismos pocos productos, asi que el atajo tiene que estar donde
           el pulgar ya esta, antes de cualquier categoria. -->
      <button
        v-if="hasFrequent"
        type="button"
        class="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors"
        :class="
          frequentSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        "
        @click="toggleFrequent"
      >
        <i class="pi pi-bolt text-xs" />
        Frecuentes
      </button>
      <button
        type="button"
        class="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors"
        :class="
          selectedCategoryId === null && !frequentSelected
            ? 'bg-indigo-600 text-white'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        "
        @click="selectCategory(null)"
      >
        Todas
      </button>
      <button
        v-for="category in categoriesInUse"
        :key="category.id"
        type="button"
        class="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors"
        :class="
          selectedCategoryId === category.id
            ? 'bg-indigo-600 text-white'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        "
        @click="selectCategory(category.id)"
      >
        <span
          class="h-2 w-2 shrink-0 rounded-full"
          :class="[categoryTones.get(category.id)?.dot, selectedCategoryId === category.id ? 'ring-2 ring-white/70' : '']"
        />
        {{ category.name }}
      </button>
    </div>

    <div class="@container flex-1 overflow-y-auto">
      <div
        v-if="filteredProducts.length === 0"
        class="flex h-full flex-col items-center justify-center gap-2 text-slate-400"
      >
        <i class="pi pi-search-minus text-5xl" />
        <p class="text-sm">No se encontraron productos.</p>
      </div>
      <div
        v-else
        class="grid grid-cols-2 gap-2 pb-4"
        :class="
          fitContainer
            ? '@lg:grid-cols-3 @lg:gap-3 @3xl:grid-cols-4 @5xl:grid-cols-5'
            : 'sm:grid-cols-3 sm:gap-3 xl:grid-cols-4 2xl:grid-cols-5'
        "
      >
        <ProductCard
          v-for="product in filteredProducts"
          :key="product.id"
          :product="product"
          :tone="product.category ? categoryTones.get(product.category.id) : undefined"
          :show-photo="showPhotos"
          :organizing="organizing"
          :pinned="pinnedPosition(product) !== -1"
          :can-move-earlier="pinnedPosition(product) > 0"
          :can-move-later="pinnedPosition(product) !== -1 && pinnedPosition(product) < pinnedIds.length - 1"
          @click="emit('select', product)"
          @toggle-pin="togglePin(product)"
          @move="(offset) => movePinned(product, offset)"
        />
      </div>
    </div>
  </div>
</template>
