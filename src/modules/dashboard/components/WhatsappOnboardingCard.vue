<script setup lang="ts">
// Card de "vincula tu WhatsApp" - puerto reducido de
// Components/AiChat/OnboardingWhatsAppCard.vue del legacy. Legacy enlaza a
// Ajustes > IA para vincular; esta app todavia no tiene esa pantalla, asi
// que el flujo de vinculo (telefono -> codigo) vive inline en el card
// mismo, reusando POST /ai/channels/whatsapp/start|confirm. El checklist de
// "alertas activas" de legacy no se porta: depende de
// notification_preferences, que esta app todavia no expone en ningun
// Ajustes (ver docs/MIGRATION_BACKLOG.md) - mostrar un check que nadie
// puede prender confundiria mas de lo que ayuda.
import { ref } from 'vue'

import aiRobot from '@/assets/ai-robot.png'
import { useSystemAlert } from '@/composables/useSystemAlert'
import { confirmWhatsappLink, startWhatsappLink } from '@/services/aiChannelLink'
import { NxButton, NxInput } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { useDismissWhatsappOnboarding, useWhatsappOnboarding } from '../composables/useDashboardSummary'

const onboardingQuery = useWhatsappOnboarding()
const dismissMutation = useDismissWhatsappOnboarding()
const { notify } = useSystemAlert()

type Step = 'phone' | 'code'
const step = ref<Step>('phone')
const phone = ref('')
const code = ref('')
const isSubmitting = ref(false)
const formError = ref<string | null>(null)

async function sendCode(): Promise<void> {
  if (!phone.value.trim()) {
    return
  }
  isSubmitting.value = true
  formError.value = null
  try {
    await startWhatsappLink(phone.value.trim())
    step.value = 'code'
  } catch (error) {
    formError.value = extractErrorMessage(error, 'No pudimos enviar el código.')
  } finally {
    isSubmitting.value = false
  }
}

async function confirmCode(): Promise<void> {
  if (!code.value.trim()) {
    return
  }
  isSubmitting.value = true
  formError.value = null
  try {
    await confirmWhatsappLink(code.value.trim())
    notify('Tu WhatsApp quedó vinculado')
    await onboardingQuery.refetch()
  } catch (error) {
    formError.value = extractErrorMessage(error, 'No pudimos confirmar el código.')
  } finally {
    isSubmitting.value = false
  }
}

function dismiss(): void {
  dismissMutation.mutate()
}
</script>

<template>
  <div
    v-if="onboardingQuery.data.value"
    class="flex gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
  >
    <img :src="aiRobot" alt="Asistente de IA" class="h-10 w-10 shrink-0 object-contain" />
    <div class="min-w-0 flex-1">
      <p class="mb-0.5 text-xs font-bold uppercase tracking-wide text-indigo-500">Vincula tu WhatsApp</p>

      <template v-if="onboardingQuery.data.value.linked">
        <p class="text-sm leading-snug text-slate-700">
          <i class="pi pi-check-circle mr-1 text-emerald-500" />Tu WhatsApp ya está vinculado al Asistente.
        </p>
        <button type="button" class="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800" @click="dismiss">
          Listo
        </button>
      </template>

      <template v-else>
        <p class="mb-2 text-sm leading-snug text-slate-700">
          Vincula tu número para recibir resúmenes y alertas del negocio por WhatsApp.
        </p>
        <p v-if="formError" class="mb-2 text-xs text-red-600">{{ formError }}</p>

        <div v-if="step === 'phone'" class="flex flex-wrap items-end gap-2">
          <NxInput v-model="phone" label="Tu número de WhatsApp" size="sm" class="max-w-[220px]" />
          <NxButton size="sm" :loading="isSubmitting" @click="sendCode">Enviar código</NxButton>
        </div>
        <div v-else class="flex flex-wrap items-end gap-2">
          <NxInput v-model="code" label="Código recibido" size="sm" class="max-w-[140px]" />
          <NxButton size="sm" :loading="isSubmitting" @click="confirmCode">Confirmar</NxButton>
          <button type="button" class="pb-2 text-xs text-slate-400 hover:text-slate-600" @click="step = 'phone'">
            Cambiar número
          </button>
        </div>

        <button type="button" class="mt-2 text-xs font-medium text-slate-400 hover:text-slate-600" @click="dismiss">
          Ahora no
        </button>
      </template>
    </div>
  </div>
</template>
