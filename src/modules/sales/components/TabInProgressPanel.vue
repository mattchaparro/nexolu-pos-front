<script setup lang="ts">
// Panel derecho de Vender cuando se esta editando/abriendo una cuenta
// (mode !== 'quick'). Los items YA guardados de la cuenta se muestran
// como chips de solo lectura (igual que la barra "Editando" del legacy) -
// para editar cantidad/quitar un item ya guardado hay que ir a la
// pantalla completa de Cuentas abiertas (link "Ver detalle" de la tira de
// arriba); aca el foco es agregar rapido sin perder el catalogo de
// productos a la vista.
import type { Business } from '@/types/business'
import type { Sale } from '@/types/sale'
import type { BusinessTable } from '@/types/table'
import { NxButton, NxInput } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import type { useNewItemsCart } from '../../open-tabs/composables/useNewItemsCart'
import NewItemsCartList from '../../open-tabs/components/NewItemsCartList.vue'

const props = defineProps<{
  activeSale: Sale | null
  pendingTable: BusinessTable | null
  business: Business | undefined
  cart: ReturnType<typeof useNewItemsCart>
  submittingCart: boolean
}>()

const emit = defineEmits<{
  cancel: []
  submit: []
  close: []
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
        <p class="text-[10px] font-semibold uppercase tracking-wide text-amber-600">
          {{ activeSale ? 'Editando' : 'Nueva cuenta' }}
        </p>
        <h2 class="truncate text-sm font-semibold text-slate-900">{{ title() }}</h2>
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <p v-if="activeSale" class="text-sm font-bold text-slate-900">{{ formatCop(activeSale.total) }}</p>
        <button type="button" class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" @click="emit('cancel')">
          <i class="pi pi-times" />
        </button>
      </div>
    </div>

    <div
      v-if="activeSale && activeSale.items.length > 0"
      class="mb-3 flex flex-wrap gap-1.5 rounded-lg bg-slate-50 p-2"
    >
      <span
        v-for="item in activeSale.items"
        :key="item.id"
        class="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs text-slate-600 shadow-sm"
      >
        {{ item.product.name }} <span class="font-semibold text-slate-900">x{{ item.quantity }}</span>
      </span>
    </div>

    <div v-if="!activeSale" class="mb-3 flex flex-col gap-2">
      <NxInput v-if="!pendingTable" v-model="newTabName" placeholder="Nombre de la cuenta (ej: Don Pedro)" size="sm" />
      <NxInput v-if="!pendingTable" v-model="newTabPhone" placeholder="Teléfono (opcional)" size="sm" />
      <label
        v-if="business?.delivery_enabled"
        class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
      >
        <span class="text-sm font-medium text-slate-700">Pedido para domicilio</span>
        <input v-model="newTabIsDelivery" type="checkbox" class="h-4 w-4 rounded accent-indigo-600" />
      </label>
    </div>

    <div class="flex-1 overflow-y-auto">
      <NewItemsCartList :cart="cart" />
    </div>

    <div class="flex flex-col gap-2 border-t border-slate-200 pt-3">
      <NxButton
        v-if="cart.lines.value.length > 0"
        :loading="submittingCart"
        @click="emit('submit')"
      >
        {{ activeSale ? 'Agregar a la cuenta' : 'Abrir cuenta' }}
      </NxButton>
      <NxButton
        v-if="activeSale"
        variant="outline"
        icon="pi pi-money-bill"
        :disabled="cart.lines.value.length > 0"
        @click="emit('close')"
      >
        Cobrar
      </NxButton>
      <p v-if="activeSale && cart.lines.value.length > 0" class="text-center text-xs text-amber-700">
        Agrega los nuevos productos a la cuenta antes de cobrar.
      </p>
    </div>
  </div>
</template>
