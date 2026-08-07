<script setup lang="ts">
// Vender: version recortada de SalesTerminal.vue del legacy, solo venta
// directa (mode==='quick'). Cuentas abiertas/mesas (mode==='tab'/'new-tab'),
// dictado por voz e impresion/envio de recibo quedan fuera - ver
// docs/BACKEND_READINESS.md para el detalle de por que cada una.
import { computed, ref } from 'vue'

import { useBusiness } from '@/composables/useBusiness'
import type { Product } from '@/types/product'
import { NxPageHeader } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import CashCheckoutModal from '../components/CashCheckoutModal.vue'
import CartPanel from '../components/CartPanel.vue'
import PriceVariesModal from '../components/PriceVariesModal.vue'
import ProductGrid from '../components/ProductGrid.vue'
import SaleSuccessDialog from '../components/SaleSuccessDialog.vue'
import { useActiveDiscounts } from '../composables/useActiveDiscounts'
import { useCreateSale } from '../composables/useCreateSale'
import { useProductCatalog } from '../composables/useProductCatalog'
import { useSaleCheckout } from '../composables/useSaleCheckout'

const { data: business } = useBusiness()
const { productsQuery, categoriesQuery } = useProductCatalog()
const { data: discounts } = useActiveDiscounts()
const createSaleMutation = useCreateSale()

const discountList = computed(() => discounts.value ?? [])
const checkout = useSaleCheckout(
  computed(() => business.value),
  discountList,
)

const priceVariesProduct = ref<Product | null>(null)
const cashModalOpen = ref(false)
const successOpen = ref(false)
const submitError = ref<string | null>(null)
const mobileCartOpen = ref(false)

function handleSelectProduct(product: Product): void {
  if (product.price_varies_at_sale) {
    priceVariesProduct.value = product
    return
  }
  checkout.addProduct(product)
}

function handlePriceConfirmed(price: number): void {
  if (priceVariesProduct.value) {
    checkout.addProduct(priceVariesProduct.value, price)
  }
  priceVariesProduct.value = null
}

// El id de metodo de pago se normaliza a snake_case desde su label
// (Business::normalizePaymentMethodsInput) - "efectivo"/"cash" son los
// unicos que representan pago en efectivo, igual que
// Business::resolveCashPaymentMethodId() en el backend.
function isCashMethod(id: string | null): boolean {
  return id !== null && ['cash', 'efectivo'].includes(id.toLowerCase())
}

async function handleSubmit(): Promise<void> {
  submitError.value = null

  if (!checkout.isNonRevenue.value && isCashMethod(checkout.paymentMethod.value)) {
    cashModalOpen.value = true
    return
  }

  await submitSale()
}

async function submitSale(): Promise<void> {
  submitError.value = null
  try {
    await createSaleMutation.mutateAsync(checkout.buildPayload())
    cashModalOpen.value = false
    mobileCartOpen.value = false
    successOpen.value = true
  } catch (error) {
    submitError.value = extractErrorMessage(error)
  }
}

function extractErrorMessage(error: unknown): string {
  const response = (
    error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
  ).response
  const firstFieldError = response?.data?.errors
    ? Object.values(response.data.errors)[0]?.[0]
    : undefined
  return (
    firstFieldError ?? response?.data?.message ?? 'No pudimos registrar la venta. Intenta de nuevo.'
  )
}

function handleNewSale(): void {
  checkout.reset()
  successOpen.value = false
}
</script>

<template>
  <div class="flex h-[calc(100dvh-4rem)] flex-col lg:h-[calc(100dvh-4rem-3rem)]">
    <NxPageHeader title="Vender" icon="pi pi-shopping-cart" />

    <p v-if="submitError" class="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ submitError }}
    </p>

    <div class="mt-4 flex min-h-0 flex-1 gap-4">
      <div class="min-h-0 min-w-0 flex-1 pb-20 lg:pb-0">
        <template v-if="productsQuery.isPending.value || categoriesQuery.isPending.value">
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <div v-for="n in 10" :key="n" class="h-28 animate-pulse rounded-xl bg-slate-200" />
          </div>
        </template>
        <p v-else-if="productsQuery.isError.value" class="text-sm text-red-700">
          No pudimos cargar el catálogo. Intenta de nuevo más tarde.
        </p>
        <ProductGrid
          v-else
          :products="productsQuery.data.value ?? []"
          :categories="categoriesQuery.data.value ?? []"
          @select="handleSelectProduct"
        />
      </div>

      <!-- Carrito de escritorio: panel fijo a la derecha -->
      <div
        v-if="business"
        class="hidden w-[380px] shrink-0 rounded-xl border border-slate-200 bg-white p-4 lg:block"
      >
        <CartPanel
          :checkout="checkout"
          :business="business"
          :submitting="createSaleMutation.isPending.value"
          @submit="handleSubmit"
        />
      </div>
    </div>

    <!-- Barra movil: resumen + boton para abrir el carrito -->
    <button
      v-if="business && checkout.itemCount.value > 0"
      type="button"
      class="fixed inset-x-4 bottom-20 z-10 flex items-center justify-between rounded-xl bg-indigo-600 px-4 py-3 text-white shadow-lg lg:hidden"
      @click="mobileCartOpen = true"
    >
      <span class="text-sm font-medium">{{ checkout.itemCount.value }} producto(s)</span>
      <span class="font-bold">{{ formatCop(checkout.totals.value?.grandTotal ?? 0) }}</span>
    </button>

    <Teleport to="body">
      <div
        v-if="business && mobileCartOpen"
        class="fixed inset-0 z-40 flex flex-col bg-white lg:hidden"
      >
        <div class="flex items-center justify-end border-b border-slate-200 px-4 py-2">
          <button
            type="button"
            class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
            @click="mobileCartOpen = false"
          >
            <i class="pi pi-times" />
          </button>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto p-4">
          <CartPanel
            :checkout="checkout"
            :business="business"
            :submitting="createSaleMutation.isPending.value"
            @submit="handleSubmit"
          />
        </div>
      </div>
    </Teleport>

    <PriceVariesModal
      :model-value="priceVariesProduct !== null"
      :product="priceVariesProduct"
      @update:model-value="priceVariesProduct = null"
      @confirm="handlePriceConfirmed"
    />

    <CashCheckoutModal
      v-model="cashModalOpen"
      :total="checkout.totals.value?.grandTotal ?? 0"
      :submitting="createSaleMutation.isPending.value"
      @confirm="submitSale"
    />

    <SaleSuccessDialog
      v-model="successOpen"
      :sale="createSaleMutation.data.value ?? null"
      @new-sale="handleNewSale"
    />
  </div>
</template>
