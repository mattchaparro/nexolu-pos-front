<script setup lang="ts">
// Datos de facturacion (documento, nombre, telefono + email/direccion/ciudad
// opcionales), compartido por AddCardModal y PseModal - se piden UNA vez,
// antes de agregar la tarjeta o de pagar por PSE, nunca en una pantalla de
// ajustes aparte (asi no quedan "por allá abajo", lejos del pago real).
//
// Prellenado en capas: primero lo que el negocio ya guardo en su
// billing profile (ver App\Models\BillingProfile, nexolu-pos-api); si algun
// campo todavia no existe ahi, cae al dato mas cercano que ya tenemos - el
// nombre/celular/correo del usuario dueño (el "super admin" del negocio,
// unico usuario que hoy administra facturacion) o el telefono/direccion del
// negocio. Si ya hay documento + nombre guardados, arranca en modo resumen
// (compacto, con boton Editar) - si no, arranca en modo formulario.
import { computed, ref, watch } from 'vue'

import { useBillingProfile } from '@/composables/useBillingProfile'
import { useBusiness } from '@/composables/useBusiness'
import { useAuthStore } from '@/stores/auth.store'
import { NxButton, NxInput, NxSelect } from '@/ui'

import { stripToDigits } from '../support/colombianPhone'

const documentType = defineModel<'CC' | 'NIT' | 'CE'>('documentType', { default: 'CC' })
const documentNumber = defineModel<string>('documentNumber', { default: '' })
const fullName = defineModel<string>('fullName', { default: '' })
const phone = defineModel<string>('phone', { default: '' })
const email = defineModel<string>('email', { default: '' })
const address = defineModel<string>('address', { default: '' })
const city = defineModel<string>('city', { default: '' })
const valid = defineModel<boolean>('valid', { default: false })

const documentTypeOptions = [
  { label: 'Cédula de ciudadanía', value: 'CC' },
  { label: 'NIT', value: 'NIT' },
  { label: 'Cédula de extranjería', value: 'CE' },
]

const auth = useAuthStore()
const businessQuery = useBusiness()
const billingProfileQuery = useBillingProfile()

const editing = ref(false)
let prefilled = false

watch(
  () => [billingProfileQuery.data.value, businessQuery.data.value] as const,
  ([profile, business]) => {
    if (!profile || prefilled) {
      return
    }
    prefilled = true
    documentType.value = profile.document_type ?? 'CC'
    documentNumber.value = profile.document_number ?? ''
    fullName.value = profile.full_name ?? auth.user?.full_name ?? ''
    phone.value = profile.phone ?? auth.user?.cellphone ?? business?.phone ?? ''
    email.value = profile.email ?? auth.user?.email ?? ''
    address.value = profile.address ?? business?.address ?? ''
    city.value = profile.city ?? ''
    // Ya hay documento + nombre guardados de una vez anterior: arranca en
    // resumen, no hace falta volver a pedirlo cada vez que se paga.
    editing.value = !(profile.document_number && profile.full_name)
  },
  { immediate: true },
)

function onPhoneInput(raw: string): void {
  phone.value = stripToDigits(raw)
}

function onDocumentNumberInput(raw: string): void {
  documentNumber.value = raw.replace(/\D/g, '').slice(0, 15)
}

const showMoreFields = ref(false)

const formValid = computed(
  () => documentNumber.value.length >= 5 && fullName.value.trim().length >= 3 && phone.value.length >= 7,
)
watch(formValid, (v) => (valid.value = v), { immediate: true })
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <p class="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
      <i class="pi pi-id-card" />
      Datos de facturación
    </p>

    <!-- Resumen compacto: ya sabemos quien paga, no hace falta pedirselo de nuevo -->
    <div v-if="!editing" class="flex items-center justify-between gap-3">
      <div class="min-w-0 text-sm">
        <p class="truncate font-semibold text-slate-800">{{ fullName }}</p>
        <p class="text-xs text-slate-500">{{ documentType }} {{ documentNumber }} · {{ phone }}</p>
      </div>
      <NxButton size="sm" variant="ghost" @click="editing = true">Editar</NxButton>
    </div>

    <!-- Formulario: primera vez, o el usuario pidio editar -->
    <div v-else class="flex flex-col gap-3">
      <div class="grid grid-cols-2 gap-3">
        <NxSelect
          v-model="documentType"
          :options="documentTypeOptions"
          option-label="label"
          option-value="value"
          label="Tipo de documento"
        />
        <NxInput :model-value="documentNumber" label="Número de documento" required inputmode="numeric" @update:model-value="onDocumentNumberInput" />
      </div>
      <NxInput v-model="fullName" label="Nombre completo" required />
      <NxInput :model-value="phone" label="Teléfono" required inputmode="numeric" placeholder="3107654321" @update:model-value="onPhoneInput" />

      <button type="button" class="self-start text-xs font-semibold text-indigo-600 hover:text-indigo-800" @click="showMoreFields = !showMoreFields">
        {{ showMoreFields ? 'Ocultar' : 'Agregar' }} correo/dirección (opcional)
      </button>
      <template v-if="showMoreFields">
        <NxInput v-model="email" label="Correo de facturación" type="email" />
        <NxInput v-model="address" label="Dirección" />
        <NxInput v-model="city" label="Ciudad" />
      </template>
    </div>
  </div>
</template>
