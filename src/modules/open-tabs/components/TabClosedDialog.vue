<script setup lang="ts">
import { ref } from 'vue'

import type { Sale } from '@/types/sale'
import { NxButton, NxModal } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import ReceiptActionsModal from '@/components/ReceiptActionsModal.vue'

defineProps<{
  modelValue: boolean
  sale: Sale | null
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const receiptModalOpen = ref(false)
</script>

<template>
  <NxModal
    :model-value="modelValue"
    :closable="false"
    size="sm"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col items-center gap-3 py-2 text-center">
      <div class="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
        <i class="pi pi-check text-2xl text-emerald-600" />
      </div>
      <p class="text-lg font-bold text-slate-900">Cuenta cerrada</p>
      <p v-if="sale" class="text-2xl font-bold text-slate-900">{{ formatCop(sale.total) }}</p>
      <p v-if="sale?.invoice_number" class="text-sm text-slate-500">Factura {{ sale.invoice_number }}</p>
    </div>

    <template #footer>
      <div class="flex w-full gap-2">
        <NxButton v-if="sale" variant="outline" icon="pi pi-receipt" @click="receiptModalOpen = true">Comprobante</NxButton>
        <NxButton class="flex-1" size="lg" @click="emit('update:modelValue', false)">Listo</NxButton>
      </div>
    </template>
  </NxModal>

  <ReceiptActionsModal
    v-if="sale"
    v-model="receiptModalOpen"
    entity-type="sale"
    :entity-id="sale.id"
    document-title="Recibo de venta"
    :default-phone="sale.customer_phone"
  />
</template>
