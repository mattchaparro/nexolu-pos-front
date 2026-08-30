<script setup lang="ts">
// Elegir una plantilla de inicio.
//
// Aplicarla REEMPLAZA la página, así que si ya hay bloques se confirma
// primero. Y se separa "solo la estructura" de "estructura y colores":
// alguien que ya eligió su marca no debería perderla por querer una mejor
// disposición.
import { ref } from 'vue'

import { NxButton } from '@/ui'

import { HOME_PRESETS, instantiate, type HomePreset } from '../homePresets'

const props = defineProps<{ hasBlocks: boolean }>()
const emit = defineEmits<{
  apply: [payload: { blocks: ReturnType<typeof instantiate>; theme: HomePreset['theme'] | null }]
  close: []
}>()

const chosen = ref<HomePreset | null>(null)

function choose(preset: HomePreset): void {
  // Sin nada que perder, se aplica de una: un paso de confirmación sobre
  // una página vacía es solo fricción.
  if (!props.hasBlocks) {
    apply(preset, true)
    return
  }
  chosen.value = preset
}

function apply(preset: HomePreset, withTheme: boolean): void {
  emit('apply', { blocks: instantiate(preset), theme: withTheme ? preset.theme : null })
  chosen.value = null
  emit('close')
}
</script>

<template>
  <!-- Panel en la pagina, no un modal: el dialogo de PrimeVue se
       teletransporta a <body>, y dentro de una pestaña su prop dejaba de
       actualizarse (el padre tenia false y el hijo seguia recibiendo true),
       asi que no habia forma de cerrarlo. De paso, asi la vista previa
       queda a la vista mientras se elige. -->
  <div class="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
    <div class="mb-3 flex items-center justify-between">
      <p class="text-sm font-semibold text-slate-800">Empezar desde una plantilla</p>
      <button type="button" class="text-slate-400 hover:text-slate-600" @click="emit('close')">
        <i class="pi pi-times text-sm" />
      </button>
    </div>
    <div v-if="chosen === null" class="flex flex-col gap-2">
      <p class="text-sm text-slate-500">
        Elige la que más se parezca a tu negocio. Después cambias lo que quieras: los textos son
        solo para que no arranques con la página en blanco.
      </p>

      <button
        v-for="preset in HOME_PRESETS"
        :key="preset.id"
        type="button"
        class="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-left hover:border-indigo-400"
        @click="choose(preset)"
      >
        <span class="text-2xl">{{ preset.icon }}</span>
        <span class="min-w-0">
          <span class="block text-sm font-semibold text-slate-800">{{ preset.label }}</span>
          <span class="block text-xs text-slate-500">{{ preset.description }}</span>
          <span class="mt-1 block text-[11px] text-slate-400">
            {{ preset.blocks.length }} bloques
          </span>
        </span>
      </button>
    </div>

    <div v-if="chosen !== null" class="flex flex-col gap-3">
      <!-- Dos `v-if` independientes y no un par v-if/v-else: la
           adyacencia que exige `v-else` se rompe con solo poner un
           comentario en medio, y el fallo se ve como un TypeError al leer
           `chosen.blocks` cuando ya es null. Con dos condiciones
           explicitas no hay nada que romper. -->
      <p class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Esto reemplaza los bloques que tienes ahora. No se puede deshacer una vez guardes.
      </p>
      <p class="text-sm text-slate-600">
        Vas a usar <strong>{{ chosen.label }}</strong> ({{ chosen.blocks.length }} bloques).
      </p>

      <div class="flex flex-wrap gap-2">
        <NxButton @click="apply(chosen, true)">Estructura y colores</NxButton>
        <NxButton variant="outline" @click="apply(chosen, false)">Solo la estructura</NxButton>
        <NxButton variant="ghost" @click="chosen = null">Volver</NxButton>
      </div>
      <p class="text-[11px] text-slate-400">
        "Solo la estructura" conserva los colores y la tipografía que ya elegiste.
      </p>
    </div>
  </div>
</template>
