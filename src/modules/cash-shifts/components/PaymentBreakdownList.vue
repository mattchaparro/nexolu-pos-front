<script setup lang="ts">
import type { PaymentBreakdownEntry } from '@/types/cashShift'
import { formatCop } from '@/utils/formatCop'

defineProps<{ breakdown: PaymentBreakdownEntry[] }>()
</script>

<template>
  <div class="flex flex-col gap-2">
    <div v-for="method in breakdown" :key="method.id" class="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-2.5">
      <span class="text-sm font-medium text-slate-700">{{ method.label }}</span>
      <span class="text-sm font-semibold text-slate-900">{{ formatCop(method.total) }}</span>
    </div>
    <p v-if="breakdown.length === 0" class="py-2 text-center text-xs text-slate-400">Sin ingresos todavía.</p>
  </div>
</template>
