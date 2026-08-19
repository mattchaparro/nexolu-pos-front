<script setup lang="ts">
// Igual que el legacy (StaleShiftBanner.vue): visible siempre que el turno
// venga de un dia calendario anterior, sin boton para ocultarlo - mientras
// siga abierto sus totales abarcan dos dias, no es una notificacion que se
// pueda descartar sin resolver el problema.
import type { CashShift } from '@/types/cashShift'

defineProps<{ shift: CashShift }>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm text-white shadow-sm">
    <i class="pi pi-clock shrink-0" />
    <span class="font-semibold">Tienes un turno abierto desde el {{ new Date(shift.opened_at).toLocaleDateString('es-CO') }}.</span>
    <span class="text-xs text-white/90">Ciérralo y abre uno nuevo para que sus totales no mezclen dos días.</span>
  </div>
</template>
