<script setup lang="ts">
// Panel derecho de Vender cuando se esta editando/abriendo una cuenta
// (mode !== 'quick'). Los items YA guardados de la cuenta usan
// SavedTabItemsList (+/-/quitar, sync inmediato) - antes eran chips de
// solo lectura y para editarlos había que salir a la pantalla completa de
// Cuentas abiertas; el cajero no debería tener que salir de Vender para
// eso. Los items nuevos (todavia sin guardar) siguen en NewItemsCartList
// aparte, mismo patron que antes.
import type { Business } from '@/types/business'
import type { Sale, SaleItem } from '@/types/sale'
import type { BusinessTable } from '@/types/table'
import { NxButton, NxInput } from '@/ui'
import { formatCop } from '@/utils/formatCop'

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
  'confirm-draft': []
  'discard-draft': []
}>()

const newTabName = defineModel<string>('newTabName', { default: '' })
const newTabPhone = defineModel<string>('newTabPhone', { default: '' })
const newTabIsDelivery = defineModel<boolean>('newTabIsDelivery', { default: false })

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
      <div class="flex shrink-0 items-center gap-1">
        <p v-if="activeSale" class="text-sm font-bold text-slate-900">
          {{ formatCop(Number(activeSale.total) + draftTotalDelta + cart.total.value) }}
        </p>
        <button type="button" class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" @click="emit('cancel')">
          <i class="pi pi-times" />
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
          class="mb-3"
          :items="draftItems"
          :syncing="syncingItems"
          @increment-item="emit('increment-item', $event)"
          @decrement-item="emit('decrement-item', $event)"
          @remove-item="emit('remove-item', $event)"
        />
      </template>
      <p v-if="cart.lines.value.length > 0" class="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
        Por agregar
      </p>
      <NewItemsCartList :cart="cart" />
    </div>

    <div class="flex flex-col gap-2 border-t border-slate-200 pt-3">
      <!-- Cambios sobre items YA guardados: confirmar (un solo sync) o
           descartar (vuelve a lo guardado, sin red) - como el "Guardar
           cambios" del legacy. -->
      <div v-if="hasDraftChanges" class="flex gap-2">
        <NxButton class="flex-1" variant="dark" :loading="syncingItems" @click="emit('confirm-draft')">
          Confirmar cambios
        </NxButton>
        <NxButton variant="outline" :disabled="syncingItems" @click="emit('discard-draft')">
          Descartar
        </NxButton>
      </div>
      <!-- disabled con borrador pendiente: agregar items nuevos puede
           fusionarse server-side con una linea que el borrador tambien
           toca (mismo producto), y el confirmar posterior la pisaria. -->
      <NxButton
        v-if="cart.lines.value.length > 0"
        :variant="activeSale ? 'dark' : 'primary'"
        :loading="submittingCart"
        :disabled="hasDraftChanges"
        @click="emit('submit')"
      >
        {{ activeSale ? 'Agregar a la cuenta' : 'Abrir cuenta' }}
      </NxButton>
      <NxButton
        v-if="activeSale"
        icon="pi pi-money-bill"
        :disabled="cart.lines.value.length > 0 || hasDraftChanges"
        @click="emit('close')"
      >
        Cobrar
      </NxButton>
      <p v-if="activeSale && cart.lines.value.length > 0" class="text-center text-xs text-amber-700">
        Agrega los nuevos productos a la cuenta antes de cobrar.
      </p>
      <p v-else-if="activeSale && hasDraftChanges" class="text-center text-xs text-amber-700">
        Confirma o descarta los cambios antes de cobrar.
      </p>
    </div>
  </div>
</template>
