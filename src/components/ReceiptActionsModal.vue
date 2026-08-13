<script setup lang="ts">
// Modal compartido de "Imprimir"/"Enviar" comprobante - usado desde Vender
// (al cerrar una venta o una cuenta abierta, ambas son 'sale'), Ordenes de
// servicio y Apartados. Antes de esto ninguno de los 3 flujos tenia forma
// de entregarle un comprobante al cliente (ver auditoria de paridad con
// legacy) - un solo componente en vez de 3 copias porque la logica de
// imprimir/enviar es identica, solo cambia el tipo/id de entidad que le
// pasa cada pantalla.
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import { fetchReceiptPdf, fetchReceiptPrintHtml, sendReceipt } from '@/services/receipts'
import type { ReceiptChannel, ReceiptEntityType } from '@/types/receipt'
import { NxButton, NxInput, NxModal } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

const props = defineProps<{
  modelValue: boolean
  entityType: ReceiptEntityType
  entityId: number
  documentTitle: string
  defaultPhone?: string | null
  defaultEmail?: string | null
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const { notify } = useSystemAlert()

// Dos formatos distintos, igual que el backend (ver ReceiptPdfService):
// "Imprimir" abre el HTML de impresion directo (dispara window.print() solo,
// sin visor de PDF de por medio - mejor para imprimir contra una impresora
// termica) y "Ver PDF" abre el PDF descargable/adjuntable (el mismo que se
// usa al enviar por WhatsApp/correo).
const isPrinting = ref(false)
const printError = ref<string | null>(null)

async function print(): Promise<void> {
  printError.value = null
  isPrinting.value = true
  try {
    const blob = await fetchReceiptPrintHtml(props.entityType, props.entityId)
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (error) {
    printError.value = extractErrorMessage(error, 'No pudimos generar el comprobante.')
  } finally {
    isPrinting.value = false
  }
}

const isOpeningPdf = ref(false)
const pdfError = ref<string | null>(null)

async function viewPdf(): Promise<void> {
  pdfError.value = null
  isOpeningPdf.value = true
  try {
    const blob = await fetchReceiptPdf(props.entityType, props.entityId)
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (error) {
    pdfError.value = extractErrorMessage(error, 'No pudimos generar el PDF.')
  } finally {
    isOpeningPdf.value = false
  }
}

const channel = ref<ReceiptChannel>('whatsapp')
const destination = ref('')
const sendError = ref<string | null>(null)
const isSending = ref(false)

watch(
  [() => props.modelValue, channel],
  ([open]) => {
    if (!open) {
      return
    }
    destination.value = (channel.value === 'whatsapp' ? props.defaultPhone : props.defaultEmail) ?? ''
  },
  { immediate: true },
)

const destinationLabel = computed(() => (channel.value === 'whatsapp' ? 'Número de WhatsApp' : 'Correo electrónico'))

async function send(): Promise<void> {
  sendError.value = null
  if (!destination.value.trim()) {
    sendError.value = 'Ingresa un destino.'
    return
  }

  isSending.value = true
  try {
    await sendReceipt(props.entityType, props.entityId, { channel: channel.value, to: destination.value.trim() })
    notify(channel.value === 'whatsapp' ? 'Tu comprobante se está enviando por WhatsApp.' : 'Tu comprobante se está enviando por correo.')
    emit('update:modelValue', false)
  } catch (error) {
    sendError.value = extractErrorMessage(error, 'No pudimos enviar el comprobante.')
  } finally {
    isSending.value = false
  }
}
</script>

<template>
  <NxModal :model-value="modelValue" :title="documentTitle" size="sm" @update:model-value="emit('update:modelValue', $event)">
    <div class="flex flex-col gap-4">
      <div>
        <p class="mb-2 text-sm font-semibold text-slate-700">Imprimir</p>
        <div class="flex flex-wrap gap-2">
          <NxButton variant="outline" icon="pi pi-print" :loading="isPrinting" @click="print">Imprimir</NxButton>
          <NxButton variant="outline" icon="pi pi-file-pdf" :loading="isOpeningPdf" @click="viewPdf">Ver PDF</NxButton>
        </div>
        <p v-if="printError" class="mt-1 text-xs text-red-600">{{ printError }}</p>
        <p v-if="pdfError" class="mt-1 text-xs text-red-600">{{ pdfError }}</p>
      </div>

      <div class="border-t border-slate-200 pt-4">
        <p class="mb-2 text-sm font-semibold text-slate-700">Enviar</p>
        <div class="mb-3 flex gap-2">
          <button
            type="button"
            class="flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
            :class="channel === 'whatsapp' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'"
            @click="channel = 'whatsapp'"
          >
            <i class="pi pi-comment mr-1.5" />WhatsApp
          </button>
          <button
            type="button"
            class="flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
            :class="channel === 'email' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'"
            @click="channel = 'email'"
          >
            <i class="pi pi-envelope mr-1.5" />Correo
          </button>
        </div>

        <NxInput
          v-model="destination"
          :label="destinationLabel"
          :type="channel === 'email' ? 'email' : 'tel'"
          :error="sendError ?? undefined"
        />

        <NxButton class="mt-3 w-full" :loading="isSending" @click="send">Enviar comprobante</NxButton>
      </div>
    </div>
  </NxModal>
</template>
