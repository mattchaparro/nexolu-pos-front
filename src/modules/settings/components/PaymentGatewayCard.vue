<script setup lang="ts">
// Conectar la pasarela de un proveedor. Un formulario por proveedor: las
// llaves que pide cada uno salen del backend (`capabilities`), no
// escritas a mano aca, para que agregar un proveedor no obligue a tocar
// esta pantalla.
import { computed, ref, watch } from 'vue'

import type { PaymentGatewayProvider } from '@/types/paymentGateway'
import { NxButton, NxInput, NxSelect } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import TerminalSyncPanel from './TerminalSyncPanel.vue'

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

const CAPABILITY_META: Record<string, { title: string; blurb: string }> = {
  online: {
    title: 'Cobrar por internet',
    blurb: 'Las llaves de “Botón de Pagos”. Sirven para que te paguen en tu tienda online.',
  },
  terminal: {
    title: 'Cobrar con datáfono',
    blurb:
      'Las llaves de “API Datáfono”, distintas de las anteriores. Sirven para disparar el cobro en tu terminal desde el POS.',
  },
}

const FIELD_LABELS: Record<string, string> = {
  identity_key: 'Llave de identidad',
  secret_key: 'Llave secreta',
  terminal_identity_key: 'Llave de identidad (datáfono)',
  terminal_secret_key: 'Llave secreta (datáfono)',
  public_key: 'Llave pública',
  private_key: 'Llave privada',
  integrity_secret: 'Secreto de integridad',
  events_secret: 'Secreto de eventos',
}

const meta = computed(
  () =>
    PROVIDER_META[props.provider.provider_slug] ?? {
      name: props.provider.provider_slug,
      blurb: '',
      help: '',
    },
)

const open = ref(false)
const environment = ref('production')
const values = ref<Record<string, string>>({})
const errorMessage = ref<string | null>(null)

/** Las capacidades que este negocio puede configurar, en orden estable. */
const capabilities = computed(() =>
  (['online', 'terminal'] as const)
    .filter((key) => (props.provider.capabilities[key]?.length ?? 0) > 0)
    .map((key) => ({
      key,
      fields: props.provider.capabilities[key] ?? [],
      ...CAPABILITY_META[key],
    })),
)

const allFields = computed(() => capabilities.value.flatMap((group) => group.fields))

watch(
  allFields,
  (fields) => {
    values.value = Object.fromEntries(fields.map((field) => [field, '']))
  },
  { immediate: true },
)

/**
 * Solo se mandan los juegos que el comerciante llenó. Así puede configurar
 * el datáfono hoy y el botón de pagos el mes que viene sin que el que dejó
 * en blanco borre el que ya tenía guardado.
 */
function filledCredentials(): Record<string, string> {
  const enviados: Record<string, string> = {}

  for (const group of capabilities.value) {
    const algunoLleno = group.fields.some((field) => values.value[field]?.trim())
    if (!algunoLleno) {
      continue
    }
    for (const field of group.fields) {
      enviados[field] = values.value[field] ?? ''
    }
  }

  return enviados
}

async function connect(): Promise<void> {
  errorMessage.value = null
  try {
    await connectMutation.mutateAsync({
      provider_slug: props.provider.provider_slug,
      environment: environment.value,
      credentials: filledCredentials(),
    })
    open.value = false
    values.value = Object.fromEntries(allFields.value.map((f) => [f, '']))
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

      <!-- Con la pasarela conectada tambien se pueden AGREGAR llaves: es el
           caso de completar un juego (conectaste el boton de pagos y ahora
           quieres el datafono) o de rotar las que ya tenias. El Core fusiona
           sobre lo guardado, asi que mandar unas no borra las otras. -->
      <NxButton
        v-if="provider.is_connected && !open"
        variant="ghost"
        size="sm"
        @click="open = true"
      >
        Actualizar llaves
      </NxButton>
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

    <!-- Los datáfonos solo aplican a un proveedor que los soporte y que ya
         este conectado: antes de eso no hay a quien preguntarle. -->
    <TerminalSyncPanel
      v-if="provider.is_connected && capabilities.some((group) => group.key === 'terminal')"
      class="mt-3"
    />

    <p
      v-if="provider.last_error && !provider.is_connected"
      class="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700"
    >
      Último intento: {{ provider.last_error }}
    </p>

    <form v-if="open" class="mt-3 flex flex-col gap-3" @submit.prevent="connect">
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

      <!-- Un grupo por capacidad: en Bold son DOS juegos de llaves distintos
           y no intercambiables, y confundirlos da un 403 que no dice por qué.
           Cada grupo se puede llenar por separado. -->
      <div
        v-for="group in capabilities"
        :key="group.key"
        class="rounded-lg border border-slate-200 p-3"
      >
        <p class="text-sm font-semibold text-slate-700">{{ group.title }}</p>
        <p class="mb-2 text-[11px] text-slate-400">{{ group.blurb }}</p>

        <div class="flex flex-col gap-3">
          <NxInput
            v-for="field in group.fields"
            :key="field"
            v-model="values[field]"
            :label="FIELD_LABELS[field] ?? field"
          />
        </div>
      </div>

      <p v-if="errorMessage" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
        {{ errorMessage }}
      </p>

      <p class="text-[11px] text-slate-400">
        Las llaves se guardan cifradas y no se vuelven a mostrar. Si las pierdes, sácalas otra vez
        del panel de
        {{ meta.name }}.
      </p>

      <div class="flex gap-2">
        <NxButton type="submit" :loading="connectMutation.isPending.value">Conectar</NxButton>
        <NxButton variant="ghost" :disabled="connectMutation.isPending.value" @click="open = false"
          >Cancelar</NxButton
        >
      </div>
    </form>
  </div>
</template>
