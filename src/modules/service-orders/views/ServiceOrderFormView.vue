<script setup lang="ts">
// Nueva/editar orden de servicio - puerto de Admin/ServiceOrders/Create.vue
// y Edit.vue del legacy, unificados en una sola vista (mismos campos,
// salvo el abono inicial que solo aplica al crear). Dos modos mutuamente
// excluyentes para el monto: total plano, o desglose por items - igual
// que exige StoreServiceOrderRequest (uno de los dos es obligatorio).
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useBusiness } from '@/composables/useBusiness'
import { useServiceOptions } from '@/composables/useServiceOptions'
import { useStaffOptions } from '@/composables/useStaffOptions'
import { useSystemAlert } from '@/composables/useSystemAlert'
import type { ServiceOrderItemInput, ServiceOrderPayload } from '@/types/serviceOrder'
import { NxButton, NxInput, NxInputNumber, NxPageHeader, NxSelect, NxTextarea, NxToggleButton } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'
import { formatCop } from '@/utils/formatCop'
import { isCreditPaymentMethodId } from '@/utils/paymentMethod'

import PaymentMethodPicker from '@/components/PaymentMethodPicker.vue'
import ClientPicker from '@/modules/clients/components/ClientPicker.vue'
import ServiceOrderItemsEditor from '../components/ServiceOrderItemsEditor.vue'
import { useServiceOrder } from '../composables/useServiceOrder'
import { useServiceOrderMutations } from '../composables/useServiceOrderMutations'
import { newServiceOrderLineRow, type ServiceOrderLineRow } from '../support/serviceOrderLine'

const route = useRoute()
const router = useRouter()
const { notify } = useSystemAlert()
const { data: business } = useBusiness()

const orderId = computed(() => (route.params.id ? Number(route.params.id) : null))
const isEdit = computed(() => orderId.value !== null)
const orderQuery = useServiceOrder(orderId)

const servicesQuery = useServiceOptions()
const staffQuery = useStaffOptions()

const nonCreditPaymentMethods = computed(
  () => business.value?.payment_methods.filter((m) => !isCreditPaymentMethodId(m.id)) ?? [],
)

const clientId = ref<number | null>(null)
const productId = ref<number | null>(null)
const serviceName = ref('')
const notes = ref('')
const itemized = ref(false)
const flatTotal = ref<number | null>(null)
const lines = ref<ServiceOrderLineRow[]>([newServiceOrderLineRow()])

const registerInitialPayment = ref(false)
const initialPayment = ref<number | null>(null)
const initialPaymentMethod = ref<string | null>(null)

watch(
  () => orderQuery.data.value,
  (order) => {
    if (!order) {
      return
    }
    clientId.value = order.client?.id ?? null
    productId.value = order.product_id
    serviceName.value = order.service_name
    notes.value = order.notes ?? ''
    itemized.value = order.items.length > 0
    flatTotal.value = order.items.length === 0 ? Number(order.total) : null
    lines.value = order.items.length
      ? order.items.map((item) => ({
          uid: crypto.randomUUID(),
          name: item.name,
          // ServiceOrderItem.quantity/unit_price son decimal:2 en el
          // backend (llegan como string "1.00") - Number() para que
          // NxInputNumber reciba un numero real, no un string numerico.
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          user_id: item.user_id,
          notes: item.notes ?? '',
        }))
      : [newServiceOrderLineRow()]
  },
  { immediate: true },
)

function applyMainService(id: number | null): void {
  productId.value = id
  const service = servicesQuery.data.value?.find((s) => s.id === id)
  if (!service) {
    return
  }
  if (!serviceName.value.trim()) {
    serviceName.value = service.name
  }
  if (!itemized.value && !service.price_varies_at_sale) {
    flatTotal.value = Number(service.price)
  }
}

const total = computed(() =>
  itemized.value
    ? lines.value.reduce((sum, row) => sum + (Number(row.unit_price) || 0) * row.quantity, 0)
    : Number(flatTotal.value) || 0,
)

const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)
const { createMutation, updateMutation } = useServiceOrderMutations()
const isSaving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)

async function submit(): Promise<void> {
  fieldErrors.value = {}
  formError.value = null

  const items: ServiceOrderItemInput[] | undefined = itemized.value
    ? lines.value.map((row) => ({
        name: row.name.trim(),
        quantity: row.quantity,
        unit_price: Number(row.unit_price) || 0,
        user_id: row.user_id,
        notes: row.notes.trim() || null,
      }))
    : undefined

  const payload: ServiceOrderPayload = {
    client_id: clientId.value,
    product_id: productId.value,
    service_name: serviceName.value.trim(),
    notes: notes.value.trim() || null,
    ...(itemized.value ? { items } : { total: flatTotal.value }),
    ...(!isEdit.value && registerInitialPayment.value && initialPayment.value
      ? { initial_payment: initialPayment.value, initial_payment_method: initialPaymentMethod.value }
      : {}),
  }

  try {
    if (isEdit.value && orderId.value) {
      await updateMutation.mutateAsync({ id: orderId.value, payload })
      notify('Orden actualizada')
      router.push({ name: 'service-orders.show', params: { id: orderId.value } })
    } else {
      const order = await createMutation.mutateAsync(payload)
      notify('Orden registrada')
      router.push({ name: 'service-orders.show', params: { id: order.id } })
    }
  } catch (error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) {
      fieldErrors.value = fields
    } else {
      formError.value = extractErrorMessage(error, 'No pudimos guardar la orden.')
    }
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <div class="flex items-center gap-2">
      <button type="button" class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" @click="router.back()">
        <i class="pi pi-arrow-left" />
      </button>
      <NxPageHeader :title="isEdit ? 'Editar orden' : 'Nueva orden de servicio'" icon="pi pi-wrench" compact />
    </div>

    <p v-if="formError" class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{{ formError }}</p>

    <template v-if="isEdit && orderQuery.isPending.value">
      <div class="h-64 animate-pulse rounded-xl bg-slate-100" />
    </template>

    <div v-else class="flex flex-col gap-4">
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="mb-3 text-sm font-semibold text-slate-700">Datos de la orden</p>
        <div class="flex flex-col gap-3">
          <ClientPicker v-model="clientId" :error="fieldErrors.client_id" />
          <NxSelect
            v-if="(servicesQuery.data.value?.length ?? 0) > 0"
            :model-value="productId"
            :options="servicesQuery.data.value ?? []"
            option-label="name"
            option-value="id"
            label="Servicio del catálogo (opcional)"
            filter
            @update:model-value="applyMainService($event as number | null)"
          />
          <NxInput v-model="serviceName" label="Nombre de la orden" required :error="fieldErrors.service_name" />
          <NxTextarea v-model="notes" label="Notas (opcional)" :rows="2" />
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <NxToggleButton v-model="itemized" label="Desglosar en ítems" icon="pi pi-list" />

        <div v-if="!itemized" class="mt-3">
          <NxInputNumber v-model="flatTotal" label="Total de la orden" :min="0" required :error="fieldErrors.total" />
        </div>
        <div v-else class="mt-3">
          <ServiceOrderItemsEditor
            v-model="lines"
            :services="servicesQuery.data.value ?? []"
            :staff="staffQuery.data.value ?? []"
            :errors="fieldErrors"
          />
          <p v-if="fieldErrors.items" class="mt-2 text-xs text-red-600">{{ fieldErrors.items }}</p>
        </div>
      </div>

      <div v-if="!isEdit" class="flex flex-col gap-2">
        <NxToggleButton v-model="registerInitialPayment" label="Registrar abono inicial" icon="pi pi-wallet" />

        <div v-if="registerInitialPayment" class="flex flex-col gap-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
          <NxInputNumber v-model="initialPayment" label="Monto del abono" :min="0" />
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

      <p class="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
        Total: <strong class="text-slate-900">{{ formatCop(total) }}</strong>
      </p>
    </div>

    <NxButton :loading="isSaving" @click="submit">{{ isEdit ? 'Guardar cambios' : 'Guardar orden' }}</NxButton>
  </div>
</template>
