<script setup lang="ts">
// Catalogo global de medios de pago del POS - los negocios eligen de aca
// en Ajustes > Medios de pago (ver modulo settings), nunca escriben uno
// libre. Sin accion de eliminar a proposito: solo activar/desactivar (ver
// PosPaymentMethodController, backend).
import { ref } from 'vue'

import type { SuperAdminPosPaymentMethod } from '@/types/superadmin/posPaymentMethod'
import { NxButton, NxPageHeader } from '@/ui'

import PosPaymentMethodFormModal from '../components/PosPaymentMethodFormModal.vue'
import { usePosPaymentMethods } from '../composables/usePosPaymentMethods'

const methodsQuery = usePosPaymentMethods()

const formModalOpen = ref(false)
const editingMethod = ref<SuperAdminPosPaymentMethod | null>(null)

function openCreate(): void {
  editingMethod.value = null
  formModalOpen.value = true
}

function openEdit(method: SuperAdminPosPaymentMethod): void {
  editingMethod.value = method
  formModalOpen.value = true
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
      <NxPageHeader title="Medios de pago" icon="pi pi-wallet" compact />
      <NxButton icon="pi pi-plus" @click="openCreate">Nuevo medio de pago</NxButton>
    </div>

    <p class="text-sm text-slate-500">
      Catálogo global que los negocios usan para elegir sus medios de pago en Ajustes - no pueden escribir uno libre. Un
      medio de pago nunca se elimina (solo se desactiva) para no romper el historial de ventas que ya lo usaron.
    </p>

    <div v-if="methodsQuery.isPending.value" class="h-40 animate-pulse rounded-xl bg-slate-100" />

    <div v-else-if="!methodsQuery.data.value?.length" class="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-400">
      Todavía no hay medios de pago en el catálogo.
    </div>

    <div v-else class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table class="w-full min-w-[560px] text-sm">
        <thead class="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-4 py-3 text-left">Nombre</th>
            <th class="px-4 py-3 text-left">Identificador</th>
            <th class="px-4 py-3 text-right">Negocios</th>
            <th class="px-4 py-3 text-right">Estado</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="method in methodsQuery.data.value" :key="method.id" class="cursor-pointer hover:bg-slate-50" @click="openEdit(method)">
            <td class="px-4 py-3 font-semibold text-slate-900">{{ method.label }}</td>
            <td class="px-4 py-3 font-mono text-xs text-slate-500">{{ method.key }}</td>
            <td class="px-4 py-3 text-right text-slate-600">{{ method.businesses_count }}</td>
            <td class="px-4 py-3 text-right">
              <span
                class="rounded-full px-2 py-0.5 text-xs font-semibold"
                :class="method.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'"
              >
                {{ method.is_active ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <PosPaymentMethodFormModal v-model="formModalOpen" :method="editingMethod" />
  </div>
</template>
