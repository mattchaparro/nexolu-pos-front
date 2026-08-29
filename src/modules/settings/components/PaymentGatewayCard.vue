<script setup lang="ts">
// Conectar la pasarela de un proveedor. Un formulario por proveedor: las
// llaves que pide cada uno salen del backend (`credential_fields`), no
// escritas a mano aca, para que agregar un proveedor no obligue a tocar
// esta pantalla.
import { computed, ref, watch } from 'vue'

import type { PaymentGatewayProvider } from '@/types/paymentGateway'
import { NxButton, NxInput, NxSelect } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { usePaymentGateways } from '../composables/usePaymentGateways'

const props = defineProps<{ provider: PaymentGatewayProvider }>()

const { connectMutation, disconnectMutation } = usePaymentGateways()

const PROVIDER_META: Record<string, { name: string; blurb: string; help: string }> = {
  bold: {
    name: 'Bold',
    blurb: 'Cobra por internet con tarjeta, PSE, Nequi y botón Bancolombia.',
    // Nada de prometer el datáfono todavía: esta llave HABILITA el cobro
    // contra la terminal física, pero ese flujo (F3) no está construido, y
    // el medio de pago "Bold" del catálogo es otra cosa - una etiqueta con
    // la que el cajero registra un cobro que hizo a mano en el aparato.
    // Escribirlo aquí en futuro haría que el comerciante conecte esperando
    // que el botón "Bold" de la caja empiece a cobrar solo.
    help: 'Bold → Mi perfil → Preferencias de cobro → Integraciones.',
  },
  wompi: {
    name: 'Wompi',
    blurb: 'Cobra con tarjeta, PSE, Nequi y botón Bancolombia.',
    help: 'Wompi → Desarrolladores → Llaves de API. Necesitas las cuatro.',
  },
}

const FIELD_LABELS: Record<string, string> = {
  identity_key: 'Llave de identidad',
  secret_key: 'Llave secreta',
  public_key: 'Llave pública',
  private_key: 'Llave privada',
  integrity_secret: 'Secreto de integridad',
  events_secret: 'Secreto de eventos',
}

const meta = computed(() => PROVIDER_META[props.provider.provider_slug] ?? { name: props.provider.provider_slug, blurb: '', help: '' })

const open = ref(false)
const environment = ref('production')
const values = ref<Record<string, string>>({})
const errorMessage = ref<string | null>(null)

watch(
  () => props.provider.credential_fields,
  (fields) => {
    values.value = Object.fromEntries(fields.map((field) => [field, '']))
  },
  { immediate: true },
)

async function connect(): Promise<void> {
  errorMessage.value = null
  try {
    await connectMutation.mutateAsync({
      provider_slug: props.provider.provider_slug,
      environment: environment.value,
      credentials: { ...values.value },
    })
    open.value = false
    values.value = Object.fromEntries(props.provider.credential_fields.map((f) => [f, '']))
  } catch (error) {
    errorMessage.value = extractErrorMessage(error, 'No pudimos conectar la pasarela.')
  }
}

async function disconnect(): Promise<void> {
  if (!window.confirm(`¿Desconectar ${meta.value.name}? Dejarás de poder cobrar en línea.`)) {
    return
  }
  try {
    await disconnectMutation.mutateAsync(props.provider.provider_slug)
  } catch (error) {
    errorMessage.value = extractErrorMessage(error, 'No pudimos desconectar la pasarela.')
  }
}
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-sm font-semibold text-slate-800">
          {{ meta.name }}
          <span
            v-if="provider.is_connected"
            class="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700"
          >
            Conectada
          </span>
        </p>
        <p class="text-xs text-slate-400">{{ meta.blurb }}</p>
      </div>

      <NxButton
        v-if="provider.is_connected"
        variant="outline"
        size="sm"
        :disabled="disconnectMutation.isPending.value"
        @click="disconnect"
      >
        Desconectar
      </NxButton>
      <NxButton v-else-if="!open" size="sm" @click="open = true">Conectar</NxButton>
    </div>

    <p v-if="provider.last_error && !provider.is_connected" class="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
      Último intento: {{ provider.last_error }}
    </p>

    <form v-if="open && !provider.is_connected" class="mt-3 flex flex-col gap-3" @submit.prevent="connect">
      <p class="text-xs text-slate-500">{{ meta.help }}</p>

      <NxSelect
        v-model="environment"
        :options="[
          { id: 'production', label: 'Producción (cobros reales)' },
          { id: 'sandbox', label: 'Pruebas' },
        ]"
        option-label="label"
        option-value="id"
        label="Ambiente"
      />

      <NxInput
        v-for="field in provider.credential_fields"
        :key="field"
        v-model="values[field]"
        :label="FIELD_LABELS[field] ?? field"
      />

      <p v-if="errorMessage" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{{ errorMessage }}</p>

      <p class="text-[11px] text-slate-400">
        Las llaves se guardan cifradas y no se vuelven a mostrar. Si las pierdes, sácalas otra vez del panel de
        {{ meta.name }}.
      </p>

      <div class="flex gap-2">
        <NxButton type="submit" :loading="connectMutation.isPending.value">Conectar</NxButton>
        <NxButton variant="ghost" :disabled="connectMutation.isPending.value" @click="open = false">Cancelar</NxButton>
      </div>
    </form>
  </div>
</template>
