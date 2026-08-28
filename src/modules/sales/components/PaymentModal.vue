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
//
// Tabs para las formas de cobrar (mismo modelo de datos {method, amount,
// label} para "varios medios" y "cuentas divididas" - la unica diferencia
// es si se muestra el campo "quien paga" y el ayudante de repartir entre N
// personas, ver la nota en submitConfirm). "Abonar" (abono parcial) es una
// cuarta tab, al final, solo para cuentas abiertas (sale != null) - se usa
// poco comparado con las otras tres, por eso no vive suelta arriba de los
// tabs como antes. El domicilio NO vive aca a proposito: se decide al
// crear la venta/cuenta (carrito o alta de cuenta), nunca al cerrarla -
// moverlo aca solo para venta directa rompería esa simetría entre los dos
// flujos.
//
// receivableMode=true: tambien lo reusa el cobro de Fiados (antes tenia su
// propio CollectReceivableModal aparte) - misma experiencia de cobro que
// venta/cuenta abierta, con cortesia/cargos/pestañas extra ocultas por no
// aplicar al backend de Receivable (ver el comentario de la prop).
import { computed, ref, watch } from 'vue'

import PaymentMethodPicker from '@/components/PaymentMethodPicker.vue'
import ClientQuickAssociate from '@/modules/clients/components/ClientQuickAssociate.vue'
import type { Business } from '@/types/business'
import type { Sale } from '@/types/sale'
import {
  NxButton,
  NxInput,
  NxInputNumber,
  NxModal,
  NxSelect,
  NxTab,
  NxTabList,
  NxTabPanel,
  NxTabPanels,
  NxTabs,
  NxToggleButton,
} from '@/ui'
import { formatCop } from '@/utils/formatCop'
import { isCashPaymentMethodId, isCreditPaymentMethodId } from '@/utils/paymentMethod'

import type { CloseOpenTabPayload, PaymentSplitInput, RecordPartialPaymentPayload } from '../../open-tabs/types'
import { round2 } from '../support/saleMath'

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
    existingCustomerIdentification?: string | null
    title?: string
    // Cobro de un fiado (Receivable) - a diferencia de venta/cuenta
    // abierta, ese backend solo soporta un pago unico y completo (sin
    // payment_splits ni abonos parciales, ver ReceivableService::collect()),
    // y ademas no vuelve a aplicar cargos/cortesia (esos ya se resolvieron
    // cuando se creo la venta a credito original). Oculta cortesia, cargos
    // y las pestañas de Varios medios/Dividir/Abonar - solo "Pago unico",
    // sin la pestaña visible (no tiene sentido mostrar una sola opcion como
    // si hubiera para elegir), y excluye 'credit' del selector de medio
    // (no se puede pagar un fiado con otro fiado).
    receivableMode?: boolean
  }>(),
  {
    fallbackChargeBase: 0,
    fallbackDeliveryFee: 0,
    existingCustomerName: null,
    existingCustomerPhone: null,
    existingCustomerIdentification: null,
    title: undefined,
    receivableMode: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [payload: CloseOpenTabPayload]
  'register-partial': [payload: RecordPartialPaymentPayload]
}>()

type PaymentTab = 'single' | 'multi' | 'split' | 'partial'

const splitMethods = computed(() =>
  props.business.payment_methods.filter((m) => !isCreditPaymentMethodId(m.id)),
)
const defaultMethodId = computed(() => props.business.payment_methods[0]?.id ?? 'cash')
const defaultSplitMethodId = computed(() => splitMethods.value[0]?.id ?? 'cash')

const isCourtesy = ref(false)
const courtesyReason = ref('')
const applyServiceCharge = ref(true)
const applyIpoconsumo = ref(true)
const activeTab = ref<PaymentTab>('single')
const splitRows = ref<PaymentSplitInput[]>([])
const splitPeopleCount = ref<number | null>(2)
const singleMethod = ref<string | null>(null)
const customerName = ref('')
const customerPhone = ref('')
const customerIdentification = ref('')
const clientId = ref<number | null>(null)
const partialAmount = ref<number | null>(null)
const partialMethod = ref<string | null>(null)
const partialLabel = ref('')
const receivedInput = ref<number | null>(null)

function resetForm(): void {
  isCourtesy.value = false
  courtesyReason.value = ''
  applyServiceCharge.value = true
  applyIpoconsumo.value = true
  activeTab.value = 'single'
  splitRows.value = []
  splitPeopleCount.value = 2
  singleMethod.value = props.receivableMode ? defaultSplitMethodId.value : defaultMethodId.value
  customerName.value = ''
  customerPhone.value = ''
  customerIdentification.value = ''
  clientId.value = null
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
  // receivableMode: un fiado nunca vuelve a llevar cargos - esos ya se
  // resolvieron sobre la venta a credito original, ver el comentario de la
  // prop mas arriba.
  if (props.receivableMode || isCourtesy.value || !props.business.charges.service_charge_enabled || !applyServiceCharge.value) {
    return 0
  }
  return round2((chargeBase.value * props.business.charges.service_charge_rate) / 100)
})

const ipoconsumoAmount = computed(() => {
  if (props.receivableMode || isCourtesy.value || !props.business.charges.ipoconsumo_enabled || !applyIpoconsumo.value) {
    return 0
  }
  return round2((chargeBase.value * props.business.charges.ipoconsumo_rate) / 100)
})

const amountDue = computed(() =>
  round2(balanceBeforeCharges.value + serviceChargeAmount.value + ipoconsumoAmount.value),
)

const isSplitTab = computed(() => activeTab.value === 'multi' || activeTab.value === 'split')
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

watch(activeTab, (tab) => {
  if ((tab === 'multi' || tab === 'split') && splitRows.value.length < 2) {
    initSplitRows()
  }
})

function addSplitRow(): void {
  splitRows.value.push({ method: splitMethods.value[0]?.id ?? 'cash', amount: 0, label: null })
}

function removeSplitRow(index: number): void {
  splitRows.value.splice(index, 1)
}

/** Reparte amountDue en N filas iguales (la ultima ajusta el redondeo), una por persona. */
function divideAmongN(): void {
  const n = Math.max(1, Math.round(splitPeopleCount.value ?? 1))
  const per = round2(amountDue.value / n)
  let assigned = 0
  const rows: PaymentSplitInput[] = []
  for (let i = 0; i < n; i++) {
    const amount = i === n - 1 ? round2(amountDue.value - assigned) : per
    assigned = round2(assigned + amount)
    rows.push({ method: defaultSplitMethodId.value, amount, label: `Persona ${i + 1}` })
  }
  splitRows.value = rows
}

// Vuelto: solo tiene sentido con un unico medio en efectivo, ni en pago
// dividido ni en cortesia.
const isSingleCash = computed(
  () => !isCourtesy.value && activeTab.value === 'single' && isCashPaymentMethodId(singleMethod.value),
)
const received = computed(() => receivedInput.value ?? 0)
const change = computed(() => received.value - amountDue.value)

function fillExactAmount(): void {
  receivedInput.value = Math.round(amountDue.value)
}

// Si la venta/cuenta YA traia un cliente antes de abrir este modal
// (CustomerFieldsSection del carrito, o una cuenta abierta ya con
// cliente), no hace falta pedirlo de nuevo - se muestra como resumen en
// vez de campos editables. A diferencia de needsCustomerInfoForCredit,
// esto NUNCA depende de customerName/customerPhone (lo que se esta
// tipeando ACA): si dependiera, el campo se ocultaria apenas se escribe
// el primer caracter (el propio valor tipeado hacia que la condicion de
// "falta info" pasara a false a mitad de escritura, ver bug real
// 2026-08-20).
const hasExistingCustomerInfo = computed(() =>
  Boolean(props.existingCustomerName || props.existingCustomerPhone || props.existingCustomerIdentification),
)

const needsCustomerInfoForCredit = computed(() => {
  if (isCourtesy.value || isSplitTab.value) {
    return false
  }
  if (!isCreditPaymentMethodId(singleMethod.value)) {
    return false
  }
  return !props.existingCustomerName && !props.existingCustomerPhone && !customerName.value && !customerPhone.value
})

// En receivableMode se pide siempre (el medio nunca es credito, asi que
// needsCustomerInfoForCredit nunca aplicaria) - es la misma seccion de
// "completar datos del cliente" que en pago con fiado, pero disparada por
// estar cobrando un fiado en vez de por el medio elegido.
const showCustomerCapture = computed(() => props.receivableMode || isCreditPaymentMethodId(singleMethod.value))

const canConfirm = computed(() => {
  if (isCourtesy.value) {
    return true
  }
  if (isSplitTab.value) {
    const validRows = splitRows.value.filter((r) => Number(r.amount) > 0.009)
    return validRows.length >= 2 && Math.abs(splitRemainder.value) < 0.02
  }
  // El monto recibido es informativo (para calcular vueltas), no un
  // requisito para cobrar - el cajero puede confirmar sin haberlo tipeado.
  return Boolean(singleMethod.value) && !needsCustomerInfoForCredit.value
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

  if (!isCourtesy.value && isSplitTab.value) {
    payload.payment_splits = splitRows.value
      .filter((r) => Number(r.amount) > 0.009)
      .map((r) => ({ method: r.method, amount: Number(r.amount), label: r.label || undefined }))
  } else if (!isCourtesy.value) {
    payload.payment_method = singleMethod.value
    if (showCustomerCapture.value) {
      payload.customer_name = customerName.value || undefined
      payload.customer_phone = customerPhone.value || undefined
      if (props.receivableMode) {
        payload.customer_identification = customerIdentification.value || undefined
      }
      if (clientId.value) {
        payload.client_id = clientId.value
      }
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

const modalTitle = computed(
  () => props.title ?? (props.receivableMode ? 'Cobrar fiado' : props.sale ? 'Cobrar cuenta' : 'Cobrar venta'),
)

// Editar nombre/telefono a mano invalida el vinculo con el Client aplicado
// via ClientQuickAssociate - mismo criterio que useSaleCheckout.setCustomerName/
// setCustomerPhone (ver esa nota): un client_id que ya no corresponde al
// texto es peor que no guardar ninguno.
function setCustomerName(value: string): void {
  customerName.value = value
  clientId.value = null
}

function setCustomerPhone(value: string): void {
  customerPhone.value = value
  clientId.value = null
}

function applyClient(client: { id: number; name: string; phone: string | null }): void {
  customerName.value = client.name
  customerPhone.value = client.phone ?? ''
  clientId.value = client.id
}
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
        <p class="text-2xl font-bold text-indigo-700">{{ formatCop(amountDue) }}</p>
        <p class="text-xs text-slate-400">{{ amountPaid > 0 ? 'Saldo a cobrar ahora' : 'Total a cobrar' }}</p>
      </div>

      <div v-if="!receivableMode">
        <NxToggleButton
          v-model="isCourtesy"
          label="Cerrar como cortesía"
          icon="pi pi-gift"
          :disabled="hasPartialPayments"
        />
        <p v-if="hasPartialPayments" class="mt-1 text-[11px] text-amber-700">
          No aplica cortesía con abonos registrados.
        </p>
      </div>
      <NxInput
        v-if="isCourtesy"
        v-model="courtesyReason"
        label="Motivo (opcional)"
      />

      <div
        v-if="!receivableMode && !isCourtesy && (business.charges.service_charge_enabled || business.charges.ipoconsumo_enabled)"
        class="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
      >
        <label
          v-if="business.charges.service_charge_enabled"
          class="flex items-center justify-between text-sm text-slate-700"
        >
          <span class="flex items-center gap-2 font-medium">
            <input v-model="applyServiceCharge" type="checkbox" class="h-4 w-4 rounded accent-indigo-600" />
            Servicio ({{ business.charges.service_charge_rate }}%)
          </span>
          <span v-if="serviceChargeAmount > 0" class="font-semibold">+{{ formatCop(serviceChargeAmount) }}</span>
        </label>
        <label
          v-if="business.charges.ipoconsumo_enabled"
          class="flex items-center justify-between text-sm text-slate-700"
        >
          <span class="flex items-center gap-2 font-medium">
            <input v-model="applyIpoconsumo" type="checkbox" class="h-4 w-4 rounded accent-indigo-600" />
            Ipoconsumo ({{ business.charges.ipoconsumo_rate }}%)
          </span>
          <span v-if="ipoconsumoAmount > 0" class="font-semibold">+{{ formatCop(ipoconsumoAmount) }}</span>
        </label>
      </div>

      <NxTabs v-if="!isCourtesy" v-model:value="activeTab">
        <NxTabList v-if="!receivableMode">
          <NxTab value="single" icon="pi pi-wallet">Pago único</NxTab>
          <NxTab value="multi" icon="pi pi-credit-card">Varios medios</NxTab>
          <NxTab value="split" icon="pi pi-users">Dividir</NxTab>
          <NxTab v-if="allowPartial" value="partial" icon="pi pi-history">Abonar</NxTab>
        </NxTabList>
        <NxTabPanels>
          <NxTabPanel value="single">
            <PaymentMethodPicker
              :methods="receivableMode ? splitMethods : business.payment_methods"
              :model-value="singleMethod"
              @update:model-value="singleMethod = $event"
            />

            <div v-if="showCustomerCapture" class="mt-3 flex flex-col gap-2">
              <p v-if="hasExistingCustomerInfo" class="text-xs text-slate-500">
                Cliente: {{ existingCustomerName || existingCustomerPhone || existingCustomerIdentification }}
              </p>
              <template v-else>
                <p v-if="needsCustomerInfoForCredit" class="text-xs text-red-600">
                  Un fiado necesita al menos un dato del cliente (nombre o teléfono).
                </p>
                <p v-else-if="receivableMode" class="text-xs text-slate-400">
                  Esta cuenta se registró sin datos del cliente. Puedes completarlos ahora (opcional).
                </p>
                <NxInput :model-value="customerName" label="Nombre del cliente" size="sm" @update:model-value="setCustomerName" />
                <NxInput :model-value="customerPhone" label="Teléfono" size="sm" @update:model-value="setCustomerPhone" />
                <NxInput v-if="receivableMode" v-model="customerIdentification" label="Cédula" size="sm" />
                <ClientQuickAssociate v-if="!receivableMode" :name="customerName" :phone="customerPhone" @apply="applyClient" />
              </template>
            </div>

            <div v-if="isSingleCash" class="mt-3 flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div class="flex items-end gap-2">
                <NxInputNumber v-model="receivedInput" label="Monto recibido (opcional)" size="sm" class="flex-1" />
                <button type="button" class="pb-2 text-xs font-medium text-indigo-600 hover:text-indigo-700" @click="fillExactAmount">
                  Monto exacto
                </button>
              </div>
              <p
                v-if="receivedInput !== null"
                class="rounded-lg px-3 py-1.5 text-center text-sm font-semibold"
                :class="change >= -0.01 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'"
              >
                {{ change >= -0.01 ? `Vueltas: ${formatCop(change)}` : `Falta ${formatCop(-change)}` }}
              </p>
            </div>
          </NxTabPanel>

          <NxTabPanel v-if="!receivableMode" value="multi">
            <p class="text-xs text-slate-500">
              Saldo {{ formatCop(amountDue) }}. Diferencia:
              <span :class="Math.abs(splitRemainder) < 0.02 ? 'font-semibold text-emerald-600' : 'font-semibold text-red-600'">
                {{ formatCop(splitRemainder) }}
              </span>
            </p>
            <div class="mt-2 flex flex-col gap-2">
              <div v-for="(row, index) in splitRows" :key="index" class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                <NxSelect
                  :model-value="row.method"
                  :options="splitMethods"
                  option-label="label"
                  option-value="id"
                  label="Medio"
                  size="sm"
                  class="min-w-0 flex-1"
                  @update:model-value="row.method = $event as string"
                />
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
          </NxTabPanel>

          <NxTabPanel v-if="!receivableMode" value="split">
            <p class="text-xs text-slate-500">
              Saldo {{ formatCop(amountDue) }}. Diferencia:
              <span :class="Math.abs(splitRemainder) < 0.02 ? 'font-semibold text-emerald-600' : 'font-semibold text-red-600'">
                {{ formatCop(splitRemainder) }}
              </span>
            </p>
            <div class="mt-2 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
              <NxInputNumber v-model="splitPeopleCount" label="Personas" size="sm" class="w-24" :min="1" :currency="false" />
              <NxButton size="sm" variant="secondary" icon="pi pi-users" @click="divideAmongN">Dividir</NxButton>
            </div>
            <div class="mt-2 flex flex-col gap-2">
              <div v-for="(row, index) in splitRows" :key="index" class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                <NxSelect
                  :model-value="row.method"
                  :options="splitMethods"
                  option-label="label"
                  option-value="id"
                  label="Medio"
                  size="sm"
                  class="min-w-0 flex-1"
                  @update:model-value="row.method = $event as string"
                />
                <NxInputNumber
                  :model-value="row.amount"
                  label="Monto"
                  size="sm"
                  class="w-32"
                  :min="0"
                  @update:model-value="row.amount = $event ?? 0"
                />
                <NxInput
                  :model-value="row.label ?? ''"
                  label="Quién paga"
                  size="sm"
                  class="min-w-[110px] flex-1"
                  @update:model-value="row.label = $event"
                />
                <button type="button" class="shrink-0 text-slate-300 hover:text-red-500" @click="removeSplitRow(index)">
                  <i class="pi pi-times" />
                </button>
              </div>
              <button type="button" class="text-left text-xs font-semibold text-indigo-600 hover:text-indigo-800" @click="addSplitRow">
                + Agregar persona
              </button>
            </div>
          </NxTabPanel>

          <NxTabPanel v-if="allowPartial" value="partial">
            <div v-if="sale?.partial_payments?.length" class="flex flex-col gap-1 text-[11px] text-slate-600">
              <p v-for="p in sale.partial_payments" :key="p.id">
                {{ formatCop(p.amount) }} —
                {{ business.payment_method_labels[p.payment_method] ?? p.payment_method }}
                <span v-if="p.payer_label" class="text-slate-500">· {{ p.payer_label }}</span>
              </p>
            </div>
            <div v-if="amountDue > 0.02" class="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <NxInputNumber v-model="partialAmount" label="Monto" size="sm" class="w-32" />
              <NxSelect
                :model-value="partialMethod"
                :options="splitMethods"
                option-label="label"
                option-value="id"
                label="Medio"
                size="sm"
                class="min-w-[130px]"
                @update:model-value="partialMethod = $event as string"
              />
              <NxInput v-model="partialLabel" label="Quién paga (opc.)" size="sm" class="min-w-[120px] flex-1" />
              <NxButton size="sm" variant="secondary" @click="submitPartial">Registrar</NxButton>
            </div>
          </NxTabPanel>
        </NxTabPanels>
      </NxTabs>
    </div>

    <template #footer>
      <NxButton class="w-full" :disabled="!canConfirm" :loading="submitting" @click="submitConfirm">Cobrar</NxButton>
    </template>
  </NxModal>
</template>
