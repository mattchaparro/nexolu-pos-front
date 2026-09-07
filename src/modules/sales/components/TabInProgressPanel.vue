<script setup lang="ts">
// Panel derecho de Vender cuando se esta editando/abriendo una cuenta
// (mode !== 'quick'). Los items YA guardados de la cuenta usan
// SavedTabItemsList (+/-/quitar, sync inmediato) - antes eran chips de
// solo lectura y para editarlos había que salir a la pantalla completa de
// Cuentas abiertas; el cajero no debería tener que salir de Vender para
// eso. Los items nuevos (todavia sin guardar) siguen en NewItemsCartList
// aparte, mismo patron que antes.
import { computed } from 'vue'

import type { Business } from '@/types/business'
import type { Sale, SaleItem } from '@/types/sale'
import type { BusinessTable } from '@/types/table'
import { NxButton, NxInput } from '@/ui'
import { formatCop } from '@/utils/formatCop'
import { formatShortDateTime } from '@/utils/formatShortDateTime'
import { salePartialPaid, saleRemaining } from '@/utils/saleBalance'

import type { useNewItemsCart } from '../../open-tabs/composables/useNewItemsCart'
import NewItemsCartList from '../../open-tabs/components/NewItemsCartList.vue'
import SavedTabItemsList from '../../open-tabs/components/SavedTabItemsList.vue'

const props = defineProps<{
  activeSale: Sale | null
  pendingTable: BusinessTable | null
  business: Business | undefined
  cart: ReturnType<typeof useNewItemsCart>
  submittingCart: boolean
  syncingItems: boolean
  // Borrador de items guardados (semantica legacy: los +/- se acumulan
  // local y solo persisten al confirmar) - ver useActiveTabItemActions.
  draftItems: SaleItem[]
  hasDraftChanges: boolean
  draftTotalDelta: number
}>()

const emit = defineEmits<{
  cancel: []
  submit: []
  close: []
  'increment-item': [item: SaleItem]
  'decrement-item': [item: SaleItem]
  'remove-item': [item: SaleItem]
  'discard-draft': []
}>()

const newTabName = defineModel<string>('newTabName', { default: '' })
const newTabPhone = defineModel<string>('newTabPhone', { default: '' })
const newTabIsDelivery = defineModel<boolean>('newTabIsDelivery', { default: false })

/** Hay algo sin guardar: cantidades tocadas, productos nuevos, o ambos. */
const hasPendingChanges = computed(() => props.hasDraftChanges || props.cart.lines.value.length > 0)

/**
 * La etiqueta dice lo que el boton VA a hacer, para que el cajero no tenga
 * que deducirlo del estado de la pantalla.
 */
const saveLabel = computed(() => {
  if (!props.activeSale) {
    return 'Abrir cuenta'
  }
  if (props.hasDraftChanges && props.cart.lines.value.length > 0) {
    return 'Guardar cambios y agregar'
  }
  return props.hasDraftChanges ? 'Guardar cambios' : 'Agregar a la cuenta'
})

function title(): string {
  if (props.activeSale) {
    return props.activeSale.table_id ? 'Mesa' : props.activeSale.customer_name || `Cuenta #${props.activeSale.id}`
  }
  return props.pendingTable ? props.pendingTable.name : 'Cuenta nueva'
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex items-center justify-between px-1 pb-2">
      <div class="min-w-0">
        <p class="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
          {{ activeSale ? 'Editando' : 'Nueva cuenta' }}
        </p>
        <h2 class="truncate text-sm font-semibold text-slate-900">{{ title() }}</h2>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <!-- Saldo pendiente (total - abonos), no el total: es lo que de
             verdad falta cobrar - ver utils/saleBalance. -->
        <p v-if="activeSale" class="select-none text-sm font-bold text-slate-900">
          {{ formatCop(saleRemaining(activeSale) + draftTotalDelta + cart.total.value) }}
        </p>
        <!-- h-9 w-9: el area tactil de antes (p-1.5 sobre un icono de 16px)
             era de ~28px, por debajo de lo que un dedo acierta a la primera
             al lado de una cifra. -->
        <button
          type="button"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
          title="Cerrar"
          @click="emit('cancel')"
        >
          <i class="pi pi-times text-base" />
        </button>
      </div>
    </div>

    <div v-if="!activeSale" class="mb-3 flex flex-col gap-2">
      <NxInput v-if="!pendingTable" v-model="newTabName" label="Nombre de la cuenta" size="sm" />
      <NxInput v-if="!pendingTable" v-model="newTabPhone" label="Teléfono (opcional)" size="sm" />
      <label
        v-if="business?.delivery_enabled"
        class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
      >
        <span class="text-sm font-medium text-slate-700">Pedido para domicilio</span>
        <input v-model="newTabIsDelivery" type="checkbox" class="h-4 w-4 rounded accent-indigo-600" />
      </label>
    </div>

    <div class="flex-1 overflow-y-auto">
      <template v-if="activeSale && draftItems.length > 0">
        <p class="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Ítems guardados</p>
        <SavedTabItemsList
          :key="activeSale?.id"
          class="mb-3"
          :items="draftItems"
          :syncing="syncingItems"
          @increment-item="emit('increment-item', $event)"
          @decrement-item="emit('decrement-item', $event)"
          @remove-item="emit('remove-item', $event)"
        />
      </template>
      <!-- Detalle de abonos: cuanto y cuando ("no es claro cuando ni cuanto
           abono"). El pie deja explicito por que el numero del header es
           menor a la suma de los items. -->
      <div
        v-if="activeSale && (activeSale.partial_payments?.length ?? 0) > 0"
        class="mb-3 rounded-lg bg-emerald-50 px-3 py-2"
      >
        <p class="mb-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Abonos</p>
        <div
          v-for="payment in activeSale.partial_payments"
          :key="payment.id"
          class="flex items-center justify-between text-xs text-emerald-800"
        >
          <span>
            {{ formatShortDateTime(payment.created_at) || 'Abono' }}
            <template v-if="payment.payer_label"> · {{ payment.payer_label }}</template>
          </span>
          <span class="font-semibold">{{ formatCop(Number(payment.amount)) }}</span>
        </div>
        <div class="mt-1.5 flex items-center justify-between border-t border-emerald-200 pt-1.5 text-xs">
          <span class="text-emerald-800">
            Total {{ formatCop(Number(activeSale.total) + draftTotalDelta) }} · Abonado
            {{ formatCop(salePartialPaid(activeSale)) }}
          </span>
          <span class="font-bold text-emerald-900">
            Falta {{ formatCop(saleRemaining(activeSale) + draftTotalDelta) }}
          </span>
        </div>
      </div>

      <p v-if="cart.lines.value.length > 0" class="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
        Por agregar
      </p>
      <NewItemsCartList :cart="cart" />
    </div>

    <div class="flex flex-col gap-2 border-t border-slate-200 pt-3">
      <!-- UN solo boton guarda TODO lo pendiente (cambios de cantidad sobre
           items guardados y productos nuevos del carrito), en vez de dos
           botones que se deshabilitaban entre si. Antes, con las dos cosas
           pendientes a la vez, "Agregar a la cuenta" quedaba disabled: el
           cajero lo apretaba, no pasaba nada, y al cambiar de cuenta la
           guarda de salida le descartaba el trabajo (reportado en
           produccion). Un boton que no hace nada al tocarlo es peor que uno
           que falla. -->
      <NxButton
        v-if="hasPendingChanges"
        :variant="activeSale ? 'dark' : 'primary'"
        :loading="submittingCart || syncingItems"
        @click="emit('submit')"
      >
        {{ saveLabel }}
      </NxButton>
      <NxButton v-if="hasDraftChanges" variant="outline" :disabled="syncingItems" @click="emit('discard-draft')">
        Descartar cambios
      </NxButton>
      <NxButton
        v-if="activeSale"
        icon="pi pi-money-bill"
        :disabled="hasPendingChanges"
        @click="emit('close')"
      >
        Cobrar
      </NxButton>
      <p v-if="activeSale && hasPendingChanges" class="text-center text-xs text-amber-700">
        Guarda los cambios antes de cobrar.
      </p>
    </div>
  </div>
</template>
