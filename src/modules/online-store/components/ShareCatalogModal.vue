<script setup lang="ts">
// "Compartir catálogo" desde Catálogo: el enlace a la tienda completa o, si
// llega un producto, a su ficha. Se monta solo al abrirse (v-if en quien lo
// usa) para no pedir la configuración de la tienda en cada visita al
// catálogo.
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { NxButton, NxModal } from '@/ui'

import { useStoreSettings } from '../composables/useStoreSettings'
import ShareLinkPanel from './ShareLinkPanel.vue'

const props = defineProps<{
  modelValue: boolean
  product?: { id: number; name: string } | null
}>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const router = useRouter()
const { settingsQuery } = useStoreSettings()
const settings = computed(() => settingsQuery.data.value)
const storeName = computed(() => settings.value?.store_name || 'mi tienda')

const url = computed(() => {
  const base = settings.value?.public_url ?? ''
  return props.product ? `${base}/producto/${props.product.id}` : `${base}/tienda`
})

const shareText = computed(() =>
  props.product
    ? `Mira ${props.product.name} en ${storeName.value}:`
    : `Mira el catálogo de ${storeName.value}, con precios al día. Haz tu pedido aquí:`,
)

function goToStore(): void {
  emit('update:modelValue', false)
  void router.push({ name: 'online-store.index' })
}
</script>

<template>
  <NxModal
    :model-value="modelValue"
    :title="product ? 'Compartir producto' : 'Compartir catálogo'"
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <p v-if="settingsQuery.isPending.value" class="text-sm text-slate-400">Cargando…</p>

    <div v-else-if="settings && !settings.is_active" class="flex flex-col items-start gap-3">
      <p class="text-sm text-slate-600">
        Tu tienda online está cerrada. Ábrela y tendrás un catálogo virtual con tus productos,
        precios y fotos al día, listo para mandar por WhatsApp o poner en un QR.
      </p>
      <NxButton icon="pi pi-shop" @click="goToStore">Ir a mi tienda online</NxButton>
    </div>

    <div v-else-if="settings" class="flex flex-col gap-4">
      <p class="text-sm text-slate-600">
        <template v-if="product">
          Quien abra el enlace ve <strong>{{ product.name }}</strong> con su precio y puede pedirlo
          de una vez.
        </template>
        <template v-else>
          Tu tienda online también es tu catálogo: compártela en tus estados de WhatsApp, en
          Instagram o imprime el QR para el mostrador. Los precios y fotos se actualizan solos.
        </template>
      </p>
      <ShareLinkPanel
        :url="url"
        :share-text="shareText"
        :qr-file-name="product ? `qr-producto-${product.id}` : 'qr-catalogo'"
      />
      <p v-if="!product && settings.published_products_count === 0" class="text-xs text-amber-700">
        Todavía no tienes productos publicados: quien abra el enlace no verá nada. Publícalos con el
        botón «Publicar» de cada producto.
      </p>
    </div>
  </NxModal>
</template>
