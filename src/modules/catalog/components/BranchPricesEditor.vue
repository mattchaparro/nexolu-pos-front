<script setup lang="ts">
/**
 * Precio de un producto por sede.
 *
 * Guarda aparte del resto del formulario a proposito: es su propio endpoint
 * (PUT /products/{id}/branch-prices), solo tiene sentido sobre un producto
 * que ya existe, y separarlo evita que un error al fijar un precio de sede
 * tumbe el guardado del producto entero.
 *
 * Con variaciones (tallas, colores) el precio vive en cada variacion, asi
 * que el override tambien: una fila por variacion y un campo por sede. Sin
 * variaciones, un campo por sede para el producto.
 *
 * Dejar el campo vacio BORRA el override y esa sede vuelve al precio del
 * catalogo. Es distinto de escribir 0, que es un precio real (cortesia).
 */
import { computed, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'

import { useBranches } from '@/composables/useBranches'
import { useSystemAlert } from '@/composables/useSystemAlert'
import { fetchBranchPrices, updateBranchPrices } from '@/services/branches'
import { NxButton, NxInputNumber } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { formatCop } from '@/utils/formatCop'

interface PricedVariant {
  id: number
  label: string
  price: number
}

/** Una fila del editor: el producto entero, o una de sus variaciones. */
interface PriceLine {
  variantId: number | null
  label: string
  basePrice: number
}

const props = withDefaults(
  defineProps<{
    productId: number
    /** Precio del catalogo, para mostrar de que se estan apartando las sedes. */
    basePrice: number
    /** Variaciones ya guardadas; si hay, el precio por sede va por variacion. */
    variants?: PricedVariant[]
  }>(),
  { variants: () => [] },
)

const { branches } = useBranches()
const { notify } = useSystemAlert()

const pricesQuery = useQuery({
  queryKey: computed(() => ['products', props.productId, 'branch-prices'] as const),
  queryFn: () => fetchBranchPrices(props.productId),
})

const lines = computed<PriceLine[]>(() =>
  props.variants.length > 0
    ? props.variants.map((v) => ({ variantId: v.id, label: v.label, basePrice: v.price }))
    : [{ variantId: null, label: '', basePrice: props.basePrice }],
)

function key(branchId: number, variantId: number | null): string {
  return `${branchId}:${variantId ?? 0}`
}

/** "sede:variacion" -> precio propio, o null si usa el del catalogo. */
const overrides = ref<Record<string, number | null>>({})
const saving = ref(false)

watch(
  () => [pricesQuery.data.value, lines.value, branches.value] as const,
  ([data]) => {
    if (!data) {
      return
    }
    const next: Record<string, number | null> = {}
    for (const branch of branches.value) {
      for (const line of lines.value) {
        const row = data.branch_prices.find(
          (price) => price.branch_id === branch.id && (price.product_variant_id ?? null) === line.variantId,
        )
        next[key(branch.id, line.variantId)] = row ? row.price : null
      }
    }
    overrides.value = next
  },
  { immediate: true },
)

const customizedCount = computed(() => Object.values(overrides.value).filter((v) => v !== null).length)

async function save(): Promise<void> {
  saving.value = true
  try {
    await updateBranchPrices(
      props.productId,
      branches.value.flatMap((branch) =>
        lines.value.map((line) => ({
          branch_id: branch.id,
          product_variant_id: line.variantId,
          price: overrides.value[key(branch.id, line.variantId)] ?? null,
        })),
      ),
    )
    await pricesQuery.refetch()
    notify('Precios por sede guardados.', 'success')
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos guardar los precios por sede.'), 'error')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <p v-if="branches.length < 2" class="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
      Por ahora tienes una sola sede. Crea la otra en el menú <span class="font-semibold">Sedes</span> y
      aquí podrás darle precios distintos.
    </p>

    <template v-if="variants.length === 0">
      <p class="text-xs text-slate-500">
        Precio del catálogo: <span class="font-medium">{{ formatCop(basePrice) }}</span>. Deja una
        sede vacía para que use ese precio.
      </p>

      <div v-for="branch in branches" :key="branch.id" class="flex items-center gap-3">
        <span class="min-w-0 flex-1 truncate text-sm text-slate-700">{{ branch.name }}</span>
        <div class="w-40">
          <NxInputNumber v-model="overrides[key(branch.id, null)]" :min="0" placeholder="Catálogo" />
        </div>
      </div>
    </template>

    <template v-else>
      <p class="text-xs text-slate-500">
        Cada variación tiene su precio. Deja vacía una sede para que use el precio del catálogo de
        esa variación.
        <span v-if="customizedCount" class="font-medium text-indigo-700">
          {{ customizedCount }} {{ customizedCount === 1 ? 'precio propio' : 'precios propios' }}.
        </span>
      </p>

      <div class="flex flex-col divide-y divide-slate-100 rounded-lg border border-slate-200">
        <div
          v-for="line in lines"
          :key="line.variantId ?? 0"
          class="flex flex-col gap-2 p-2.5 sm:flex-row sm:items-center sm:gap-3"
        >
          <div class="min-w-0 sm:w-40 sm:shrink-0">
            <p class="truncate text-sm font-medium text-slate-800">{{ line.label }}</p>
            <p class="text-[11px] text-slate-400">Catálogo: {{ formatCop(line.basePrice) }}</p>
          </div>
          <div class="grid flex-1 grid-cols-2 gap-2">
            <NxInputNumber
              v-for="branch in branches"
              :key="branch.id"
              v-model="overrides[key(branch.id, line.variantId)]"
              :label="branch.name"
              size="sm"
              :min="0"
              placeholder="Catálogo"
            />
          </div>
        </div>
      </div>
    </template>

    <div>
      <NxButton variant="secondary" :loading="saving" @click="save">Guardar precios</NxButton>
    </div>
  </div>
</template>
