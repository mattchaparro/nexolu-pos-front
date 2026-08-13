<script setup lang="ts">
// Acciones de suscripcion que el backend ya soporta (activate/extendTrial/
// setCustomPrice/changePlan en BusinessesController) pero que el panel
// SuperAdmin nuevo omitia a proposito - ver docs/MIGRATION_BACKLOG.md,
// seccion SuperAdmin. Un solo modal con selector de accion en vez de 4
// componentes: son 4 formularios muy chicos que no justifican 4 archivos.
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { SuperAdminBusiness } from '@/types/superadmin/business'
import { NxButton, NxInputNumber, NxModal, NxSelect, NxTextarea } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'
import { formatCop } from '@/utils/formatCop'

import { useBusinessMutations } from '../composables/useBusinessMutations'

const props = defineProps<{
  modelValue: boolean
  business: SuperAdminBusiness
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

type Mode = 'activate' | 'extend_trial' | 'custom_price' | 'change_plan'

const modes: Array<{ key: Mode; label: string; icon: string }> = [
  { key: 'activate', label: 'Activar pago', icon: 'pi pi-check-circle' },
  { key: 'extend_trial', label: 'Extender prueba', icon: 'pi pi-clock' },
  { key: 'custom_price', label: 'Precio personalizado', icon: 'pi pi-tag' },
  { key: 'change_plan', label: 'Cambiar plan', icon: 'pi pi-sync' },
]

const planOptions = [
  { value: 'basic', label: 'Básico' },
  { value: 'full', label: 'Full' },
]

const mode = ref<Mode>('activate')
const activateDays = ref<number | null>(30)
const activateAmountCop = ref<number | null>(null)
const activateNotes = ref('')
const extendTrialDays = ref<number | null>(15)
const customPriceCop = ref<number | null>(null)
const plan = ref('basic')
const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)

const { activateMutation, extendTrialMutation, setCustomPriceMutation, changePlanMutation } = useBusinessMutations()
// useToast() (detras de notify) usa inject(), que solo resuelve el
// PrimeVue Toast si se llama de forma sincronica durante setup() - pedirlo
// dentro de submit() (despues de un await) revienta con "No PrimeVue Toast
// provided!" aunque el guardado ya haya tenido exito en el backend, y ese
// error se confundia con un fallo real del PATCH. Ver misma correccion en
// SuperAdminBusinessShowView.vue.
const { notify } = useSystemAlert()

const isSaving = computed(
  () =>
    activateMutation.isPending.value ||
    extendTrialMutation.isPending.value ||
    setCustomPriceMutation.isPending.value ||
    changePlanMutation.isPending.value,
)

function resetForm(): void {
  mode.value = 'activate'
  activateDays.value = 30
  activateAmountCop.value = null
  activateNotes.value = ''
  extendTrialDays.value = 15
  customPriceCop.value = props.business.custom_price_cop
  plan.value = props.business.subscription_plan ?? 'basic'
  fieldErrors.value = {}
  formError.value = null
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      resetForm()
    }
  },
)

async function submit(): Promise<void> {
  fieldErrors.value = {}
  formError.value = null

  try {
    if (mode.value === 'activate') {
      if (!activateDays.value || activateDays.value < 1) {
        fieldErrors.value.days = 'Los días son obligatorios.'
        return
      }
      await activateMutation.mutateAsync({
        id: props.business.id,
        payload: {
          days: activateDays.value,
          amount_cop: activateAmountCop.value,
          notes: activateNotes.value.trim() || null,
        },
      })
    } else if (mode.value === 'extend_trial') {
      if (!extendTrialDays.value || extendTrialDays.value < 1) {
        fieldErrors.value.days = 'Los días son obligatorios.'
        return
      }
      await extendTrialMutation.mutateAsync({ id: props.business.id, days: extendTrialDays.value })
    } else if (mode.value === 'custom_price') {
      await setCustomPriceMutation.mutateAsync({ id: props.business.id, customPriceCop: customPriceCop.value })
    } else {
      await changePlanMutation.mutateAsync({ id: props.business.id, plan: plan.value })
    }

    notify('Cambios guardados.')
    emit('update:modelValue', false)
  } catch (error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) {
      fieldErrors.value = fields
    } else {
      formError.value = extractErrorMessage(error, 'No pudimos guardar el cambio.')
    }
  }
}
</script>

<template>
  <NxModal :model-value="modelValue" title="Suscripción" size="md" @update:model-value="emit('update:modelValue', $event)">
    <div class="flex flex-col gap-4">
      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>

      <div class="flex flex-wrap gap-2">
        <NxButton
          v-for="option in modes"
          :key="option.key"
          type="button"
          size="sm"
          :variant="mode === option.key ? 'primary' : 'outline'"
          :icon="option.icon"
          @click="mode = option.key"
        >
          {{ option.label }}
        </NxButton>
      </div>

      <div v-if="mode === 'activate'" class="flex flex-col gap-3">
        <p class="text-xs text-slate-500">
          Registra un pago manual y extiende <strong>paid_until</strong> del negocio {{ business.days_remaining }} días desde hoy (o desde
          la fecha actual de vencimiento, si sigue vigente).
        </p>
        <NxInputNumber v-model="activateDays" label="Días a activar" required :currency="false" :error="fieldErrors.days" />
        <NxInputNumber v-model="activateAmountCop" label="Monto cobrado (opcional)" />
        <NxTextarea v-model="activateNotes" label="Notas (opcional)" :rows="2" />
      </div>

      <div v-else-if="mode === 'extend_trial'" class="flex flex-col gap-3">
        <p class="text-xs text-slate-500">
          Prueba actual vence: <strong>{{ business.trial_ends_at ?? '—' }}</strong>
        </p>
        <NxInputNumber v-model="extendTrialDays" label="Días a extender" required :currency="false" :error="fieldErrors.days" />
      </div>

      <div v-else-if="mode === 'custom_price'" class="flex flex-col gap-3">
        <p class="text-xs text-slate-500">
          Precio actual: <strong>{{ business.custom_price_cop != null ? formatCop(business.custom_price_cop) : 'el del plan (sin precio especial)' }}</strong>
        </p>
        <NxInputNumber v-model="customPriceCop" label="Precio mensual especial" :error="fieldErrors.custom_price_cop" />
        <p class="text-xs text-slate-400">Deja el campo vacío para volver a usar el precio estándar del plan.</p>
      </div>

      <div v-else class="flex flex-col gap-3">
        <p class="text-xs text-slate-500">
          Plan actual: <strong>{{ business.subscription_plan ?? '—' }}</strong>. Al cambiar de plan, se fusionan los defaults del plan
          nuevo con los features ya personalizados de este negocio (no los pisa).
        </p>
        <NxSelect v-model="plan" label="Plan" :options="planOptions" option-label="label" option-value="value" :error="fieldErrors.plan" />
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-1" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-1" :loading="isSaving" @click="submit">Guardar</NxButton>
      </div>
    </template>
  </NxModal>
</template>
