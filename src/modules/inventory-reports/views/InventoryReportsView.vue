<script setup lang="ts">
// Reportes de inventario: dos pestanas (Movimientos y Margenes), puerto de
// admin.reports.inventory + admin.reports.inventory.margins del legacy - se
// unifican en una sola pantalla con tabs para no duplicar el item de menu.
// Las opciones de filtro (categorias, razones, productos, insumos) vienen
// todas del payload de /reports/inventory/margins - se pide una sola vez
// aca y se reparte a ambas pestanas, en vez de que cada una lo pida aparte.
import { computed, ref } from 'vue'

import { NxPageHeader, NxTab, NxTabList, NxTabPanel, NxTabPanels, NxTabs } from '@/ui'

import MarginsTab from '../components/MarginsTab.vue'
import StockMovementsTab from '../components/StockMovementsTab.vue'
import { useMarginsReport } from '../composables/useMarginsReport'

const activeTab = ref('0')

// with_sales:false -> el backend no calcula ventas, solo devuelve las
// opciones de filtro compartidas (categorias/razones/productos/insumos) y
// los margenes base - liviano para pedirlo apenas entra la pantalla.
const optionsQuery = useMarginsReport(computed(() => ({})))
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <NxPageHeader title="Reportes de inventario" icon="pi pi-box" compact />

    <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <NxTabs v-model:value="activeTab">
        <NxTabList>
          <NxTab value="0">Movimientos</NxTab>
          <NxTab value="1">Márgenes</NxTab>
        </NxTabList>

        <NxTabPanels>
          <NxTabPanel value="0">
            <div class="mt-3">
              <StockMovementsTab
                :reasons="optionsQuery.data.value?.reasons ?? []"
                :product-options="optionsQuery.data.value?.product_options ?? []"
                :ingredient-options="optionsQuery.data.value?.ingredient_options ?? []"
              />
            </div>
          </NxTabPanel>

          <NxTabPanel value="1">
            <div class="mt-3">
              <MarginsTab :categories="optionsQuery.data.value?.categories ?? []" />
            </div>
          </NxTabPanel>
        </NxTabPanels>
      </NxTabs>
    </div>
  </div>
</template>
