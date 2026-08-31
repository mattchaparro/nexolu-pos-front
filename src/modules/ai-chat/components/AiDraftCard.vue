<script setup lang="ts">
import type { AiDraft } from '@/types/aiChat'
import { NxButton, NxCard } from '@/ui'

const props = defineProps<{
  draft: AiDraft
  confirming: boolean
  discarding: boolean
}>()

const emit = defineEmits<{
  confirm: [draftId: string]
  discard: [draftId: string]
}>()

// draft.fields describe cada campo del borrador (label legible); si IA Core
// no manda label para una key, se usa la key cruda como fallback.
function labelFor(key: string): string {
  const field = props.draft.fields?.[key] as { label?: string } | undefined
  return field?.label ?? key
}
</script>

<template>
  <NxCard class="border-indigo-200">
    <p class="mb-2 text-sm font-semibold text-slate-900">{{ draft.summary }}</p>

    <dl class="mb-3 space-y-1">
      <div v-for="(value, key) in draft.values" :key="key" class="flex justify-between gap-3 text-xs">
        <dt class="text-slate-500">{{ labelFor(String(key)) }}</dt>
        <dd class="font-medium text-slate-900">{{ value }}</dd>
      </div>
    </dl>

    <div class="flex gap-2">
      <NxButton size="sm" :loading="confirming" :disabled="discarding" @click="emit('confirm', draft.id)">
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
