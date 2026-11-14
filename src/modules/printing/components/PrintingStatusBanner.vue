<script setup lang="ts">
// Aviso de impresión para la caja: si el computador que imprime se apagó
// (las comandas no están saliendo) o si hay tickets que no se pudieron
// imprimir. Solo con «Impresoras» encendida; sin nada que avisar no ocupa
// espacio.
import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'

import { useBusiness } from '@/composables/useBusiness'
import { hasFeature } from '@/utils/hasFeature'

import { fetchPrintingStatus } from '../services/printingService'

const { data: business } = useBusiness()
const enabled = computed(() => hasFeature(business.value, 'auto_printing'))

const statusQuery = useQuery({
  queryKey: ['printing-status'],
  queryFn: fetchPrintingStatus,
  enabled,
  refetchInterval: 15_000,
})

const status = computed(() => statusQuery.data.value)
const offline = computed(() => status.value?.agents_offline ?? [])
</script>

<template>
  <div v-if="enabled && status" class="flex flex-col gap-2">
    <div
      v-if="offline.length > 0"
      class="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
      role="alert"
    >
      <i class="pi pi-exclamation-circle mt-0.5" />
      <p>
        <span class="font-semibold">No está saliendo nada impreso.</span>
        {{ offline.join(', ') }} lleva más de un minuto sin conectarse. Revisa que esté prendido y
        con internet; lo que se vende mientras tanto se imprime cuando vuelva.
      </p>
    </div>
    <div
      v-else-if="status.failed_jobs > 0"
      class="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
      role="status"
    >
      <i class="pi pi-print mt-0.5" />
      <p>
        {{
          status.failed_jobs === 1
            ? 'Un ticket no se pudo imprimir en las últimas 24 horas'
            : `${status.failed_jobs} tickets no se pudieron imprimir en las últimas 24 horas`
        }}. Revisa papel y cable de la impresora; el administrador los puede reintentar en Ajustes ›
        Impresoras.
      </p>
    </div>
  </div>
</template>
