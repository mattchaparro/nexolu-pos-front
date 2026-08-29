<script setup lang="ts">
// Wizard publico de registro, 3 pasos, estilo del registro del legacy (el
// usuario dijo que le gusta esa UX: tarjetas + panel de resumen en vivo) -
// pero con la logica corregida: plan PRIMERO, despues personalizar dentro de
// ese plan. El legacy hacia lo opuesto (entrevista de funciones, el plan se
// derivaba despues con un bug que lo dejaba siempre en 'basic') - ver
// decision registrada via AskUserQuestion: solo se puede APAGAR una funcion
// que el plan trae por defecto, nunca prender una fuera del plan (eso solo
// se logra subiendo de plan, ya sea aca antes de crear la cuenta o despues
// desde SuperAdmin). El backend (BusinessRegistrationService::register())
// clampa esto igual, asi que esta pantalla no es la unica barrera.
//
// El paso 2 arranca con dos preguntas (variaciones y tienda online) antes de
// mostrar las tarjetas de plan: son las dos funciones exclusivas de Full que
// mas seguido hacen que un negocio elija Básico y se de cuenta tarde. No
// cambian el payload - solo recomiendan plan y avisan si lo elegido no cubre
// lo que el propio usuario dijo necesitar.
//
// El paso 3 (verificar WhatsApp por OTP) es obligatorio a proposito - misma
// decision via AskUserQuestion: pedir el WhatsApp del negocio y confirmarlo
// con un codigo antes de dejar entrar al dashboard ahorra el paso de
// vincularlo despues (ver WhatsappOnboardingCard.vue del Dashboard) y de
// paso sirve como verificacion minima anti-bot - nadie termina el registro
// sin poder recibir un mensaje de WhatsApp real. Reusa el mismo mecanismo de
// OTP que ya existe para el Asistente de IA (POST /ai/channels/whatsapp/*,
// ver ChannelLinkService) en vez de construir uno nuevo sin sesion.
import { isAxiosError } from 'axios'
import { useForm } from 'vee-validate'
import { computed, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { z } from 'zod'

import { homeRouteFor } from '@/router'
import { confirmWhatsappLink, startWhatsappLink } from '@/services/aiChannelLink'
import { updateBillingProfile } from '@/services/billingProfile'
import { useAuthStore } from '@/stores/auth.store'
import { NxButton, NxInput, NxSelect, NxSwitch } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { formatCop } from '@/utils/formatCop'

import { usePlanCatalog } from '../composables/usePlanCatalog'

const step = ref<1 | 2 | 3>(1)
const catalogQuery = usePlanCatalog()

// --- Paso 1: datos del negocio y del dueño ---
const step1Schema = z
  .object({
    business_name: z.string().min(1, 'El nombre del negocio es obligatorio'),
    owner_name: z.string().min(1, 'Tu nombre es obligatorio'),
    email: z.string().min(1, 'El correo es obligatorio').email('Ingresa un correo válido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    password_confirmation: z.string().min(1, 'Confirma tu contraseña'),
    whatsapp_number: z.string().min(7, 'Ingresa un número de WhatsApp válido, con indicativo'),
    usesDifferentPhone: z.boolean(),
    phone: z.string().optional(),
    nit: z.string().optional(),
    address: z.string().optional(),
    document_type: z.enum(['CC', 'NIT', 'CE']).optional(),
    document_number: z.string().optional(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Las contraseñas no coinciden',
    path: ['password_confirmation'],
  })
  .refine((data) => !data.usesDifferentPhone || Boolean(data.phone?.trim()), {
    message: 'Ingresa el teléfono que aparecerá en facturas y reportes',
    path: ['phone'],
  })

const { handleSubmit, defineField, errors, setErrors } = useForm({
  initialValues: {
    business_name: '',
    owner_name: '',
    email: '',
    password: '',
    password_confirmation: '',
    whatsapp_number: '',
    usesDifferentPhone: false,
    phone: '',
    nit: '',
    address: '',
    document_type: 'CC',
    document_number: '',
  },
})

const [business_name, businessNameAttrs] = defineField('business_name')
const [owner_name, ownerNameAttrs] = defineField('owner_name')
const [email, emailAttrs] = defineField('email')
const [password, passwordAttrs] = defineField('password')
const [password_confirmation, passwordConfirmationAttrs] = defineField('password_confirmation')
const [whatsapp_number, whatsappNumberAttrs] = defineField('whatsapp_number')
const [usesDifferentPhone] = defineField('usesDifferentPhone')
const [phone, phoneAttrs] = defineField('phone')
const [nit, nitAttrs] = defineField('nit')
const [address, addressAttrs] = defineField('address')
const [document_type, documentTypeAttrs] = defineField('document_type')
const [document_number, documentNumberAttrs] = defineField('document_number')
const documentTypeOptions = [
  { label: 'Cédula de ciudadanía', value: 'CC' },
  { label: 'NIT', value: 'NIT' },
  { label: 'Cédula de extranjería', value: 'CE' },
]

const goToStep2 = handleSubmit((values) => {
  const result = step1Schema.safeParse(values)
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors
    setErrors({
      business_name: fieldErrors.business_name?.[0],
      owner_name: fieldErrors.owner_name?.[0],
      email: fieldErrors.email?.[0],
      password: fieldErrors.password?.[0],
      password_confirmation: fieldErrors.password_confirmation?.[0],
      whatsapp_number: fieldErrors.whatsapp_number?.[0],
      phone: fieldErrors.phone?.[0],
    })
    return
  }
  step.value = 2
})

// --- Paso 2: plan primero, despues personalizar dentro de ese plan ---
const selectedPlan = ref<'basic' | 'full' | null>(null)

// Dos preguntas antes de mostrar los planes. No cambian nada del payload:
// solo deciden que plan se recomienda y que aviso se muestra si el usuario
// elige uno que no incluye lo que acaba de decir que necesita. Son las dos
// funciones que mas seguido hacen que un negocio elija mal el plan y se de
// cuenta despues de estar cargando el inventario - `variants` y
// `online_store` son exclusivas de Full (ver BusinessFeaturePresets en
// nexolu-pos-api).
const needs = reactive<Record<'variants' | 'online_store', boolean>>({
  variants: false,
  online_store: false,
})

const needsQuestions: Array<{ key: 'variants' | 'online_store'; label: string; hint: string }> = [
  {
    key: 'variants',
    label: 'Vendo el mismo producto en varias tallas, colores o presentaciones',
    hint: 'Por ejemplo una camiseta en S, M y L, cada una con su propio precio y existencias.',
  },
  {
    key: 'online_store',
    label: 'Quiero vender también por internet',
    hint: 'Tu catálogo publicado en una tienda web con el mismo inventario del POS, y pagos en línea.',
  },
]

const recommendedPlan = computed<'basic' | 'full' | null>(() => (needs.variants || needs.online_store ? 'full' : null))

// Lo que el usuario dijo que necesita y el plan que esta viendo NO incluye.
// Se calcula contra el catalogo del backend, no contra una lista local, para
// que mover una funcion de plan no deje este aviso mintiendo.
function featuresMissingIn(plan: 'basic' | 'full'): string[] {
  const catalog = catalogQuery.data.value?.features ?? []
  return needsQuestions
    .filter((question) => needs[question.key])
    .map((question) => catalog.find((feature) => feature.key === question.key))
    .filter((feature) => feature && !feature[plan])
    .map((feature) => feature!.label)
}

// Solo las funciones que el plan elegido trae ENCENDIDAS por defecto se
// pueden personalizar (apagar) - las que el plan no incluye ni siquiera se
// muestran como opcion, para que quede claro que subir de plan es la unica
// forma de conseguirlas.
const customizableFeatures = computed(() => {
  if (!selectedPlan.value || !catalogQuery.data.value) {
    return []
  }
  return catalogQuery.data.value.features.filter((feature) => feature[selectedPlan.value!])
})

const editableFlags = reactive<Record<string, boolean>>({})
function selectPlan(plan: 'basic' | 'full'): void {
  selectedPlan.value = plan
  const defaults = catalogQuery.data.value?.features.filter((feature) => feature[plan]) ?? []
  Object.keys(editableFlags).forEach((key) => delete editableFlags[key])
  defaults.forEach((feature) => {
    editableFlags[feature.key] = true
  })
}

// Lo pedido que NO va a quedar encendido en la cuenta: porque el plan no lo
// trae, o porque el usuario lo apago en la lista de abajo sin darse cuenta
// de que era justo lo que dijo necesitar.
const missingInSelectedPlan = computed(() => {
  if (!selectedPlan.value) {
    return []
  }
  const catalog = catalogQuery.data.value?.features ?? []
  return needsQuestions
    .filter((question) => needs[question.key])
    .map((question) => catalog.find((feature) => feature.key === question.key))
    .filter((feature) => feature && !editableFlags[feature.key])
    .map((feature) => feature!.label)
})

// Panel "lo que se activará" - refleja el estado actual de los toggles,
// agrupado igual que la pantalla de SuperAdmin para que se sienta la misma
// fuente de verdad.
const summaryGroups = computed(() => {
  const enabled = customizableFeatures.value.filter((feature) => editableFlags[feature.key])
  const order: string[] = []
  const byGroup = new Map<string, typeof enabled>()
  for (const feature of enabled) {
    if (!byGroup.has(feature.group)) {
      byGroup.set(feature.group, [])
      order.push(feature.group)
    }
    byGroup.get(feature.group)!.push(feature)
  }
  return order.map((group) => ({ group, features: byGroup.get(group)! }))
})

function backToStep1(): void {
  step.value = 1
}

function backToPlanSelection(): void {
  selectedPlan.value = null
}

const authStore = useAuthStore()
const router = useRouter()
const submitError = ref<string | null>(null)
const isSubmitting = ref(false)

// --- Paso 3: verificar el WhatsApp con un codigo (obligatorio) ---
const otpPhone = ref('')
const otpCode = ref('')
const otpSent = ref(false)
const otpError = ref<string | null>(null)
const isSendingOtp = ref(false)
const isConfirmingOtp = ref(false)

async function sendWhatsappCode(): Promise<void> {
  if (!otpPhone.value.trim()) {
    return
  }
  otpError.value = null
  isSendingOtp.value = true
  try {
    await startWhatsappLink(otpPhone.value.trim())
    otpSent.value = true
    otpCode.value = ''
  } catch (error) {
    otpError.value = extractErrorMessage(error, 'No pudimos enviar el código. Revisa el número e intenta de nuevo.')
  } finally {
    isSendingOtp.value = false
  }
}

function editWhatsappNumber(): void {
  otpSent.value = false
  otpError.value = null
}

async function confirmWhatsappCode(): Promise<void> {
  if (!otpCode.value.trim()) {
    return
  }
  otpError.value = null
  isConfirmingOtp.value = true
  try {
    await confirmWhatsappLink(otpCode.value.trim())
    await router.push(homeRouteFor(authStore.user))
  } catch (error) {
    otpError.value = extractErrorMessage(error, 'El código no es válido. Intenta de nuevo.')
  } finally {
    isConfirmingOtp.value = false
  }
}

async function submitRegistration(): Promise<void> {
  if (!selectedPlan.value) {
    return
  }
  submitError.value = null
  isSubmitting.value = true
  try {
    await authStore.register({
      business_name: business_name.value ?? '',
      owner_name: owner_name.value ?? '',
      email: email.value ?? '',
      password: password.value ?? '',
      password_confirmation: password_confirmation.value ?? '',
      whatsapp_number: whatsapp_number.value ?? '',
      phone: usesDifferentPhone.value ? phone.value || undefined : undefined,
      nit: nit.value || undefined,
      address: address.value || undefined,
      plan: selectedPlan.value,
      feature_flags: { ...editableFlags },
      device_name: 'nexolu-pos-front',
    })

    // Opcional, no bloquea el registro si falla - solo evita volver a
    // pedir el documento en el primer pago por PSE (ver PseModal.vue).
    if (document_number.value?.trim()) {
      try {
        await updateBillingProfile({
          document_type: document_type.value as 'CC' | 'NIT' | 'CE',
          document_number: document_number.value.trim(),
          full_name: owner_name.value,
          phone: (usesDifferentPhone.value ? phone.value : whatsapp_number.value) ?? undefined,
          address: address.value || undefined,
        })
      } catch {
        // silencioso a proposito: el registro ya tuvo exito, esto es una
        // comodidad extra, no una condicion para entrar a la app.
      }
    }

    step.value = 3
    otpPhone.value = whatsapp_number.value ?? ''
    await sendWhatsappCode()
  } catch (error) {
    submitError.value = isAxiosError<{ message?: string; errors?: Record<string, string[]> }>(error)
      ? (Object.values(error.response?.data?.errors ?? {})[0]?.[0] ?? error.response?.data?.message)
      : null
    submitError.value ??= 'No pudimos crear tu cuenta. Intenta de nuevo.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <header class="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <span class="text-lg font-bold text-indigo-600">Nexolú POS</span>
      <RouterLink v-if="step < 3" :to="{ name: 'login' }" class="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
        ¿Ya tienes cuenta? Inicia sesión
      </RouterLink>
    </header>

    <main class="mx-auto px-6 py-10" :class="step === 2 ? 'max-w-5xl' : 'max-w-xl'">
      <div class="mb-8 text-center">
        <p class="text-xs font-semibold tracking-wide text-indigo-600 uppercase">Paso {{ step }} de 3</p>
        <h1 class="mt-1 text-3xl font-bold text-slate-900">
          {{ step === 1 ? 'Cuéntanos de tu negocio' : step === 2 ? 'Elige tu plan' : 'Verifica tu WhatsApp' }}
        </h1>
      </div>

      <!-- Paso 1 -->
      <form v-if="step === 1" class="space-y-5" novalidate @submit.prevent="goToStep2">
        <NxInput id="business_name" v-model="business_name" v-bind="businessNameAttrs" label="Nombre del negocio" :error="errors.business_name" />
        <NxInput id="owner_name" v-model="owner_name" v-bind="ownerNameAttrs" label="Tu nombre" :error="errors.owner_name" />
        <NxInput id="email" v-model="email" v-bind="emailAttrs" type="email" label="Correo" autocomplete="username" :error="errors.email" />
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <NxInput
            id="password"
            v-model="password"
            v-bind="passwordAttrs"
            type="password"
            label="Contraseña"
            autocomplete="new-password"
            :error="errors.password"
          />
          <NxInput
            id="password_confirmation"
            v-model="password_confirmation"
            v-bind="passwordConfirmationAttrs"
            type="password"
            label="Confirmar contraseña"
            autocomplete="new-password"
            :error="errors.password_confirmation"
          />
        </div>

        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <NxInput
            id="whatsapp_number"
            v-model="whatsapp_number"
            v-bind="whatsappNumberAttrs"
            label="WhatsApp del negocio"
            :error="errors.whatsapp_number"
          />
          <p class="mt-2 text-xs text-slate-500">
            A este número te llegarán todas las notificaciones del negocio (resúmenes, alertas, recordatorios). En el siguiente paso te
            enviaremos un código para confirmarlo.
          </p>

          <label class="mt-3 flex items-center gap-2">
            <NxSwitch v-model="usesDifferentPhone" />
            <span class="text-sm text-slate-700">Uso un número diferente para facturas y reportes</span>
          </label>

          <NxInput
            v-if="usesDifferentPhone"
            id="phone"
            v-model="phone"
            v-bind="phoneAttrs"
            label="Teléfono para facturas y reportes"
            class="mt-3"
            :error="errors.phone"
          />
        </div>

        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <NxInput id="nit" v-model="nit" v-bind="nitAttrs" label="NIT (opcional)" />
          <NxInput id="address" v-model="address" v-bind="addressAttrs" label="Dirección (opcional)" />
        </div>

        <!-- Opcional: si se completa, queda prellenado para pagar por PSE
             despues sin volver a pedirlo (ver App\Models\BillingProfile,
             nexolu-pos-api) - nunca bloquea el registro. -->
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p class="mb-3 text-sm text-slate-700">Documento del titular (opcional)</p>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NxSelect
              v-model="document_type"
              v-bind="documentTypeAttrs"
              :options="documentTypeOptions"
              option-label="label"
              option-value="value"
              label="Tipo de documento"
            />
            <NxInput id="document_number" v-model="document_number" v-bind="documentNumberAttrs" label="Número de documento" inputmode="numeric" />
          </div>
          <p class="mt-2 text-xs text-slate-500">Lo vas a necesitar para pagar por PSE - te lo pedimos ahora para no volver a preguntarlo.</p>
        </div>

        <NxButton type="submit" class="w-full">Continuar</NxButton>
      </form>

      <!-- Paso 2 -->
      <div v-else-if="step === 2" class="space-y-6">
        <p v-if="submitError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{{ submitError }}</p>

        <div v-if="catalogQuery.isPending.value" class="h-64 animate-pulse rounded-xl bg-slate-100" />

        <template v-else-if="catalogQuery.data.value">
          <!-- Seleccion de plan -->
          <template v-if="!selectedPlan">
            <!-- Dos preguntas que deciden el plan. Van antes de las tarjetas
                 a proposito: son la forma corta de saber si Básico alcanza. -->
            <div class="rounded-xl border border-slate-200 bg-white p-4">
              <p class="text-sm font-semibold text-slate-700">Antes de elegir, cuéntanos dos cosas</p>
              <ul class="mt-3 divide-y divide-slate-100">
                <li v-for="question in needsQuestions" :key="question.key" class="flex items-center justify-between gap-3 py-2.5">
                  <div class="min-w-0">
                    <p class="text-sm text-slate-700">{{ question.label }}</p>
                    <p class="text-xs text-slate-400">{{ question.hint }}</p>
                  </div>
                  <NxSwitch v-model="needs[question.key]" />
                </li>
              </ul>
              <p v-if="recommendedPlan" class="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                Para eso necesitas el plan <strong>Full</strong>: {{ featuresMissingIn('basic').join(' y ') }}
                {{ featuresMissingIn('basic').length > 1 ? 'no vienen' : 'no viene' }} en el plan Básico.
              </p>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                v-for="plan in (['basic', 'full'] as const)"
                :key="plan"
                type="button"
                class="relative cursor-pointer rounded-xl border-2 bg-white p-6 text-left transition hover:border-indigo-400"
                :class="recommendedPlan === plan ? 'border-indigo-500' : 'border-slate-200'"
                @click="selectPlan(plan)"
              >
                <span
                  v-if="recommendedPlan === plan"
                  class="absolute -top-2.5 right-4 rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white"
                >
                  Recomendado para ti
                </span>
                <p class="text-lg font-bold text-slate-900">{{ plan === 'basic' ? 'Básico' : 'Full' }}</p>
                <p class="mt-1 text-2xl font-bold text-indigo-600">
                  {{ formatCop(catalogQuery.data.value.plans[plan].price_cop) }}<span class="text-sm font-normal text-slate-400">/mes</span>
                </p>
                <ul class="mt-4 space-y-1.5 text-sm text-slate-600">
                  <li v-for="feature in catalogQuery.data.value.features.filter((f) => f[plan])" :key="feature.key" class="flex gap-2">
                    <i class="pi pi-check-circle mt-0.5 text-emerald-500" />
                    <span>{{ feature.label }}</span>
                  </li>
                </ul>
                <p v-if="featuresMissingIn(plan).length" class="mt-4 text-xs text-amber-600">
                  No incluye: {{ featuresMissingIn(plan).join(', ') }}.
                </p>
              </button>
            </div>
          </template>

          <!-- Personalizar dentro del plan elegido + resumen en vivo -->
          <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            <div>
              <button type="button" class="mb-4 text-sm font-semibold text-indigo-600 hover:text-indigo-800" @click="backToPlanSelection">
                ← Cambiar de plan
              </button>
              <p class="mb-3 text-sm text-slate-500">
                Plan <strong>{{ selectedPlan === 'basic' ? 'Básico' : 'Full' }}</strong> - apaga lo que no necesites, puedes activarlo después
                subiendo de plan.
              </p>
              <div v-if="missingInSelectedPlan.length" class="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <template v-if="selectedPlan === 'basic'">
                  Este plan no incluye <strong>{{ missingInSelectedPlan.join(' ni ') }}</strong
                  >, que es lo que nos dijiste que necesitas.
                  <button type="button" class="ml-1 font-semibold underline" @click="selectPlan('full')">Cambiar al plan Full</button>
                </template>
                <template v-else>
                  Apagaste <strong>{{ missingInSelectedPlan.join(' y ') }}</strong
                  >, que es lo que nos dijiste que necesitas. Tu cuenta se creará sin eso.
                </template>
              </div>
              <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <ul class="divide-y divide-slate-100">
                  <li v-for="feature in customizableFeatures" :key="feature.key" class="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <div class="min-w-0">
                      <p class="text-slate-700">{{ feature.label }}</p>
                      <p class="text-xs text-slate-400">{{ feature.description }}</p>
                    </div>
                    <NxSwitch v-model="editableFlags[feature.key]" />
                  </li>
                </ul>
              </div>
            </div>

            <div class="lg:sticky lg:top-6 lg:self-start">
              <div class="rounded-xl border border-slate-200 bg-white p-4">
                <p class="mb-3 text-sm font-semibold text-slate-700">Lo que se activará en tu cuenta</p>
                <div v-for="section in summaryGroups" :key="section.group" class="mb-3 last:mb-0">
                  <p class="text-xs font-semibold tracking-wide text-slate-400 uppercase">{{ section.group }}</p>
                  <ul class="mt-1 space-y-1">
                    <li v-for="feature in section.features" :key="feature.key" class="flex items-center gap-1.5 text-sm text-slate-700">
                      <i class="pi pi-check text-emerald-500" />
                      {{ feature.label }}
                    </li>
                  </ul>
                </div>
                <p v-if="summaryGroups.length === 0" class="text-sm text-slate-400">Nada activado todavía.</p>
              </div>
            </div>
          </div>
        </template>

        <div class="flex justify-between gap-2">
          <NxButton variant="outline" @click="backToStep1">Atrás</NxButton>
          <NxButton :disabled="!selectedPlan" :loading="isSubmitting" @click="submitRegistration">Crear mi cuenta</NxButton>
        </div>
      </div>

      <!-- Paso 3: verificar WhatsApp (obligatorio, sin opcion de omitir) -->
      <div v-else class="mx-auto max-w-sm space-y-4 text-center">
        <i class="pi pi-whatsapp text-4xl text-emerald-500" />

        <p v-if="otpError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{{ otpError }}</p>

        <template v-if="!otpSent">
          <p class="text-sm text-slate-600">
            Confirma el número de WhatsApp donde recibirás todas las notificaciones de tu negocio.
          </p>
          <NxInput v-model="otpPhone" label="WhatsApp del negocio" class="mx-auto max-w-[260px]" />
          <NxButton :loading="isSendingOtp" @click="sendWhatsappCode">Enviar código</NxButton>
        </template>

        <template v-else>
          <p class="text-sm text-slate-600">
            Te enviamos un código de 6 dígitos a <strong>{{ otpPhone }}</strong
            >.
          </p>
          <NxInput v-model="otpCode" label="Código recibido" class="mx-auto max-w-[200px]" />
          <NxButton class="w-full" :loading="isConfirmingOtp" @click="confirmWhatsappCode">Confirmar código</NxButton>
          <div class="flex justify-center gap-4 text-xs">
            <button type="button" class="font-medium text-indigo-600 hover:text-indigo-800" :disabled="isSendingOtp" @click="sendWhatsappCode">
              Reenviar código
            </button>
            <button type="button" class="font-medium text-slate-400 hover:text-slate-600" @click="editWhatsappNumber">
              ¿Número equivocado?
            </button>
          </div>
        </template>
      </div>
    </main>
  </div>
</template>
