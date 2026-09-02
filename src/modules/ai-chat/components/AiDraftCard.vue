<script setup lang="ts">
import { ref, watch } from 'vue'

import type { AiDraft } from '@/types/aiChat'
import { NxButton, NxCard, NxDatePicker, NxInput, NxInputNumber } from '@/ui'

const props = defineProps<{
  draft: AiDraft
  confirming: boolean
  discarding: boolean
}>()

const emit = defineEmits<{
  confirm: [draftId: string, values: Record<string, unknown>]
  discard: [draftId: string]
}>()

interface DraftField {
  key: string
  label: string
  type: 'string' | 'number' | 'date'
}

/**
 * Los campos editables del borrador, segun los declara IA Core en
 * `draft.fields` (ver WriteTool.fields_for del lado del Core).
 *
 * El orden lo pone `fields`, no `values`: es el que el autor de la
 * herramienta decidio y el que agrupa lo que va junto (cantidad al lado del
 * producto, no despues de la nota).
 */
const fields = ref<DraftField[]>([])

/**
 * Copia local editable. El borrador que llega por el stream NO se muta: si el
 * usuario edita y despues descarta, o falla la confirmacion, lo que el
 * asistente entendio tiene que seguir siendo visible tal cual.
 */
const values = ref<Record<string, unknown>>({})

watch(
  () => props.draft,
  (draft) => {
    const declared = (draft.fields ?? {}) as Record<string, { label?: string; type?: string }>

    fields.value = Object.entries(declared).map(([key, field]) => ({
      key,
      label: field?.label ?? key,
      type: field?.type === 'number' || field?.type === 'date' ? field.type : 'string',
    }))

    // Un campo que IA Core no declaro pero que si trae valor se muestra igual,
    // como texto: perderlo de vista seria peor que mostrarlo sin label bonito.
    for (const key of Object.keys(draft.values ?? {})) {
      if (!fields.value.some((field) => field.key === key)) {
        fields.value.push({ key, label: key, type: 'string' })
      }
    }

    values.value = { ...draft.values }
  },
  { immediate: true },
)

function confirm(): void {
  // Solo se mandan los campos con valor: un campo opcional que el usuario dejo
  // vacio no debe viajar como cadena vacia, que el API interpretaria como "el
  // usuario quiso borrarlo".
  const filled = Object.fromEntries(
    Object.entries(values.value).filter(([, value]) => value !== null && value !== undefined && value !== ''),
  )

  emit('confirm', props.draft.id, filled)
}
</script>

<template>
  <NxCard class="border-indigo-200">
    <p class="mb-3 text-sm font-semibold text-slate-900">{{ draft.summary }}</p>

    <!-- Editable, no solo lectura: el asistente entiende mal la cantidad o el
         producto con frecuencia suficiente como para que "descartar y volver a
         dictarlo" sea el camino largo. Corregir aqui y confirmar es un clic. -->
    <div class="mb-4 space-y-3">
      <template v-for="field in fields" :key="field.key">
        <NxInputNumber
          v-if="field.type === 'number'"
          v-model="(values[field.key] as number | null)"
          :label="field.label"
          :currency="false"
          size="sm"
          :disabled="confirming || discarding"
        />
        <NxDatePicker
          v-else-if="field.type === 'date'"
          v-model="(values[field.key] as string | null)"
          :label="field.label"
          size="sm"
          :disabled="confirming || discarding"
        />
        <NxInput
          v-else
          v-model="(values[field.key] as string)"
          :label="field.label"
          size="sm"
          :disabled="confirming || discarding"
        />
      </template>
    </div>

    <div class="flex gap-2">
      <NxButton size="sm" :loading="confirming" :disabled="discarding" @click="confirm">
        Confirmar
      </NxButton>
      <NxButton
        size="sm"
        variant="outline"
        :loading="discarding"
        :disabled="confirming"
        @click="emit('discard', draft.id)"
      >
        Descartar
      </NxButton>
    </div>
  </NxCard>
</template>
