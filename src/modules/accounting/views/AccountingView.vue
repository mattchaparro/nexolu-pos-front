<script setup lang="ts">
// Contabilidad gerencial: P&L mensual del negocio, puerto de
// Admin/Reports/Accounting.vue del legacy (admin.reports.accounting). Cerrar
// el mes es una accion sensible (congela el resultado, ver
// ManagerialAccountingService::closeMonth()) - confirmacion + notas
// opcionales antes de mandarla.
import { computed, ref } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { AccountingAnnualMonth, AccountingExpenseLine, AccountingIncomeLine, ProductProfitLine } from '@/types/accounting'
import { NxButton, NxColumn, NxDataTable, NxModal, NxPageHeader, NxSelect, NxStatCard, NxTab, NxTabList, NxTabPanel, NxTabPanels, NxTabs, NxTextarea } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { formatCop } from '@/utils/formatCop'

import { useAccountingMutations } from '../composables/useAccountingMutations'
import { useAnnualReport, useMonthlyReport } from '../composables/useAccountingReport'
import { fetchMonthlyReportCsv } from '../services/accountingService'

const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)
const activeTab = ref('0')

const monthlyQuery = useMonthlyReport(year, month)
const annualQuery = useAnnualReport(year)

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const monthOptions = monthNames.map((label, i) => ({ label, value: i + 1 }))
const yearOptions = Array.from({ length: 6 }, (_, i) => ({ label: String(now.getFullYear() - i), value: now.getFullYear() - i }))

const { notify } = useSystemAlert()
const { closeMonthMutation } = useAccountingMutations()

const closeModalOpen = ref(false)
const closeNotes = ref('')

async function confirmCloseMonth(): Promise<void> {
  try {
    await closeMonthMutation.mutateAsync({ year: year.value, month: month.value, notes: closeNotes.value || undefined })
    notify('Mes cerrado correctamente.')
    closeModalOpen.value = false
    closeNotes.value = ''
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos cerrar el mes.'), 'error')
  }
}

const exporting = ref(false)
async function exportCsv(): Promise<void> {
  exporting.value = true
  try {
    const blob = await fetchMonthlyReportCsv(year.value, month.value)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `contabilidad-${year.value}-${String(month.value).padStart(2, '0')}.csv`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos exportar el reporte.'), 'error')
  } finally {
    exporting.value = false
  }
}

const productProfit = computed(() => monthlyQuery.data.value?.product_profit_lines)
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <NxPageHeader title="Contabilidad gerencial" icon="pi pi-calculator" compact />
      <div class="flex gap-3">
        <NxSelect v-model="month" :options="monthOptions" option-label="label" option-value="value" class="w-40" />
        <NxSelect v-model="year" :options="yearOptions" option-label="label" option-value="value" class="w-28" />
      </div>
    </div>

    <div v-if="monthlyQuery.isPending.value" class="h-64 animate-pulse rounded-xl bg-slate-100" />

    <template v-else-if="monthlyQuery.data.value">
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <NxStatCard label="Ingresos" :value="formatCop(monthlyQuery.data.value.income)" icon="pi pi-dollar" />
        <NxStatCard label="Gastos" :value="formatCop(monthlyQuery.data.value.expenses)" icon="pi pi-money-bill" />
        <NxStatCard label="Utilidad neta" :value="formatCop(monthlyQuery.data.value.net_result)" icon="pi pi-wallet" />
        <NxStatCard label="Fiados cobrados" :value="formatCop(monthlyQuery.data.value.receivables_collected)" icon="pi pi-credit-card" />
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div v-if="monthlyQuery.data.value.is_closed" class="flex items-center gap-2 text-sm text-emerald-700">
          <i class="pi pi-lock" />
          <span>
            Mes cerrado por {{ monthlyQuery.data.value.closed_by ?? 'un administrador' }}
            <span v-if="monthlyQuery.data.value.closed_at">· {{ new Date(monthlyQuery.data.value.closed_at).toLocaleString('es-CO') }}</span>
          </span>
        </div>
        <p v-else class="text-sm text-slate-500">Este mes todavía no se ha cerrado.</p>

        <div class="flex gap-2">
          <NxButton variant="outline" icon="pi pi-download" :loading="exporting" @click="exportCsv">Exportar CSV</NxButton>
          <NxButton v-if="!monthlyQuery.data.value.is_closed" icon="pi pi-lock" @click="closeModalOpen = true">Cerrar mes</NxButton>
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <NxTabs v-model:value="activeTab">
          <NxTabList>
            <NxTab value="0">Ingresos y gastos</NxTab>
            <NxTab value="1">Rentabilidad por producto</NxTab>
            <NxTab value="2">Vista anual</NxTab>
          </NxTabList>

          <NxTabPanels>
            <NxTabPanel value="0">
              <div class="mt-3 grid gap-4 lg:grid-cols-2">
                <div>
                  <h3 class="mb-2 text-sm font-semibold text-slate-700">
                    Ingresos <span class="font-normal text-slate-400">({{ monthlyQuery.data.value.sales_count }} ventas)</span>
                  </h3>
                  <NxDataTable :value="monthlyQuery.data.value.income_lines" :rows="10" paginator>
                    <template #empty>
                      <p class="py-4 text-center text-sm text-slate-400">Sin ingresos este mes.</p>
                    </template>
                    <NxColumn header="Fecha">
                      <template #body="{ data }: { data: AccountingIncomeLine }"><p class="text-xs text-slate-600">{{ data.date }}</p></template>
                    </NxColumn>
                    <NxColumn header="Descripción">
                      <template #body="{ data }: { data: AccountingIncomeLine }">
                        <p class="text-sm text-slate-800">{{ data.description }}</p>
                        <p class="text-xs text-slate-400">{{ data.type_label }}</p>
                      </template>
                    </NxColumn>
                    <NxColumn header="Monto">
                      <template #body="{ data }: { data: AccountingIncomeLine }">
                        <p class="text-right text-sm font-semibold text-emerald-600">{{ formatCop(data.amount) }}</p>
                      </template>
                    </NxColumn>
                  </NxDataTable>
                </div>

                <div>
                  <h3 class="mb-2 text-sm font-semibold text-slate-700">
                    Gastos <span class="font-normal text-slate-400">({{ monthlyQuery.data.value.expenses_count }})</span>
                  </h3>
                  <NxDataTable :value="monthlyQuery.data.value.expense_lines" :rows="10" paginator>
                    <template #empty>
                      <p class="py-4 text-center text-sm text-slate-400">Sin gastos este mes.</p>
                    </template>
                    <NxColumn header="Fecha">
                      <template #body="{ data }: { data: AccountingExpenseLine }"><p class="text-xs text-slate-600">{{ data.date }}</p></template>
                    </NxColumn>
                    <NxColumn header="Descripción">
                      <template #body="{ data }: { data: AccountingExpenseLine }">
                        <p class="text-sm text-slate-800">{{ data.description }}</p>
                        <p class="text-xs text-slate-400">{{ data.type_name }}</p>
                      </template>
                    </NxColumn>
                    <NxColumn header="Monto">
                      <template #body="{ data }: { data: AccountingExpenseLine }">
                        <p class="text-right text-sm font-semibold text-red-500">{{ formatCop(data.amount) }}</p>
                      </template>
                    </NxColumn>
                  </NxDataTable>
                </div>
              </div>
            </NxTabPanel>

            <NxTabPanel value="1">
              <div class="mt-3 flex flex-col gap-4">
                <div v-if="productProfit" class="grid grid-cols-2 gap-3 lg:grid-cols-3">
                  <NxStatCard label="Utilidad de productos" :value="formatCop(productProfit.total_profit)" icon="pi pi-arrow-up-right" />
                  <NxStatCard label="Ingreso de productos con costo" :value="formatCop(productProfit.total_revenue)" icon="pi pi-dollar" />
                  <NxStatCard label="Productos sin costo configurado" :value="String(productProfit.uncosted.products_count)" icon="pi pi-exclamation-triangle" />
                </div>

                <NxDataTable :value="productProfit?.lines ?? []" :rows="10" paginator>
                  <template #empty>
                    <p class="py-4 text-center text-sm text-slate-400">Sin productos con costo configurado vendidos este mes.</p>
                  </template>
                  <NxColumn header="Producto">
                    <template #body="{ data }: { data: ProductProfitLine }"><p class="text-sm font-medium text-slate-900">{{ data.name }}</p></template>
                  </NxColumn>
                  <NxColumn header="Unidades">
                    <template #body="{ data }: { data: ProductProfitLine }"><p class="text-sm text-slate-700">{{ data.qty_sold }}</p></template>
                  </NxColumn>
                  <NxColumn header="Ingreso">
                    <template #body="{ data }: { data: ProductProfitLine }"><p class="text-sm text-slate-700">{{ formatCop(data.revenue) }}</p></template>
                  </NxColumn>
                  <NxColumn header="Costo">
                    <template #body="{ data }: { data: ProductProfitLine }"><p class="text-sm text-slate-700">{{ formatCop(data.cost_total) }}</p></template>
                  </NxColumn>
                  <NxColumn header="Utilidad">
                    <template #body="{ data }: { data: ProductProfitLine }">
                      <p class="text-right text-sm font-semibold text-emerald-600">{{ formatCop(data.profit) }}</p>
                    </template>
                  </NxColumn>
                </NxDataTable>

                <div v-if="(productProfit?.uncosted.lines.length ?? 0) > 0" class="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <h3 class="mb-2 text-sm font-semibold text-amber-800">Vendidos sin costo configurado</h3>
                  <p class="mb-3 text-xs text-amber-700/80">
                    Se vendieron este mes pero no tienen costo en Catálogo, así que no se les puede calcular utilidad real.
                  </p>
                  <div class="flex flex-col divide-y divide-amber-100">
                    <div
                      v-for="row in productProfit?.uncosted.lines ?? []"
                      :key="row.name"
                      class="flex items-center justify-between py-1.5 text-sm text-amber-900"
                    >
                      <span>{{ row.name }} <span class="text-amber-600">x{{ row.qty_sold }}</span></span>
                      <span class="font-medium">{{ formatCop(row.revenue) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </NxTabPanel>

            <NxTabPanel value="2">
              <div class="mt-3">
                <div v-if="annualQuery.data.value" class="mb-3 grid grid-cols-3 gap-3">
                  <NxStatCard label="Ingresos del año" :value="formatCop(annualQuery.data.value.income_total)" icon="pi pi-dollar" />
                  <NxStatCard label="Gastos del año" :value="formatCop(annualQuery.data.value.expenses_total)" icon="pi pi-money-bill" />
                  <NxStatCard label="Utilidad neta del año" :value="formatCop(annualQuery.data.value.net_total)" icon="pi pi-wallet" />
                </div>
                <NxDataTable :value="annualQuery.data.value?.months ?? []" :loading="annualQuery.isPending.value">
                  <NxColumn header="Mes">
                    <template #body="{ data }: { data: AccountingAnnualMonth }"><p class="text-sm font-medium capitalize text-slate-900">{{ data.label }}</p></template>
                  </NxColumn>
                  <NxColumn header="Ventas">
                    <template #body="{ data }: { data: AccountingAnnualMonth }"><p class="text-sm text-slate-700">{{ data.sales_count }}</p></template>
                  </NxColumn>
                  <NxColumn header="Ingresos">
                    <template #body="{ data }: { data: AccountingAnnualMonth }"><p class="text-sm text-slate-700">{{ formatCop(data.income) }}</p></template>
                  </NxColumn>
                  <NxColumn header="Gastos">
                    <template #body="{ data }: { data: AccountingAnnualMonth }"><p class="text-sm text-slate-700">{{ formatCop(data.expenses) }}</p></template>
                  </NxColumn>
                  <NxColumn header="Utilidad neta">
                    <template #body="{ data }: { data: AccountingAnnualMonth }">
                      <p class="text-right text-sm font-semibold" :class="data.net_result >= 0 ? 'text-emerald-600' : 'text-red-500'">
                        {{ formatCop(data.net_result) }}
                      </p>
                    </template>
                  </NxColumn>
                </NxDataTable>
              </div>
            </NxTabPanel>
          </NxTabPanels>
        </NxTabs>
      </div>
    </template>

    <NxModal v-model="closeModalOpen" title="Cerrar mes" size="sm">
      <div class="flex flex-col gap-3">
        <p class="text-sm text-slate-600">
          Esto congela el resultado del mes ({{ monthOptions.find((m) => m.value === month)?.label }} {{ year }}). Podrás seguir viéndolo, pero no
          se recalcula si entran ventas o gastos nuevos con fecha de este mes.
        </p>
        <NxTextarea v-model="closeNotes" label="Notas (opcional)" :rows="3" />
      </div>
      <template #footer>
        <NxButton variant="outline" @click="closeModalOpen = false">Cancelar</NxButton>
        <NxButton :loading="closeMonthMutation.isPending.value" @click="confirmCloseMonth">Confirmar cierre</NxButton>
      </template>
    </NxModal>
  </div>
</template>
