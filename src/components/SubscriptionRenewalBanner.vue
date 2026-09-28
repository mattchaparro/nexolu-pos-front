<script setup lang="ts">
// Aviso de vencimiento de la suscripcion en todas las pantallas del negocio.
// Puerto de SubscriptionRenewalBanner.vue del legacy, que el POS nuevo no
// tenia: Las Banquitas llego a su ultimo dia (2026-09-28) sin ver ningun
// aviso. Aparece desde `subscription_warning_days` dias antes (5 por
// defecto, igual que el legacy) y no se puede cerrar - es justo lo que
// evita que el negocio se quede sin servicio de sorpresa.
//
// Solo el admin puede pagar (la ruta de suscripcion es requiresAdmin): a un
// empleado se le dice a quien avisarle en vez de mostrarle un boton que lo
// rebotaria.
import { computed } from 'vue'

import { useBusiness } from '@/composables/useBusiness'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const { data: business } = useBusiness()

const isAdmin = computed(() => auth.user?.roles?.includes('admin') === true)

const alert = computed(() => {
  const b = business.value
  if (!b || b.subscription_status === 'inactive') {
    return null
  }
  const planLabel = b.subscription_status === 'trial' ? 'prueba gratuita' : 'suscripción'
  if (b.subscription_status === 'expired') {
    return { expired: true, message: `Tu ${planLabel} ya venció. Realiza el pago para restablecer el acceso.` }
  }
  if (b.days_remaining > b.subscription_warning_days) {
    return null
  }
  const when =
    b.days_remaining <= 0 ? 'hoy' : b.days_remaining === 1 ? 'mañana' : `en ${b.days_remaining} días`
  return { expired: false, message: `Tu ${planLabel} vence ${when}. Evita interrupciones realizando el pago.` }
})
</script>

<template>
  <div
    v-if="alert"
    class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-4 py-2 text-sm font-medium text-white"
    :class="alert.expired ? 'bg-red-600' : 'bg-amber-500'"
    role="alert"
  >
    <span class="flex items-center gap-2">
      <i class="pi pi-exclamation-triangle" />
      {{ alert.message }}
    </span>
    <RouterLink
      v-if="isAdmin"
      :to="{ name: 'subscription.index' }"
      class="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1 text-xs font-bold hover:bg-white/90"
      :class="alert.expired ? 'text-red-700' : 'text-amber-700'"
    >
      <i class="pi pi-credit-card text-xs" />
      Pagar ahora
    </RouterLink>
    <span v-else class="text-xs text-white/90">Avísale al administrador del negocio.</span>
  </div>
</template>
