<script setup lang="ts">
// Agregar/editar una impresora térmica. Mismo patrón modal que
// BranchFormModal (resetForm / watch-on-open / fieldErrors / formError).
//
// Una impresora la maneja un computador (el que tiene el agente): por red
// se escribe su IP; por USB se elige de las impresoras que ese computador
// reporta tener instaladas en Windows.
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { computed, ref, watch } from 'vue'

import { useBranches } from '@/composables/useBranches'
import { useSystemAlert } from '@/composables/useSystemAlert'
import { NxButton, NxInput, NxModal, NxSelect, NxSwitch } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'

import {
  createPrinter,
  updatePrinter,
  type PrintAgent,
  type Printer,
  type PrinterConnection,
  type PrinterPayload,
  type PrinterRole,
} from '../services/printingService'

const props = defineProps<{
  modelValue: boolean
  printer: Printer | null
  agents: PrintAgent[]
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { notify } = useSystemAlert()
const queryClient = useQueryClient()
const { branches, hasMultipleBranches } = useBranches()

const roleOptions: { label: string; value: PrinterRole }[] = [
  { label: 'Cocina (comandas)', value: 'kitchen' },
  { label: 'Mostrador (facturas, domicilios y cajón)', value: 'counter' },
]
const connectionOptions: { label: string; value: PrinterConnection }[] = [
  { label: 'Cable de red (IP)', value: 'network' },
  { label: 'USB, instalada en Windows', value: 'windows' },
]
const paperOptions = [
  { label: '80 mm', value: 80 },
  { label: '58 mm', value: 58 },
]

const name = ref('')
const role = ref<PrinterRole>('kitchen')
const connection = ref<PrinterConnection>('network')
const address = ref('')
const paperWidth = ref<58 | 80>(80)
const agentId = ref<number | null>(null)
const branchId = ref<number | null>(null)
const isActive = ref(true)
const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)

const pairedAgents = computed(() => props.agents.filter((agent) => agent.status === 'paired'))
const branchOptions = computed(() => [
  { label: 'Todas las sedes', value: null },
  ...branches.value.map((branch) => ({ label: branch.name, value: branch.id })),
])
const windowsPrinters = computed(() => {
  const agent = props.agents.find((candidate) => candidate.id === agentId.value)
  return (agent?.reported_printers ?? []).map((printerName) => ({
    label: printerName,
    value: printerName,
  }))
})

const mutation = useMutation({
  mutationFn: (payload: PrinterPayload) =>
    props.printer ? updatePrinter(props.printer.id, payload) : createPrinter(payload),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['printing'] }),
})

function resetForm(): void {
  name.value = props.printer?.name ?? ''
  role.value = props.printer?.role ?? 'kitchen'
  connection.value = props.printer?.connection ?? 'network'
  address.value = props.printer?.address ?? ''
  paperWidth.value = props.printer?.paper_width ?? 80
  agentId.value = props.printer?.print_agent_id ?? pairedAgents.value[0]?.id ?? null
  branchId.value = props.printer?.branch_id ?? null
  isActive.value = props.printer?.is_active ?? true
  fieldErrors.value = {}
  formError.value = null
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      resetForm()
    }
  },
)

// Al cambiar de red a USB la IP no sirve como nombre de impresora, y al revés.
// Es un manejador y no un watch: un watch también se dispararía al llenar el
// formulario de una impresora existente y le borraría la dirección.
function changeConnection(value: PrinterConnection): void {
  if (value !== connection.value) {
    address.value = ''
  }
  connection.value = value
}

async function submit(): Promise<void> {
  fieldErrors.value = {}
  formError.value = null
  if (agentId.value === null) {
    formError.value = 'Primero vincula el computador que maneja la impresora.'
    return
  }

  try {
    await mutation.mutateAsync({
      name: name.value.trim(),
      role: role.value,
      connection: connection.value,
      address: address.value.trim(),
      paper_width: paperWidth.value,
      is_active: isActive.value,
      branch_id: branchId.value,
      print_agent_id: agentId.value,
    })
    notify(
      props.printer
        ? 'Impresora actualizada.'
        : 'Impresora agregada. Imprime una prueba para revisarla.',
      'success',
    )
    emit('update:modelValue', false)
  } catch (error) {
    fieldErrors.value = extractFieldErrors(error)
    formError.value = extractErrorMessage(error, 'No pudimos guardar la impresora.')
  }
}
</script>

<template>
  <NxModal
    :model-value="modelValue"
    :title="printer ? 'Editar impresora' : 'Agregar impresora'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-4">
      <NxInput v-model="name" label="Nombre" placeholder="Cocina" :error="fieldErrors.name" />

      <NxSelect
        v-model="role"
        :options="roleOptions"
        option-label="label"
        option-value="value"
        label="Qué imprime"
        :error="fieldErrors.role"
      />

      <NxSelect
        v-model="agentId"
        :options="pairedAgents"
        option-label="name"
        option-value="id"
        label="Computador que la maneja"
        :error="fieldErrors.print_agent_id"
      />

      <NxSelect
        :model-value="connection"
        :options="connectionOptions"
        option-label="label"
        option-value="value"
        label="Cómo está conectada"
        :error="fieldErrors.connection"
        @update:model-value="changeConnection($event as PrinterConnection)"
      />

      <template v-if="connection === 'network'">
        <NxInput
          v-model="address"
          label="IP de la impresora"
          placeholder="192.168.1.50"
          :error="fieldErrors.address"
        />
        <p class="-mt-2 text-xs text-slate-500">
          La IP sale en la hoja de configuración de la impresora (casi siempre se imprime dejando
          oprimido el botón de avance al prenderla). Si no le pones puerto, se usa el 9100.
        </p>
      </template>
      <template v-else>
        <NxSelect
          v-if="windowsPrinters.length > 0"
          v-model="address"
          :options="windowsPrinters"
          option-label="label"
          option-value="value"
          label="Impresora instalada en Windows"
          :error="fieldErrors.address"
        />
        <template v-else>
          <NxInput
            v-model="address"
            label="Nombre de la impresora en Windows"
            :error="fieldErrors.address"
          />
          <p class="-mt-2 text-xs text-slate-500">
            Ese computador todavía no ha reportado sus impresoras. Escribe el nombre tal como
            aparece en Windows › Impresoras.
          </p>
        </template>
      </template>

      <NxSelect
        v-model="paperWidth"
        :options="paperOptions"
        option-label="label"
        option-value="value"
        label="Ancho del papel"
        :error="fieldErrors.paper_width"
      />

      <NxSelect
        v-if="hasMultipleBranches"
        v-model="branchId"
        :options="branchOptions"
        option-label="label"
        option-value="value"
        label="Sede"
        :error="fieldErrors.branch_id"
      />

      <div v-if="printer" class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-slate-700">Activa</p>
          <p class="text-xs text-slate-500">Apagada, no le llega nada.</p>
        </div>
        <NxSwitch v-model="isActive" />
      </div>

      <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
    </div>

    <template #footer>
      <NxButton variant="secondary" @click="emit('update:modelValue', false)">Cancelar</NxButton>
      <NxButton :loading="mutation.isPending.value" @click="submit">Guardar</NxButton>
    </template>
  </NxModal>
</template>
