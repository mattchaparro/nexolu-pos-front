<script setup lang="ts">
// Columna de NxDataTable - pass-through de Column de PrimeVue. El slot
// "body" es el mas usado (renderizar precio formateado, badges de stock,
// botones de accion) - se reenvia explicito porque los slots con scope no
// pasan solos a traves de <slot />.
import PrimeColumn from 'primevue/column'

defineProps<{
  field?: string
  header?: string
  sortable?: boolean
}>()
</script>

<template>
  <PrimeColumn :field="field" :header="header" :sortable="sortable">
    <template v-if="$slots.body" #body="slotProps">
      <slot name="body" v-bind="slotProps" />
    </template>
  </PrimeColumn>
</template>
