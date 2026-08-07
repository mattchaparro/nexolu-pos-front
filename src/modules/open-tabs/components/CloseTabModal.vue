<script setup lang="ts">
// Cobrar/cerrar una cuenta abierta: cortesia, cargos (mismo patron que
// CartCheckoutSection de Vender, sin override de tasa - ver nota en
// docs/BACKEND_READINESS.md), abonos parciales, pago con un solo medio o
// dividido entre 2+. Simplificacion deliberada sobre el legacy
// (OpenTabs.vue): sin el selector "una persona/varias personas" ni el
// boton de "repartir entre N" - misma funcionalidad final (abonar de a
// poco o dividir el pago), presentada como 3 acciones directas en vez de
// alternar entre pestañas.
import { computed, ref, watch } from 'vue'

import type { Business } from '@/types/business'
import type { Sale } from '@/types/sale'
import { NxButton, NxInput, NxModal } from '@/ui'
import { formatCop } from '@/utils/formatCop'
import { isCreditPaymentMethodId } from '@/utils/paymentMethod'

import { round2 } from '../../sales/support/saleMath'
import type { CloseOpenTabPayload, PaymentSplitInput, RecordPartialPaymentPayload } from '../types'
import PaymentMethodPicker from '../../sales/components/PaymentMethodPicker.vue'

const props = defineProps<{
  modelValue: boolean
  sale: Sale
  business: Business
  submitting: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: [payload: CloseOpenTabPayload]
  'register-partial': [payload: RecordPartialPaymentPayload]
}>()

const splitMethods = computed(() =>
  props.business.payment_methods.filter((m) => !isCreditPaymentMethodId(m.id)),
)
const defaultMethodId = computed(() => props.business.payment_methods[0]?.id ?? 'cash')
const defaultSplitMethodId = computed(() => splitMethods.value[0]?.id ?? 'cash')

const isCourtesy = ref(false)
const courtesyReason = ref('')
const applyServiceCharge = ref(true)
const applyIpoconsumo = ref(true)
const useSplit = ref(false)
const splitRows = ref<PaymentSplitInput[]>([])
const singleMethod = ref<string | null>(null)
const customerName = ref('')
const customerPhone = ref('')
const partialAmount = ref('')
const partialMethod = ref<string | null>(null)
const partialLabel = ref('')

function resetForm(): void {
  isCourtesy.value = false
  courtesyReason.value = ''
  applyServiceCharge.value = true
  applyIpoconsumo.value = true
  useSplit.value = false
  splitRows.value = []
  singleMethod.value = defaultMethodId.value
  customerName.value = ''
  customerPhone.value = ''
  partialAmount.value = ''
  partialMethod.value = defaultSplitMethodId.value
  partialLabel.value = ''
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      resetForm()
    }
  },
)

const hasPartialPayments = computed(() => (props.sale.partial_payments?.length ?? 0) > 0)
const amountPaid = computed(
  () => props.sale.amount_paid ?? props.sale.partial_payments?.reduce((s, p) => s + p.amount, 0) ?? 0,
)
const balanceBeforeCharges = computed(() =>
  round2(props.sale.balance_due ?? props.sale.total - amountPaid.value),
)

// Base sin el domicilio, igual que OpenTabService::close().
const chargeBase = computed(() => Math.max(0, props.sale.total - props.sale.delivery_fee))

const serviceChargeAmount = computed(() => {
  if (isCourtesy.value || !props.business.charges.service_charge_enabled || !applyServiceCharge.value) {
    return 0
  }
  return round2((chargeBase.value * props.business.charges.service_charge_rate) / 100)
})

const ipoconsumoAmount = computed(() => {
  if (isCourtesy.value || !props.business.charges.ipoconsumo_enabled || !applyIpoconsumo.value) {
    return 0
  }
  return round2((chargeBase.value * props.business.charges.ipoconsumo_rate) / 100)
})

const amountDue = computed(() =>
  round2(balanceBeforeCharges.value + serviceChargeAmount.value + ipoconsumoAmount.value),
)

const splitTotal = computed(() => round2(splitRows.value.reduce((s, r) => s + (Number(r.amount) || 0), 0)))
const splitRemainder = computed(() => round2(amountDue.value - splitTotal.value))

function initSplitRows(): void {
  const half = round2(amountDue.value / 2)
  const m0 = splitMethods.value[0]?.id ?? 'cash'
  const m1 = splitMethods.value[1]?.id ?? splitMethods.value[0]?.id ?? 'transfer'
  splitRows.value = [
    { method: m0, amount: splitMethods.value.length >= 2 ? half : amountDue.value, label: null },
    { method: m1, amount: splitMethods.value.length >= 2 ? round2(amountDue.value - half) : 0, label: null },
  ]
}

watch(useSplit, (v) => {
  if (v) {
    initSplitRows()
  }
})

watch(isCourtesy, (v) => {
  if (v) {
    useSplit.value = false
  }
})

function addSplitRow(): void {
  splitRows.value.push({ method: splitMethods.value[0]?.id ?? 'cash', amount: 0, label: null })
}

function removeSplitRow(index: number): void {
  splitRows.value.splice(index, 1)
}

const needsCustomerInfoForCredit = computed(() => {
  if (isCourtesy.value || useSplit.value) {
    return false
  }
  if (!isCreditPaymentMethodId(singleMethod.value)) {
    return false
  }
  return !props.sale.customer_name && !props.sale.customer_phone && !customerName.value && !customerPhone.value
})

const canClose = computed(() => {
  if (isCourtesy.value) {
    return true
  }
  if (useSplit.value) {
    const validRows = splitRows.value.filter((r) => Number(r.amount) > 0.009)
    return validRows.length >= 2 && Math.abs(splitRemainder.value) < 0.02
  }
  return Boolean(singleMethod.value) && !needsCustomerInfoForCredit.value
})

function submitClose(): void {
  if (!canClose.value) {
    return
  }

  const payload: CloseOpenTabPayload = {
    is_non_revenue: isCourtesy.value,
    non_revenue_reason: isCourtesy.value ? courtesyReason.value || 'Cortesía' : undefined,
    apply_service_charge: !isCourtesy.value && applyServiceCharge.value,
    apply_ipoconsumo: !isCourtesy.value && applyIpoconsumo.value,
  }

  if (!isCourtesy.value && useSplit.value) {
    payload.payment_splits = splitRows.value
      .filter((r) => Number(r.amount) > 0.009)
      .map((r) => ({ method: r.method, amount: Number(r.amount), label: r.label || undefined }))
  } else if (!isCourtesy.value) {
    payload.payment_method = singleMethod.value
    if (isCreditPaymentMethodId(singleMethod.value)) {
      payload.customer_name = customerName.value || undefined
      payload.customer_phone = customerPhone.value || undefined
    }
  }

  emit('close', payload)
}

function submitPartial(): void {
  const amount = Number(partialAmount.value)
  if (!(amount > 0) || amount > balanceBeforeCharges.value + 0.02 || !partialMethod.value) {
    return
  }
  emit('register-partial', {
    amount,
    payment_method: partialMethod.value,
    payer_label: partialLabel.value.trim() || undefined,
  })
  partialAmount.value = ''
  partialLabel.value = ''
}
</script>

<template>
  <NxModal
    :model-value="modelValue"
    title="Cobrar cuenta"
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-4">
      <div>
        <p v-if="amountPaid > 0" class="space-y-0.5 text-xs text-slate-500">
          Total cuenta: <strong class="text-slate-700">{{ formatCop(sale.total) }}</strong> · Ya pagado:
          <strong class="text-emerald-700">{{ formatCop(amountPaid) }}</strong>
        </p>
        <p class="text-2xl font-bold text-emerald-600">{{ formatCop(amountDue) }}</p>
        <p class="text-xs text-slate-400">{{ amountPaid > 0 ? 'Saldo a cobrar ahora' : 'Total a cobrar' }}</p>
      </div>

      <div
        v-if="sale.partial_payments?.length"
        class="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-[11px] text-amber-900"
      >
        <p v-for="p in sale.partial_payments" :key="p.id">
          {{ formatCop(p.amount) }} —
          {{ business.payment_methods.find((m) => m.id === p.payment_method)?.label ?? p.payment_method }}
          <span v-if="p.payer_label" class="text-amber-700">· {{ p.payer_label }}</span>
        </p>
      </div>

      <div v-if="amountDue > 0.02" class="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
        <p class="mb-2 text-xs font-semibold text-amber-800">Registrar abono parcial</p>
        <div class="flex flex-wrap items-end gap-2">
          <NxInput v-model="partialAmount" type="number" placeholder="Monto" size="sm" class="w-28" />
          <select
            v-model="partialMethod"
            class="min-w-[110px] rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-xs"
          >
            <option v-for="m in splitMethods" :key="m.id" :value="m.id">{{ m.label }}</option>
          </select>
          <NxInput v-model="partialLabel" placeholder="Quién paga (opc.)" size="sm" class="min-w-[120px] flex-1" />
          <NxButton size="sm" variant="secondary" @click="submitPartial">Registrar</NxButton>
        </div>
      </div>

      <label
        class="flex items-center justify-between py-1"
        :class="hasPartialPayments ? 'opacity-50' : ''"
      >
        <span class="text-sm font-medium text-slate-700">Cerrar como cortesía</span>
        <input
          v-model="isCourtesy"
          type="checkbox"
          :disabled="hasPartialPayments"
          class="h-4 w-4 rounded accent-amber-500 disabled:opacity-50"
        />
      </label>
      <p v-if="hasPartialPayments" class="-mt-2 text-[11px] text-amber-700">
        No aplica cortesía con abonos registrados.
      </p>
      <NxInput
        v-if="isCourtesy"
        v-model="courtesyReason"
        placeholder="Motivo (opcional)"
      />

      <div
        v-if="!isCourtesy && (business.charges.service_charge_enabled || business.charges.ipoconsumo_enabled)"
        class="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50/40 p-3"
      >
        <label
          v-if="business.charges.service_charge_enabled"
          class="flex items-center justify-between text-sm text-amber-900"
        >
          <span class="flex items-center gap-2 font-medium">
            <input v-model="applyServiceCharge" type="checkbox" class="h-4 w-4 rounded accent-amber-600" />
            Servicio ({{ business.charges.service_charge_rate }}%)
          </span>
          <span v-if="serviceChargeAmount > 0" class="font-semibold">+{{ formatCop(serviceChargeAmount) }}</span>
        </label>
        <label
          v-if="business.charges.ipoconsumo_enabled"
          class="flex items-center justify-between text-sm text-amber-900"
        >
          <span class="flex items-center gap-2 font-medium">
            <input v-model="applyIpoconsumo" type="checkbox" class="h-4 w-4 rounded accent-amber-600" />
            Ipoconsumo ({{ business.charges.ipoconsumo_rate }}%)
          </span>
          <span v-if="ipoconsumoAmount > 0" class="font-semibold">+{{ formatCop(ipoconsumoAmount) }}</span>
        </label>
      </div>

      <label v-if="!isCourtesy && splitMethods.length >= 2" class="flex items-center justify-between py-1">
        <span class="text-sm font-medium text-indigo-700">Pago dividido (2+ medios)</span>
        <input v-model="useSplit" type="checkbox" class="h-4 w-4 rounded accent-indigo-600" />
      </label>

      <div v-if="!isCourtesy && useSplit" class="flex flex-col gap-2">
        <p class="text-xs text-slate-500">
          Saldo {{ formatCop(amountDue) }}. Diferencia:
          <span :class="Math.abs(splitRemainder) < 0.02 ? 'font-semibold text-emerald-600' : 'font-semibold text-amber-600'">
            {{ formatCop(splitRemainder) }}
          </span>
        </p>
        <div v-for="(row, index) in splitRows" :key="index" class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <select v-model="row.method" class="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm">
            <option v-for="m in splitMethods" :key="m.id" :value="m.id">{{ m.label }}</option>
          </select>
          <input
            v-model.number="row.amount"
            type="number"
            min="0"
            step="100"
            placeholder="Monto"
            class="w-28 rounded-xl border border-slate-300 px-2 py-2 text-right text-sm"
          />
          <button type="button" class="shrink-0 text-slate-300 hover:text-red-500" @click="removeSplitRow(index)">
            <i class="pi pi-times" />
          </button>
        </div>
        <button type="button" class="text-left text-xs font-semibold text-indigo-600 hover:text-indigo-800" @click="addSplitRow">
          + Agregar medio
        </button>
      </div>

      <div v-if="!isCourtesy && !useSplit">
        <PaymentMethodPicker :methods="business.payment_methods" :model-value="singleMethod" @update:model-value="singleMethod = $event" />

        <div v-if="isCreditPaymentMethodId(singleMethod)" class="mt-3 flex flex-col gap-2">
          <p v-if="!needsCustomerInfoForCredit" class="text-xs text-slate-500">
            Cliente: {{ sale.customer_name || sale.customer_phone || customerName || customerPhone }}
          </p>
          <template v-else>
            <p class="text-xs text-red-600">
              Un fiado necesita al menos un dato del cliente (nombre o teléfono).
            </p>
            <NxInput v-model="customerName" placeholder="Nombre del cliente" size="sm" />
            <NxInput v-model="customerPhone" placeholder="Teléfono" size="sm" />
          </template>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-1" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-1" :disabled="!canClose" :loading="submitting" @click="submitClose">Cobrar</NxButton>
      </div>
    </template>
  </NxModal>
</template>
