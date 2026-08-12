<script setup lang="ts">
// Compartido entre Ordenes de servicio y Agenda (ambas muestran la etapa
// de una ServiceOrder) - no vive dentro de un modulo puntual, ver
// README.md "Modulos independientes".
import { computed } from 'vue'

import type { ServiceWorkflowStage } from '@/types/serviceWorkflow'

const props = defineProps<{
  stage: Partial<ServiceWorkflowStage> | null
}>()

// hexToRgba: el color de la etapa lo define un super admin (hex libre), asi
// que se pinta con estilo inline en vez de una clase Tailwind fija - mismo
// enfoque que el legacy (Admin/ServiceOrders/Index.vue).
function hexToRgba(hex: string, alpha: number): string {
  if (!hex || hex.length < 7) {
    return `rgba(107,114,128,${alpha})`
  }
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

const color = computed(() => props.stage?.color ?? '#6b7280')
</script>

<template>
  <span
    v-if="stage?.id != null"
    class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
    :style="{ background: hexToRgba(color, 0.12), color }"
  >
    <span class="h-1.5 w-1.5 flex-shrink-0 rounded-full" :style="{ background: color }" />
    {{ stage.label }}
  </span>
</template>
