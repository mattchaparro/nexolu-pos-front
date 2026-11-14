<script setup lang="ts">
// Ajustes › Impresoras: el computador que imprime (Nexolú Print Agent), las
// impresoras que maneja, cómo sale la factura y los tickets que fallaron.
//
// Vincular un computador es en dos pasos: aquí se crea y se muestra un código
// de 6 números; el instalador del agente lo pide y queda conectado. La
// pantalla se refresca sola mientras está abierta para ver cuándo se vinculó.
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, ref } from 'vue'

import { confirmAction } from '@/composables/useConfirm'
import { useSystemAlert } from '@/composables/useSystemAlert'
import { NxButton, NxCard, NxInput, NxModal, NxSelect, NxSwitch } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import {
  createPrintAgent,
  deletePrintAgent,
  deletePrinter,
  fetchPrintingOverview,
  printTestPage,
  regeneratePairingCode,
  retryPrintJob,
  updatePrintSettings,
  type PrintAgent,
  type Printer,
  type PrintSettings,
} from '../services/printingService'
import PrinterFormModal from './PrinterFormModal.vue'

const { notify } = useSystemAlert()
const queryClient = useQueryClient()

const overviewQuery = useQuery({
  queryKey: ['printing'],
  queryFn: fetchPrintingOverview,
  refetchInterval: 10_000,
})

const overview = computed(() => overviewQuery.data.value)
const agents = computed(() => overview.value?.agents ?? [])
const printers = computed(() => overview.value?.printers ?? [])
const failedJobs = computed(() => overview.value?.failed_jobs ?? [])

const refresh = () => queryClient.invalidateQueries({ queryKey: ['printing'] })

// ---------- Factura ----------------------------------------------------
const copiesOptions = [
  { label: 'Una (para el cliente)', value: 1 },
  { label: 'Dos (cliente y copia del local)', value: 2 },
]

const settingsMutation = useMutation({
  mutationFn: (payload: Partial<PrintSettings>) => updatePrintSettings(payload),
  onSuccess: () => notify('Guardado.', 'success'),
  onError: (error) => notify(extractErrorMessage(error, 'No pudimos guardar.'), 'error'),
  onSettled: refresh,
})

// ---------- Computadores -----------------------------------------------
const pairingOpen = ref(false)
const newAgentName = ref('Computador de la caja')
const pairingCode = ref<string | null>(null)
const pairingAgentId = ref<number | null>(null)

const pairingAgent = computed(
  () => agents.value.find((agent) => agent.id === pairingAgentId.value) ?? null,
)
const pairingDone = computed(() => pairingAgent.value?.status === 'paired')

const createAgentMutation = useMutation({
  mutationFn: () => createPrintAgent({ name: newAgentName.value.trim() }),
  onSuccess: (result) => {
    pairingCode.value = result.pairing_code
    pairingAgentId.value = result.agent.id
    refresh()
  },
  onError: (error) =>
    notify(extractErrorMessage(error, 'No pudimos crear el computador.'), 'error'),
})

const regenerateMutation = useMutation({
  mutationFn: (agentId: number) => regeneratePairingCode(agentId),
  onSuccess: (result) => {
    pairingCode.value = result.pairing_code
    pairingAgentId.value = result.agent.id
    pairingOpen.value = true
    refresh()
  },
  onError: (error) => notify(extractErrorMessage(error, 'No pudimos generar el código.'), 'error'),
})

function openPairing(): void {
  pairingCode.value = null
  pairingAgentId.value = null
  newAgentName.value = agents.value.length === 0 ? 'Computador de la caja' : ''
  pairingOpen.value = true
}

async function relink(agent: PrintAgent): Promise<void> {
  if (
    agent.status === 'paired' &&
    !(await confirmAction(
      `¿Generar un código nuevo para "${agent.name}"? Deja de imprimir hasta que escribas el código en ese computador.`,
    ))
  ) {
    return
  }
  regenerateMutation.mutate(agent.id)
}

async function removeAgent(agent: PrintAgent): Promise<void> {
  if (
    !(await confirmAction(
      `¿Quitar "${agent.name}"? Sus impresoras quedan sin computador hasta que les asignes otro.`,
    ))
  ) {
    return
  }
  try {
    await deletePrintAgent(agent.id)
    notify('Computador quitado.', 'success')
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos quitarlo.'), 'error')
  } finally {
    refresh()
  }
}

function agentState(agent: PrintAgent): { label: string; classes: string } {
  if (agent.status === 'pairing') {
    return { label: 'Esperando el código', classes: 'bg-amber-50 text-amber-700' }
  }
  if (agent.status !== 'paired') {
    return { label: 'Sin vincular', classes: 'bg-slate-100 text-slate-600' }
  }
  return agent.is_online
    ? { label: 'Conectado', classes: 'bg-emerald-50 text-emerald-700' }
    : { label: 'Desconectado', classes: 'bg-red-50 text-red-700' }
}

function agentName(agentId: number | null): string {
  return agents.value.find((agent) => agent.id === agentId)?.name ?? 'Sin computador'
}

// ---------- Impresoras -------------------------------------------------
const printerModalOpen = ref(false)
const editingPrinter = ref<Printer | null>(null)

function openPrinter(printer: Printer | null): void {
  editingPrinter.value = printer
  printerModalOpen.value = true
}

const testMutation = useMutation({
  mutationFn: (printerId: number) => printTestPage(printerId),
  onSuccess: () => notify('Página de prueba enviada. Debe salir en unos segundos.', 'success'),
  onError: (error) => notify(extractErrorMessage(error, 'No pudimos enviar la prueba.'), 'error'),
})

async function removePrinter(printer: Printer): Promise<void> {
  if (!(await confirmAction(`¿Quitar la impresora "${printer.name}"?`))) {
    return
  }
  try {
    await deletePrinter(printer.id)
    notify('Impresora quitada.', 'success')
  } catch (error) {
    notify(extractErrorMessage(error, 'No pudimos quitarla.'), 'error')
  } finally {
    refresh()
  }
}

function roleLabel(printer: Printer): string {
  return printer.role === 'kitchen' ? 'Cocina' : 'Mostrador'
}

function connectionLabel(printer: Printer): string {
  return printer.connection === 'network' ? `Red · ${printer.address}` : `USB · ${printer.address}`
}

// ---------- Tickets que fallaron ---------------------------------------
const retryMutation = useMutation({
  mutationFn: (jobId: number) => retryPrintJob(jobId),
  onSuccess: () => notify('Se vuelve a intentar.', 'success'),
  onError: (error) => notify(extractErrorMessage(error, 'No pudimos reintentarlo.'), 'error'),
  onSettled: refresh,
})

const jobTypeLabels: Record<string, string> = {
  kitchen_ticket: 'Comanda',
  kitchen_addition: 'Adición',
  kitchen_void: 'Anulación',
  receipt: 'Factura',
  delivery: 'Domicilio',
  test: 'Prueba',
}
</script>

<template>
  <div class="mt-3 flex flex-col gap-4">
    <div v-if="overviewQuery.isPending.value" class="h-48 animate-pulse rounded-xl bg-slate-100" />

    <template v-else-if="overview">
      <!-- Computadores -->
      <NxCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="font-semibold text-slate-900">Computador que imprime</h2>
              <p class="text-sm text-slate-500">
                El que tiene instalado Nexolú Print Agent. Tiene que quedar prendido mientras el
                local esté abierto.
              </p>
            </div>
            <NxButton icon="pi pi-link" size="sm" @click="openPairing">Vincular</NxButton>
          </div>
        </template>

        <p v-if="agents.length === 0" class="text-sm text-slate-500">
          Todavía no hay ningún computador vinculado. Instala el agente en el computador de la caja
          y vincúlalo con el botón de arriba.
        </p>
        <ul v-else class="flex flex-col divide-y divide-slate-100">
          <li
            v-for="agent in agents"
            :key="agent.id"
            class="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <div class="min-w-0">
              <p class="font-medium text-slate-900">{{ agent.name }}</p>
              <p class="text-xs text-slate-500">
                <span
                  class="rounded-full px-2 py-0.5 font-medium"
                  :class="agentState(agent).classes"
                >
                  {{ agentState(agent).label }}
                </span>
                <span v-if="agent.version" class="ml-2">Versión {{ agent.version }}</span>
              </p>
            </div>
            <div class="flex gap-2">
              <NxButton
                variant="outline"
                size="sm"
                :loading="regenerateMutation.isPending.value"
                @click="relink(agent)"
              >
                {{ agent.status === 'paired' ? 'Volver a vincular' : 'Ver código' }}
              </NxButton>
              <NxButton variant="ghost" size="sm" icon="pi pi-trash" @click="removeAgent(agent)" />
            </div>
          </li>
        </ul>
      </NxCard>

      <!-- Impresoras -->
      <NxCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="font-semibold text-slate-900">Impresoras</h2>
              <p class="text-sm text-slate-500">
                La de cocina recibe las comandas; la del mostrador, facturas y domicilios.
              </p>
            </div>
            <NxButton
              icon="pi pi-plus"
              size="sm"
              :disabled="agents.length === 0"
              @click="openPrinter(null)"
            >
              Agregar
            </NxButton>
          </div>
        </template>

        <p v-if="printers.length === 0" class="text-sm text-slate-500">
          {{
            agents.length === 0
              ? 'Primero vincula el computador.'
              : 'Agrega la impresora de cocina y la del mostrador.'
          }}
        </p>
        <ul v-else class="flex flex-col divide-y divide-slate-100">
          <li
            v-for="printer in printers"
            :key="printer.id"
            class="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <div class="min-w-0">
              <p class="font-medium text-slate-900">
                {{ printer.name }}
                <span
                  class="ml-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
                  >{{ roleLabel(printer) }}</span
                >
                <span
                  v-if="!printer.is_active"
                  class="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500"
                  >Apagada</span
                >
              </p>
              <p class="truncate text-xs text-slate-500">
                {{ connectionLabel(printer) }} · {{ printer.paper_width }} mm ·
                {{ agentName(printer.print_agent_id) }}
              </p>
            </div>
            <div class="flex gap-2">
              <NxButton
                variant="outline"
                size="sm"
                icon="pi pi-print"
                :loading="
                  testMutation.isPending.value && testMutation.variables.value === printer.id
                "
                @click="testMutation.mutate(printer.id)"
              >
                Prueba
              </NxButton>
              <NxButton
                variant="ghost"
                size="sm"
                icon="pi pi-pencil"
                @click="openPrinter(printer)"
              />
              <NxButton
                variant="ghost"
                size="sm"
                icon="pi pi-trash"
                @click="removePrinter(printer)"
              />
            </div>
          </li>
        </ul>
      </NxCard>

      <!-- Factura -->
      <NxCard>
        <template #header>
          <h2 class="font-semibold text-slate-900">Factura</h2>
        </template>
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-slate-700">Imprimir la factura al cobrar</p>
              <p class="text-xs text-slate-500">
                Sale sola en la impresora del mostrador. Apagado, solo se imprime con «Imprimir».
              </p>
            </div>
            <NxSwitch
              :model-value="overview.settings.auto_print_receipts"
              @update:model-value="settingsMutation.mutate({ auto_print_receipts: $event })"
            />
          </div>
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-slate-700">Abrir el cajón con efectivo</p>
              <p class="text-xs text-slate-500">
                El cajón va conectado a la impresora del mostrador.
              </p>
            </div>
            <NxSwitch
              :model-value="overview.settings.open_cash_drawer"
              @update:model-value="settingsMutation.mutate({ open_cash_drawer: $event })"
            />
          </div>
          <NxSelect
            :model-value="overview.settings.receipt_copies"
            :options="copiesOptions"
            option-label="label"
            option-value="value"
            label="Copias de la factura"
            @update:model-value="settingsMutation.mutate({ receipt_copies: $event as 1 | 2 })"
          />
        </div>
      </NxCard>

      <!-- Fallidos -->
      <NxCard v-if="failedJobs.length > 0">
        <template #header>
          <h2 class="font-semibold text-slate-900">Tickets que no salieron</h2>
        </template>
        <ul class="flex flex-col divide-y divide-slate-100">
          <li
            v-for="job in failedJobs"
            :key="job.id"
            class="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-slate-900">
                {{ jobTypeLabels[job.type] ?? job.type }} · {{ job.printer_name }}
              </p>
              <p class="text-xs text-red-700">{{ job.last_error }}</p>
            </div>
            <NxButton
              variant="outline"
              size="sm"
              icon="pi pi-refresh"
              :loading="retryMutation.isPending.value && retryMutation.variables.value === job.id"
              @click="retryMutation.mutate(job.id)"
            >
              Reintentar
            </NxButton>
          </li>
        </ul>
      </NxCard>
    </template>

    <PrinterFormModal v-model="printerModalOpen" :printer="editingPrinter" :agents="agents" />

    <!-- Vincular un computador -->
    <NxModal v-model="pairingOpen" title="Vincular un computador" size="sm">
      <div v-if="!pairingCode" class="flex flex-col gap-4">
        <NxInput
          v-model="newAgentName"
          label="Nombre del computador"
          placeholder="Computador de la caja"
        />
        <p class="text-xs text-slate-500">
          Te damos un código de 6 números para escribirlo en el instalador del agente.
        </p>
      </div>
      <div v-else-if="pairingDone" class="flex flex-col items-center gap-3 py-4 text-center">
        <i class="pi pi-check-circle text-4xl text-emerald-600" />
        <p class="font-semibold text-slate-900">{{ pairingAgent?.name }} quedó vinculado.</p>
        <p class="text-sm text-slate-500">Ahora agrega sus impresoras e imprime una prueba.</p>
      </div>
      <div v-else class="flex flex-col items-center gap-3 py-2 text-center">
        <p class="text-sm text-slate-600">
          En el computador, abre Nexolú Print Agent y escribe este código:
        </p>
        <p class="font-mono text-4xl font-bold tracking-[0.3em] text-slate-900">
          {{ pairingCode }}
        </p>
        <p class="text-xs text-slate-500">
          Vence en 10 minutos. Esta ventana avisa cuando quede vinculado.
        </p>
      </div>
      <template #footer>
        <NxButton variant="secondary" @click="pairingOpen = false">{{
          pairingCode ? 'Cerrar' : 'Cancelar'
        }}</NxButton>
        <NxButton
          v-if="!pairingCode"
          :loading="createAgentMutation.isPending.value"
          :disabled="newAgentName.trim() === ''"
          @click="createAgentMutation.mutate()"
        >
          Generar código
        </NxButton>
      </template>
    </NxModal>
  </div>
</template>
