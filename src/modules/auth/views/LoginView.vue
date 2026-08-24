<script setup lang="ts">
// Validacion alineada 1:1 con LoginRequest (nexolu-pos-api): email
// requerido+formato, password requerido. Sin casilla "Recordarme" (los
// tokens de Sanctum expiran a las 4h - config/sanctum.php - no hay un
// "recordarme" mas alla de eso).
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
import { RouterLink, useRouter } from 'vue-router'
import { z } from 'zod'

import { homeRouteFor } from '@/router'
import { useAuthStore } from '@/stores/auth.store'
import { NxButton, NxInput } from '@/ui'

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
    // Un usuario superadmin no tiene business_id (ver DatabaseSeeder) - el
    // dashboard de negocio le rompe (fetches business-scoped sin negocio),
    // asi que entra directo a su propio panel (ver homeRouteFor, misma
    // regla que usa el guard del router).
    await router.push(homeRouteFor(authStore.user))
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

      <NxInput
        id="email"
        v-model="email"
        v-bind="emailAttrs"
        type="email"
        label="Correo"
        autocomplete="username"
        :error="errors.email"
      />

      <div>
        <NxInput
          id="password"
          v-model="password"
          v-bind="passwordAttrs"
          type="password"
          label="Contraseña"
          autocomplete="current-password"
          :error="errors.password"
        />
        <RouterLink
          :to="{ name: 'forgot-password' }"
          class="mt-1.5 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-800"
        >
          ¿Olvidaste tu contraseña?
        </RouterLink>
      </div>

      <NxButton type="submit" class="w-full" :loading="isSubmitting"> Ingresar </NxButton>

      <p class="text-center text-sm text-slate-500">
        ¿No tienes cuenta?
        <RouterLink :to="{ name: 'register' }" class="font-semibold text-indigo-600 hover:text-indigo-800">Regístrate</RouterLink>
      </p>
    </form>
  </div>
</template>

<style scoped>
/* A pedido explicito: los inputs de esta pantalla un poco mas redondeados
   que el default de NxInput (6px, ver theme/nexoluPreset.ts) - NxInput no
   expone una prop para variar el border-radius, asi que se apunta por id
   en vez de sumarle una prop nueva solo para este caso puntual. */
:deep(#email),
:deep(#password) {
  border-radius: 0.75rem;
}
</style>
