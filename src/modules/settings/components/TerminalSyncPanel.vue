<script setup lang="ts">
/**
 * Traer los datáfonos que el comercio expuso en Bold.
 *
 * Vive junto a las llaves y no en la pantalla de venta porque es
 * configuración: se hace una vez, y se repite solo si el comerciante agrega
 * o quita un aparato en la app de Bold.
 *
 * Existe porque faltaba: el endpoint de sincronización y el panel de cobro
 * ya estaban, pero NADA los conectaba. Sin datáfonos guardados el panel de
 * cobro no se dibuja, así que el comerciante cargaba sus llaves y no volvía
 * a ver nada — sin ningún botón que pudiera tocar ni explicación de por qué.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, ref } from 'vue'

import { fetchTerminals, syncTerminals } from '@/modules/sales/services/terminalService'
import { NxButton } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

const queryClient = useQueryClient()
const errorMessage = ref<string | null>(null)

const terminalsQuery = useQuery({ queryKey: ['terminals'], queryFn: fetchTerminals })

const syncMutation = useMutation({
  mutationFn: syncTerminals,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['terminals'] }),
})

const terminals = computed(() => terminalsQuery.data.value ?? [])

async function sync(): Promise<void> {
  errorMessage.value = null
  try {
    await syncMutation.mutateAsync()
  } catch (error) {
    errorMessage.value = extractErrorMessage(error, 'No pudimos consultar tus datáfonos.')
  }
}
</script>

<template>
  <div class="rounded-xl border border-slate-200 p-3">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm font-semibold text-slate-700">Tus datáfonos</p>
        <p class="text-[11px] text-slate-400">
          Los que tengas conectados en Bold. Vuelve a buscarlos si agregas o quitas un aparato.
        </p>
      </div>
      <NxButton variant="outline" size="sm" :loading="syncMutation.isPending.value" @click="sync">
        Buscar
      </NxButton>
    </div>

    <ul v-if="terminals.length > 0" class="mt-3 flex flex-col gap-1">
      <li
        v-for="terminal in terminals"
        :key="terminal.id"
        class="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5"
      >
        <span class="text-sm text-slate-700">{{ terminal.name }}</span>
        <span class="font-mono text-[11px] text-slate-400">{{ terminal.serial }}</span>
      </li>
    </ul>

    <p
      v-else-if="!terminalsQuery.isLoading.value"
      class="mt-3 rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-500"
    >
      Todavía no encontramos ninguno. En la app de Bold entra a
      <strong>Mi perfil → Preferencias de cobro → Conexiones API</strong>, actívalas y elige qué
      datáfonos quieres usar desde el POS. Solo funciona con Smart y Smart&nbsp;Pro.
    </p>

    <p v-if="errorMessage" class="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
      {{ errorMessage }}
    </p>
  </div>
</template>
