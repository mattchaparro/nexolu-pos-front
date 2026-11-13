<script setup lang="ts">
// El modal de confirmación del proyecto. Se monta UNA vez (App.vue) y lo abre
// confirmAction() desde cualquier pantalla - ver src/composables/useConfirm.ts.
// Reemplaza al window.confirm del navegador.
import { confirmState, settleConfirm } from '@/composables/useConfirm'

import NxButton from './NxButton.vue'
import NxModal from './NxModal.vue'
</script>

<template>
  <!-- Cerrar con la X, con Esc o tocando afuera cuenta como "no". -->
  <NxModal
    :model-value="confirmState.open"
    :title="confirmState.title"
    size="sm"
    @update:model-value="(open: boolean) => !open && settleConfirm(false)"
  >
    <p class="text-sm leading-relaxed whitespace-pre-line text-slate-600">
      {{ confirmState.message }}
    </p>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <NxButton variant="outline" @click="settleConfirm(false)">
          {{ confirmState.cancelLabel }}
        </NxButton>
        <NxButton
          :variant="confirmState.danger ? 'danger' : 'primary'"
          @click="settleConfirm(true)"
        >
          {{ confirmState.confirmLabel }}
        </NxButton>
      </div>
    </template>
  </NxModal>
</template>
