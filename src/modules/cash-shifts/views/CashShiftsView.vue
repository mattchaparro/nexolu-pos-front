<script setup lang="ts">
// Turnos de caja / Cierre del día. Dos pestañas segun permiso: "Cierre de
// caja" (cash_closing.manage - normalmente solo el dueño/admin, con el
// historial y el "Deshacer" del mismo dia dentro para no multiplicar
// pestañas) y "Mi turno" (cash_shift.manage - cualquier cajero). Cierre de
// caja va primero: es lo que le interesa ver de entrada al dueño/admin, que
// es quien mas usa esta pantalla.
import { computed, ref } from 'vue'

import { usePermissions } from '@/composables/usePermissions'
import { NxTab, NxTabList, NxTabPanel, NxTabPanels, NxTabs } from '@/ui'

import CashClosingHistory from '../components/CashClosingHistory.vue'
import CashClosingPanel from '../components/CashClosingPanel.vue'
import MyShiftPanel from '../components/MyShiftPanel.vue'

const { hasPermission } = usePermissions()
const canManageShift = computed(() => hasPermission('cash_shift.manage'))
const canManageClosing = computed(() => hasPermission('cash_closing.manage'))

const activeTab = ref(canManageClosing.value ? '0' : '1')
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <div class="flex items-center gap-2">
      <i class="pi pi-clock text-lg text-indigo-600" />
      <h1 class="text-lg font-bold text-slate-900">Turnos de caja</h1>
    </div>

    <NxTabs v-model:value="activeTab">
      <NxTabList>
        <NxTab v-if="canManageClosing" value="0">Cierre de caja</NxTab>
        <NxTab v-if="canManageShift" value="1">Mi turno</NxTab>
      </NxTabList>

      <NxTabPanels>
        <NxTabPanel v-if="canManageClosing" value="0">
          <div class="mt-3 flex flex-col gap-6">
            <CashClosingPanel />

            <div>
              <h2 class="mb-2 text-sm font-semibold text-slate-700">Historial de cierres</h2>
              <CashClosingHistory />
            </div>
          </div>
        </NxTabPanel>

        <NxTabPanel v-if="canManageShift" value="1">
          <div class="mt-3">
            <MyShiftPanel />
          </div>
        </NxTabPanel>
      </NxTabPanels>
    </NxTabs>
  </div>
</template>
