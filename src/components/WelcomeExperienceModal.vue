<script setup lang="ts">
// Bienvenida para un negocio recien migrado desde legacy - ver
// useWelcomeExperience.ts para el flujo completo (flag ?bienvenida=1 ->
// localStorage -> se muestra una sola vez, nunca mas en este navegador).
import { NxButton, NxModal } from '@/ui'
import { useWelcomeExperience } from '@/composables/useWelcomeExperience'

const { showWelcome, dismiss } = useWelcomeExperience()
</script>

<template>
  <NxModal :model-value="showWelcome" :closable="true" size="sm" @update:model-value="dismiss">
    <div class="flex flex-col items-center gap-4 py-2 text-center">
      <span class="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
        <i class="pi pi-verified text-3xl text-indigo-600" aria-hidden="true" />
      </span>

      <h2 class="text-xl font-bold text-slate-900">
        ¡Bienvenido a la nueva experiencia de Nexolú!
      </h2>

      <p class="text-sm leading-relaxed text-slate-600">
        Tu negocio ya está usando la nueva versión de Nexolú. La preparamos para que
        administrarlo sea más sencillo, rápido y práctico.
      </p>

      <p class="text-sm leading-relaxed text-slate-600">
        Tu información ya está disponible - puedes continuar trabajando con normalidad.
      </p>
    </div>

    <template #footer>
      <NxButton class="w-full" @click="dismiss">Comenzar</NxButton>
    </template>
  </NxModal>
</template>
