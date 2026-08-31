<script setup lang="ts">
// Mismo lenguaje visual que el banner de cupo agotado en
// BusinessSettingsView.vue (pestaña "Asistente de IA") - la compra del
// paquete vive alli via useAiMessagePackCheckout, no se duplica esa logica
// de pago aca. El texto lo manda el backend (AiQuotaExceededException ya
// distingue admin/empleado), este componente solo le da el estilo y el
// enlace a Ajustes.
import { RouterLink } from 'vue-router'

defineProps<{ message: string }>()
</script>

<template>
  <div class="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
    <i class="pi pi-exclamation-triangle mt-0.5" />
    <div>
      <p>{{ message }}</p>
      <RouterLink :to="{ name: 'business-settings.index' }" class="font-medium underline">
        Ir a Ajustes
      </RouterLink>
    </div>
  </div>
</template>
