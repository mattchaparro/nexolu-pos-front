<script setup lang="ts">
/**
 * Qué le falta a la tienda antes de abrirla.
 *
 * Cada punto es un enlace a la sección donde se arregla: decirle a alguien
 * "te falta el WhatsApp" sin llevarlo hasta el campo le deja el trabajo de
 * buscarlo.
 */
import type { ChecklistItem } from '../composables/usePublishChecklist'

defineProps<{
  items: ChecklistItem[]
  progress: number
  ready: boolean
}>()

const emit = defineEmits<{ go: [section: string] }>()
</script>

<template>
  <div class="flex flex-col gap-3">
    <div>
      <div class="mb-1 flex items-center justify-between">
        <p class="text-sm font-semibold text-slate-700">Listo para abrir</p>
        <span class="text-xs font-semibold text-slate-500">{{ progress }}%</span>
      </div>
      <div class="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          class="h-full rounded-full transition-[width] duration-300"
          :class="ready ? 'bg-emerald-500' : 'bg-indigo-500'"
          :style="{ width: `${progress}%` }"
        />
      </div>
    </div>

    <p v-if="ready" class="rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-800">
      Tu tienda tiene lo necesario para abrir. Lo que queda es opcional.
    </p>

    <ul class="flex flex-col gap-1">
      <li v-for="item in items" :key="item.key">
        <button
          type="button"
          class="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-50"
          :disabled="item.done"
          :class="item.done ? 'cursor-default' : ''"
          @click="emit('go', item.section)"
        >
          <i
            class="pi mt-0.5 text-xs"
            :class="
              item.done
                ? 'pi-check-circle text-emerald-500'
                : item.blocking
                  ? 'pi-exclamation-circle text-amber-500'
                  : 'pi-circle text-slate-300'
            "
          />
          <span class="min-w-0 flex-1">
            <span
              class="block text-xs font-medium"
              :class="item.done ? 'text-slate-400 line-through' : 'text-slate-700'"
            >
              {{ item.label }}
            </span>
            <span v-if="!item.done" class="block text-[11px] text-slate-400">
              {{ item.hint }}
            </span>
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>
