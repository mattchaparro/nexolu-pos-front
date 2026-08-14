<script setup lang="ts">
// Crear/editar un medio de pago del catalogo. El 'key' solo se pide al
// crear (ver StorePosPaymentMethodRequest en el backend - no es editable
// despues, queda grabado en transacciones de negocios que lo usen).
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { SuperAdminPosPaymentMethod } from '@/types/superadmin/posPaymentMethod'
import { NxButton, NxInput, NxInputNumber, NxModal, NxToggleButton } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'

import { usePosPaymentMethodMutations } from '../composables/usePosPaymentMethodMutations'

const props = defineProps<{
  modelValue: boolean
  method: SuperAdminPosPaymentMethod | null
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { createMutation, updateMutation } = usePosPaymentMethodMutations()
const { notify } = useSystemAlert()

const key = ref('')
const label = ref('')
const isActive = ref(true)
const sortOrder = ref(0)
const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)

function resetForm(): void {
  key.value = props.method?.key ?? ''
  label.value = props.method?.label ?? ''
  isActive.value = props.method?.is_active ?? true
  sortOrder.value = props.method?.sort_order ?? 0
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

const isEdit = computed(() => props.method !== null)
const isSaving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)
const modalTitle = computed(() => (isEdit.value ? 'Editar medio de pago' : 'Nuevo medio de pago'))

async function submit(): Promise<void> {
  fieldErrors.value = {}
  formError.value = null

  if (!label.value.trim()) {
    fieldErrors.value.label = 'El nombre es obligatorio.'
    return
  }
  if (!isEdit.value && !key.value.trim()) {
    fieldErrors.value.key = 'El identificador es obligatorio.'
    return
  }

  try {
    if (isEdit.value && props.method) {
      await updateMutation.mutateAsync({
        id: props.method.id,
        payload: { label: label.value.trim(), is_active: isActive.value, sort_order: sortOrder.value },
      })
    } else {
      await createMutation.mutateAsync({
        key: key.value.trim(),
        label: label.value.trim(),
        is_active: isActive.value,
        sort_order: sortOrder.value,
      })
    }
    notify(isEdit.value ? 'Medio de pago actualizado' : 'Medio de pago creado')
    emit('update:modelValue', false)
  } catch (error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) {
      fieldErrors.value = fields
    } else {
      formError.value = extractErrorMessage(error, 'No pudimos guardar el medio de pago.')
    }
  }
}
</script>

<template>
  <NxModal :model-value="modelValue" :title="modalTitle" size="md" @update:model-value="emit('update:modelValue', $event)">
    <div class="flex flex-col gap-3">
      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>

      <NxInput
        v-if="!isEdit"
        v-model="key"
        label="Identificador (key)"
        placeholder="Ej. nequi"
        required
        :error="fieldErrors.key"
      />
      <p v-else class="text-xs text-slate-400">Identificador: <span class="font-mono">{{ method?.key }}</span> (no editable)</p>

      <NxInput v-model="label" label="Nombre visible" placeholder="Ej. Nequi" required :error="fieldErrors.label" />

      <div class="flex items-end gap-3">
        <NxToggleButton v-model="isActive" label="Activo" icon="pi pi-check" />
        <NxInputNumber v-model="sortOrder" label="Orden" :currency="false" />
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
