<script setup lang="ts">
// Aviso de una sola vez (por navegador) al administrador: desde nov-2026 la
// suscripcion se cobra sola al medio de pago registrado, y si no se paga el
// sistema se bloquea despues de 2 dias de gracia. Antes nadie cobraba al
// vencer y el aviso iba solo por correo, que casi nadie lee.
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'
import { NxButton, NxModal } from '@/ui'

const SEEN_KEY = 'nx_aviso_pago_automatico_visto'
// Si hay una bienvenida de migracion pendiente, esa va primero.
const WELCOME_PENDING_KEY = 'nx_bienvenida_pendiente'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    // localStorage puede fallar (modo privado): no mostrarlo es lo seguro.
    return true
  }
}

const dismissed = ref(readFlag(SEEN_KEY) || readFlag(WELCOME_PENDING_KEY))

const visible = computed(
  () =>
    !dismissed.value &&
    auth.user?.roles?.includes('admin') === true &&
    !auth.user?.roles?.includes('superadmin') &&
    !auth.isImpersonating &&
    route.name !== 'subscription.locked',
)

function dismiss(): void {
  dismissed.value = true
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {
    // ver readFlag
  }
}

function goToSubscription(): void {
  dismiss()
  router.push({ name: 'subscription.index' })
}
</script>

<template>
  <NxModal :model-value="visible" :closable="true" size="sm" @update:model-value="dismiss">
    <div class="flex flex-col items-center gap-4 py-2 text-center">
      <span class="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
        <i class="pi pi-sync text-3xl text-indigo-600" aria-hidden="true" />
      </span>

      <span class="rounded-full bg-indigo-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
        Pago automático
      </span>

      <h2 class="text-xl font-bold text-slate-900">Tu suscripción ahora se paga sola</h2>

      <p class="text-sm leading-relaxed text-slate-600">
        Cuando registras una tarjeta o una cuenta Nequi, el día que vence tu suscripción le hacemos el cobro
        automáticamente. Te recomendamos tener saldo o cupo disponible.
      </p>

      <p class="text-sm leading-relaxed text-slate-600">
        Te avisamos por WhatsApp 3 días antes y cuando se haga el cobro. Si no pasa, lo reintentamos. Si la
        suscripción no se paga, tienes 2 días de gracia y después el sistema se bloquea hasta que se pague.
      </p>
    </div>

    <template #footer>
      <div class="flex w-full flex-col gap-2">
        <NxButton class="w-full" @click="goToSubscription">Ver mi suscripción</NxButton>
        <NxButton class="w-full" variant="secondary" @click="dismiss">Entendido</NxButton>
      </div>
    </template>
  </NxModal>
</template>
