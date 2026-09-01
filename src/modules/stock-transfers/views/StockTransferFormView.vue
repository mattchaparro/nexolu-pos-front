<script setup lang="ts">
// Mover inventario de una sede a otra.
//
// El traslado es inmediato: sale de origen y entra a destino en la misma
// operacion, sin estado "en transito" (ver StockTransferService en la API).
// Por eso la pantalla no tiene pasos ni confirmacion de recepcion.
//
// El stock que se muestra por linea es el de la sede ORIGEN, no el total del
// negocio: mandar 10 unidades desde un local que solo tiene 3 es el error
// que hay que hacer imposible de cometer, y el total no ayuda a evitarlo.
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { useBranches } from '@/composables/useBranches'
import { useSystemAlert } from '@/composables/useSystemAlert'
import type { Product } from '@/types/product'
import { NxButton, NxCard, NxInput, NxInputNumber, NxPageHeader, NxSelect } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { useBranchProducts } from '../composables/useBranchProducts'
import { useStockTransferMutations } from '../composables/useStockTransferMutations'

const router = useRouter()
const { branches } = useBranches()
const { createMutation } = useStockTransferMutations()
const { notify } = useSystemAlert()

const fromBranchId = ref<number | null>(null)
const toBranchId = ref<number | null>(null)
const notes = ref('')
const formError = ref<string | null>(null)

interface Line {
  key: string
  productId: number | null
  quantity: number | null
}

const lines = ref<Line[]>([{ key: crypto.randomUUID(), productId: null, quantity: null }])

// El catalogo se pide CON la sede de origen, para que cada producto traiga
// el stock de ese local.
const { products, isLoading } = useBranchProducts(fromBranchId)

const branchOptions = computed(() =>
  branches.value.map((branch) => ({ label: branch.name, value: branch.id })),
)

const destinationOptions = computed(() =>
  branchOptions.value.filter((option) => option.value !== fromBranchId.value),
)

const productOptions = computed(() =>
  products.value.map((product: Product) => ({
    label: `${product.name} — ${Number(product.stock)} disp.`,
    value: product.id,
  })),
)

function stockOf(productId: number | null): number {
  if (!productId) {
    return 0
  }
  return Number(products.value.find((product: Product) => product.id === productId)?.stock ?? 0)
}

/** Una linea que pide mas de lo que hay en origen: el backend la rechaza. */
function exceedsStock(line: Line): boolean {
  return line.productId !== null && (line.quantity ?? 0) > stockOf(line.productId)
}

const canSubmit = computed(
  () =>
    fromBranchId.value !== null &&
    toBranchId.value !== null &&
    fromBranchId.value !== toBranchId.value &&
    lines.value.some((line) => line.productId && (line.quantity ?? 0) > 0) &&
    !lines.value.some(exceedsStock),
)

// Cambiar el origen cambia el stock de cada producto, asi que las cantidades
// ya escritas dejan de significar lo mismo. Se limpian en vez de arrastrar
// un numero que ahora puede exceder lo disponible.
watch(fromBranchId, () => {
  lines.value = [{ key: crypto.randomUUID(), productId: null, quantity: null }]
  if (toBranchId.value === fromBranchId.value) {
    toBranchId.value = null
  }
})

function addLine(): void {
  lines.value.push({ key: crypto.randomUUID(), productId: null, quantity: null })
}

function removeLine(key: string): void {
  lines.value = lines.value.filter((line) => line.key !== key)
  if (lines.value.length === 0) {
    addLine()
  }
}

async function submit(): Promise<void> {
  formError.value = null

  try {
    await createMutation.mutateAsync({
      from_branch_id: fromBranchId.value as number,
      to_branch_id: toBranchId.value as number,
      notes: notes.value.trim() || null,
      items: lines.value
        .filter((line) => line.productId && (line.quantity ?? 0) > 0)
        .map((line) => ({ product_id: line.productId, quantity: line.quantity as number })),
    })
    notify('Traslado realizado.', 'success')
    router.push({ name: 'stock-transfers.index' })
  } catch (error) {
    formError.value = extractErrorMessage(error, 'No pudimos hacer el traslado.')
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <NxPageHeader
      title="Nuevo traslado"
      subtitle="El inventario sale de una sede y entra a la otra al confirmar."
      icon="pi pi-arrow-right-arrow-left"
    />

    <NxCard>
      <div class="grid gap-4 sm:grid-cols-2">
        <NxSelect
          v-model="fromBranchId"
          label="Desde"
          :options="branchOptions"
          option-label="label"
          option-value="value"
        />
        <NxSelect
          v-model="toBranchId"
          label="Hacia"
          :options="destinationOptions"
          option-label="label"
          option-value="value"
          :disabled="fromBranchId === null"
        />
      </div>
    </NxCard>

    <NxCard v-if="fromBranchId">
      <div class="flex flex-col gap-3">
        <div v-for="line in lines" :key="line.key" class="flex items-end gap-2">
          <div class="min-w-0 flex-1">
            <NxSelect
              v-model="line.productId"
              label="Producto"
              :options="productOptions"
              option-label="label"
              option-value="value"
              filter
              :disabled="isLoading"
            />
          </div>
          <div class="w-32">
            <NxInputNumber v-model="line.quantity" label="Cantidad" :min="0" />
          </div>
          <NxButton
            variant="secondary"
            icon="pi pi-trash"
            title="Quitar"
            @click="removeLine(line.key)"
          />
        </div>

        <p v-if="lines.some(exceedsStock)" class="text-sm text-red-600">
          Alguna línea pide más de lo que hay en la sede de origen.
        </p>

        <div>
          <NxButton variant="secondary" icon="pi pi-plus" @click="addLine">
            Agregar producto
          </NxButton>
        </div>
      </div>
    </NxCard>

    <NxCard v-if="fromBranchId">
      <NxInput v-model="notes" label="Nota (opcional)" placeholder="Reposición semanal" />
    </NxCard>

    <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>

    <div class="flex justify-end gap-2">
      <NxButton variant="secondary" @click="router.push({ name: 'stock-transfers.index' })">
        Cancelar
      </NxButton>
      <NxButton :disabled="!canSubmit" :loading="createMutation.isPending.value" @click="submit">
        Confirmar traslado
      </NxButton>
    </div>
  </div>
</template>
