<script setup lang="ts">
// Pantalla de bloqueo por falta de pago: a donde manda el router (y el
// interceptor de 402) cuando la suscripcion vencio y pasaron los dias de
// gracia. El admin va a pagar; un empleado no puede, pero con un boton le
// avisa al dueño por WhatsApp. Si el negocio ya pago (otra pestaña, el superadmin), se
// ofrece volver al inicio.
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useBusiness } from '@/composables/useBusiness'
import { useAuthStore } from '@/stores/auth.store'
import { NxButton } from '@/ui'

import { notifyAdminOfLockout } from '../services/subscriptionService'

const auth = useAuthStore()
const router = useRouter()
const { data: business } = useBusiness()

const isAdmin = computed(() => auth.user?.roles?.includes('admin') === true)
const locked = computed(() => business.value?.access_locked !== false)

// El empleado no puede pagar: le manda un WhatsApp al dueño.
const notifying = ref(false)
const notified = ref(false)
async function notifyAdmin(): Promise<void> {
  notifying.value = true
  try {
    await notifyAdminOfLockout()
    notified.value = true
  } finally {
    notifying.value = false
  }
}
</script>

<template>
  <div class="flex min-h-[60vh] items-center justify-center p-4">
    <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" :class="locked ? 'bg-red-50' : 'bg-emerald-50'">
        <i class="pi text-xl" :class="locked ? 'pi-lock text-red-600' : 'pi-check text-emerald-600'" />
      </div>

      <template v-if="locked">
        <h1 class="text-lg font-bold text-slate-900">El sistema está bloqueado</h1>
        <p class="mt-2 text-sm text-slate-600">
          La suscripción de <strong>{{ business?.name ?? 'tu negocio' }}</strong> venció y no se ha pagado. Tus datos
          están guardados: apenas se pague, todo vuelve a funcionar.
        </p>
        <NxButton v-if="isAdmin" class="mt-5 w-full" icon="pi pi-credit-card" @click="router.push({ name: 'subscription.index' })">
          Pagar ahora
        </NxButton>
        <template v-else>
          <p class="mt-4 text-sm text-slate-600">Solo el administrador del negocio puede pagar la suscripción.</p>
          <p v-if="notified" class="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <i class="pi pi-check mr-1 text-xs" />Listo, le avisamos al administrador por WhatsApp.
          </p>
          <NxButton v-else class="mt-4 w-full" icon="pi pi-whatsapp" :loading="notifying" @click="notifyAdmin">
            Avisar al administrador
          </NxButton>
        </template>
      </template>

      <template v-else>
        <h1 class="text-lg font-bold text-slate-900">Tu suscripción está al día</h1>
        <p class="mt-2 text-sm text-slate-600">Ya puedes seguir usando el sistema.</p>
        <NxButton class="mt-5 w-full" @click="router.push({ name: 'dashboard' })">Ir al inicio</NxButton>
      </template>
    </div>
  </div>
</template>
