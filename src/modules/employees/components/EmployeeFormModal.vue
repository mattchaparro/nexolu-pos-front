<script setup lang="ts">
// Crear/editar un usuario del negocio (empleado o admin adicional) - mismo
// patron modal que ClientFormModal/DiscountFormModal. La contraseña es
// obligatoria al crear (se envia por correo, ver NewUserCredentialsMail) y
// opcional al editar (dejarla vacía la conserva).
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { Employee, EmployeeRole } from '@/types/employee'
import { NxButton, NxInput, NxModal, NxSelect } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'

import { useEmployeeMutations } from '../composables/useEmployeeMutations'

const props = defineProps<{
  modelValue: boolean
  employee: Employee | null
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { createMutation, updateMutation } = useEmployeeMutations()
const { notify } = useSystemAlert()

const ROLE_OPTIONS: { label: string; value: EmployeeRole }[] = [
  { label: 'Empleado', value: 'employee' },
  { label: 'Administrador', value: 'admin' },
]

const name = ref('')
const email = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const role = ref<EmployeeRole>('employee')
const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)

function resetForm(): void {
  name.value = props.employee?.name ?? ''
  email.value = props.employee?.email ?? ''
  password.value = ''
  passwordConfirmation.value = ''
  role.value = props.employee?.role ?? 'employee'
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

const isEdit = computed(() => props.employee !== null)
const isSaving = computed(() => createMutation.isPending.value || updateMutation.isPending.value)
const modalTitle = computed(() => (isEdit.value ? 'Editar usuario' : 'Nuevo usuario'))

async function submit(): Promise<void> {
  fieldErrors.value = {}
  formError.value = null

  if (!name.value.trim()) {
    fieldErrors.value.name = 'El nombre es obligatorio.'
    return
  }
  if (!email.value.trim()) {
    fieldErrors.value.email = 'El correo es obligatorio.'
    return
  }
  if (!isEdit.value && password.value.length < 8) {
    fieldErrors.value.password = 'La contraseña debe tener al menos 8 caracteres.'
    return
  }
  if (password.value && password.value !== passwordConfirmation.value) {
    fieldErrors.value.password = 'Las contraseñas no coinciden.'
    return
  }

  try {
    if (props.employee) {
      await updateMutation.mutateAsync({
        id: props.employee.id,
        payload: {
          name: name.value.trim(),
          email: email.value.trim(),
          role: role.value,
          ...(password.value ? { password: password.value, password_confirmation: passwordConfirmation.value } : {}),
        },
      })
      notify('Usuario actualizado')
    } else {
      await createMutation.mutateAsync({
        name: name.value.trim(),
        email: email.value.trim(),
        password: password.value,
        password_confirmation: passwordConfirmation.value,
        role: role.value,
      })
      notify('Usuario creado. Le enviamos sus credenciales por correo.')
    }
    emit('update:modelValue', false)
  } catch (error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) {
      fieldErrors.value = fields
    } else {
      formError.value = extractErrorMessage(error, 'No pudimos guardar el usuario.')
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
      <NxInput v-model="email" label="Correo" type="email" required :error="fieldErrors.email" />

      <NxSelect
        v-if="!employee?.is_business_owner"
        v-model="role"
        label="Rol"
        :options="ROLE_OPTIONS"
        option-label="label"
        option-value="value"
      />

      <NxInput
        v-model="password"
        :label="isEdit ? 'Nueva contraseña (opcional)' : 'Contraseña'"
        type="password"
        :required="!isEdit"
        :error="fieldErrors.password"
      />
      <NxInput
        v-if="password"
        v-model="passwordConfirmation"
        label="Confirmar contraseña"
        type="password"
      />
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-1" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-1" :loading="isSaving" @click="submit">Guardar</NxButton>
      </div>
    </template>
  </NxModal>
</template>
