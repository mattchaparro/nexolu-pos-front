<script setup lang="ts">
// Conectar la pasarela de un proveedor. Un formulario por proveedor: las
// llaves que pide cada uno salen del backend (`capabilities`), no
// escritas a mano aca, para que agregar un proveedor no obligue a tocar
// esta pantalla.
import { useClipboard } from '@vueuse/core'
import { computed, ref, watch } from 'vue'

import type { PaymentGatewayProvider, PaymentGatewayTest } from '@/types/paymentGateway'
import { NxButton, NxInput, NxSelect } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import TerminalSyncPanel from './TerminalSyncPanel.vue'

import { usePaymentGateways } from '../composables/usePaymentGateways'
import { testPaymentGateway } from '../services/paymentGatewayService'

const props = defineProps<{ provider: PaymentGatewayProvider }>()

const { connectMutation, disconnectMutation } = usePaymentGateways()

/**
 * Probar las llaves sin cobrarle a nadie.
 *
 * "Conectado" solo significa que hay algo guardado. Sin esta prueba el
 * comerciante se entera de que las llaves están mal con el primer comprador
 * que no puede pagar.
 */
const testing = ref(false)
const testResult = ref<PaymentGatewayTest | null>(null)

async function test(): Promise<void> {
  testing.value = true
  testResult.value = null
  try {
    testResult.value = await testPaymentGateway(props.provider.provider_slug)
  } catch (error) {
    testResult.value = {
      ok: false,
      message: extractErrorMessage(error, 'No pudimos probar la conexión.'),
    }
  } finally {
    testing.value = false
  }
}

const { copy, copied } = useClipboard()

const PROVIDER_META: Record<string, { name: string; blurb: string; help: string; signup: string }> =
  {
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
      signup: 'https://bold.co',
    },
    wompi: {
      name: 'Wompi',
      blurb: 'Cobra con tarjeta, PSE, Nequi y botón Bancolombia.',
      help: 'Wompi → Desarrolladores → Llaves de API. Necesitas las cuatro.',
      signup: 'https://wompi.co',
    },
  }

/**
 * `optional` es lo que evita que un negocio que solo vende por internet
 * crea que le faltan datos. El backend nunca exigió el juego del datáfono
 * — un grupo vacío ni siquiera se envía — pero la pantalla mostraba los dos
 * bloques con el mismo peso y cuatro campos en blanco, que se lee como
 * "esto está incompleto".
 */
const CAPABILITY_META: Record<string, { title: string; blurb: string; optional?: boolean }> = {
  online: {
    title: 'Cobrar por internet',
    blurb: 'Las llaves de “Botón de Pagos”. Sirven para que te paguen en tu tienda online.',
  },
  terminal: {
    title: 'Cobrar con datáfono',
    blurb:
      'Las llaves de “API Datáfono”, distintas de las anteriores. Sirven para disparar el cobro en tu terminal desde el POS.',
    optional: true,
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
/**
 * Arranca en el ambiente que la pasarela YA tiene, no en un valor fijo.
 *
 * Con 'production' fijo, abrir "Actualizar llaves" sobre una pasarela de
 * pruebas mostraba "Producción" y guardar escribía sobre OTRA credencial
 * -- la de producción -- dejando la de pruebas intacta y al comerciante
 * convencido de que había actualizado la que estaba usando.
 *
 * El ambiente es parte de la identidad de la credencial (un comercio puede
 * tener las dos), así que cambiarlo aquí no la migra: apunta a la otra.
 */
const environment = ref(props.provider.environment ?? 'production')

watch(
  () => props.provider.environment,
  (value) => {
    if (value) {
      environment.value = value
    }
  },
)
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

/**
 * Los grupos opcionales arrancan cerrados: el camino normal — vender por
 * internet — queda en un solo bloque de dos campos. Se abre solo si ya hay
 * algo escrito, para no esconderle a alguien lo que estaba llenando.
 */
const openGroups = ref<Record<string, boolean>>({})

function isGroupOpen(key: string): boolean {
  return openGroups.value[key] ?? false
}

function toggleGroup(key: string): void {
  openGroups.value = { ...openGroups.value, [key]: !isGroupOpen(key) }
}

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

    <!-- Lo que falta después de guardar las llaves, y que nadie adivina.
         Sin este paso el comerciante ve "Conectado", cree que terminó, y su
         primer pedido se queda esperando un pago que ya entró. -->
    <div
      v-if="provider.is_connected && provider.webhook_url"
      class="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3"
    >
      <p class="text-sm font-semibold text-amber-900">Falta un paso en {{ meta.name }}</p>
      <p class="mt-0.5 text-[11px] text-amber-800">
        Pega esta dirección en el panel de {{ meta.name }}, en la sección de webhooks. Es lo que le
        avisa a tu POS cuando alguien te paga.
      </p>
      <div class="mt-2 flex items-center gap-2">
        <code
          class="min-w-0 flex-1 truncate rounded-lg bg-white px-2.5 py-1.5 font-mono text-[11px] text-slate-700"
        >
          {{ provider.webhook_url }}
        </code>
        <NxButton size="sm" variant="outline" @click="copy(provider.webhook_url)">
          {{ copied ? 'Copiado' : 'Copiar' }}
        </NxButton>
      </div>
    </div>

    <!-- En pruebas no entra dinero. Un comerciante puede leer "pruebas" y
         creer que es la opción prudente. -->
    <p
      v-if="provider.is_connected && provider.environment === 'sandbox'"
      class="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-[11px] text-slate-600"
    >
      Estás en <strong>modo pruebas</strong>: puedes simular compras, pero
      <strong>no entra dinero real</strong>. Cuando quieras cobrar de verdad, vuelve a conectar
      eligiendo «Producción» con tus llaves productivas.
    </p>

    <!-- "Conectado" solo dice que hay algo guardado. Esto dice si sirve. -->
    <div v-if="provider.is_connected" class="mt-3">
      <NxButton size="sm" variant="outline" :loading="testing" @click="test">
        Probar la conexión
      </NxButton>
      <p
        v-if="testResult"
        class="mt-2 rounded-lg px-3 py-2 text-xs"
        :class="testResult.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'"
      >
        {{ testResult.message }}
      </p>
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
      <p class="text-xs text-slate-500">
        {{ meta.help }}
        <br />
        ¿Todavía no tienes cuenta?
        <a :href="meta.signup" target="_blank" rel="noopener" class="text-indigo-600 underline">
          Ábrela en {{ meta.name }}
        </a>
        y vuelve aquí con tus llaves.
      </p>

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

      <!-- Cambiar de ambiente NO migra las llaves: apunta a otra credencial.
           Sin este aviso parece que se estan actualizando las de siempre. -->
      <p
        v-if="provider.is_connected && environment !== provider.environment"
        class="-mt-1 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700"
      >
        Estás cambiando de ambiente. Estas llaves se guardan aparte de las de
        <strong>{{ provider.environment === 'sandbox' ? 'pruebas' : 'producción' }}</strong
        >, que siguen como están.
      </p>

      <!-- Un grupo por capacidad: en Bold son DOS juegos de llaves distintos
           y no intercambiables, y confundirlos da un 403 que no dice por qué.
           Cada grupo se puede llenar por separado. -->
      <div
        v-for="group in capabilities"
        :key="group.key"
        class="rounded-lg border border-slate-200 p-3"
      >
        <!-- Un grupo opcional arranca cerrado y detrás de una pregunta: así
             quien solo vende por internet ve un formulario de dos campos, no
             uno de cuatro con la mitad que no entiende. -->
        <button
          v-if="group.optional"
          type="button"
          class="flex w-full items-center justify-between gap-2 text-left"
          @click="toggleGroup(group.key)"
        >
          <span>
            <span class="text-sm font-semibold text-slate-700">
              ¿Cobras también con datáfono?
            </span>
            <span class="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
              Opcional
            </span>
          </span>
          <i :class="isGroupOpen(group.key) ? 'pi pi-chevron-up' : 'pi pi-chevron-down'" />
        </button>

        <template v-else>
          <p class="text-sm font-semibold text-slate-700">{{ group.title }}</p>
          <p class="mb-2 text-[11px] text-slate-400">{{ group.blurb }}</p>
        </template>

        <p v-if="group.optional && !isGroupOpen(group.key)" class="mt-1 text-[11px] text-slate-400">
          Si solo vendes por internet, sáltate esto. Lo puedes agregar después sin desconectar nada.
        </p>

        <p
          v-if="group.optional && isGroupOpen(group.key)"
          class="mt-1 mb-2 text-[11px] text-slate-400"
        >
          {{ group.blurb }} Si las llenas, tienen que ir las dos.
        </p>

        <div v-show="!group.optional || isGroupOpen(group.key)" class="flex flex-col gap-3">
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
