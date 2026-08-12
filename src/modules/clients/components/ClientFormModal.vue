<script setup lang="ts">
// Crear/editar cliente - mismo patron modal que SupplierFormModal (resetForm/
// watch-on-open/fieldErrors/formError/submit).
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { Client } from '@/types/client'
import { NxButton, NxInput, NxModal, NxTextarea } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'

import { useClientMutations } from '../composables/useClientMutations'

const props = defineProps<{
  modelValue: boolean
  client: Client | null
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { createMutation, updateMutation } = useClientMutations()
const { notify } = useSystemAlert()

const name = ref('')
const phone = ref('')
const email = ref('')
const notes = ref('')
const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)

function resetForm(): void {
  name.value = props.client?.name ?? ''
  phone.value = props.client?.phone ?? ''
  email.value = props.client?.email ?? ''
  notes.value = props.client?.notes ?? ''
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

const isEdit = computed(() => props.client !== null)
const isSaving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)
const modalTitle = computed(() => (isEdit.value ? 'Editar cliente' : 'Nuevo cliente'))

async function submit(): Promise<void> {
  fieldErrors.value = {}
  formError.value = null

  if (!name.value.trim()) {
    fieldErrors.value.name = 'El nombre es obligatorio.'
    return
  }

  const payload = {
    name: name.value.trim(),
    phone: phone.value.trim() || null,
    email: email.value.trim() || null,
    notes: notes.value.trim() || null,
  }

  try {
    if (props.client) {
      await updateMutation.mutateAsync({ id: props.client.id, payload })
      notify('Cliente actualizado')
    } else {
      await createMutation.mutateAsync(payload)
      notify('Cliente creado')
    }
    emit('update:modelValue', false)
  } catch (error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) {
      fieldErrors.value = fields
    } else {
      formError.value = extractErrorMessage(error, 'No pudimos guardar el cliente.')
    }
  }
}
</script>

<template>
  <NxModal
    :model-value="modelValue"
    :title="modalTitle"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-3">
      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>

      <NxInput v-model="name" label="Nombre" required :error="fieldErrors.name" />
      <NxInput v-model="phone" label="Teléfono (opcional)" :error="fieldErrors.phone" />
      <NxInput v-model="email" label="Correo (opcional)" type="email" :error="fieldErrors.email" />
      <NxTextarea v-model="notes" label="Notas (opcional)" :rows="2" />
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-1" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-1" :loading="isSaving" @click="submit">Guardar</NxButton>
      </div>
    </template>
  </NxModal>
</template>
