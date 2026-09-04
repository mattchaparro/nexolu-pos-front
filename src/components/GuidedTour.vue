<script setup lang="ts">
/**
 * El globo del recorrido guiado, anclado al elemento real de la pantalla.
 *
 * El recorte se hace con un `box-shadow` gigante sobre un recuadro
 * transparente en vez de con cuatro divs oscuros alrededor: una sola capa,
 * sin costuras entre paneles y sin recalcular cuatro rectángulos al
 * redimensionar.
 *
 * La posición se recalcula al cambiar de paso, al redimensionar y al hacer
 * scroll. Sin eso, abrir una sección más alta deja el globo apuntando al
 * vacío — que es peor que no tener recorrido.
 *
 * Si el elemento del paso no existe (la sección aún no montó), el globo se
 * muestra centrado en vez de desaparecer: el texto sigue siendo útil aunque
 * no haya a qué apuntar.
 */
import { onMounted, onUnmounted, ref, watch } from 'vue'

import { NxButton } from '@/ui'

import type { TourStep } from '@/types/tour'

const props = defineProps<{
  step: TourStep | null
  index: number
  total: number
  isLast: boolean
}>()

const emit = defineEmits<{ next: []; back: []; skip: [] }>()

interface Spot {
  top: number
  left: number
  width: number
  height: number
}

const spot = ref<Spot | null>(null)

/** Margen del recorte, para que el elemento no quede pegado al borde. */
const PAD = 6

function measure(): void {
  const selector = props.step?.target
  if (!selector) {
    spot.value = null
    return
  }

  const el = document.querySelector(selector)
  if (!el) {
    spot.value = null
    return
  }

  const rect = el.getBoundingClientRect()
  spot.value = {
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  }
}

/**
 * Dónde va el globo. Se limita a la ventana para que no se salga por un
 * borde cuando el elemento está pegado a la orilla.
 */
function balloonStyle(): Record<string, string> {
  const ANCHO = 320
  const MARGEN = 12

  if (!spot.value) {
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: `${ANCHO}px` }
  }

  const s = spot.value
  const placement = props.step?.placement ?? 'bottom'

  let top = s.top + s.height + MARGEN
  let left = s.left

  if (placement === 'right') {
    top = s.top
    left = s.left + s.width + MARGEN
  } else if (placement === 'left') {
    top = s.top
    left = s.left - ANCHO - MARGEN
  } else if (placement === 'top') {
    top = s.top - MARGEN - 180
  }

  return {
    top: `${Math.max(MARGEN, Math.min(top, window.innerHeight - 200))}px`,
    left: `${Math.max(MARGEN, Math.min(left, window.innerWidth - ANCHO - MARGEN))}px`,
    width: `${ANCHO}px`,
  }
}

watch(() => props.step, measure, { immediate: true, flush: 'post' })

onMounted(() => {
  window.addEventListener('resize', measure)
  window.addEventListener('scroll', measure, true)
})

onUnmounted(() => {
  window.removeEventListener('resize', measure)
  window.removeEventListener('scroll', measure, true)
})
</script>

<template>
  <div v-if="step" class="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
    <!-- El velo. Con ancla es un recorte (box-shadow enorme); sin ancla, una
         capa plana. En ambos casos captura el clic para que el recorrido no
         compita con la pantalla de atrás. -->
    <div
      v-if="spot"
      class="pointer-events-auto absolute rounded-lg transition-all duration-200"
      :style="{
        top: `${spot.top}px`,
        left: `${spot.left}px`,
        width: `${spot.width}px`,
        height: `${spot.height}px`,
        boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.55)',
      }"
      @click="emit('skip')"
    />
    <div
      v-else
      class="pointer-events-auto absolute inset-0 bg-slate-900/55"
      @click="emit('skip')"
    />

    <div
      class="pointer-events-auto absolute rounded-xl bg-white p-4 shadow-2xl"
      :style="balloonStyle()"
    >
      <p class="mb-1 text-[11px] font-semibold tracking-wide text-indigo-600 uppercase">
        Paso {{ index + 1 }} de {{ total }}
      </p>
      <h3 class="text-sm font-bold text-slate-900">{{ step.title }}</h3>
      <p class="mt-1 text-xs leading-relaxed text-slate-600">{{ step.body }}</p>

      <div class="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          class="text-xs text-slate-400 underline hover:text-slate-600"
          @click="emit('skip')"
        >
          Saltar
        </button>

        <div class="flex gap-2">
          <NxButton v-if="index > 0" variant="ghost" size="sm" @click="emit('back')">
            Atrás
          </NxButton>
          <NxButton size="sm" @click="emit('next')">
            {{ isLast ? 'Entendido' : 'Siguiente' }}
          </NxButton>
        </div>
      </div>
    </div>
  </div>
</template>
