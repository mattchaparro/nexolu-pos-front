<script setup lang="ts">
// "Compartir catálogo" desde Catálogo e Inicio: el enlace a la tienda
// completa, a la página de enlaces (la de la bio) o, si llega un producto, a
// su ficha. Se monta solo al abrirse (v-if en quien lo
// usa) para no pedir la configuración de la tienda en cada visita al
// catálogo.
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { NxButton, NxModal } from '@/ui'

import { useStoreSettings } from '../composables/useStoreSettings'
import ShareLinkPanel from './ShareLinkPanel.vue'

const props = defineProps<{
  modelValue: boolean
  product?: { id: number; name: string } | null
  /** Qué se comparte al abrir, sin producto: el catálogo o la página de enlaces. */
  initialTarget?: 'catalog' | 'links'
}>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const router = useRouter()
const { settingsQuery } = useStoreSettings()
const settings = computed(() => settingsQuery.data.value)
const storeName = computed(() => settings.value?.store_name || 'mi tienda')

const target = ref<'catalog' | 'links'>(props.initialTarget ?? 'catalog')

const url = computed(() => {
  const base = settings.value?.public_url ?? ''
  if (props.product) {
    return `${base}/producto/${props.product.id}`
  }
  return target.value === 'links' ? `${base}/enlaces` : `${base}/tienda`
})

const shareText = computed(() => {
  if (props.product) {
    return `Mira ${props.product.name} en ${storeName.value}:`
  }
  return target.value === 'links'
    ? `Encuentra a ${storeName.value}: catálogo, WhatsApp y redes en un solo lugar.`
    : `Mira el catálogo de ${storeName.value}, con precios al día. Haz tu pedido aquí:`
})

function goToStore(): void {
  emit('update:modelValue', false)
  void router.push({ name: 'online-store.index' })
}
</script>

<template>
  <NxModal
    :model-value="modelValue"
    :title="product ? 'Compartir producto' : 'Compartir tu tienda'"
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
      <div
        v-if="!product"
        class="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1"
        role="tablist"
      >
        <button
          v-for="option in [
            { value: 'catalog' as const, label: 'Catálogo', icon: 'pi pi-shop' },
            { value: 'links' as const, label: 'Página de enlaces', icon: 'pi pi-link' },
          ]"
          :key="option.value"
          type="button"
          role="tab"
          :aria-selected="target === option.value"
          class="flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold transition-colors"
          :class="
            target === option.value
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          "
          @click="target = option.value"
        >
          <i :class="option.icon" class="text-xs" />
          {{ option.label }}
        </button>
      </div>
      <p class="text-sm text-slate-600">
        <template v-if="product">
          Quien abra el enlace ve <strong>{{ product.name }}</strong> con su precio y puede pedirlo
          de una vez.
        </template>
        <template v-else-if="target === 'links'">
          Tu página de enlaces reúne el catálogo, tu WhatsApp y tus redes. Ponla en la bio de
          Instagram o TikTok. Agregas más enlaces en Tienda online.
        </template>
        <template v-else>
          Tu tienda online también es tu catálogo: compártela en tus estados de WhatsApp, en
          Instagram o imprime el QR para el mostrador. Los precios y fotos se actualizan solos.
        </template>
      </p>
      <ShareLinkPanel
        :url="url"
        :share-text="shareText"
        :qr-file-name="
          product ? `qr-producto-${product.id}` : target === 'links' ? 'qr-enlaces' : 'qr-catalogo'
        "
      />
      <p
        v-if="!product && target === 'catalog' && settings.published_products_count === 0"
        class="text-xs text-amber-700"
      >
        Todavía no tienes productos publicados: quien abra el enlace no verá nada. Publícalos con el
        botón «Publicar» de cada producto.
      </p>
    </div>
  </NxModal>
</template>
