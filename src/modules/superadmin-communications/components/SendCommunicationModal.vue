<script setup lang="ts">
// Redactar y mandar una comunicacion puntual (correo o WhatsApp) a un
// negocio, con asunto/cuerpo libres - consume
// CommunicationController::send (BusinessCommunicationService). El WhatsApp
// usa la plantilla generica 'recordatorio' (una unica variable de texto
// libre, tope 300 caracteres en Meta) - de ahi el contador y el limite
// distinto por canal.
import { computed, ref, watch } from 'vue'

import { useSystemAlert } from '@/composables/useSystemAlert'
import type { CommunicationChannel } from '@/types/superadmin/communication'
import { NxButton, NxInput, NxModal, NxSelect, NxTextarea } from '@/ui'
import { extractErrorMessage } from '@/utils/extractErrorMessage'
import { extractFieldErrors } from '@/utils/extractFieldErrors'

import { useBusinessSearch } from '../composables/useBusinessSearch'
import { useSendCommunicationMutation } from '../composables/useSendCommunicationMutation'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const channelOptions: Array<{ value: CommunicationChannel; label: string }> = [
  { value: 'email', label: 'Correo' },
  { value: 'whatsapp', label: 'WhatsApp' },
]

const businessId = ref<number | null>(null)
const businessSearch = ref('')
const channel = ref<CommunicationChannel>('email')
const subject = ref('')
const message = ref('')
const fieldErrors = ref<Record<string, string>>({})
const formError = ref<string | null>(null)

const businessSearchQuery = useBusinessSearch(businessSearch)
const businessOptions = computed(() => businessSearchQuery.data.value ?? [])
const maxMessageLength = computed(() => (channel.value === 'whatsapp' ? 300 : 2000))

function resetForm(): void {
  businessId.value = null
  businessSearch.value = ''
  channel.value = 'email'
  subject.value = ''
  message.value = ''
  fieldErrors.value = {}
  formError.value = null
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      resetForm()
    }
  },
)

const { notify } = useSystemAlert()
const sendMutation = useSendCommunicationMutation()

async function submit(): Promise<void> {
  fieldErrors.value = {}
  formError.value = null

  if (!businessId.value) {
    fieldErrors.value.business = 'Selecciona un negocio.'
    return
  }

  try {
    await sendMutation.mutateAsync({
      businessId: businessId.value,
      payload: {
        channel: channel.value,
        subject: channel.value === 'email' ? subject.value.trim() : null,
        message: message.value.trim(),
      },
    })
    notify(channel.value === 'email' ? 'Correo enviado.' : 'Mensaje de WhatsApp enviado.')
    emit('update:modelValue', false)
  } catch (error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) {
      fieldErrors.value = fields
    } else {
      formError.value = extractErrorMessage(error, 'No pudimos enviar la comunicación.')
    }
  }
}
</script>

<template>
  <NxModal :model-value="modelValue" title="Redactar comunicación" size="md" @update:model-value="emit('update:modelValue', $event)">
    <div class="flex flex-col gap-3">
      <p v-if="formError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ formError }}</p>

      <div>
        <NxSelect
          :model-value="businessId"
          label="Negocio"
          :options="businessOptions"
          option-label="name"
          option-value="id"
          filter
          :error="fieldErrors.business"
          @update:model-value="businessId = $event as number | null"
          @filter="businessSearch = $event"
        />
        <p class="mt-1 text-xs text-slate-400">Escribe para buscar por nombre.</p>
      </div>

      <NxSelect v-model="channel" label="Canal" :options="channelOptions" option-label="label" option-value="value" />

      <NxInput v-if="channel === 'email'" v-model="subject" label="Asunto" required :error="fieldErrors.subject" />

      <div>
        <NxTextarea v-model="message" label="Mensaje" :rows="5" required :error="fieldErrors.message" />
        <p class="mt-1 text-right text-xs text-slate-400">{{ message.length }} / {{ maxMessageLength }}</p>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <NxButton variant="outline" class="flex-1" @click="emit('update:modelValue', false)">Cancelar</NxButton>
        <NxButton class="flex-1" :loading="sendMutation.isPending.value" @click="submit">Enviar</NxButton>
      </div>
    </template>
  </NxModal>
</template>
