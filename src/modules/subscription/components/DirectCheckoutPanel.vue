<script setup lang="ts">
// Panel de pago directo (flow="api", sin abrir el widget de Wompi) -
// segrega "Pagos recurrentes" (tarjeta/Nequi, los unicos que Wompi permite
// guardar para reuso via Fuentes de Pago) de "Pagos normales" (PSE/Boton
// Bancolombia, siempre de una sola vez). Ver
// docs/PLAN_METODOS_PAGO_ALTERNOS.md (repo nexolu-pos-api) seccion 9.
// Convive con el boton de widget legado en SubscriptionView, no lo
// reemplaza. Solo se renderiza algo si el comercio de Wompi tiene al menos
// uno de estos 4 metodos habilitado (ver usePaymentMethodsCatalog).
import { computed, ref } from 'vue'

import type { PseFinancialInstitution } from '@/types/paymentSource'
import { NxButton } from '@/ui'

import type { DirectCheckout, PseChargeInput } from '../composables/useDirectCheckout'
import { usePaymentMethodsCatalog, usePseFinancialInstitutions } from '../composables/usePaymentMethodsCatalog'
import { usePaymentSources, useRemovePaymentSource } from '../composables/usePaymentSources'
import { paymentMethodImage } from '../support/paymentMethodImages'
import type { CardInput } from '../services/wompiTokenization'

import AddCardModal from './AddCardModal.vue'
import AddNequiModal from './AddNequiModal.vue'
import PseModal from './PseModal.vue'

const props = defineProps<{
  direct: DirectCheckout
}>()

const catalogQuery = usePaymentMethodsCatalog()
const accepted = computed(() => catalogQuery.data.value?.accepted_payment_methods ?? [])
const hasCard = computed(() => accepted.value.includes('CARD'))
const hasNequi = computed(() => accepted.value.includes('NEQUI'))
const hasPse = computed(() => accepted.value.includes('PSE'))
const hasBancolombia = computed(() => accepted.value.includes('BANCOLOMBIA_TRANSFER'))
const hasAnyMethod = computed(() => hasCard.value || hasNequi.value || hasPse.value || hasBancolombia.value)

const sourcesQuery = usePaymentSources()
const removeSource = useRemovePaymentSource()

const institutionsQuery = usePseFinancialInstitutions(hasPse)
const institutions = computed<PseFinancialInstitution[]>(() => institutionsQuery.data.value ?? [])

const showAddCard = ref(false)
const showAddNequi = ref(false)
const showPse = ref(false)

async function handleAddCard(card: CardInput, saveLabel: string | null): Promise<void> {
  await props.direct.payWithNewCard(card, saveLabel)
  if (!props.direct.error.value) {
    showAddCard.value = false
  }
}

async function handleAddNequi(phoneNumber: string, save: boolean, label: string): Promise<void> {
  await props.direct.payWithNewNequi(phoneNumber, save, label)
  if (!props.direct.error.value) {
    showAddNequi.value = false
  }
}

async function handlePse(payload: PseChargeInput): Promise<void> {
  // PSE redirige de inmediato si sale bien - no hace falta cerrar el modal
  // a mano, el navegador ya se fue al sitio del banco.
  await props.direct.payWithPse(payload)
}
</script>

<template>
  <div v-if="hasAnyMethod" class="flex flex-col gap-4">
    <div v-if="hasCard || hasNequi">
      <p class="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Pagos recurrentes</p>

      <div v-if="sourcesQuery.data.value?.length" class="mb-2 flex flex-col gap-2">
        <div
          v-for="source in sourcesQuery.data.value"
          :key="source.id"
          class="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3"
        >
          <div class="flex items-center gap-2 text-sm font-medium text-slate-700">
            <img :src="paymentMethodImage(source.type)" alt="" class="h-7 w-auto rounded-md" />
            {{ source.label }}
          </div>
          <div class="flex items-center gap-2">
            <NxButton size="sm" :loading="direct.paying.value" @click="direct.payWithSavedSource(source.payment_source_id)">
              Pagar
            </NxButton>
            <button
              type="button"
              class="text-slate-400 transition-colors hover:text-red-500 disabled:opacity-50"
              :disabled="removeSource.removing.value"
              title="Eliminar"
              @click="removeSource.remove(source.id)"
            >
              <i class="pi pi-trash text-sm" />
            </button>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <NxButton v-if="hasCard" size="sm" variant="outline" @click="showAddCard = true">
          <img :src="paymentMethodImage('CARD')" alt="" class="h-5 w-auto rounded" />
          Agregar tarjeta
        </NxButton>
        <NxButton v-if="hasNequi" size="sm" variant="outline" @click="showAddNequi = true">
          <img :src="paymentMethodImage('NEQUI')" alt="" class="h-5 w-auto rounded" />
          Agregar Nequi
        </NxButton>
      </div>
    </div>

    <div v-if="hasPse || hasBancolombia">
      <p class="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Pagos normales</p>
      <div class="flex flex-wrap gap-2">
        <NxButton v-if="hasPse" size="sm" variant="outline" @click="showPse = true">
          <img :src="paymentMethodImage('PSE')" alt="" class="h-5 w-auto rounded" />
          PSE
        </NxButton>
        <NxButton
          v-if="hasBancolombia"
          size="sm"
          variant="outline"
          :loading="direct.paying.value"
          @click="direct.payWithBancolombiaTransfer()"
        >
          <img :src="paymentMethodImage('BANCOLOMBIA_TRANSFER')" alt="" class="h-5 w-auto rounded" />
          Botón Bancolombia
        </NxButton>
      </div>
    </div>

    <p v-if="direct.error.value" class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {{ direct.error.value }}
    </p>

    <AddCardModal v-model="showAddCard" :paying="direct.paying.value" :error="direct.error.value" @submit="handleAddCard" />
    <AddNequiModal
      v-model="showAddNequi"
      :paying="direct.paying.value"
      :waiting-approval="direct.waitingNequiApproval.value"
      :error="direct.error.value"
      @submit="handleAddNequi"
    />
    <PseModal
      v-model="showPse"
      :paying="direct.paying.value"
      :error="direct.error.value"
      :institutions="institutions"
      :loading-institutions="institutionsQuery.isPending.value"
      @submit="handlePse"
    />
  </div>
</template>
