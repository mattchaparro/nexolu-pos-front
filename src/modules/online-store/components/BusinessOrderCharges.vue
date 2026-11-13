<script setup lang="ts">
// Lo que un pedido online suma encima de los productos. No es una
// configuración de la tienda: es la del negocio (Configuración › Ventas), la
// misma que usa el POS. El envío es el envío, uno solo.
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { useBusiness } from '@/composables/useBusiness'
import { formatCop } from '@/utils/formatCop'
import { hasFeature } from '@/utils/hasFeature'

const router = useRouter()
const { data: business } = useBusiness()

const lines = computed(() => {
  const value = business.value
  if (!value) {
    return []
  }
  const charges = hasFeature(value, 'charges')
  return [
    value.delivery_enabled && Number(value.delivery_fee) > 0
      ? `Domicilio ${formatCop(value.delivery_fee)}`
      : 'Domicilio gratis',
    ...(charges && value.charges.service_charge_enabled
      ? [`propina sugerida ${value.charges.service_charge_rate} % (el cliente la puede quitar)`]
      : []),
    ...(charges && value.charges.ipoconsumo_enabled
      ? [`impoconsumo ${value.charges.ipoconsumo_rate} %`]
      : []),
  ]
})
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 sm:col-span-2">
    <p>{{ lines.join(' · ') }}</p>
    <p class="mt-0.5 text-xs text-slate-500">
      Son los mismos del POS. Se cambian en
      <button
        type="button"
        class="font-semibold text-indigo-600 hover:text-indigo-800"
        @click="router.push({ name: 'business-settings.index', query: { tab: '2' } })"
      >
        Configuración › Ventas</button
      >.
    </p>
  </div>
</template>
