<script setup lang="ts">
// Dos formularios independientes (datos personales / contraseña), cada uno
// con su propio Guardar - mismo criterio que el legacy (Pages/Profile/Show.vue,
// dos Partials separados) y que BusinessSettingsView (una seccion no debe
// fallar/bloquear a la otra). Disponible para cualquier usuario autenticado
// (admin o empleado), a diferencia de Ajustes del negocio - ver el
// comentario en router/index.ts.
//
// Usa VeeValidate + Zod (no el patron reactive()+errores a mano de
// BusinessSettingsView): esta pantalla maneja contraseña, mismo criterio de
// rigor que las vistas de auth (ver LoginView.vue) - y por el bug conocido
// de vee-validate 4.15.1 + @vee-validate/zod (mensajes custom de Zod se
// pierden), NO se usa `validationSchema` directo: se valida con
// zodSchema.safeParse() en el submit y los mensajes se pasan con setErrors().
import { useForm } from 'vee-validate'
import { ref, watch } from 'vue'
import { z } from 'zod'

import { useSystemAlert } from '@/composables/useSystemAlert'
import { useAuthStore } from '@/stores/auth.store'
import { NxButton, NxCard, NxInput, NxPageHeader } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'

const authStore = useAuthStore()
const { notify } = useSystemAlert()

// ---------- Datos personales ----------------------------------------------
const profileSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  last_name: z.string().optional(),
  email: z.string().min(1, 'El correo es obligatorio').email('Ingresa un correo válido'),
  cellphone: z.string().optional(),
})

const {
  handleSubmit: handleProfileSubmit,
  defineField: defineProfileField,
  errors: profileErrors,
  setErrors: setProfileErrors,
  setValues: setProfileValues,
} = useForm({
  initialValues: { name: '', last_name: '', email: '', cellphone: '' },
})

const [name, nameAttrs] = defineProfileField('name')
const [lastName, lastNameAttrs] = defineProfileField('last_name')
const [email, emailAttrs] = defineProfileField('email')
const [cellphone, cellphoneAttrs] = defineProfileField('cellphone')

// El guard de router/index.ts ya garantiza que auth.user este poblado antes
// de llegar aca (fetchCurrentUser() si hacia falta) - el watch (no un valor
// leido una sola vez al montar) cubre igual el caso de refrescar esta misma
// pantalla o entrar directo por URL antes de que la rehidratacion termine.
watch(
  () => authStore.user,
  (user) => {
    if (!user) {
      return
    }
    setProfileValues({
      name: user.name,
      last_name: user.last_name ?? '',
      email: user.email,
      cellphone: user.cellphone ?? '',
    })
  },
  { immediate: true },
)

const profileSubmitError = ref<string | null>(null)
const profileSaving = ref(false)

const onProfileSubmit = handleProfileSubmit(async (values) => {
  const result = profileSchema.safeParse(values)
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors
    setProfileErrors({
      name: fieldErrors.name?.[0],
      email: fieldErrors.email?.[0],
    })
    return
  }

  profileSubmitError.value = null
  profileSaving.value = true
  try {
    await authStore.updateProfile({
      name: result.data.name,
      last_name: result.data.last_name || null,
      email: result.data.email,
      cellphone: result.data.cellphone || null,
    })
    notify('Perfil actualizado.')
  } catch (error) {
    setProfileErrors(extractFieldErrors(error))
    profileSubmitError.value = extractErrorMessage(error, 'No pudimos guardar tus datos. Intenta de nuevo.')
  } finally {
    profileSaving.value = false
  }
})

// ---------- Contraseña -----------------------------------------------------
const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Ingresa tu contraseña actual'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    password_confirmation: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Las contraseñas no coinciden',
    path: ['password_confirmation'],
  })

const {
  handleSubmit: handlePasswordSubmit,
  defineField: definePasswordField,
  errors: passwordErrors,
  setErrors: setPasswordErrors,
  resetForm: resetPasswordForm,
} = useForm({
  initialValues: { current_password: '', password: '', password_confirmation: '' },
})

const [currentPassword, currentPasswordAttrs] = definePasswordField('current_password')
const [newPassword, newPasswordAttrs] = definePasswordField('password')
const [newPasswordConfirmation, newPasswordConfirmationAttrs] = definePasswordField('password_confirmation')

const passwordSubmitError = ref<string | null>(null)
const passwordSaving = ref(false)

const onPasswordSubmit = handlePasswordSubmit(async (values) => {
  const result = passwordSchema.safeParse(values)
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors
    setPasswordErrors({
      current_password: fieldErrors.current_password?.[0],
      password: fieldErrors.password?.[0],
      password_confirmation: fieldErrors.password_confirmation?.[0],
    })
    return
  }

  passwordSubmitError.value = null
  passwordSaving.value = true
  try {
    await authStore.updatePassword(result.data)
    // Limpia los 3 campos - a diferencia de datos personales, no tiene
    // sentido dejar la contraseña actual/nueva tipeada en pantalla despues
    // de un cambio exitoso.
    resetPasswordForm()
    notify('Contraseña actualizada.')
  } catch (error) {
    setPasswordErrors(extractFieldErrors(error))
    passwordSubmitError.value = extractErrorMessage(error, 'No pudimos actualizar tu contraseña. Intenta de nuevo.')
  } finally {
    passwordSaving.value = false
  }
})
</script>

<template>
  <div>
    <NxPageHeader title="Mi perfil" subtitle="Actualiza tus datos personales y tu contraseña" icon="pi pi-user" />

    <div class="mt-6 flex flex-col gap-6">
      <NxCard>
        <template #header>
          <p class="text-sm font-semibold text-slate-700">Datos personales</p>
        </template>

        <form class="flex flex-col gap-4" novalidate @submit.prevent="onProfileSubmit">
          <p v-if="profileSubmitError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {{ profileSubmitError }}
          </p>

          <div class="grid gap-4 sm:grid-cols-2">
            <NxInput
              id="name"
              v-model="name"
              v-bind="nameAttrs"
              label="Nombre"
              required
              :error="profileErrors.name"
            />
            <NxInput id="last_name" v-model="lastName" v-bind="lastNameAttrs" label="Apellido" :error="profileErrors.last_name" />
            <NxInput
              id="email"
              v-model="email"
              v-bind="emailAttrs"
              type="email"
              label="Correo"
              autocomplete="username"
              required
              :error="profileErrors.email"
            />
            <NxInput id="cellphone" v-model="cellphone" v-bind="cellphoneAttrs" label="Celular" :error="profileErrors.cellphone" />
          </div>

          <NxButton type="submit" class="self-start" :loading="profileSaving">Guardar cambios</NxButton>
        </form>
      </NxCard>

      <NxCard>
        <template #header>
          <p class="text-sm font-semibold text-slate-700">Contraseña</p>
        </template>

        <form class="flex flex-col gap-4" novalidate @submit.prevent="onPasswordSubmit">
          <p v-if="passwordSubmitError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {{ passwordSubmitError }}
          </p>

          <NxInput
            id="current_password"
            v-model="currentPassword"
            v-bind="currentPasswordAttrs"
            type="password"
            label="Contraseña actual"
            autocomplete="current-password"
            :error="passwordErrors.current_password"
          />
          <div class="grid gap-4 sm:grid-cols-2">
            <NxInput
              id="new_password"
              v-model="newPassword"
              v-bind="newPasswordAttrs"
              type="password"
              label="Contraseña nueva"
              autocomplete="new-password"
              :error="passwordErrors.password"
            />
            <NxInput
              id="new_password_confirmation"
              v-model="newPasswordConfirmation"
              v-bind="newPasswordConfirmationAttrs"
              type="password"
              label="Confirmar contraseña nueva"
              autocomplete="new-password"
              :error="passwordErrors.password_confirmation"
            />
          </div>

          <NxButton type="submit" class="self-start" :loading="passwordSaving">Actualizar contraseña</NxButton>
        </form>
      </NxCard>
    </div>
  </div>
</template>
