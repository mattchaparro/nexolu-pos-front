<script setup lang="ts">
// Vender: version recortada de SalesTerminal.vue del legacy. Cubre venta
// directa (mode==='quick') Y cuentas abiertas/mesas embebidas en la misma
// pantalla (mode==='tab'|'new-tab', tira de chips arriba del buscador) -
// el cajero vive aca y espera encontrar sus mesas/cuentas sin navegar a
// otro lado. La pantalla completa "Cuentas abiertas" (link "Ver detalle")
// sigue existiendo para gestion mas a fondo (mesas, buscador dedicado).
// Dictado por voz e impresion/envio de recibo quedan fuera, igual que
// antes - ver docs/BACKEND_READINESS.md.
import { computed, ref } from 'vue'

import { useBusiness } from '@/composables/useBusiness'
import type { Product } from '@/types/product'
import type { Sale } from '@/types/sale'
import type { BusinessTable } from '@/types/table'
import { NxPageHeader } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { formatCop } from '@/utils/formatCop'

import CloseTabModal from '../../open-tabs/components/CloseTabModal.vue'
import TabClosedDialog from '../../open-tabs/components/TabClosedDialog.vue'
import { useNewItemsCart } from '../../open-tabs/composables/useNewItemsCart'
import { useOpenTabMutations } from '../../open-tabs/composables/useOpenTabMutations'
import { useOpenTabsList } from '../../open-tabs/composables/useOpenTabsList'
import { useTables } from '../../open-tabs/composables/useTables'
import type { CloseOpenTabPayload, RecordPartialPaymentPayload } from '../../open-tabs/types'
import CashCheckoutModal from '../components/CashCheckoutModal.vue'
import CartPanel from '../components/CartPanel.vue'
import MobileCartSheet from '../components/MobileCartSheet.vue'
import MobileTabSheet from '../components/MobileTabSheet.vue'
import PriceVariesModal from '../components/PriceVariesModal.vue'
import ProductGrid from '../components/ProductGrid.vue'
import SaleSuccessDialog from '../components/SaleSuccessDialog.vue'
import TabInProgressPanel from '../components/TabInProgressPanel.vue'
import TabSwitcherStrip from '../components/TabSwitcherStrip.vue'
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

// --- Cuentas abiertas/mesas embebidas ---
const tablesQuery = useTables()
const openTabsQuery = useOpenTabsList()
const tabMutations = useOpenTabMutations()
const tabCart = useNewItemsCart()

const mode = ref<'quick' | 'tab' | 'new-tab'>('quick')
const activeSale = ref<Sale | null>(null)
const pendingTable = ref<BusinessTable | null>(null)
const newTabName = ref('')
const newTabPhone = ref('')
const newTabIsDelivery = ref(false)
const mobileTabSheetOpen = ref(false)
const closeModalOpen = ref(false)
const tabClosedOpen = ref(false)
const lastClosedSale = ref<Sale | null>(null)

const openSaleByTable = computed(() => {
  const map = new Map<number, Sale>()
  for (const sale of openTabsQuery.data.value ?? []) {
    if (sale.table_id) {
      map.set(sale.table_id, sale)
    }
  }
  return map
})
const openTabsByName = computed(() => (openTabsQuery.data.value ?? []).filter((s) => !s.table_id))

function selectNewNamedTab(): void {
  submitError.value = null
  mode.value = 'new-tab'
  activeSale.value = null
  pendingTable.value = null
  newTabName.value = ''
  newTabPhone.value = ''
  newTabIsDelivery.value = false
  tabCart.reset()
}

function selectTable(table: BusinessTable): void {
  submitError.value = null
  const openSale = openSaleByTable.value.get(table.id)
  if (openSale) {
    mode.value = 'tab'
    activeSale.value = openSale
    pendingTable.value = null
  } else {
    mode.value = 'new-tab'
    pendingTable.value = table
    activeSale.value = null
    newTabName.value = ''
    newTabPhone.value = ''
    newTabIsDelivery.value = false
  }
  tabCart.reset()
}

function selectOpenTab(sale: Sale): void {
  submitError.value = null
  mode.value = 'tab'
  activeSale.value = sale
  pendingTable.value = null
  tabCart.reset()
}

function cancelTab(): void {
  mode.value = 'quick'
  activeSale.value = null
  pendingTable.value = null
  tabCart.reset()
  mobileTabSheetOpen.value = false
  submitError.value = null
}

async function submitTabCart(): Promise<void> {
  if (tabCart.lines.value.length === 0) {
    return
  }
  submitError.value = null

  try {
    if (activeSale.value) {
      const updated = await tabMutations.addItemsMutation.mutateAsync({
        saleId: activeSale.value.id,
        payload: { items: tabCart.toItemsPayload() },
      })
      activeSale.value = updated
      tabCart.reset()
    } else {
      const opened = await tabMutations.openMutation.mutateAsync({
        table_id: pendingTable.value?.id ?? null,
        customer_name: pendingTable.value ? null : newTabName.value || null,
        customer_phone: newTabPhone.value || null,
        is_delivery: business.value?.delivery_enabled ? newTabIsDelivery.value : false,
        items: tabCart.toItemsPayload(),
      })
      // Se sigue editando la cuenta recien creada (no vuelve a "quick") -
      // el cajero suele seguir agregando o cobrar de una vez.
      mode.value = 'tab'
      activeSale.value = opened
      pendingTable.value = null
      tabCart.reset()
    }
  } catch (error) {
    submitError.value = extractErrorMessage(error, 'No pudimos guardar los productos. Intenta de nuevo.')
  }
}

async function handleTabCloseSubmit(payload: CloseOpenTabPayload): Promise<void> {
  if (!activeSale.value) {
    return
  }
  submitError.value = null
  try {
    const closed = await tabMutations.closeMutation.mutateAsync({ saleId: activeSale.value.id, payload })
    lastClosedSale.value = closed
    closeModalOpen.value = false
    tabClosedOpen.value = true
    cancelTab()
  } catch (error) {
    submitError.value = extractErrorMessage(error, 'No pudimos cerrar la cuenta.')
  }
}

async function handleRegisterPartial(payload: RecordPartialPaymentPayload): Promise<void> {
  if (!activeSale.value) {
    return
  }
  try {
    activeSale.value = await tabMutations.partialPaymentMutation.mutateAsync({
      saleId: activeSale.value.id,
      payload,
    })
  } catch (error) {
    submitError.value = extractErrorMessage(error, 'No pudimos registrar el abono.')
  }
}

function mobileTabLabel(): string {
  if (!activeSale.value) {
    return 'Cuenta nueva'
  }
  if (activeSale.value.customer_name) {
    return activeSale.value.customer_name
  }
  return activeSale.value.table_id ? 'Mesa' : `Cuenta #${activeSale.value.id}`
}

// --- Venta directa ---
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
  if (mode.value === 'quick') {
    checkout.addProduct(product)
  } else {
    tabCart.addProduct(product)
  }
}

function handlePriceConfirmed(price: number): void {
  if (priceVariesProduct.value) {
    if (mode.value === 'quick') {
      checkout.addProduct(priceVariesProduct.value, price)
    } else {
      tabCart.addProduct(priceVariesProduct.value, price)
    }
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
    submitError.value = extractErrorMessage(error, 'No pudimos registrar la venta. Intenta de nuevo.')
  }
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

    <div class="mt-3">
      <TabSwitcherStrip
        :tables="tablesQuery.data.value ?? []"
        :open-tabs-by-name="openTabsByName"
        :open-sale-by-table="openSaleByTable"
        :active-mode="mode"
        :active-sale-id="activeSale?.id ?? null"
        :pending-table-id="pendingTable?.id ?? null"
        @new-name="selectNewNamedTab"
        @select-table="selectTable"
        @select-tab="selectOpenTab"
      />
    </div>

    <div class="mt-3 flex min-h-0 flex-1 gap-4">
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

      <!-- Panel de escritorio: carrito de venta directa o cuenta abierta en edicion -->
      <div
        v-if="business"
        class="hidden w-[380px] shrink-0 rounded-xl border border-slate-200 bg-white p-4 lg:block"
      >
        <CartPanel
          v-if="mode === 'quick'"
          :checkout="checkout"
          :business="business"
          :submitting="createSaleMutation.isPending.value"
          @submit="handleSubmit"
        />
        <TabInProgressPanel
          v-else
          v-model:new-tab-name="newTabName"
          v-model:new-tab-phone="newTabPhone"
          v-model:new-tab-is-delivery="newTabIsDelivery"
          :active-sale="activeSale"
          :pending-table="pendingTable"
          :business="business"
          :cart="tabCart"
          :submitting-cart="tabMutations.addItemsMutation.isPending.value || tabMutations.openMutation.isPending.value"
          @cancel="cancelTab"
          @submit="submitTabCart"
          @close="closeModalOpen = true"
        />
      </div>
    </div>

    <!-- Barra movil: resumen + boton para abrir el carrito/panel de cuenta -->
    <button
      v-if="business && mode === 'quick' && checkout.itemCount.value > 0"
      type="button"
      class="fixed inset-x-4 bottom-20 z-10 flex items-center justify-between rounded-xl bg-indigo-600 px-4 py-3 text-white shadow-lg lg:hidden"
      @click="mobileCartOpen = true"
    >
      <span class="text-sm font-medium">{{ checkout.itemCount.value }} producto(s)</span>
      <span class="font-bold">{{ formatCop(checkout.totals.value?.grandTotal ?? 0) }}</span>
    </button>
    <button
      v-if="business && mode !== 'quick'"
      type="button"
      class="fixed inset-x-4 bottom-20 z-10 flex items-center justify-between rounded-xl bg-amber-600 px-4 py-3 text-white shadow-lg lg:hidden"
      @click="mobileTabSheetOpen = true"
    >
      <span class="text-sm font-medium">
        {{ mobileTabLabel() }}
      </span>
      <span class="font-bold">{{ formatCop((activeSale?.total ?? 0) + tabCart.total.value) }}</span>
    </button>

    <Teleport to="body">
      <MobileCartSheet
        v-if="business"
        v-model="mobileCartOpen"
        :checkout="checkout"
        :business="business"
        :submitting="createSaleMutation.isPending.value"
        @submit="handleSubmit"
      />
      <MobileTabSheet
        v-model="mobileTabSheetOpen"
        v-model:new-tab-name="newTabName"
        v-model:new-tab-phone="newTabPhone"
        v-model:new-tab-is-delivery="newTabIsDelivery"
        :active-sale="activeSale"
        :pending-table="pendingTable"
        :business="business"
        :cart="tabCart"
        :submitting-cart="tabMutations.addItemsMutation.isPending.value || tabMutations.openMutation.isPending.value"
        @cancel="cancelTab"
        @submit="submitTabCart"
        @close="
          mobileTabSheetOpen = false;
          closeModalOpen = true
        "
      />
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

    <CloseTabModal
      v-if="activeSale && business"
      v-model="closeModalOpen"
      :sale="activeSale"
      :business="business"
      :submitting="tabMutations.closeMutation.isPending.value"
      @close="handleTabCloseSubmit"
      @register-partial="handleRegisterPartial"
    />

    <TabClosedDialog v-model="tabClosedOpen" :sale="lastClosedSale" />
  </div>
</template>
