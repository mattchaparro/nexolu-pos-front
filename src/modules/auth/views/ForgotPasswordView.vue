<script setup lang="ts">
// Pide el correo y dispara AuthController::forgotPassword - el backend
// responde siempre el mismo mensaje generico (exista o no ese correo, ver
// comentario en AuthController), asi que esta vista no distingue "correo
// no encontrado" de "listo, revisa tu bandeja": solo muestra el mensaje que
// vino del backend.
import { isAxiosError } from 'axios'
import { useForm } from 'vee-validate'
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { z } from 'zod'

import { useAuthStore } from '@/stores/auth.store'
import { NxButton, NxInput } from '@/ui'

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'El correo es obligatorio').email('Ingresa un correo válido'),
})

const { handleSubmit, defineField, errors, setErrors } = useForm({
  initialValues: { email: '' },
})

const [email, emailAttrs] = defineField('email')

const authStore = useAuthStore()
const submitError = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const isSubmitting = ref(false)

const onSubmit = handleSubmit(async (values) => {
  const result = forgotPasswordSchema.safeParse(values)
  // Sin validationSchema, vee-validate no revalida solo al tipear (ver
  // CLAUDE.md) - sin este clear, un error de un intento anterior se queda
  // pegado en pantalla aunque el campo ya sea valido.
  setErrors({ email: undefined })
  if (!result.success) {
    setErrors({ email: result.error.flatten().fieldErrors.email?.[0] })
    return
  }

  submitError.value = null
  successMessage.value = null
  isSubmitting.value = true
  try {
    successMessage.value = await authStore.forgotPassword(result.data.email)
  } catch (error) {
    submitError.value =
      isAxiosError<{ message?: string }>(error) && error.response?.data?.message
        ? error.response.data.message
        : 'No pudimos procesar tu solicitud. Intenta de nuevo.'
  } finally {
    isSubmitting.value = false
  }
})
</script>

<template>
  <div>
    <div class="mb-8 text-center">
      <h1 class="text-3xl font-bold text-slate-900">¿Olvidaste tu contraseña?</h1>
      <p class="mt-2 text-slate-500">Escribe tu correo y te enviamos un enlace para restablecerla</p>
    </div>

    <div v-if="successMessage" class="space-y-5">
      <p class="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{{ successMessage }}</p>
      <RouterLink :to="{ name: 'login' }" class="block text-center text-sm font-semibold text-indigo-600 hover:text-indigo-800">
        Volver a iniciar sesión
      </RouterLink>
    </div>

    <form v-else class="space-y-5" novalidate @submit.prevent="onSubmit">
      <p v-if="submitError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ submitError }}
      </p>

      <NxInput
        id="email"
        v-model="email"
        v-bind="emailAttrs"
        type="email"
        label="Correo"
        autocomplete="username"
        :error="errors.email"
      />

      <NxButton type="submit" class="w-full" :loading="isSubmitting">Enviar enlace</NxButton>

      <RouterLink :to="{ name: 'login' }" class="block text-center text-sm font-semibold text-indigo-600 hover:text-indigo-800">
        Volver a iniciar sesión
      </RouterLink>
    </form>
  </div>
</template>
