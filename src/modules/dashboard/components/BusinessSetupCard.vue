<script setup lang="ts">
// "Termina de configurar tu negocio": los pasos que hacen que tu tienda, tu
// página de enlaces y tus recibos salgan completos. Sin esto el comerciante no
// sabía que WhatsApp, redes y logo se llenan una sola vez y sirven para todo
// (solo 4 de 13 negocios activos tenían WhatsApp). Desaparece al terminar o si
// el dueño dice "Ahora no".
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useBusiness } from '@/composables/useBusiness'
import PublicProfileModal from '@/modules/link-page/components/PublicProfileModal.vue'
import ShareLinkPageModal from '@/modules/link-page/components/ShareLinkPageModal.vue'
import { useLinkPage } from '@/modules/link-page/composables/useLinkPage'
import { hasFeature } from '@/utils/hasFeature'

const router = useRouter()
const { data: business } = useBusiness()
const { linkPageQuery } = useLinkPage()
const state = computed(() => linkPageQuery.data.value)

interface SetupStep {
  key: string
  title: string
  hint: string
  action: string
  done: boolean
  run: () => void
}

const profileOpen = ref(false)
const profileFocus = ref<'images' | 'contact' | undefined>(undefined)
const linksOpen = ref(false)

function openProfile(focus: 'images' | 'contact'): void {
  profileFocus.value = focus
  profileOpen.value = true
}

const steps = computed<SetupStep[]>(() => {
  const current = state.value
  if (!current) {
    return []
  }
  const { settings } = current

  const list: SetupStep[] = [
    {
      key: 'whatsapp',
      title: 'Agrega tu WhatsApp',
      hint: 'Es por donde tus clientes te escriben desde tu tienda y tu página de enlaces.',
      action: 'Agregar',
      done: Boolean(settings.whatsapp),
      run: () => openProfile('contact'),
    },
    {
      key: 'social',
      title: 'Agrega tu Instagram o TikTok',
      hint: 'Salen como botones en tu página de enlaces.',
      action: 'Agregar',
      done: Boolean(settings.instagram || settings.tiktok || settings.facebook_url),
      run: () => openProfile('contact'),
    },
    {
      key: 'logo',
      title: 'Sube tu logo',
      hint: 'Aparece en tu tienda, en tu página de enlaces y en tus recibos.',
      action: 'Subir',
      done: settings.has_logo || settings.has_icon,
      run: () => openProfile('images'),
    },
    {
      key: 'links',
      title: 'Publica tu página de enlaces',
      hint: 'Un solo enlace con todo para poner en la bio de Instagram o TikTok.',
      action: 'Publicar',
      done: current.published,
      run: () => {
        linksOpen.value = true
      },
    },
  ]

  if (hasFeature(business.value, 'online_store')) {
    list.push({
      key: 'store',
      title: 'Abre tu tienda online',
      hint: 'Tu catálogo con precios al día para mandar por WhatsApp.',
      action: 'Abrir',
      done: current.has_store,
      run: () => {
        router.push({ name: 'online-store.index' })
      },
    })
  }

  return list
})

const doneCount = computed(() => steps.value.filter((step) => step.done).length)
const allDone = computed(() => steps.value.length > 0 && doneCount.value === steps.value.length)

// "Ahora no" se recuerda por negocio en este navegador. El almacenamiento
// puede estar bloqueado (ventana privada): sin él la tarjeta simplemente vuelve.
const storageKey = computed(() => `nexolu:setup-dismissed:${business.value?.id ?? 'x'}`)
function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(storageKey.value) === '1'
  } catch {
    return false
  }
}
const dismissed = ref(readDismissed())

function dismiss(): void {
  dismissed.value = true
  try {
    window.localStorage.setItem(storageKey.value, '1')
  } catch {
    // Sin almacenamiento: se oculta solo en esta visita.
  }
}

// Con un modal abierto la tarjeta se queda aunque ya esté todo hecho: publicar
// la página completa el último paso, y si la tarjeta se ocultara en ese
// momento el modal con el enlace para compartir desaparecería con ella.
const visible = computed(
  () =>
    steps.value.length > 0 &&
    ((!allDone.value && !dismissed.value) || profileOpen.value || linksOpen.value),
)
</script>

<template>
  <div v-if="visible" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm font-semibold text-slate-800">Termina de configurar tu negocio</p>
        <p class="mt-0.5 text-xs text-slate-500">
          Lo llenas una vez y se usa en tu tienda, tu página de enlaces y tus recibos.
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-3">
        <span class="text-xs font-semibold text-slate-500">{{ doneCount }} de {{ steps.length }}</span>
        <button
          type="button"
          class="text-xs font-semibold text-slate-400 hover:text-slate-600"
          @click="dismiss"
        >
          Ahora no
        </button>
      </div>
    </div>

    <div class="mt-3 h-1 overflow-hidden rounded-full bg-slate-100">
      <div
        class="h-full rounded-full bg-indigo-600 transition-all"
        :style="{ width: `${(doneCount / steps.length) * 100}%` }"
      />
    </div>

    <ul class="mt-2 divide-y divide-slate-100">
      <li v-for="step in steps" :key="step.key" class="flex items-center gap-3 py-2.5">
        <span
          v-if="step.done"
          class="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
        >
          <i class="pi pi-check text-[10px]" />
        </span>
        <span v-else class="size-5 shrink-0 rounded-full border border-slate-300" />

        <div class="min-w-0 flex-1">
          <p
            class="text-sm"
            :class="step.done ? 'text-slate-400 line-through' : 'font-medium text-slate-800'"
          >
            {{ step.title }}
          </p>
          <p v-if="!step.done" class="text-xs text-slate-500">{{ step.hint }}</p>
        </div>

        <button
          v-if="!step.done"
          type="button"
          class="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-slate-50"
          @click="step.run()"
        >
          {{ step.action }}
        </button>
      </li>
    </ul>

    <PublicProfileModal v-if="profileOpen" v-model="profileOpen" :focus="profileFocus" />
    <ShareLinkPageModal v-if="linksOpen" v-model="linksOpen" />
  </div>
</template>
