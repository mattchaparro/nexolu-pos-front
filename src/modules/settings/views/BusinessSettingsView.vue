<script setup lang="ts">
// Puerto parcial de Admin/Settings/Index.vue del legacy - por ahora solo
// la seccion "Ordenes de servicio" (unica que un modulo migrado consume:
// ServiceOrderFormView.vue). El resto de secciones de legacy (info del
// negocio, redes, tickets, medios de pago, mesas, domicilios, cargos,
// inventario, apartados) ya tienen su propio lugar en este app o todavia
// no fueron migradas - se agregan a esta vista cuando haga falta, no de
// una sola vez.
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'

import { useBusiness } from '@/composables/useBusiness'
import { useSystemAlert } from '@/composables/useSystemAlert'
import { useUpdateBusinessMutation } from '@/composables/useUpdateBusinessMutation'
import { useAiMessagePackCheckout } from '@/modules/ai-message-packs/composables/useAiMessagePackCheckout'
import { useAiQuotaState } from '@/modules/ai-message-packs/composables/useAiQuotaState'
import { NxButton, NxCard, NxInput, NxPageHeader, NxToggleButton } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'
import { formatCop } from '@/utils/formatCop'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { data: business, isPending } = useBusiness()
const { notify } = useSystemAlert()

const canEdit = computed(() => auth.user?.is_business_owner === true || auth.user?.roles?.includes('admin') === true)

const quotaQuery = useAiQuotaState()
const quota = computed(() => quotaQuery.data.value ?? null)
const quotaUsedPercent = computed(() => {
  if (!quota.value || quota.value.applicable_quota <= 0) {
    return 0
  }
  return Math.min(100, Math.round((quota.value.consumed_this_month / quota.value.applicable_quota) * 100))
})

const packCheckout = useAiMessagePackCheckout()

async function buyPack(): Promise<void> {
  if (!auth.user || !quota.value) {
    return
  }
  await packCheckout.pay({ email: auth.user.email, fullName: auth.user.full_name }, quota.value.pack_balance)
}

onMounted(() => {
  // Fallback de navegacion (mobile): Wompi redirigio de vuelta con
  // ?wompi_pack_paid=1 en vez de solo devolver el resultado al callback del widget.
  if (route.query.wompi_pack_paid === '1') {
    packCheckout.resumePollingFromRedirect()
    router.replace({ query: {} })
  }
})

onUnmounted(() => packCheckout.stop())

const showCatalog = ref(true)
const defaultServiceName = ref('')

watch(
  business,
  (value) => {
    if (!value) {
      return
    }
    showCatalog.value = value.service_orders_show_catalog
    defaultServiceName.value = value.service_orders_default_service_name ?? ''
  },
  { immediate: true },
)

const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)
const { mutateAsync, isPending: isSaving } = useUpdateBusinessMutation()

async function submit(): Promise<void> {
  fieldErrors.value = {}
  formError.value = null

  try {
    await mutateAsync({
      service_orders_show_catalog: showCatalog.value,
      service_orders_default_service_name: defaultServiceName.value.trim() || null,
    })
    notify('Ajustes guardados')
  } catch (error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) {
      fieldErrors.value = fields
    } else {
      formError.value = extractErrorMessage(error, 'No pudimos guardar los ajustes.')
    }
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 pb-20 lg:pb-0">
    <NxPageHeader title="Ajustes" icon="pi pi-cog" compact />

    <p v-if="formError" class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{{ formError }}</p>

    <div v-if="isPending" class="h-48 animate-pulse rounded-xl bg-slate-100" />

    <template v-else>
      <NxCard v-if="business?.can_access_services">
        <p class="mb-1 text-sm font-semibold text-slate-700">Órdenes de servicio</p>
        <p class="mb-3 text-xs text-slate-500">Opciones para el formulario de creación de órdenes.</p>

        <div class="flex flex-col gap-4">
          <div>
            <NxToggleButton v-model="showCatalog" label="Mostrar catálogo de servicios" icon="pi pi-wrench" :disabled="!canEdit" />
            <p class="mt-1 text-xs text-slate-500">Permite seleccionar un servicio del catálogo al crear una orden.</p>
          </div>

          <div>
            <NxInput
              v-model="defaultServiceName"
              label="Nombre de servicio por defecto"
              placeholder="Ej. Servicio Técnico"
              :disabled="!canEdit"
              :error="fieldErrors.service_orders_default_service_name"
            />
            <p class="mt-1 text-xs text-slate-500">Se pre-llena en el campo nombre al crear una orden nueva.</p>
          </div>
        </div>
      </NxCard>

      <p v-if="!business?.can_access_services" class="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        Este negocio no tiene módulos con ajustes disponibles todavía.
      </p>

      <NxButton v-if="canEdit && business?.can_access_services" :loading="isSaving" @click="submit">Guardar cambios</NxButton>

      <!-- Cupo de mensajes del Asistente de IA -->
      <NxCard>
        <p class="mb-1 text-sm font-semibold text-slate-700">Asistente de IA</p>
        <p class="mb-3 text-xs text-slate-500">Cupo de mensajes incluido este mes y paquetes comprados.</p>

        <div v-if="quotaQuery.isPending.value" class="h-24 animate-pulse rounded-xl bg-slate-100" />

        <template v-else-if="quota">
          <div class="mb-3">
            <div class="mb-1 flex items-center justify-between text-xs text-slate-500">
              <span>Cupo mensual usado</span>
              <span>{{ quota.consumed_this_month }} / {{ quota.applicable_quota }}</span>
            </div>
            <div class="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                class="h-full rounded-full transition-all"
                :class="quotaUsedPercent >= 100 ? 'bg-red-500' : 'bg-indigo-500'"
                :style="{ width: quotaUsedPercent + '%' }"
              />
            </div>
          </div>

          <div class="mb-3 grid grid-cols-2 gap-3">
            <div class="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p class="mb-0.5 text-xs text-slate-500">Cupo mensual restante</p>
              <p class="text-lg font-bold" :class="quota.remaining_quota === 0 ? 'text-red-700' : 'text-slate-900'">
                {{ quota.remaining_quota }}
              </p>
            </div>
            <div class="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p class="mb-0.5 text-xs text-slate-500">Paquetes comprados</p>
              <p class="text-lg font-bold text-slate-900">{{ quota.pack_balance }}</p>
            </div>
          </div>

          <p
            v-if="quota.remaining_quota === 0 && quota.pack_balance === 0"
            class="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
          >
            Se agotó el cupo de mensajes de este mes.
            <span v-if="!quota.is_admin">Pídele al dueño del negocio que compre un paquete adicional.</span>
          </p>

          <div v-if="packCheckout.verifying.value" class="mb-3 flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
            <i class="pi pi-spin pi-spinner" />
            Verificando tu pago...
          </div>

          <div
            v-else-if="packCheckout.activated.value"
            class="mb-3 flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            <i class="pi pi-check-circle" />
            Paquete acreditado.
          </div>

          <div
            v-else-if="packCheckout.timedOut.value"
            class="mb-3 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
          >
            <i class="pi pi-clock mt-0.5" />
            <div>
              <p>Tu pago fue recibido pero la acreditación está tardando.</p>
              <NxButton size="sm" variant="outline" class="mt-2" @click="quotaQuery.refetch()">Verificar de nuevo</NxButton>
            </div>
          </div>

          <NxButton
            v-if="quota.is_admin && !packCheckout.verifying.value && !packCheckout.activated.value"
            size="sm"
            variant="outline"
            icon="pi pi-credit-card"
            :loading="packCheckout.paying.value"
            @click="buyPack"
          >
            {{
              packCheckout.paying.value
                ? 'Abriendo pasarela de pago...'
                : `Comprar paquete de ${quota.pack_size} mensajes (${formatCop(quota.pack_price_cop)})`
            }}
          </NxButton>

          <p v-if="packCheckout.error.value" class="mt-2 rounded-xl border border-red-200 bg-red-50 p-2 text-xs text-red-700">
            {{ packCheckout.error.value }}
          </p>
        </template>
      </NxCard>
    </template>
  </div>
</template>
