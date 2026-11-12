<script setup lang="ts">
// Compartir la página de enlaces desde Inicio. Si todavía no está
// publicada, la publica en el mismo paso: quien tocó "Compartir" ya decidió.
import { computed, onMounted } from 'vue'

import ShareLinkPanel from '@/modules/online-store/components/ShareLinkPanel.vue'
import { NxModal } from '@/ui'

import { useLinkPage } from '../composables/useLinkPage'

defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { linkPageQuery, updateMutation } = useLinkPage()
const state = computed(() => linkPageQuery.data.value)

onMounted(async () => {
  const current = state.value ?? (await linkPageQuery.refetch()).data
  if (current && !current.published) {
    await updateMutation.mutateAsync({ enabled: true })
  }
})
</script>

<template>
  <NxModal
    :model-value="modelValue"
    title="Tu página de enlaces"
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <p v-if="!state?.published" class="text-sm text-slate-400">Preparando tu página…</p>

    <div v-else class="flex flex-col gap-4">
      <p class="text-sm text-slate-600">
        Ponla en la bio de Instagram o TikTok. Reúne tu WhatsApp, tus redes{{
          state.has_store ? ' y tu catálogo' : ''
        }}. Agregas más enlaces en Compartir mi negocio, en el menú de tu perfil.
      </p>
      <ShareLinkPanel
        :url="state.public_url"
        :share-text="`Encuentra a ${state.page.name}: WhatsApp, redes y más en un solo lugar.`"
        qr-file-name="qr-enlaces"
      />
    </div>
  </NxModal>
</template>
