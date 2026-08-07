<script setup lang="ts">
// Cuentas abiertas: version recortada de OpenTabs.vue del legacy (Admin y
// Employee eran casi identicos, solo cambiaba el prefijo de ruta - un solo
// componente aca, permisos deciden quien la ve). Dictado por voz e
// impresion de factura quedan fuera, igual que en Vender.
import { computed, ref, watch } from 'vue'

import { useBusiness } from '@/composables/useBusiness'
import type { Product } from '@/types/product'
import type { Sale } from '@/types/sale'
import type { BusinessTable } from '@/types/table'
import { NxButton, NxInput, NxPageHeader } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import PriceVariesModal from '../../sales/components/PriceVariesModal.vue'
import ProductGrid from '../../sales/components/ProductGrid.vue'
import { useProductCatalog } from '../../sales/composables/useProductCatalog'
import ActiveTabItemsPanel from '../components/ActiveTabItemsPanel.vue'
import CloseTabModal from '../components/CloseTabModal.vue'
import NewItemsCartList from '../components/NewItemsCartList.vue'
import OpenTabsByNameList from '../components/OpenTabsByNameList.vue'
import TabClosedDialog from '../components/TabClosedDialog.vue'
import TableManagerModal from '../components/TableManagerModal.vue'
import TablesGrid from '../components/TablesGrid.vue'
import { useNewItemsCart } from '../composables/useNewItemsCart'
import { useOpenTabMutations } from '../composables/useOpenTabMutations'
import { useOpenTabsList } from '../composables/useOpenTabsList'
import { useTables } from '../composables/useTables'
import type { CloseOpenTabPayload, RecordPartialPaymentPayload } from '../types'

const { data: business } = useBusiness()
const tablesQuery = useTables()
const openTabsQuery = useOpenTabsList()
const { productsQuery, categoriesQuery } = useProductCatalog()
const mutations = useOpenTabMutations()

const search = ref('')
const mode = ref<'overview' | 'building'>('overview')
const activeSale = ref<Sale | null>(null)
const pendingTable = ref<BusinessTable | null>(null)
const newTabType = ref<'table' | 'name'>('name')
const newTabName = ref('')
const newTabPhone = ref('')
const newTabIsDelivery = ref(false)

const tableManagerOpen = ref(false)
const closeModalOpen = ref(false)
const tabClosedOpen = ref(false)
const lastClosedSale = ref<Sale | null>(null)
const priceVariesProduct = ref<Product | null>(null)
const submitError = ref<string | null>(null)

const cart = useNewItemsCart()

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

const filteredTables = computed(() => {
  const tables = tablesQuery.data.value ?? []
  const q = search.value.trim().toLowerCase()
  if (!q) {
    return tables
  }
  return tables.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      (openSaleByTable.value.get(t.id)?.customer_name ?? '').toLowerCase().includes(q),
  )
})

const filteredOpenTabsByName = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) {
    return openTabsByName.value
  }
  return openTabsByName.value.filter(
    (t) => (t.customer_name ?? '').toLowerCase().includes(q) || String(t.id).includes(q),
  )
})

// Si tables/openTabs se refrescan (por la propia mutacion o por otra
// pestaña), activeSale se re-deriva para no quedar mostrando datos
// viejos - mismo patron que el watcher de props.tables/openTabs del legacy.
watch([() => tablesQuery.data.value, () => openTabsQuery.data.value], () => {
  if (!activeSale.value) {
    return
  }
  const fresh = (openTabsQuery.data.value ?? []).find((s) => s.id === activeSale.value?.id)
  if (fresh) {
    activeSale.value = fresh
  }
})

function selectTable(table: BusinessTable): void {
  submitError.value = null
  const openSale = openSaleByTable.value.get(table.id)
  if (openSale) {
    activeSale.value = openSale
    pendingTable.value = null
  } else {
    pendingTable.value = table
    activeSale.value = null
    newTabType.value = 'table'
    newTabName.value = table.name
    newTabIsDelivery.value = false
  }
  cart.reset()
  mode.value = 'building'
}

function selectTab(sale: Sale): void {
  submitError.value = null
  activeSale.value = sale
  pendingTable.value = null
  cart.reset()
  mode.value = 'building'
}

function openNewByName(): void {
  submitError.value = null
  activeSale.value = null
  pendingTable.value = null
  newTabType.value = 'name'
  newTabName.value = ''
  newTabPhone.value = ''
  newTabIsDelivery.value = false
  cart.reset()
  mode.value = 'building'
}

function goBack(): void {
  mode.value = 'overview'
  activeSale.value = null
  pendingTable.value = null
  cart.reset()
  submitError.value = null
}

function handleSelectProduct(product: Product): void {
  if (product.price_varies_at_sale) {
    priceVariesProduct.value = product
    return
  }
  cart.addProduct(product)
}

function handlePriceConfirmed(price: number): void {
  if (priceVariesProduct.value) {
    cart.addProduct(priceVariesProduct.value, price)
  }
  priceVariesProduct.value = null
}

async function submitCart(): Promise<void> {
  if (cart.lines.value.length === 0) {
    return
  }
  submitError.value = null

  try {
    if (activeSale.value) {
      await mutations.addItemsMutation.mutateAsync({
        saleId: activeSale.value.id,
        payload: { items: cart.toItemsPayload() },
      })
      cart.reset()
    } else {
      await mutations.openMutation.mutateAsync({
        table_id: newTabType.value === 'table' ? pendingTable.value?.id : null,
        customer_name: newTabType.value === 'name' ? newTabName.value || null : null,
        customer_phone: newTabPhone.value || null,
        is_delivery: business.value?.delivery_enabled ? newTabIsDelivery.value : false,
        items: cart.toItemsPayload(),
      })
      goBack()
    }
  } catch (error) {
    submitError.value = extractErrorMessage(error, 'No pudimos guardar los productos. Intenta de nuevo.')
  }
}

function itemsWithOverride(sale: Sale, itemId: number, quantity: number) {
  return sale.items
    .map((item) => ({
      product_id: item.product.id,
      quantity: item.id === itemId ? quantity : item.quantity,
      unit_price: item.unit_price,
    }))
    .filter((item) => item.quantity > 0)
}

async function adjustItemQuantity(itemId: number, delta: number): Promise<void> {
  if (!activeSale.value) {
    return
  }
  const item = activeSale.value.items.find((i) => i.id === itemId)
  if (!item) {
    return
  }
  const newQuantity = item.quantity + delta
  submitError.value = null

  if (newQuantity <= 0) {
    if (activeSale.value.items.length === 1) {
      if (window.confirm('Esto dejaría la cuenta sin productos. ¿Eliminar la cuenta completa en su lugar?')) {
        await destroyActiveTab()
      }
      return
    }
  }

  try {
    await mutations.syncItemsMutation.mutateAsync({
      saleId: activeSale.value.id,
      payload: { items: itemsWithOverride(activeSale.value, itemId, newQuantity) },
    })
  } catch (error) {
    submitError.value = extractErrorMessage(error, 'No pudimos actualizar la cantidad.')
  }
}

async function destroyActiveTab(): Promise<void> {
  if (!activeSale.value) {
    return
  }
  submitError.value = null
  try {
    await mutations.deleteMutation.mutateAsync(activeSale.value.id)
    goBack()
  } catch (error) {
    submitError.value = extractErrorMessage(error, 'No pudimos eliminar la cuenta.')
  }
}

function confirmDestroyActiveTab(): void {
  if (window.confirm('¿Eliminar esta cuenta abierta? Se restaurará el inventario de los productos.')) {
    destroyActiveTab()
  }
}

async function handleCloseSubmit(payload: CloseOpenTabPayload): Promise<void> {
  if (!activeSale.value) {
    return
  }
  submitError.value = null
  try {
    const closed = await mutations.closeMutation.mutateAsync({ saleId: activeSale.value.id, payload })
    lastClosedSale.value = closed
    closeModalOpen.value = false
    tabClosedOpen.value = true
    goBack()
  } catch (error) {
    submitError.value = extractErrorMessage(error, 'No pudimos cerrar la cuenta.')
  }
}

async function handleRegisterPartial(payload: RecordPartialPaymentPayload): Promise<void> {
  if (!activeSale.value) {
    return
  }
  try {
    await mutations.partialPaymentMutation.mutateAsync({ saleId: activeSale.value.id, payload })
  } catch (error) {
    submitError.value = extractErrorMessage(error, 'No pudimos registrar el abono.')
  }
}
</script>

<template>
  <div class="flex flex-col pb-20 lg:pb-0">
    <div class="flex items-center justify-between gap-3">
      <NxPageHeader title="Cuentas abiertas" icon="pi pi-receipt" />
      <NxButton
        v-if="mode === 'overview'"
        variant="outline"
        icon="pi pi-table"
        size="sm"
        @click="tableManagerOpen = true"
      >
        Mesas
      </NxButton>
    </div>

    <p v-if="submitError" class="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ submitError }}
    </p>

    <!-- Vista general: mesas + cuentas por nombre -->
    <div v-if="mode === 'overview'" class="mt-4">
      <NxInput v-model="search" placeholder="Buscar mesa o cuenta..." size="lg" icon="pi pi-search" clearable />

      <div v-if="filteredTables.length > 0" class="mt-5">
        <h3 class="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
          Mesas
          <span class="ml-1 font-semibold text-amber-600">
            {{ filteredTables.filter((t) => openSaleByTable.has(t.id)).length }}/{{ filteredTables.length }} ocupadas
          </span>
        </h3>
        <TablesGrid :tables="filteredTables" :open-sale-by-table="openSaleByTable" @select="selectTable" />
      </div>

      <div v-if="filteredOpenTabsByName.length > 0" class="mt-5">
        <h3 class="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Cuentas por nombre</h3>
        <OpenTabsByNameList :tabs="filteredOpenTabsByName" @select="selectTab" />
      </div>

      <div
        v-if="search && filteredTables.length === 0 && filteredOpenTabsByName.length === 0"
        class="flex flex-col items-center py-10 text-slate-400"
      >
        <i class="pi pi-search-minus mb-2 text-3xl" />
        <p class="text-sm">Sin resultados para "{{ search }}"</p>
      </div>

      <NxButton class="mt-5" icon="pi pi-plus" @click="openNewByName">Nueva cuenta por nombre</NxButton>
    </div>

    <!-- Detalle: items de la cuenta activa / nueva + agregar productos -->
    <div v-else class="mt-4 flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
      <div class="min-w-0 flex-1">
        <button type="button" class="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700" @click="goBack">
          <i class="pi pi-arrow-left text-sm" /> Volver
        </button>

        <ActiveTabItemsPanel
          v-if="activeSale"
          :sale="activeSale"
          :syncing="mutations.syncItemsMutation.isPending.value"
          :has-partial-payments="(activeSale.partial_payments?.length ?? 0) > 0"
          @increment-item="adjustItemQuantity($event.id, 1)"
          @decrement-item="adjustItemQuantity($event.id, -1)"
          @remove-item="adjustItemQuantity($event.id, -$event.quantity)"
          @close="closeModalOpen = true"
          @destroy="confirmDestroyActiveTab"
        />

        <div v-else class="mb-4 rounded-xl border border-slate-200 bg-white p-4">
          <div v-if="newTabType === 'name'" class="flex flex-col gap-3">
            <NxInput v-model="newTabName" placeholder="Nombre de la cuenta (ej: Don Pedro)" />
            <NxInput v-model="newTabPhone" placeholder="Teléfono (opcional)" />
          </div>
          <p v-else class="text-sm font-medium text-slate-700">Pedido para {{ newTabName }}</p>

          <label v-if="business?.delivery_enabled" class="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span class="text-sm font-medium text-slate-700">Pedido para domicilio</span>
            <input v-model="newTabIsDelivery" type="checkbox" class="h-4 w-4 rounded accent-indigo-600" />
          </label>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-4">
          <h3 class="mb-3 font-semibold text-slate-900">Agregar productos</h3>
          <template v-if="productsQuery.isPending.value || categoriesQuery.isPending.value">
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div v-for="n in 6" :key="n" class="h-28 animate-pulse rounded-xl bg-slate-200" />
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
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4 lg:w-80 lg:shrink-0">
        <h3 class="mb-2 flex items-baseline gap-2 text-sm font-semibold text-slate-900">
          Nuevos ítems
          <span v-if="cart.itemCount.value > 0" class="text-xs font-medium text-slate-400">{{ cart.itemCount.value }}</span>
        </h3>
        <NewItemsCartList :cart="cart" />
        <NxButton
          v-if="cart.lines.value.length > 0"
          class="mt-3 w-full"
          :loading="mutations.addItemsMutation.isPending.value || mutations.openMutation.isPending.value"
          @click="submitCart"
        >
          {{ activeSale ? 'Agregar a la cuenta' : 'Abrir cuenta' }}
        </NxButton>
      </div>
    </div>

    <PriceVariesModal
      :model-value="priceVariesProduct !== null"
      :product="priceVariesProduct"
      @update:model-value="priceVariesProduct = null"
      @confirm="handlePriceConfirmed"
    />

    <TableManagerModal v-model="tableManagerOpen" :tables="tablesQuery.data.value ?? []" />

    <CloseTabModal
      v-if="activeSale && business"
      v-model="closeModalOpen"
      :sale="activeSale"
      :business="business"
      :submitting="mutations.closeMutation.isPending.value"
      @close="handleCloseSubmit"
      @register-partial="handleRegisterPartial"
    />

    <TabClosedDialog v-model="tabClosedOpen" :sale="lastClosedSale" />
  </div>
</template>
