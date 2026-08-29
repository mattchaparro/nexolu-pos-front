<script setup lang="ts">
// Alta de un negocio desde cero (SuperAdmin\BusinessesController::store). El
// endpoint existia desde el primer corte del panel pero nunca tuvo pantalla:
// la unica forma de crear un negocio era el registro publico, que ademas
// clampa los features contra el plan. Aca no hay clamp - es el alta "despues
// de una llamada de ventas", donde se pacta el plan, las funciones sueltas,
// los dias de prueba y, si el negocio entra pagando, la activacion con su
// pago registrado. Todo en un solo formulario para no tener que crear el
// negocio y despues entrar al detalle a repetir tres formularios mas.
import { computed, reactive, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import { useFeatureCatalog } from '@/modules/superadmin-feature-catalog/composables/useFeatureCatalog'
import type { SuperAdminBusiness } from '@/types/superadmin/business'
import { NxButton, NxInput, NxInputNumber, NxModal, NxSelect, NxSwitch, NxTextarea } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'
import { formatCop } from '@/utils/formatCop'

import { useBusinessMutations } from '../composables/useBusinessMutations'

const props = defineProps<{ modelValue: boolean }>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  created: [business: SuperAdminBusiness]
}>()

const planOptions = [
  { value: 'basic', label: 'Básico' },
  { value: 'full', label: 'Full' },
]

const catalogQuery = useFeatureCatalog()

const businessName = ref('')
const ownerName = ref('')
const email = ref('')
const password = ref('')
const whatsappNumber = ref('')
const phone = ref('')
const nit = ref('')
const address = ref('')
const plan = ref<'basic' | 'full'>('basic')
const trialDays = ref<number | null>(14)
const entersPaying = ref(false)
const activateDays = ref<number | null>(30)
const amountCop = ref<number | null>(null)
const customPriceCop = ref<number | null>(null)
const notes = ref('')
const sendCredentials = ref(true)
const featureFlags = reactive<Record<string, boolean>>({})
const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)

/** Features del catalogo agrupados igual que la pestaña Features del detalle. */
const featureGroups = computed(() => {
  const features = catalogQuery.data.value?.features ?? []
  const order: string[] = []
  const byGroup = new Map<string, typeof features>()
  for (const feature of features) {
    if (!byGroup.has(feature.group)) {
      byGroup.set(feature.group, [])
      order.push(feature.group)
    }
    byGroup.get(feature.group)!.push(feature)
  }
  return order.map((group) => ({ group, features: byGroup.get(group)! }))
})

const planPriceCop = computed(() => catalogQuery.data.value?.plans[plan.value]?.price_cop ?? null)

/** Cuantas funciones quedaron distintas de lo que trae el plan tal cual. */
const overriddenCount = computed(
  () => (catalogQuery.data.value?.features ?? []).filter((feature) => featureFlags[feature.key] !== feature[plan.value]).length,
)

function applyPlanDefaults(): void {
  for (const feature of catalogQuery.data.value?.features ?? []) {
    featureFlags[feature.key] = feature[plan.value]
  }
}

function generatePassword(): void {
  // Legible al dictarla por teléfono: sin simbolos ni caracteres ambiguos.
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789'
  password.value = Array.from(
    { length: 10 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join('')
}

function resetForm(): void {
  businessName.value = ''
  ownerName.value = ''
  email.value = ''
  password.value = ''
  whatsappNumber.value = ''
  phone.value = ''
  nit.value = ''
  address.value = ''
  plan.value = 'basic'
  trialDays.value = 14
  entersPaying.value = false
  activateDays.value = 30
  amountCop.value = null
  customPriceCop.value = null
  notes.value = ''
  sendCredentials.value = true
  fieldErrors.value = {}
  formError.value = null
  applyPlanDefaults()
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      resetForm()
    }
  },
)

// El catalogo puede llegar despues de abrir el modal (primera visita, query
// todavia en vuelo): sin esto los interruptores quedarian todos apagados.
watch(() => catalogQuery.data.value, applyPlanDefaults)

// Cambiar de plan reescribe los interruptores con los defaults del plan
// nuevo: mantener los del anterior haria que "Básico" y "Full" signifiquen
// cosas distintas segun por donde se paso, que es justo lo que confunde.
watch(plan, applyPlanDefaults)

const { createMutation } = useBusinessMutations()
// notify() debe pedirse en setup(), no dentro de una funcion async despues de
// un await - ver el mismo comentario en SubscriptionActionsModal.vue.
const { notify } = useSystemAlert()

async function submit(): Promise<void> {
  fieldErrors.value = {}
  formError.value = null

  if (entersPaying.value && (!activateDays.value || activateDays.value < 1)) {
    fieldErrors.value.activate_days = 'Los días a activar son obligatorios.'
    return
  }

  try {
    const business = await createMutation.mutateAsync({
      business_name: businessName.value.trim(),
      owner_name: ownerName.value.trim(),
      email: email.value.trim(),
      password: password.value,
      whatsapp_number: whatsappNumber.value.trim() || null,
      phone: phone.value.trim() || null,
      nit: nit.value.trim() || null,
      address: address.value.trim() || null,
      plan: plan.value,
      feature_flags: { ...featureFlags },
      trial_days: trialDays.value ?? 0,
      activate_days: entersPaying.value ? activateDays.value : null,
      amount_cop: entersPaying.value ? amountCop.value : null,
      custom_price_cop: customPriceCop.value,
      notes: entersPaying.value ? notes.value.trim() || null : null,
      send_credentials: sendCredentials.value,
    })

    notify('Negocio creado.')
    emit('created', business)
    emit('update:modelValue', false)
  } catch (error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) {
      fieldErrors.value = fields
    } else {
      formError.value = extractErrorMessage(error, 'No pudimos crear el negocio.')
    }
  }
}
</script>

<template>
  <NxModal :model-value="modelValue" title="Crear negocio" size="lg" @update:model-value="emit('update:modelValue', $event)">
    <div class="flex flex-col gap-5">
      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>

      <section class="flex flex-col gap-3">
        <p class="text-sm font-semibold text-slate-700">Negocio y dueño</p>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <NxInput v-model="businessName" label="Nombre del negocio" required :error="fieldErrors.business_name" />
          <NxInput v-model="ownerName" label="Nombre del dueño" required :error="fieldErrors.owner_name" />
          <NxInput v-model="email" label="Correo del dueño" type="email" required :error="fieldErrors.email" />
          <div class="flex items-end gap-2">
            <NxInput v-model="password" label="Contraseña" class="flex-1" required :error="fieldErrors.password" />
            <NxButton type="button" size="sm" variant="outline" icon="pi pi-refresh" @click="generatePassword">Generar</NxButton>
          </div>
          <NxInput v-model="whatsappNumber" label="WhatsApp del negocio" :error="fieldErrors.whatsapp_number" />
          <NxInput v-model="phone" label="Teléfono para facturas (opcional)" :error="fieldErrors.phone" />
          <NxInput v-model="nit" label="NIT (opcional)" :error="fieldErrors.nit" />
          <NxInput v-model="address" label="Dirección (opcional)" :error="fieldErrors.address" />
        </div>
        <label class="flex items-center gap-2">
          <NxSwitch v-model="sendCredentials" />
          <span class="text-sm text-slate-700">Enviarle la contraseña al dueño por correo</span>
        </label>
        <p class="text-xs text-slate-400">
          El dueño no eligió su contraseña: sin este correo no tiene cómo entrar. El de bienvenida se envía siempre y no la incluye.
        </p>
      </section>

      <section class="flex flex-col gap-3 border-t border-slate-100 pt-4">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <p class="text-sm font-semibold text-slate-700">Plan y funciones</p>
          <p v-if="planPriceCop != null" class="text-xs text-slate-400">Precio del plan: {{ formatCop(planPriceCop) }}/mes</p>
        </div>
        <NxSelect v-model="plan" label="Plan" :options="planOptions" option-label="label" option-value="value" :error="fieldErrors.plan" />

        <p class="text-xs text-slate-500">
          Los interruptores arrancan con lo que trae el plan y se pueden mover uno por uno - a diferencia del registro público, acá sí se
          puede encender una función que el plan no incluye.
          <span v-if="overriddenCount > 0" class="font-semibold text-indigo-600">
            {{ overriddenCount }} {{ overriddenCount === 1 ? 'función distinta' : 'funciones distintas' }} de lo que trae el plan.
          </span>
        </p>

        <div v-if="catalogQuery.isPending.value" class="h-40 animate-pulse rounded-xl bg-slate-100" />
        <div v-else class="overflow-hidden rounded-xl border border-slate-200">
          <div v-for="section in featureGroups" :key="section.group">
            <p class="bg-slate-50 px-4 py-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">{{ section.group }}</p>
            <ul class="divide-y divide-slate-100">
              <li v-for="feature in section.features" :key="feature.key" class="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div class="min-w-0">
                  <p class="text-slate-700">{{ feature.label }}</p>
                  <p class="text-xs text-slate-400">{{ feature.description }}</p>
                </div>
                <NxSwitch v-model="featureFlags[feature.key]" />
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section class="flex flex-col gap-3 border-t border-slate-100 pt-4">
        <p class="text-sm font-semibold text-slate-700">Suscripción</p>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <NxInputNumber v-model="trialDays" label="Días de prueba" :currency="false" :error="fieldErrors.trial_days" />
          <NxInputNumber v-model="customPriceCop" label="Precio mensual especial (opcional)" :error="fieldErrors.custom_price_cop" />
        </div>

        <label class="flex items-center gap-2">
          <NxSwitch v-model="entersPaying" />
          <span class="text-sm text-slate-700">Entra pagando: registrar el primer pago ahora</span>
        </label>

        <div v-if="entersPaying" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <NxInputNumber v-model="activateDays" label="Días a activar" required :currency="false" :error="fieldErrors.activate_days" />
          <NxInputNumber v-model="amountCop" label="Monto cobrado" :error="fieldErrors.amount_cop" />
          <NxTextarea v-model="notes" label="Notas del pago (opcional)" :rows="2" class="sm:col-span-2" :error="fieldErrors.notes" />
        </div>
        <p v-if="entersPaying" class="text-xs text-slate-400">
          Si dejas el monto vacío se usa el precio especial, y si tampoco hay, el del plan.
        </p>
      </section>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-1" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-1" :loading="createMutation.isPending.value" @click="submit">Crear negocio</NxButton>
      </div>
    </template>
  </NxModal>
</template>
