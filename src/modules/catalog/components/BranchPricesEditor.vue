<script setup lang="ts">
/**
 * Precio de un producto por sede.
 *
 * Guarda aparte del resto del formulario a proposito: es su propio endpoint
 * (PUT /products/{id}/branch-prices), solo tiene sentido sobre un producto
 * que ya existe, y separarlo evita que un error al fijar un precio de sede
 * tumbe el guardado del producto entero.
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

const props = defineProps<{
  productId: number
  /** Precio del catalogo, para mostrar de que se estan apartando las sedes. */
  basePrice: number
}>()

const { branches } = useBranches()
const { notify } = useSystemAlert()

const pricesQuery = useQuery({
  queryKey: computed(() => ['products', props.productId, 'branch-prices'] as const),
  queryFn: () => fetchBranchPrices(props.productId),
})

/** branch_id -> precio propio, o null si esa sede usa el del catalogo. */
const overrides = ref<Record<number, number | null>>({})
const saving = ref(false)

watch(
  () => pricesQuery.data.value,
  (data) => {
    if (!data) {
      return
    }
    const next: Record<number, number | null> = {}
    for (const branch of branches.value) {
      // Solo los del producto padre: las variantes tienen su propio precio
      // y se editan desde su propia fila (todavia no en esta pantalla).
      const row = data.branch_prices.find(
        (price) => price.branch_id === branch.id && price.product_variant_id === null,
      )
      next[branch.id] = row ? row.price : null
    }
    overrides.value = next
  },
  { immediate: true },
)

async function save(): Promise<void> {
  saving.value = true
  try {
    await updateBranchPrices(
      props.productId,
      branches.value.map((branch) => ({
        branch_id: branch.id,
        price: overrides.value[branch.id] ?? null,
      })),
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
    <p class="text-xs text-slate-500">
      Precio del catálogo: <span class="font-medium">{{ formatCop(basePrice) }}</span>. Deja una sede
      vacía para que use ese precio.
    </p>

    <div v-for="branch in branches" :key="branch.id" class="flex items-center gap-3">
      <span class="min-w-0 flex-1 truncate text-sm text-slate-700">{{ branch.name }}</span>
      <div class="w-40">
        <NxInputNumber v-model="overrides[branch.id]" :min="0" placeholder="Catálogo" />
      </div>
    </div>

    <div>
      <NxButton variant="secondary" :loading="saving" @click="save">Guardar precios</NxButton>
    </div>
  </div>
</template>
