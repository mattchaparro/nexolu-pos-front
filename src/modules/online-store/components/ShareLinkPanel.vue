<script setup lang="ts">
// Compartir un enlace de la tienda (el catálogo completo o un producto):
// copiarlo, mandarlo por WhatsApp, el menú de compartir del celular y un QR
// para imprimir en el mostrador. El QR se genera en el navegador: es la misma
// URL pública, no hace falta pedírsela a nadie.
import QRCode from 'qrcode'
import { ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import { NxButton } from '@/ui'

const props = defineProps<{
  url: string
  /** El texto que acompaña al enlace cuando se comparte. */
  shareText: string
  /** Nombre del PNG del QR, sin extensión. */
  qrFileName: string
}>()

const { notify } = useSystemAlert()
const qrDataUrl = ref<string | null>(null)
const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

watch(
  () => props.url,
  async (url) => {
    try {
      qrDataUrl.value = await QRCode.toDataURL(url, { width: 768, margin: 2 })
    } catch {
      qrDataUrl.value = null
    }
  },
  { immediate: true },
)

function openWhatsapp(): void {
  const text = encodeURIComponent(`${props.shareText}\n${props.url}`)
  window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener')
}

async function copy(): Promise<void> {
  await navigator.clipboard.writeText(props.url)
  notify('Enlace copiado')
}

async function nativeShare(): Promise<void> {
  try {
    await navigator.share({ text: props.shareText, url: props.url })
  } catch {
    // Cerrar el menú de compartir no es un error.
  }
}

function downloadQr(): void {
  if (!qrDataUrl.value) {
    return
  }
  const link = document.createElement('a')
  link.href = qrDataUrl.value
  link.download = `${props.qrFileName}.png`
  link.click()
}
</script>

<template>
  <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
    <img
      v-if="qrDataUrl"
      :src="qrDataUrl"
      alt="Código QR del enlace"
      class="size-32 shrink-0 self-center rounded-lg border border-slate-200 sm:self-start"
    />
    <div class="flex min-w-0 flex-1 flex-col gap-3">
      <div class="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
        <span class="min-w-0 flex-1 truncate font-mono text-xs text-slate-600">{{ url }}</span>
        <a
          :href="url"
          target="_blank"
          rel="noopener"
          class="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
        >
          Abrir
        </a>
      </div>
      <div class="flex flex-wrap gap-2">
        <NxButton size="sm" icon="pi pi-copy" @click="copy">Copiar enlace</NxButton>
        <NxButton size="sm" variant="outline" icon="pi pi-whatsapp" @click="openWhatsapp">
          Enviar por WhatsApp
        </NxButton>
        <NxButton
          v-if="canNativeShare"
          size="sm"
          variant="outline"
          icon="pi pi-share-alt"
          @click="nativeShare"
        >
          Compartir
        </NxButton>
        <NxButton
          v-if="qrDataUrl"
          size="sm"
          variant="outline"
          icon="pi pi-qrcode"
          @click="downloadQr"
        >
          Descargar QR
        </NxButton>
      </div>
    </div>
  </div>
</template>
