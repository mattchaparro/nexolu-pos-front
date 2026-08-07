<script setup lang="ts">
import type { Sale } from '@/types/sale'
import { formatCop } from '@/utils/formatCop'

defineProps<{
  tabs: Sale[]
}>()

const emit = defineEmits<{ select: [tab: Sale] }>()
</script>

<template>
  <div class="divide-y divide-slate-100 overflow-hidden rounded-xl border border-indigo-200 bg-white">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-indigo-50 active:bg-indigo-100"
      @click="emit('select', tab)"
    >
      <i class="pi pi-user shrink-0 text-xl text-indigo-400" />
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-semibold text-indigo-900">
          {{ tab.customer_name || `Cuenta #${tab.id}` }}
        </p>
        <p class="text-xs text-slate-400">
          {{ tab.items.length }} item(s)
          <span v-if="tab.is_delivery" class="ml-2 font-semibold text-fuchsia-600">
            <i class="pi pi-truck text-[10px] align-middle" /> Dom.
          </span>
        </p>
      </div>
      <p class="shrink-0 text-sm font-bold text-indigo-800">{{ formatCop(tab.total) }}</p>
      <i class="pi pi-chevron-right shrink-0 text-sm text-slate-300" />
    </button>
  </div>
</template>
