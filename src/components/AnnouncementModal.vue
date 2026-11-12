<script setup lang="ts">
// Novedad publicada por el superadmin (ver SuperAdmin > Comunicaciones >
// Difusion): se muestra una vez al entrar, hasta que la persona la cierra o
// toca el boton. Una a la vez a proposito: tres ventanas seguidas al entrar
// es la forma segura de que no lea ninguna.
//
// Espera a que no haya otra ventana abierta (bienvenida, aviso de pago
// automatico) para no apilarlas, y no se muestra mientras el superadmin esta
// impersonando: cerrarla ahi la marcaria como vista por el dueño.
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { httpClient } from '@/services/http/client'
import { useAuthStore } from '@/stores/auth.store'
import { NxButton, NxModal } from '@/ui'

interface PendingAnnouncement {
  id: number
  title: string
  body: string
  cta_label: string | null
  cta_url: string | null
}

const auth = useAuthStore()
const router = useRouter()
const announcement = ref<PendingAnnouncement | null>(null)
const open = ref(false)

function otherDialogOpen(): boolean {
  return document.querySelector('[role="dialog"]') !== null
}

onMounted(async () => {
  if (auth.isImpersonating) {
    return
  }
  try {
    const { data } = await httpClient.get<{ data: PendingAnnouncement | null }>('/announcements/pending')
    if (!data.data) {
      return
    }
    announcement.value = data.data
    // Se reintenta un rato mientras haya otra ventana encima.
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 1200 : 3000))
      if (!otherDialogOpen()) {
        open.value = true
        return
      }
    }
  } catch {
    // Una novedad que no carga no es motivo para molestar a nadie.
  }
})

async function dismiss(): Promise<void> {
  const current = announcement.value
  open.value = false
  if (current) {
    try {
      await httpClient.post(`/announcements/${current.id}/dismiss`)
    } catch {
      // Si falla, se vuelve a mostrar la proxima vez: no es grave.
    }
  }
}

async function goToCta(): Promise<void> {
  const url = announcement.value?.cta_url
  await dismiss()
  if (!url) {
    return
  }
  if (url.startsWith('/')) {
    await router.push(url)
  } else {
    window.open(url, '_blank', 'noopener')
  }
}
</script>

<template>
  <NxModal :model-value="open" title="Novedades" size="sm" @update:model-value="(value) => !value && dismiss()">
    <div v-if="announcement" class="flex flex-col gap-3">
      <span class="flex size-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <i class="pi pi-megaphone text-lg" />
      </span>
      <p class="text-lg font-semibold text-slate-900">{{ announcement.title }}</p>
      <p class="text-sm whitespace-pre-line text-slate-600">{{ announcement.body }}</p>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <NxButton variant="outline" @click="dismiss">Entendido</NxButton>
        <NxButton v-if="announcement?.cta_url" @click="goToCta">
          {{ announcement.cta_label || 'Ver' }}
        </NxButton>
      </div>
    </template>
  </NxModal>
</template>
