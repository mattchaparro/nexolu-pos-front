<script setup lang="ts">
// Crear/editar la plantilla de workflow (solo nombre/descripcion - las
// etapas se administran aparte, en el detalle). Mismo patron modal que
// SupplierFormModal (resetForm/watch-on-open/fieldErrors/formError/submit).
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { SuperAdminServiceWorkflow } from '@/types/superadmin/serviceWorkflow'
import { NxButton, NxInput, NxModal, NxTextarea } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'

import { useServiceWorkflowMutations } from '../composables/useServiceWorkflowMutations'

const props = defineProps<{
  modelValue: boolean
  workflow: SuperAdminServiceWorkflow | null
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean]; saved: [workflow: SuperAdminServiceWorkflow] }>()

const { createMutation, updateMutation } = useServiceWorkflowMutations()
const { notify } = useSystemAlert()

const name = ref('')
const description = ref('')
const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)

function resetForm(): void {
  name.value = props.workflow?.name ?? ''
  description.value = props.workflow?.description ?? ''
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

const isEdit = computed(() => props.workflow !== null)
const isSaving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)
const modalTitle = computed(() => (isEdit.value ? 'Editar workflow' : 'Nuevo workflow'))

async function submit(): Promise<void> {
  fieldErrors.value = {}
  formError.value = null

  if (!name.value.trim()) {
    fieldErrors.value.name = 'El nombre es obligatorio.'
    return
  }

  const payload = { name: name.value.trim(), description: description.value.trim() || null }

  try {
    const workflow = props.workflow
      ? await updateMutation.mutateAsync({ id: props.workflow.id, payload })
      : await createMutation.mutateAsync(payload)
    notify(isEdit.value ? 'Workflow actualizado' : 'Workflow creado')
    emit('saved', workflow)
    emit('update:modelValue', false)
  } catch (error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) {
      fieldErrors.value = fields
    } else {
      formError.value = extractErrorMessage(error, 'No pudimos guardar el workflow.')
    }
  }
}
</script>

<template>
  <NxModal :model-value="modelValue" :title="modalTitle" size="md" @update:model-value="emit('update:modelValue', $event)">
    <div class="flex flex-col gap-3">
      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>

      <NxInput v-model="name" label="Nombre" required :error="fieldErrors.name" />
      <NxTextarea v-model="description" label="Descripción (opcional)" :rows="2" />
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-1" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-1" :loading="isSaving" @click="submit">Guardar</NxButton>
      </div>
    </template>
  </NxModal>
</template>
