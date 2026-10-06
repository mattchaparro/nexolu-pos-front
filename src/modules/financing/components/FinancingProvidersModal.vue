<script setup lang="ts">
// Las financiadoras del negocio: nombre, en cuantos dias suelen girar (para
// marcar los creditos atrasados) y si se ofrecen al cobrar.
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { ref } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { FinancingProvider, FinancingProviderPayload } from '@/types/financing'
import { NxButton, NxInput, NxInputNumber, NxModal } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { createFinancingProvider, fetchFinancingProviders, updateFinancingProvider } from '../services/financingService'

defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const queryClient = useQueryClient()
const { notify } = useSystemAlert()

const providersQuery = useQuery({ queryKey: ['financing-providers', 'all'], queryFn: () => fetchFinancingProviders() })

const newName = ref('')
const newDays = ref<number | null>(null)
const formError = ref<string | null>(null)
const dayDrafts = ref<Record<number, number | null>>({})

async function saveDays(provider: FinancingProvider): Promise<void> {
  await save(provider, { expected_payout_days: dayDrafts.value[provider.id] ?? null })
  delete dayDrafts.value[provider.id]
}

function invalidate(): void {
  queryClient.invalidateQueries({ queryKey: ['financing-providers'] })
  queryClient.invalidateQueries({ queryKey: ['financing'] })
}

const createMutation = useMutation({
  mutationFn: (payload: FinancingProviderPayload) => createFinancingProvider(payload),
  onSuccess: invalidate,
})

const updateMutation = useMutation({
  mutationFn: ({ id, payload }: { id: number; payload: FinancingProviderPayload }) => updateFinancingProvider(id, payload),
  onSuccess: invalidate,
})

async function addProvider(): Promise<void> {
  if (!newName.value.trim()) {
    return
  }
  formError.value = null
  try {
    await createMutation.mutateAsync({ name: newName.value.trim(), expected_payout_days: newDays.value })
    newName.value = ''
    newDays.value = null
    notify('Financiadora agregada')
  } catch (error) {
    formError.value = extractErrorMessage(error, 'No pudimos agregar la financiadora.')
  }
}

async function save(provider: FinancingProvider, payload: FinancingProviderPayload): Promise<void> {
  formError.value = null
  try {
    await updateMutation.mutateAsync({ id: provider.id, payload })
  } catch (error) {
    formError.value = extractErrorMessage(error, 'No pudimos guardar el cambio.')
  }
}
</script>

<template>
  <NxModal :model-value="modelValue" title="Financiadoras" size="md" @update:model-value="emit('update:modelValue', $event)">
    <div class="flex flex-col gap-4">
      <p class="text-xs text-slate-500">
        Los días de pago sirven para marcar como atrasado un crédito que la financiadora todavía no ha girado.
      </p>

      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>

      <ul class="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-200">
        <li v-for="provider in providersQuery.data.value ?? []" :key="provider.id" class="flex flex-wrap items-end gap-2 p-3">
          <div class="min-w-[9rem] flex-1">
            <p class="text-sm font-semibold text-slate-900">{{ provider.name }}</p>
            <p class="text-xs text-slate-400">
              {{ provider.expected_payout_days !== null ? `Suele pagar en ${provider.expected_payout_days} días` : 'Sin plazo de pago' }}
            </p>
          </div>
          <NxInputNumber
            :model-value="dayDrafts[provider.id] ?? provider.expected_payout_days"
            label="Paga en (días)"
            size="sm"
            class="w-28"
            :currency="false"
            :min="0"
            @update:model-value="dayDrafts[provider.id] = $event"
          />
          <NxButton
            v-if="provider.id in dayDrafts && dayDrafts[provider.id] !== provider.expected_payout_days"
            size="sm"
            variant="secondary"
            @click="saveDays(provider)"
          >
            Guardar
          </NxButton>
          <button
            type="button"
            class="h-9 rounded-lg border px-3 text-xs font-semibold"
            :class="provider.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'"
            @click="save(provider, { is_active: !provider.is_active })"
          >
            {{ provider.is_active ? 'Activa' : 'Inactiva' }}
          </button>
        </li>
        <li v-if="(providersQuery.data.value ?? []).length === 0" class="p-3 text-center text-sm text-slate-400">
          Todavía no tienes financiadoras.
        </li>
      </ul>

      <div class="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-slate-300 p-3">
        <NxInput v-model="newName" label="Nueva financiadora (ej. Addi)" size="sm" class="min-w-[9rem] flex-1" />
        <NxInputNumber v-model="newDays" label="Paga en (días)" size="sm" class="w-28" :currency="false" :min="0" />
        <NxButton size="sm" icon="pi pi-plus" :loading="createMutation.isPending.value" :disabled="!newName.trim()" @click="addProvider">
          Agregar
        </NxButton>
      </div>
    </div>
  </NxModal>
</template>
