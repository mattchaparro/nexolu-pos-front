<script setup lang="ts">
/**
 * Tarjeta de insight de IA embebida en el Inicio.
 *
 * Rediseñada respecto al legacy (Components/AiChat/AiInsightCard.vue), que
 * era un bloque grande con degradado y ocupaba media pantalla en el celular
 * -- justo encima de lo que el dueño abre el POS para ver. Aca es una
 * tarjeta al ras del resto del dashboard: dos lineas de texto por defecto,
 * "Ver más" para el resto, y las acciones abajo en una fila que no crece.
 *
 * No bloquea el render: se monta, pide el insight aparte y aparece cuando
 * llega. Si no hay nada que decir (o algo falla en la primera carga) la
 * tarjeta simplemente no se muestra -- mejor nada que un error en la primera
 * pantalla del dia.
 *
 * Se puede colapsar y queda colapsada entre visitas. Colapsada NO pide el
 * insight: generarlo cuesta una llamada real de IA y el dueño no lo va a
 * ver. Se pide recien cuando lo expande.
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import aiRobot from '@/assets/ai-robot.png'
import { fetchInsight, refreshInsight } from '@/services/aiInsights'
import type { AiInsight } from '@/types/aiInsight'

const props = withDefaults(
  defineProps<{
    type?: string
    title?: string
  }>(),
  {
    type: 'resumen_inteligente',
    title: 'Resumen inteligente',
  },
)

const router = useRouter()

const COLLAPSE_KEY = `nex_insight_col:${props.type}`

const insight = ref<AiInsight | null>(null)
const loading = ref(false)
const loaded = ref(false)
const expandedText = ref(false)
const refreshing = ref(false)
const refreshError = ref('')

const collapsed = ref(readCollapsed())

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    // localStorage puede fallar en modo privado; no es critico.
    return false
  }
}

function toggleCollapsed(): void {
  collapsed.value = !collapsed.value
  try {
    localStorage.setItem(COLLAPSE_KEY, collapsed.value ? '1' : '0')
  } catch {
    // Sin persistencia, pero el toggle sigue sirviendo en esta sesion.
  }

  // Se expande por primera vez sin haber pedido nunca el insight.
  if (!collapsed.value && !loaded.value) {
    load()
  }
}

async function load(): Promise<void> {
  loading.value = true
  try {
    insight.value = await fetchInsight(props.type)
  } catch {
    // Un insight que falla al cargar no deja rastro: la tarjeta se oculta.
    insight.value = null
  } finally {
    loaded.value = true
    loading.value = false
  }
}

async function refresh(): Promise<void> {
  if (refreshing.value) {
    return
  }
  refreshing.value = true
  refreshError.value = ''
  try {
    const fresh = await refreshInsight(props.type)
    if (fresh) {
      insight.value = fresh
    }
  } catch {
    // A diferencia de la carga inicial, aca NO se oculta la tarjeta: eso
    // borraria de un tajo el insight que el dueño ya estaba leyendo.
    refreshError.value = 'No pudimos actualizarlo. Intenta de nuevo.'
  } finally {
    refreshing.value = false
  }
}

function openChat(question: string): void {
  router.push({ name: 'ai-chat.index', query: { q: question } })
}

// Colapsada no se pide nada: generar el insight cuesta una llamada real de
// IA y el dueño no lo va a ver hasta que lo expanda.
onMounted(() => {
  if (!collapsed.value) {
    load()
  }
})

const visible = computed(() => collapsed.value || loading.value || insight.value !== null)
</script>

<template>
  <section
    v-if="visible"
    class="rounded-2xl border border-slate-200 bg-white shadow-sm"
    :aria-label="title"
  >
    <!-- Cabecera: lo unico que queda al colapsar. Compacta a proposito -->
    <button
      type="button"
      class="flex w-full items-center gap-3 px-4 py-3 text-left"
      :aria-expanded="!collapsed"
      @click="toggleCollapsed"
    >
      <img :src="aiRobot" alt="" class="h-9 w-9 shrink-0 object-contain" />
      <span class="min-w-0 flex-1">
        <span class="block text-xs font-bold uppercase tracking-wide text-indigo-500">
          {{ title }}
        </span>
        <span v-if="collapsed" class="block truncate text-sm text-slate-400">
          Toca para ver qué dice el Asistente
        </span>
      </span>
      <i
        class="pi shrink-0 text-xs text-slate-400"
        :class="collapsed ? 'pi-chevron-down' : 'pi-chevron-up'"
      />
    </button>

    <div v-if="!collapsed" class="px-4 pb-3">
      <div v-if="loading" class="space-y-2" aria-hidden="true">
        <div class="h-3 w-full animate-pulse rounded bg-slate-100" />
        <div class="h-3 w-4/5 animate-pulse rounded bg-slate-100" />
      </div>

      <template v-else-if="insight">
        <!-- Dos lineas por defecto: en un celular, el resumen no puede
             empujar fuera de pantalla lo que el dueño vino a ver. -->
        <p class="text-sm leading-snug text-slate-700" :class="{ 'line-clamp-2': !expandedText }">
          {{ insight.text }}
        </p>

        <button
          v-if="insight.text.length > 120"
          type="button"
          class="mt-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
          @click="expandedText = !expandedText"
        >
          {{ expandedText ? 'Ver menos' : 'Ver más' }}
        </button>

        <p v-if="refreshError" class="mt-2 text-xs text-amber-600">{{ refreshError }}</p>

        <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            v-if="insight.suggested_question"
            type="button"
            class="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            @click="openChat(insight.suggested_question)"
          >
            Preguntar más
          </button>

          <!-- Accion sugerida: dispara una herramienta de escritura, que del
               otro lado pasa por borrador y confirmacion humana. -->
          <button
            v-if="insight.suggested_action"
            type="button"
            class="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            @click="openChat(insight.suggested_action.message)"
          >
            {{ insight.suggested_action.label }}
          </button>

          <button
            type="button"
            class="ml-auto text-xs text-slate-400 hover:text-slate-600"
            :disabled="refreshing"
            @click="refresh"
          >
            <i class="pi pi-refresh mr-1 text-[10px]" :class="{ 'animate-spin': refreshing }" />
            Actualizar
          </button>
        </div>
      </template>
    </div>
  </section>
</template>
