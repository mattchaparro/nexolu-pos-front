<script setup lang="ts">
// Nuevo apartado - puerto de Admin/Layaways/Create.vue del legacy. Sin
// pagina de edicion: un apartado ya creado reservo stock, se ajusta desde
// Show (cambiar productos / abonar / completar / cancelar), no reeditando
// el formulario de creacion.
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useBusiness } from '@/composables/useBusiness'
import { useSystemAlert } from '@/composables/useSystemAlert'
import ClientQuickAssociate from '@/modules/clients/components/ClientQuickAssociate.vue'
import type { LayawayItemInput, LayawayPayload } from '@/types/layaway'
import { NxButton, NxInput, NxInputNumber, NxPageHeader, NxTextarea, NxToggleButton } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'
import { formatCop } from '@/utils/formatCop'
import { isCreditPaymentMethodId } from '@/utils/paymentMethod'

import PaymentMethodPicker from '@/components/PaymentMethodPicker.vue'
import LayawayLinesEditor from '../components/LayawayLinesEditor.vue'
import { useLayawayMutations } from '../composables/useLayawayMutations'
import { useLayawayProductOptions } from '../composables/useLayawayProductOptions'
import { newLayawayLineRow, type LayawayLineRow } from '../support/layawayLine'

const router = useRouter()
const { notify } = useSystemAlert()
const { data: business } = useBusiness()
const productsQuery = useLayawayProductOptions()

const nonCreditPaymentMethods = computed(
  () => business.value?.payment_methods.filter((m) => !isCreditPaymentMethodId(m.id)) ?? [],
)

const customerName = ref('')
const customerPhone = ref('')
const notes = ref('')
const lines = ref<LayawayLineRow[]>([newLayawayLineRow()])

const registerInitialPayment = ref(false)
const initialPayment = ref<number | null>(null)
const initialPaymentMethod = ref<string | null>(null)

const total = computed(() =>
  lines.value.reduce((sum, row) => sum + (Number(row.unit_price) || 0) * row.quantity, 0),
)
const balancePreview = computed(() => Math.max(0, total.value - (registerInitialPayment.value ? Number(initialPayment.value) || 0 : 0)))

const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)
const { createMutation } = useLayawayMutations()
const isSaving = computed(() => createMutation.isPending.value)

async function submit(): Promise<void> {
  fieldErrors.value = {}
  formError.value = null

  const items: LayawayItemInput[] = lines.value.map((row) => ({
    product_id: row.product_id as number,
    quantity: row.quantity,
    unit_price: row.unit_price,
  }))

  const payload: LayawayPayload = {
    customer_name: customerName.value.trim() || null,
    customer_phone: customerPhone.value.trim() || null,
    notes: notes.value.trim() || null,
    items,
    ...(registerInitialPayment.value && initialPayment.value
      ? { initial_payment: initialPayment.value, initial_payment_method: initialPaymentMethod.value }
      : {}),
  }

  try {
    const layaway = await createMutation.mutateAsync(payload)
    notify('Apartado registrado')
    router.push({ name: 'layaways.show', params: { id: layaway.id } })
  } catch (error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) {
      fieldErrors.value = fields
    } else {
      formError.value = extractErrorMessage(error, 'No pudimos registrar el apartado.')
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
        @click="router.push({ name: 'layaways.index' })"
      >
        <i class="pi pi-arrow-left" />
      </button>
      <NxPageHeader title="Nuevo apartado" icon="pi pi-bookmark" compact />
    </div>

    <p v-if="formError" class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{{ formError }}</p>

    <div class="flex flex-col gap-4">
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="mb-3 text-sm font-semibold text-slate-700">Datos del cliente (opcional)</p>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <NxInput v-model="customerName" label="Nombre" :error="fieldErrors.customer_name" />
          <NxInput v-model="customerPhone" label="Teléfono" :error="fieldErrors.customer_phone" />
          <NxTextarea v-model="notes" label="Notas (opcional)" :rows="1" class="sm:col-span-2" />
        </div>
        <ClientQuickAssociate
          class="mt-3"
          :name="customerName"
          :phone="customerPhone"
          @apply="
            (client) => {
              customerName = client.name
              customerPhone = client.phone ?? ''
            }
          "
        />
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="mb-3 text-sm font-semibold text-slate-700">Productos</p>
        <LayawayLinesEditor v-model="lines" :products="productsQuery.data.value ?? []" :errors="fieldErrors" />
        <p v-if="fieldErrors.items" class="mt-2 text-xs text-red-600">{{ fieldErrors.items }}</p>
      </div>

      <div class="flex flex-col gap-2">
        <NxToggleButton v-model="registerInitialPayment" label="Registrar abono inicial" icon="pi pi-wallet" />

        <div v-if="registerInitialPayment" class="flex flex-col gap-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
          <NxInputNumber v-model="initialPayment" label="Monto del abono" :min="0" :error="fieldErrors.initial_payment" />
          <div>
            <p class="mb-2 text-sm font-medium text-slate-700">Método de pago</p>
            <PaymentMethodPicker
              :methods="nonCreditPaymentMethods"
              :model-value="initialPaymentMethod"
              @update:model-value="initialPaymentMethod = $event"
            />
          </div>
        </div>
      </div>

      <div class="flex justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm">
        <span class="text-slate-500">Total: <strong class="text-slate-900">{{ formatCop(total) }}</strong></span>
        <span class="text-slate-500">Saldo estimado: <strong class="text-slate-900">{{ formatCop(balancePreview) }}</strong></span>
      </div>
    </div>

    <NxButton :loading="isSaving" @click="submit">Guardar apartado</NxButton>
  </div>
</template>
