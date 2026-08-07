<script setup lang="ts">
// Modal de cobro UNICO para venta directa y cuentas abiertas - antes venta
// directa resolvia el pago inline en el carrito + un modal chiquito aparte
// solo para efectivo (sin pago dividido), y cuentas abiertas tenia su
// propio modal con cortesia/cargos/pago dividido/abonos pero sin vuelto en
// efectivo. Dos experiencias distintas para la misma accion ("cobrar") no
// se justificaban - ver la charla sobre unificar la experiencia de pago.
//
// sale=null significa venta directa (la Sale todavia no existe): el monto
// base para cargos y el domicilio vienen de fallbackChargeBase/
// fallbackDeliveryFee en vez de derivarse de una Sale ya persistida. Los
// abonos parciales no aplican a una venta directa (se cobra completa en el
// momento), asi que esa seccion solo aparece si sale no es null.
import { computed, ref, watch } from 'vue'

import type { Business } from '@/types/business'
import type { Sale } from '@/types/sale'
import { NxButton, NxInput, NxInputNumber, NxModal } from '@/ui'
import { formatCop } from '@/utils/formatCop'
import { isCashPaymentMethodId, isCreditPaymentMethodId } from '@/utils/paymentMethod'

import type { CloseOpenTabPayload, PaymentSplitInput, RecordPartialPaymentPayload } from '../../open-tabs/types'
import { round2 } from '../support/saleMath'
import PaymentMethodPicker from './PaymentMethodPicker.vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    business: Business
    submitting: boolean
    sale: Sale | null
    fallbackChargeBase?: number
    fallbackDeliveryFee?: number
    existingCustomerName?: string | null
    existingCustomerPhone?: string | null
    title?: string
  }>(),
  {
    fallbackChargeBase: 0,
    fallbackDeliveryFee: 0,
    existingCustomerName: null,
    existingCustomerPhone: null,
    title: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [payload: CloseOpenTabPayload]
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
const partialAmount = ref<number | null>(null)
const partialMethod = ref<string | null>(null)
const partialLabel = ref('')
const receivedInput = ref<number | null>(null)

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
  partialAmount.value = null
  partialMethod.value = defaultSplitMethodId.value
  partialLabel.value = ''
  receivedInput.value = null
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      resetForm()
    }
  },
)

const allowPartial = computed(() => props.sale !== null)
const hasPartialPayments = computed(() => (props.sale?.partial_payments?.length ?? 0) > 0)
const amountPaid = computed(() => {
  if (props.sale?.amount_paid !== null && props.sale?.amount_paid !== undefined) {
    return Number(props.sale.amount_paid)
  }
  return props.sale?.partial_payments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0
})

// Number(): sale.total/delivery_fee llegan como string desde el backend
// (cast decimal:2 de Laravel se serializa como string en JSON).
const chargeBase = computed(() =>
  props.sale
    ? Math.max(0, Number(props.sale.total) - Number(props.sale.delivery_fee))
    : props.fallbackChargeBase,
)
const grandBase = computed(() => (props.sale ? Number(props.sale.total) : props.fallbackChargeBase + props.fallbackDeliveryFee))

const balanceBeforeCharges = computed(() => {
  if (props.sale?.balance_due !== null && props.sale?.balance_due !== undefined) {
    return round2(Number(props.sale.balance_due))
  }
  return round2(grandBase.value - amountPaid.value)
})

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

// Vuelto: solo tiene sentido con un unico medio en efectivo, ni en pago
// dividido ni en cortesia.
const isSingleCash = computed(
  () => !isCourtesy.value && !useSplit.value && isCashPaymentMethodId(singleMethod.value),
)
const received = computed(() => receivedInput.value ?? 0)
const change = computed(() => received.value - amountDue.value)

function fillExactAmount(): void {
  receivedInput.value = Math.round(amountDue.value)
}

const needsCustomerInfoForCredit = computed(() => {
  if (isCourtesy.value || useSplit.value) {
    return false
  }
  if (!isCreditPaymentMethodId(singleMethod.value)) {
    return false
  }
  return !props.existingCustomerName && !props.existingCustomerPhone && !customerName.value && !customerPhone.value
})

const canConfirm = computed(() => {
  if (isCourtesy.value) {
    return true
  }
  if (useSplit.value) {
    const validRows = splitRows.value.filter((r) => Number(r.amount) > 0.009)
    return validRows.length >= 2 && Math.abs(splitRemainder.value) < 0.02
  }
  if (!singleMethod.value || needsCustomerInfoForCredit.value) {
    return false
  }
  return !isSingleCash.value || change.value >= -0.01
})

function submitConfirm(): void {
  if (!canConfirm.value) {
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

  emit('confirm', payload)
}

function submitPartial(): void {
  const amount = partialAmount.value ?? 0
  if (!(amount > 0) || amount > balanceBeforeCharges.value + 0.02 || !partialMethod.value) {
    return
  }
  emit('register-partial', {
    amount,
    payment_method: partialMethod.value,
    payer_label: partialLabel.value.trim() || undefined,
  })
  partialAmount.value = null
  partialLabel.value = ''
}

const modalTitle = computed(() => props.title ?? (props.sale ? 'Cobrar cuenta' : 'Cobrar venta'))
</script>

<template>
  <NxModal
    :model-value="modelValue"
    :title="modalTitle"
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-4">
      <div>
        <p v-if="amountPaid > 0" class="space-y-0.5 text-xs text-slate-500">
          Total cuenta: <strong class="text-slate-700">{{ formatCop(grandBase) }}</strong> · Ya pagado:
          <strong class="text-emerald-700">{{ formatCop(amountPaid) }}</strong>
        </p>
        <p class="text-2xl font-bold text-emerald-600">{{ formatCop(amountDue) }}</p>
        <p class="text-xs text-slate-400">{{ amountPaid > 0 ? 'Saldo a cobrar ahora' : 'Total a cobrar' }}</p>
      </div>

      <div
        v-if="sale?.partial_payments?.length"
        class="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-[11px] text-amber-900"
      >
        <p v-for="p in sale.partial_payments" :key="p.id">
          {{ formatCop(p.amount) }} —
          {{ business.payment_methods.find((m) => m.id === p.payment_method)?.label ?? p.payment_method }}
          <span v-if="p.payer_label" class="text-amber-700">· {{ p.payer_label }}</span>
        </p>
      </div>

      <div v-if="allowPartial && amountDue > 0.02" class="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
        <p class="mb-2 text-xs font-semibold text-amber-800">Registrar abono parcial</p>
        <div class="flex flex-wrap items-end gap-2">
          <NxInputNumber v-model="partialAmount" label="Monto" size="sm" class="w-32" />
          <select
            v-model="partialMethod"
            class="min-w-[110px] rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-xs"
          >
            <option v-for="m in splitMethods" :key="m.id" :value="m.id">{{ m.label }}</option>
          </select>
          <NxInput v-model="partialLabel" label="Quién paga (opc.)" size="sm" class="min-w-[120px] flex-1" />
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
        label="Motivo (opcional)"
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
          <NxInputNumber
            :model-value="row.amount"
            label="Monto"
            size="sm"
            class="w-32"
            :min="0"
            @update:model-value="row.amount = $event ?? 0"
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
            Cliente: {{ existingCustomerName || existingCustomerPhone || customerName || customerPhone }}
          </p>
          <template v-else>
            <p class="text-xs text-red-600">
              Un fiado necesita al menos un dato del cliente (nombre o teléfono).
            </p>
            <NxInput v-model="customerName" label="Nombre del cliente" size="sm" />
            <NxInput v-model="customerPhone" label="Teléfono" size="sm" />
          </template>
        </div>

        <div v-if="isSingleCash" class="mt-3 flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div class="flex items-end gap-2">
            <NxInputNumber v-model="receivedInput" label="Monto recibido" size="sm" class="flex-1" />
            <button type="button" class="pb-2 text-xs font-medium text-indigo-600 hover:text-indigo-700" @click="fillExactAmount">
              Monto exacto
            </button>
          </div>
          <p
            class="rounded-lg px-3 py-1.5 text-center text-sm font-semibold"
            :class="change >= -0.01 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'"
          >
            {{ change >= -0.01 ? `Vueltas: ${formatCop(change)}` : `Falta ${formatCop(-change)}` }}
          </p>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-1" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-1" :disabled="!canConfirm" :loading="submitting" @click="submitConfirm">Cobrar</NxButton>
      </div>
    </template>
  </NxModal>
</template>
