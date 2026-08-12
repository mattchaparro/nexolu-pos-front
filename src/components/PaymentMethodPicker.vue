<script setup lang="ts">
// Compartido entre modulos (Vender/Cuentas abiertas via PaymentModal,
// Compras via PurchasePaymentModal) - promovido desde modules/sales/ a
// components/ cuando dejo de ser exclusivo de Vender, ver README.md
// "Modulos independientes".
import type { BusinessPaymentMethod } from '@/types/business'
import { resolvePaymentMethodIcon } from '@/utils/paymentMethodIcon'

defineProps<{
  methods: BusinessPaymentMethod[]
  modelValue: string | null
}>()

defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
    <button
      v-for="method in methods"
      :key="method.id"
      type="button"
      class="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
      :class="
        modelValue === method.id
          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
          : 'border-slate-200 text-slate-600 hover:border-slate-300'
      "
      @click="$emit('update:modelValue', method.id)"
    >
      <i :class="resolvePaymentMethodIcon(method.id)" class="text-base" />
      {{ method.label }}
    </button>
  </div>
</template>
