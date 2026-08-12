<script setup lang="ts">
// Crear/editar una etapa del workflow - label, color, si es la inicial, y
// sus acciones especiales (mark_order_paid / trigger_on_payment_complete,
// ver ServiceOrder::applyPaymentCompleteStage() del lado del backend).
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { ServiceWorkflowActionType, SuperAdminServiceWorkflowStage } from '@/types/superadmin/serviceWorkflow'
import { NxButton, NxInput, NxModal, NxToggleButton } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'

import { useServiceWorkflowMutations } from '../composables/useServiceWorkflowMutations'

const props = defineProps<{
  modelValue: boolean
  workflowId: number
  stage: SuperAdminServiceWorkflowStage | null
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { createStageMutation, updateStageMutation } = useServiceWorkflowMutations()
const { notify } = useSystemAlert()

const label = ref('')
const color = ref('#6b7280')
const isInitial = ref(false)
const markOrderPaid = ref(false)
const triggerOnPaymentComplete = ref(false)
const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)

function resetForm(): void {
  label.value = props.stage?.label ?? ''
  color.value = props.stage?.color ?? '#6b7280'
  isInitial.value = props.stage?.is_initial ?? false
  const actions = props.stage?.actions ?? []
  markOrderPaid.value = actions.some((a) => a.type === 'mark_order_paid')
  triggerOnPaymentComplete.value = actions.some((a) => a.type === 'trigger_on_payment_complete')
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

const isEdit = computed(() => props.stage !== null)
const isSaving = computed(() => createStageMutation.isPending.value || updateStageMutation.isPending.value)
const modalTitle = computed(() => (isEdit.value ? 'Editar etapa' : 'Nueva etapa'))

async function submit(): Promise<void> {
  fieldErrors.value = {}
  formError.value = null

  if (!label.value.trim()) {
    fieldErrors.value.label = 'La etiqueta es obligatoria.'
    return
  }

  const actions: { type: ServiceWorkflowActionType }[] = []
  if (markOrderPaid.value) {
    actions.push({ type: 'mark_order_paid' })
  }
  if (triggerOnPaymentComplete.value) {
    actions.push({ type: 'trigger_on_payment_complete' })
  }

  const payload = { label: label.value.trim(), color: color.value, is_initial: isInitial.value, actions }

  try {
    if (props.stage) {
      await updateStageMutation.mutateAsync({ workflowId: props.workflowId, stageId: props.stage.id, payload })
    } else {
      await createStageMutation.mutateAsync({ workflowId: props.workflowId, payload })
    }
    notify(isEdit.value ? 'Etapa actualizada' : 'Etapa creada')
    emit('update:modelValue', false)
  } catch (error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) {
      fieldErrors.value = fields
    } else {
      formError.value = extractErrorMessage(error, 'No pudimos guardar la etapa.')
    }
  }
}
</script>

<template>
  <NxModal :model-value="modelValue" :title="modalTitle" size="md" @update:model-value="emit('update:modelValue', $event)">
    <div class="flex flex-col gap-3">
      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>

      <NxInput v-model="label" label="Etiqueta" required :error="fieldErrors.label" />

      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-slate-500">Color</label>
        <div class="flex items-center gap-2">
          <input v-model="color" type="color" class="h-9 w-12 cursor-pointer rounded border border-slate-200" />
          <NxInput v-model="color" class="flex-1" :error="fieldErrors.color" />
        </div>
      </div>

      <NxToggleButton v-model="isInitial" label="Etapa inicial" icon="pi pi-flag" />

      <div class="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
        <p class="text-xs font-semibold text-slate-500">Acciones automáticas</p>
        <NxToggleButton v-model="markOrderPaid" label="Marcar orden como pagada al entrar aquí" icon="pi pi-check-circle" />
        <NxToggleButton
          v-model="triggerOnPaymentComplete"
          label="Mover aquí cuando la orden quede pagada"
          icon="pi pi-arrow-right-arrow-left"
        />
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
