<script setup lang="ts">
import { watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import { useFlashStore } from '@/stores/flash.store'
import { NxToast } from '@/ui'

// Puente para mensajes disparados fuera de un componente (guard del
// router, interceptor de axios) - ver src/stores/flash.store.ts.
const flash = useFlashStore()
const { notify } = useSystemAlert()

watch(
  () => flash.message,
  (msg) => {
    if (msg) {
      notify(msg, flash.severity)
      flash.clear()
    }
  },
)
</script>

<template>
  <router-view />
  <NxToast />
</template>
