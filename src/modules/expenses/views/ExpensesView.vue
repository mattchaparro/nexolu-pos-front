<script setup lang="ts">
// Gastos - lista mensual filtrable + gestión de gastos fijos (plantillas).
// Puerto de Admin/Expenses/Index.vue del legacy, con tabs para separar
// el registro de gastos puntuales de la configuración de gastos recurrentes.
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import { useAuthStore } from '@/stores/auth.store'
import type { Expense, FixedExpenseTemplate } from '@/types/expense'
import { NxButton, NxColumn, NxDataTable, NxInput, NxPageHeader, NxSelect, NxTab, NxTabList, NxTabPanel, NxTabPanels, NxTabs } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import ExpenseFormModal from '../components/ExpenseFormModal.vue'
import FixedExpenseTemplateFormModal from '../components/FixedExpenseTemplateFormModal.vue'
import RegisterFixedExpenseModal from '../components/RegisterFixedExpenseModal.vue'
import { useExpenseMutations } from '../composables/useExpenseMutations'
import { useExpenses } from '../composables/useExpenses'
import { useExpenseTypes } from '../composables/useExpenseTypes'
import { useFixedExpenseTemplateMutations } from '../composables/useFixedExpenseTemplateMutations'
import { useFixedExpenseTemplates } from '../composables/useFixedExpenseTemplates'

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MONTH_OPTIONS = MONTH_LABELS.map((label, i) => ({ label, value: i + 1 }))

const currentDate = new Date()
const auth = useAuthStore()
const { notify } = useSystemAlert()

// ---------- permisos -------------------------------------------------
// expenses.create OR expenses.manage -> puede listar y crear gastos.
// expenses.manage -> también puede editar/eliminar y gestionar plantillas.
const isAdmin = computed(() => auth.user?.roles?.includes('admin') === true)
const canManage = computed(() =>
  isAdmin.value || auth.user?.permissions?.includes('expenses.manage') === true,
)

// ---------- tab activo -----------------------------------------------
// NxTabs usa v-model:value con string - ref('0') para que coincida con el
// value de los NxTab ("0", "1").
const activeTab = ref('0')

// ---------- filtros Gastos -------------------------------------------
const month = ref(currentDate.getMonth() + 1)
const year = ref(currentDate.getFullYear())
const typeIdFilter = ref<number | null>(null)
const searchInput = ref('')
const search = ref('')
const page = ref(1)
let debounce: number | undefined

watch(searchInput, (value) => {
  window.clearTimeout(debounce)
  debounce = window.setTimeout(() => {
    search.value = value
    page.value = 1
  }, 300)
})

watch([month, year, typeIdFilter], () => {
  page.value = 1
})

const expensesQuery = useExpenses(month, year, typeIdFilter, search, page)
const typesQuery = useExpenseTypes()
const { deleteMutation } = useExpenseMutations()

const expenses = computed(() => expensesQuery.data.value?.data ?? [])
const meta = computed(() => expensesQuery.data.value?.meta)

const total = computed(() =>
  expenses.value.reduce((sum, e) => sum + parseFloat(e.value), 0),
)

const typeFilterOptions = computed(() => [
  { label: 'Todos los tipos', value: null },
  ...(typesQuery.data.value ?? []).map((t) => ({ label: t.name, value: t.id })),
])

const yearOptions = computed(() => {
  const y = currentDate.getFullYear()
  return [y - 2, y - 1, y, y + 1].map((v) => ({ label: String(v), value: v }))
})

function onPage(event: { page: number }): void {
  page.value = event.page + 1
}

// ---------- CRUD gastos ----------------------------------------------
const formModalOpen = ref(false)
const editingExpense = ref<Expense | null>(null)

function openNewExpense(): void {
  editingExpense.value = null
  formModalOpen.value = true
}

function openEditExpense(expense: Expense): void {
  editingExpense.value = expense
  formModalOpen.value = true
}

async function removeExpense(expense: Expense): Promise<void> {
  if (!window.confirm(`¿Eliminar gasto "${expense.description}"?`)) {
    return
  }
  try {
    await deleteMutation.mutateAsync(expense.id)
    notify('Gasto eliminado')
  } catch (error) {
    window.alert(extractErrorMessage(error, 'No pudimos eliminar el gasto.'))
  }
}

function formatCop(value: string | number): string {
  return `$${Number(value).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

// ---------- Gastos fijos ---------------------------------------------
const templatesQuery = useFixedExpenseTemplates()
const { deleteMutation: deleteTemplateMutation, toggleReminderMutation } = useFixedExpenseTemplateMutations()

const templateFormModalOpen = ref(false)
const editingTemplate = ref<FixedExpenseTemplate | null>(null)

const registerModalOpen = ref(false)
const registeringTemplate = ref<FixedExpenseTemplate | null>(null)

function openNewTemplate(): void {
  editingTemplate.value = null
  templateFormModalOpen.value = true
}

function openEditTemplate(template: FixedExpenseTemplate): void {
  editingTemplate.value = template
  templateFormModalOpen.value = true
}

function openRegisterNow(template: FixedExpenseTemplate): void {
  registeringTemplate.value = template
  registerModalOpen.value = true
}

async function toggleReminder(template: FixedExpenseTemplate): Promise<void> {
  try {
    const result = await toggleReminderMutation.mutateAsync(template.id)
    notify(result.active ? 'Recordatorio activado' : 'Recordatorio desactivado')
  } catch (error) {
    window.alert(extractErrorMessage(error, 'No pudimos cambiar el recordatorio.'))
  }
}

async function removeTemplate(template: FixedExpenseTemplate): Promise<void> {
  if (!window.confirm(`¿Eliminar "${template.name}"?`)) {
    return
  }
  try {
    await deleteTemplateMutation.mutateAsync(template.id)
    notify('Plantilla eliminada')
  } catch (error) {
    window.alert(extractErrorMessage(error, 'No pudimos eliminar la plantilla.'))
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <div class="flex items-center justify-between gap-3">
      <NxPageHeader title="Gastos" icon="pi pi-money-bill" compact />
      <NxButton icon="pi pi-plus" @click="openNewExpense">Gasto</NxButton>
    </div>

    <NxTabs v-model:value="activeTab">
      <NxTabList>
        <NxTab value="0">Gastos</NxTab>
        <NxTab v-if="canManage" value="1">Gastos fijos</NxTab>
      </NxTabList>

      <NxTabPanels>
        <!-- ============================================================ -->
        <!-- Tab 1: Gastos del mes                                        -->
        <!-- ============================================================ -->
        <NxTabPanel value="0">
          <div class="flex flex-col gap-4 pt-3">
            <!-- Filtros de período -->
            <div class="grid grid-cols-2 items-end gap-2 lg:flex lg:flex-wrap">
              <NxSelect
                v-model="month"
                label="Mes"
                :options="MONTH_OPTIONS"
                option-label="label"
                option-value="value"
                class="lg:w-28"
              />
              <NxSelect
                v-model="year"
                label="Año"
                :options="yearOptions"
                option-label="label"
                option-value="value"
                class="lg:w-24"
              />
              <NxSelect
                v-model="typeIdFilter"
                label="Tipo"
                :options="typeFilterOptions"
                option-label="label"
                option-value="value"
                class="lg:min-w-40 lg:flex-1"
              />
              <NxInput
                v-model="searchInput"
                label="Buscar descripción"
                icon="pi pi-search"
                clearable
                blur-after-typing
                class="lg:flex-1"
              />
            </div>

            <!-- Resumen del período -->
            <div
              v-if="!expensesQuery.isPending.value && expenses.length > 0"
              class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <span class="text-sm text-slate-600">
                {{ expenses.length }} gasto{{ expenses.length !== 1 ? 's' : '' }}
                en {{ MONTH_LABELS[(month - 1)] }} {{ year }}
              </span>
              <span class="text-lg font-bold text-slate-900">{{ formatCop(total) }}</span>
            </div>

            <!-- Tabla -->
            <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <NxDataTable
                :value="expenses"
                :loading="expensesQuery.isPending.value"
                paginator
                lazy
                :rows="20"
                :total-records="meta?.total ?? 0"
                :first="((meta?.current_page ?? 1) - 1) * 20"
                @page="onPage"
              >
                <template #empty>
                  <p class="py-6 text-center text-sm text-slate-400">
                    {{ search || typeIdFilter ? 'Sin resultados.' : `Sin gastos en ${MONTH_LABELS[(month - 1)]} ${year}.` }}
                  </p>
                </template>

                <NxColumn header="Fecha" style="width: 80px">
                  <template #body="{ data }: { data: Expense }">
                    <span class="text-xs text-slate-500">{{ formatDate(data.date) }}</span>
                  </template>
                </NxColumn>

                <NxColumn header="Descripción">
                  <template #body="{ data }: { data: Expense }">
                    <div>
                      <p class="text-sm font-medium text-slate-900">{{ data.description }}</p>
                      <p v-if="data.type" class="text-xs text-slate-400">{{ data.type.name }}</p>
                    </div>
                  </template>
                </NxColumn>

                <NxColumn header="Valor" style="width: 110px">
                  <template #body="{ data }: { data: Expense }">
                    <span class="font-semibold text-slate-900">{{ formatCop(data.value) }}</span>
                  </template>
                </NxColumn>

                <NxColumn header="Pago" style="width: 100px">
                  <template #body="{ data }: { data: Expense }">
                    <span class="text-xs text-slate-500">{{ data.payment_method ?? '—' }}</span>
                  </template>
                </NxColumn>

                <NxColumn v-if="canManage" style="width: 72px">
                  <template #body="{ data }: { data: Expense }">
                    <div class="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        class="text-slate-400 hover:text-indigo-600"
                        title="Editar"
                        @click="openEditExpense(data)"
                      >
                        <i class="pi pi-pencil text-sm" />
                      </button>
                      <button
                        type="button"
                        class="text-slate-300 hover:text-red-500"
                        title="Eliminar"
                        :disabled="deleteMutation.isPending.value"
                        @click="removeExpense(data)"
                      >
                        <i class="pi pi-trash text-sm" />
                      </button>
                    </div>
                  </template>
                </NxColumn>
              </NxDataTable>
            </div>
          </div>
        </NxTabPanel>

        <!-- ============================================================ -->
        <!-- Tab 2: Gastos fijos (solo expenses.manage)                   -->
        <!-- ============================================================ -->
        <NxTabPanel v-if="canManage" value="1">
          <div class="flex flex-col gap-4 pt-3">
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm text-slate-500">
                Gastos que el sistema registra automáticamente cada mes.
              </p>
              <NxButton icon="pi pi-plus" @click="openNewTemplate">Plantilla</NxButton>
            </div>

            <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <NxDataTable
                :value="templatesQuery.data.value ?? []"
                :loading="templatesQuery.isPending.value"
              >
                <template #empty>
                  <p class="py-6 text-center text-sm text-slate-400">Sin gastos fijos configurados.</p>
                </template>

                <NxColumn header="Nombre">
                  <template #body="{ data }: { data: FixedExpenseTemplate }">
                    <div>
                      <p class="text-sm font-medium text-slate-900">{{ data.name }}</p>
                      <p v-if="data.expense_type" class="text-xs text-slate-400">{{ data.expense_type.name }}</p>
                    </div>
                  </template>
                </NxColumn>

                <NxColumn header="Monto" style="width: 110px">
                  <template #body="{ data }: { data: FixedExpenseTemplate }">
                    <span class="text-sm text-slate-700">
                      {{ data.amount ? formatCop(data.amount) : '—' }}
                    </span>
                  </template>
                </NxColumn>

                <NxColumn header="Día" style="width: 60px">
                  <template #body="{ data }: { data: FixedExpenseTemplate }">
                    <span class="text-xs text-slate-500">{{ data.day_of_month ?? '—' }}</span>
                  </template>
                </NxColumn>

                <NxColumn header="Activo" style="width: 80px">
                  <template #body="{ data }: { data: FixedExpenseTemplate }">
                    <span
                      :class="data.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'"
                      class="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    >
                      {{ data.active ? 'Sí' : 'No' }}
                    </span>
                  </template>
                </NxColumn>

                <NxColumn header="Este mes" style="width: 90px">
                  <template #body="{ data }: { data: FixedExpenseTemplate }">
                    <span
                      :class="data.registered_this_month ? 'text-emerald-600' : 'text-slate-400'"
                      class="flex items-center gap-1 text-xs"
                    >
                      <i :class="data.registered_this_month ? 'pi pi-check-circle' : 'pi pi-circle'" class="text-sm" />
                      {{ data.registered_this_month ? 'Registrado' : 'Pendiente' }}
                    </span>
                  </template>
                </NxColumn>

                <NxColumn style="width: 130px">
                  <template #body="{ data }: { data: FixedExpenseTemplate }">
                    <div class="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        class="text-slate-400 hover:text-indigo-600"
                        title="Registrar ahora"
                        @click="openRegisterNow(data)"
                      >
                        <i class="pi pi-play-circle text-sm" />
                      </button>
                      <button
                        type="button"
                        :class="data.has_active_reminder ? 'text-amber-500 hover:text-amber-600' : 'text-slate-400 hover:text-amber-500'"
                        title="Recordatorio"
                        :disabled="toggleReminderMutation.isPending.value"
                        @click="toggleReminder(data)"
                      >
                        <i class="pi pi-bell text-sm" />
                      </button>
                      <button
                        type="button"
                        class="text-slate-400 hover:text-indigo-600"
                        title="Editar"
                        @click="openEditTemplate(data)"
                      >
                        <i class="pi pi-pencil text-sm" />
                      </button>
                      <button
                        type="button"
                        class="text-slate-300 hover:text-red-500"
                        title="Eliminar"
                        :disabled="deleteTemplateMutation.isPending.value"
                        @click="removeTemplate(data)"
                      >
                        <i class="pi pi-trash text-sm" />
                      </button>
                    </div>
                  </template>
                </NxColumn>
              </NxDataTable>
            </div>
          </div>
        </NxTabPanel>
      </NxTabPanels>
    </NxTabs>

    <!-- Modales -->
    <ExpenseFormModal v-model="formModalOpen" :expense="editingExpense" />
    <FixedExpenseTemplateFormModal v-model="templateFormModalOpen" :template="editingTemplate" />
    <RegisterFixedExpenseModal v-model="registerModalOpen" :template="registeringTemplate" />
  </div>
</template>
