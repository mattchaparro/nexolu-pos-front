<script setup lang="ts">
// Validacion alineada 1:1 con LoginRequest (nexolu-pos-api): email
// requerido+formato, password requerido. Sin casilla "Recordarme" (los
// tokens de Sanctum expiran a las 4h - config/sanctum.php - no hay un
// "recordarme" mas alla de eso) ni link de "olvide mi contraseña" (el
// endpoint todavia no existe en la API) - ver conversacion con el equipo
// antes de agregarlos de vuelta.
//
// La validacion NO usa `validationSchema` de useForm (bug de integracion
// entre vee-validate 4.15.1 y @vee-validate/zod 4.15.1: los mensajes
// custom de Zod se pierden y vee-validate cae a un "Required" generico
// en ingles, aunque loginSchema.safeParse() por si solo produce el
// mensaje correcto). En su lugar: Zod valida on submit, vee-validate
// solo maneja el estado del form (touched/values) y errors via setErrors.
import { isAxiosError } from 'axios'
import { useForm } from 'vee-validate'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { z } from 'zod'

import { useAuthStore } from '@/stores/auth.store'
import { NxButton, NxFormField, NxInput } from '@/ui'

const loginSchema = z.object({
  email: z.string().min(1, 'El correo es obligatorio').email('Ingresa un correo válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

const { handleSubmit, defineField, errors, setErrors } = useForm({
  initialValues: { email: '', password: '' },
})

const [email, emailAttrs] = defineField('email')
const [password, passwordAttrs] = defineField('password')

const authStore = useAuthStore()
const router = useRouter()
const submitError = ref<string | null>(null)
const isSubmitting = ref(false)

const onSubmit = handleSubmit(async (values) => {
  const result = loginSchema.safeParse(values)
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors
    setErrors({
      email: fieldErrors.email?.[0],
      password: fieldErrors.password?.[0],
    })
    return
  }

  submitError.value = null
  isSubmitting.value = true
  try {
    await authStore.login({
      email: result.data.email,
      password: result.data.password,
      device_name: 'nexolu-pos-front',
    })
    await router.push({ name: 'dashboard' })
  } catch (error) {
    submitError.value =
      isAxiosError<{ message?: string }>(error) && error.response?.status === 401
        ? (error.response.data?.message ?? 'Las credenciales son incorrectas.')
        : 'No pudimos iniciar sesión. Intenta de nuevo.'
  } finally {
    isSubmitting.value = false
  }
})
</script>

<template>
  <div>
    <div class="mb-8 text-center">
      <h1 class="text-3xl font-bold text-slate-900">¡Hola!</h1>
      <p class="mt-2 text-slate-500">Inicia sesión para continuar</p>
    </div>

    <form class="space-y-5" novalidate @submit.prevent="onSubmit">
      <p v-if="submitError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ submitError }}
      </p>

      <NxFormField label="Correo" for="email" :error="errors.email">
        <NxInput
          id="email"
          v-model="email"
          v-bind="emailAttrs"
          type="email"
          autocomplete="username"
          placeholder="tu@correo.com"
          :invalid="Boolean(errors.email)"
        />
      </NxFormField>

      <NxFormField label="Contraseña" for="password" :error="errors.password">
        <NxInput
          id="password"
          v-model="password"
          v-bind="passwordAttrs"
          type="password"
          autocomplete="current-password"
          placeholder="••••••••"
          :invalid="Boolean(errors.password)"
        />
      </NxFormField>

      <NxButton type="submit" class="w-full" :loading="isSubmitting"> Ingresar </NxButton>
    </form>
  </div>
</template>
