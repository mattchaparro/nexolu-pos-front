<script setup lang="ts">
// Registrar compra - puerto de Admin/Purchases/Create.vue del legacy. Sin
// pagina de edicion: una compra ya aplicada movio stock/costo promedio,
// igual que una venta - se corrige con un abono (PayPurchaseModal) o
// anulando insumos manualmente, no editando la compra en si.
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useBusiness } from '@/composables/useBusiness'
import { useSystemAlert } from '@/composables/useSystemAlert'
import { useIngredientOptions } from '@/modules/catalog/composables/useIngredientOptions'
import type { PurchaseLineInput, PurchasePayload } from '@/types/purchase'
import { NxButton, NxInput, NxPageHeader, NxSelect, NxTextarea, NxToggleButton } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'
import { isCreditPaymentMethodId } from '@/utils/paymentMethod'

import CatalogHubTabs from '../../catalog/components/CatalogHubTabs.vue'
import PaymentMethodPicker from '@/components/PaymentMethodPicker.vue'
import PurchaseLinesEditor from '../components/PurchaseLinesEditor.vue'
import { usePurchaseMutations } from '../composables/usePurchaseMutations'
import { usePurchasableProducts, useSupplierOptions } from '../composables/usePurchaseFormOptions'
import { newPurchaseLineRow, type PurchaseLineRow } from '../support/purchaseLine'

const router = useRouter()
const { notify } = useSystemAlert()
const { data: business } = useBusiness()
const ingredientsEnabled = computed(() => business.value?.feature_flags?.ingredients === true)

const productsQuery = usePurchasableProducts()
const ingredientsQuery = useIngredientOptions(ingredientsEnabled)
const suppliersQuery = useSupplierOptions()
const supplierOptions = computed(() => [{ id: null, name: 'Sin proveedor' }, ...(suppliersQuery.data.value ?? [])])

const nonCreditPaymentMethods = computed(
  () => business.value?.payment_methods.filter((m) => !isCreditPaymentMethodId(m.id)) ?? [],
)

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

const supplierId = ref<number | null>(null)
const purchasedAt = ref(today())
const invoiceNumber = ref('')
const notes = ref('')
const lines = ref<PurchaseLineRow[]>([newPurchaseLineRow('product')])

const isCredit = ref(false)
const paymentReminderDate = ref('')
const paymentReminderRecurrence = ref<'none' | 'weekly' | 'monthly'>('none')
const paymentReminderEndDate = ref('')

const createExpense = ref(false)
const expensePaymentMethod = ref<string | null>(null)

const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)
const { createMutation } = usePurchaseMutations()
const isSaving = computed(() => createMutation.isPending.value)

async function submit(): Promise<void> {
  fieldErrors.value = {}
  formError.value = null

  const lineInputs: PurchaseLineInput[] = lines.value.map((row) => ({
    product_id: row.kind === 'product' ? row.product_id : null,
    ingredient_id: row.kind === 'ingredient' ? row.ingredient_id : null,
    quantity: row.kind === 'product' ? Math.round(Number(row.quantity) || 0) : Number(row.quantity) || 0,
    line_total_cop: Number(row.line_total_cop) || 0,
    notes: row.notes.trim() || null,
  }))

  const payload: PurchasePayload = {
    supplier_id: supplierId.value,
    purchased_at: purchasedAt.value,
    invoice_number: invoiceNumber.value.trim() || null,
    notes: notes.value.trim() || null,
    is_credit: isCredit.value,
    lines: lineInputs,
    ...(isCredit.value && paymentReminderDate.value
      ? {
          payment_reminder_date: paymentReminderDate.value,
          payment_reminder_recurrence: paymentReminderRecurrence.value,
          payment_reminder_end_date: paymentReminderRecurrence.value !== 'none' ? paymentReminderEndDate.value || null : null,
        }
      : {}),
    ...(!isCredit.value
      ? { create_expense: createExpense.value, expense_payment_method: expensePaymentMethod.value ?? undefined }
      : {}),
  }

  try {
    await createMutation.mutateAsync(payload)
    notify('Compra registrada')
    router.push({ name: 'purchases.index' })
  } catch (error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) {
      fieldErrors.value = fields
    } else {
      formError.value = extractErrorMessage(error, 'No pudimos registrar la compra.')
    }
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
        @click="router.push({ name: 'purchases.index' })"
      >
        <i class="pi pi-arrow-left" />
      </button>
      <NxPageHeader title="Registrar compra" icon="pi pi-shopping-cart" compact />
    </div>

    <CatalogHubTabs />

    <p v-if="formError" class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{{ formError }}</p>

    <div class="flex flex-col gap-4">
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="mb-3 text-sm font-semibold text-slate-700">Datos de la compra</p>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <NxSelect
            :model-value="supplierId"
            :options="supplierOptions"
            option-label="name"
            option-value="id"
            label="Proveedor (opcional)"
            filter
            @update:model-value="supplierId = $event as number | null"
          />
          <NxInput v-model="purchasedAt" type="date" label="Fecha de compra" required :error="fieldErrors.purchased_at" />
          <NxInput v-model="invoiceNumber" label="Factura (opcional)" :error="fieldErrors.invoice_number" />
          <NxTextarea v-model="notes" label="Notas (opcional)" :rows="1" class="sm:col-span-2" />
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="mb-3 text-sm font-semibold text-slate-700">Filas</p>
        <PurchaseLinesEditor
          v-model="lines"
          :products="productsQuery.data.value ?? []"
          :ingredients="ingredientsQuery.data.value ?? []"
          :ingredients-enabled="ingredientsEnabled"
          :errors="fieldErrors"
        />
        <p v-if="fieldErrors.lines" class="mt-2 text-xs text-red-600">{{ fieldErrors.lines }}</p>
      </div>

      <div class="flex flex-col gap-2">
        <NxToggleButton v-model="isCredit" label="Esta compra quedó a crédito con el proveedor" icon="pi pi-receipt" />

        <div v-if="isCredit" class="flex flex-col gap-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
          <p class="text-sm font-medium text-slate-700">¿Quieres que te recuerde el pago? (opcional)</p>
          <NxInput v-model="paymentReminderDate" type="date" label="Fecha del recordatorio" />
          <NxSelect
            v-if="paymentReminderDate"
            :model-value="paymentReminderRecurrence"
            :options="[
              { label: 'Una sola vez', value: 'none' },
              { label: 'Cada semana', value: 'weekly' },
              { label: 'Cada mes', value: 'monthly' },
            ]"
            option-label="label"
            option-value="value"
            label="Se repite"
            @update:model-value="paymentReminderRecurrence = $event as 'none' | 'weekly' | 'monthly'"
          />
          <NxInput
            v-if="paymentReminderDate && paymentReminderRecurrence !== 'none'"
            v-model="paymentReminderEndDate"
            type="date"
            label="Repetir hasta (opcional)"
          />
        </div>
      </div>

      <div v-if="!isCredit" class="flex flex-col gap-2">
        <NxToggleButton v-model="createExpense" label="Registrar como gasto del día" icon="pi pi-money-bill" />

        <div v-if="createExpense" class="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <p class="mb-2 text-sm font-medium text-slate-700">¿Cómo se pagó esta compra?</p>
          <PaymentMethodPicker :methods="nonCreditPaymentMethods" :model-value="expensePaymentMethod" @update:model-value="expensePaymentMethod = $event" />
        </div>
      </div>
    </div>

    <NxButton :loading="isSaving" @click="submit">Guardar y aplicar</NxButton>
  </div>
</template>
