<script setup lang="ts">
// Alta de un usuario para un negocio puntual, desde la pestaña "Equipo" de
// SuperAdmin - backend ya existente (SuperAdmin\UserController::store),
// hasta ahora sin frontend que lo consumiera.
import { ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import { NxButton, NxInput, NxModal, NxSelect } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'

import { useUserMutations } from '../composables/useUserMutations'

const props = defineProps<{
  modelValue: boolean
  businessId: number
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const roleOptions = [
  { value: 'admin', label: 'Administrador' },
  { value: 'employee', label: 'Empleado' },
]

const name = ref('')
const email = ref('')
const password = ref('')
const role = ref<'admin' | 'employee'>('employee')
const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)

function resetForm(): void {
  name.value = ''
  email.value = ''
  password.value = ''
  role.value = 'employee'
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

const { createUserMutation } = useUserMutations()
const { notify } = useSystemAlert()

async function submit(): Promise<void> {
  fieldErrors.value = {}
  formError.value = null

  try {
    await createUserMutation.mutateAsync({
      name: name.value.trim(),
      email: email.value.trim(),
      password: password.value,
      business_id: props.businessId,
      role: role.value,
    })
    notify('Usuario creado.')
    emit('update:modelValue', false)
  } catch (error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) {
      fieldErrors.value = fields
    } else {
      formError.value = extractErrorMessage(error, 'No pudimos crear el usuario.')
    }
  }
}
</script>

<template>
  <NxModal :model-value="modelValue" title="Agregar usuario" size="md" @update:model-value="emit('update:modelValue', $event)">
    <div class="flex flex-col gap-3">
      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>

      <NxInput v-model="name" label="Nombre" required :error="fieldErrors.name" />
      <NxInput v-model="email" label="Correo" type="email" required :error="fieldErrors.email" />
      <NxInput v-model="password" label="Contraseña" type="password" required :error="fieldErrors.password" />
      <NxSelect v-model="role" label="Rol" :options="roleOptions" option-label="label" option-value="value" required :error="fieldErrors.role" />
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-1" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-1" :loading="createUserMutation.isPending.value" @click="submit">Crear</NxButton>
      </div>
    </template>
  </NxModal>
</template>
