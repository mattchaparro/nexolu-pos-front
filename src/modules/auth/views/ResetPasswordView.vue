<script setup lang="ts">
// El enlace del correo (ResetPasswordMail en el backend) trae token/email
// por query string - se leen una sola vez al montar, no reactivamente
// (el usuario no navega a esta pantalla con la URL cambiando debajo).
import { isAxiosError } from 'axios'
import { useForm } from 'vee-validate'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { z } from 'zod'

import { useFlashStore } from '@/stores/flash.store'
import { useAuthStore } from '@/stores/auth.store'
import { NxButton, NxInput } from '@/ui'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const flashStore = useFlashStore()

const token = typeof route.query.token === 'string' ? route.query.token : ''
const email = typeof route.query.email === 'string' ? route.query.email : ''
const linkIsValid = token !== '' && email !== ''

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    password_confirmation: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Las contraseñas no coinciden',
    path: ['password_confirmation'],
  })

const { handleSubmit, defineField, errors, setErrors } = useForm({
  initialValues: { password: '', password_confirmation: '' },
})

const [password, passwordAttrs] = defineField('password')
const [passwordConfirmation, passwordConfirmationAttrs] = defineField('password_confirmation')

const submitError = ref<string | null>(null)
const isSubmitting = ref(false)

const onSubmit = handleSubmit(async (values) => {
  const result = resetPasswordSchema.safeParse(values)
  // Sin validationSchema, vee-validate no revalida solo al tipear (ver
  // CLAUDE.md) - sin este clear, un error de un intento anterior se queda
  // pegado en pantalla aunque el campo ya sea valido.
  setErrors({ password: undefined, password_confirmation: undefined })
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors
    setErrors({
      password: fieldErrors.password?.[0],
      password_confirmation: fieldErrors.password_confirmation?.[0],
    })
    return
  }

  submitError.value = null
  isSubmitting.value = true
  try {
    await authStore.resetPassword({
      token,
      email,
      password: result.data.password,
      password_confirmation: result.data.password_confirmation,
    })
    flashStore.set('Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión.', 'success')
    await router.push({ name: 'login' })
  } catch (error) {
    submitError.value =
      isAxiosError<{ message?: string; errors?: Record<string, string[]> }>(error) &&
      (error.response?.data?.errors?.email?.[0] ?? error.response?.data?.message)
        ? (error.response?.data?.errors?.email?.[0] ?? error.response?.data?.message)!
        : 'No pudimos restablecer tu contraseña. Intenta de nuevo.'
  } finally {
    isSubmitting.value = false
  }
})
</script>

<template>
  <div>
    <div class="mb-8 text-center">
      <h1 class="text-3xl font-bold text-slate-900">Restablecer contraseña</h1>
      <p class="mt-2 text-slate-500">Elige tu nueva contraseña</p>
    </div>

    <p v-if="!linkIsValid" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      Este enlace no es válido. Solicita uno nuevo desde "¿Olvidaste tu contraseña?".
    </p>

    <form v-else class="space-y-5" novalidate @submit.prevent="onSubmit">
      <p v-if="submitError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ submitError }}
      </p>

      <NxInput
        id="password"
        v-model="password"
        v-bind="passwordAttrs"
        type="password"
        label="Nueva contraseña"
        autocomplete="new-password"
        :error="errors.password"
      />

      <NxInput
        id="password_confirmation"
        v-model="passwordConfirmation"
        v-bind="passwordConfirmationAttrs"
        type="password"
        label="Confirmar contraseña"
        autocomplete="new-password"
        :error="errors.password_confirmation"
      />

      <NxButton type="submit" class="w-full" :loading="isSubmitting">Restablecer contraseña</NxButton>
    </form>
  </div>
</template>
