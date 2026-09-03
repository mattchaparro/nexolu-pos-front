<script setup lang="ts">
// Sistema: los logs de la aplicacion sin entrar por SSH. Consume
// SuperAdmin\SystemController (nexolu-pos-api).
//
// Evolucion de SuperAdmin/ErrorLogs/Index.vue del legacy: mismas dos
// pestañas (errores / logs) y los mismos filtros. Lo que cambia es que el
// backend ya no carga los archivos enteros en memoria (lee la cola), y que
// se avisa si Sentry no esta configurado - sin eso, "no hay errores" en esta
// pantalla se puede leer como "no hay errores en ningun lado".
import { computed, ref, watch } from 'vue'

import type { SystemLogEntry } from '@/types/systemLog'
import { NxButton, NxCard, NxInput, NxPageHeader, NxSelect } from '@/ui'

import { useSystemLogs } from '../composables/useSystemLogs'

const tab = ref<'errors' | 'logs'>('errors')
const level = ref<string | null>(null)
const searchInput = ref('')
const search = ref('')
const date = ref<string | null>(null)
const page = ref(1)

let debounce: number | undefined
watch(searchInput, (value) => {
  window.clearTimeout(debounce)
  debounce = window.setTimeout(() => {
    search.value = value
    page.value = 1
  }, 300)
})

watch([tab, level, date], () => {
  page.value = 1
  // El nivel elegido puede no existir en la otra pestaña (un ERROR no vive
  // entre los logs de rutina): se limpia para no dejar la tabla vacia sin
  // que se entienda por que.
  level.value = null
})

const logsQuery = useSystemLogs(tab, level, search, date, page)
const meta = computed(() => logsQuery.data.value?.meta)
const environment = computed(() => logsQuery.data.value?.environment)

const levelOptions = computed(() =>
  (logsQuery.data.value?.levels?.[tab.value] ?? []).map((value) => ({ value, label: value })),
)

const expandedIndex = ref<number | null>(null)

function toggle(index: number): void {
  expandedIndex.value = expandedIndex.value === index ? null : index
}

function levelClass(entry: SystemLogEntry): string {
  if (['ERROR', 'CRITICAL', 'ALERT', 'EMERGENCY'].includes(entry.level)) {
    return 'bg-red-100 text-red-700'
  }
  if (entry.level === 'WARNING') {
    return 'bg-amber-100 text-amber-800'
  }
  return 'bg-slate-100 text-slate-600'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <NxPageHeader
      title="Sistema"
      subtitle="Registros de la aplicación en el servidor."
      icon="pi pi-server"
      compact
    />

    <!-- Antes de concluir "no hay errores" hay que saber si Sentry esta
         recibiendo: si no lo esta, este visor es la unica fuente. -->
    <p
      v-if="environment && !environment.sentry_configured"
      class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
    >
      Sentry no está configurado en este ambiente ({{ environment.app_env }}): estos archivos son la
      única fuente de errores.
    </p>

    <div v-if="environment" class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
      <span>{{ environment.app_env }}</span>
      <span>PHP {{ environment.php_version }}</span>
      <span>Laravel {{ environment.laravel_version }}</span>
      <span>TZ {{ environment.timezone }}</span>
      <span v-if="environment.app_debug" class="font-semibold text-red-600">APP_DEBUG activo</span>
      <span v-for="file in logsQuery.data.value?.files ?? []" :key="file.name">
        {{ file.name }} ({{ formatBytes(file.size_bytes) }})
      </span>
    </div>

    <nav class="flex gap-1 border-b border-slate-200">
      <button
        v-for="option in [
          { key: 'errors' as const, label: 'Errores' },
          { key: 'logs' as const, label: 'Logs' },
        ]"
        :key="option.key"
        type="button"
        class="border-b-2 px-4 py-2 text-sm font-medium"
        :class="tab === option.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'"
        @click="tab = option.key"
      >
        {{ option.label }}
      </button>
    </nav>

    <div class="flex flex-wrap items-end gap-3">
      <NxSelect
        v-model="level"
        :options="levelOptions"
        option-label="label"
        option-value="value"
        label="Nivel"
        placeholder="Todos"
        class="min-w-[160px]"
        show-clear
      />
      <NxInput v-model="date" label="Fecha (YYYY-MM-DD)" placeholder="Todas" class="w-44" />
      <NxInput
        v-model="searchInput"
        label="Buscar en el mensaje"
        class="min-w-[240px] flex-1"
        icon="pi pi-search"
        clearable
        blur-after-typing
      />
    </div>

    <p v-if="meta?.truncated" class="text-xs text-amber-700">
      Se alcanzó el tope de registros leídos: puede faltar historia más vieja. Acota con fecha o nivel.
    </p>

    <div v-if="logsQuery.isPending.value" class="h-64 animate-pulse rounded-xl bg-slate-100" />

    <template v-else>
      <p v-if="(logsQuery.data.value?.data.length ?? 0) === 0" class="py-8 text-center text-sm text-slate-400">
        No hay registros con esos criterios.
      </p>

      <NxCard v-for="(entry, index) in logsQuery.data.value?.data ?? []" :key="index" class="p-0">
        <div class="flex items-start gap-3 px-4 py-3">
          <span class="rounded-full px-2 py-0.5 text-[10px] font-bold" :class="levelClass(entry)">
            {{ entry.level }}
          </span>

          <div class="min-w-0 flex-1">
            <p class="font-mono text-xs text-slate-400">{{ entry.timestamp }} · {{ entry.channel }}</p>
            <p v-if="entry.exception_class" class="font-mono text-xs font-semibold text-red-700">
              {{ entry.exception_class }}
            </p>
            <p class="break-words text-sm text-slate-800">{{ entry.message }}</p>

            <button
              v-if="entry.context || entry.trace.length"
              type="button"
              class="mt-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              @click="toggle(index)"
            >
              {{ expandedIndex === index ? 'Ocultar detalle' : 'Ver detalle' }}
            </button>

            <template v-if="expandedIndex === index">
              <pre
                v-if="entry.context"
                class="mt-2 overflow-x-auto rounded-lg bg-slate-50 p-2 text-xs text-slate-600"
              >{{ JSON.stringify(entry.context, null, 2) }}</pre>
              <pre
                v-if="entry.trace.length"
                class="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-2 text-xs text-slate-100"
              >{{ entry.trace.join('\n') }}</pre>
              <p v-if="entry.trace_lines > entry.trace.length" class="mt-1 text-xs text-slate-400">
                +{{ entry.trace_lines - entry.trace.length }} líneas más (recortadas)
              </p>
            </template>
          </div>
        </div>
      </NxCard>

      <div v-if="(meta?.last_page ?? 1) > 1" class="flex items-center justify-center gap-3">
        <NxButton size="sm" variant="outline" :disabled="page <= 1" @click="page -= 1">Anterior</NxButton>
        <span class="text-xs text-slate-500">Página {{ meta?.current_page }} de {{ meta?.last_page }}</span>
        <NxButton
          size="sm"
          variant="outline"
          :disabled="page >= (meta?.last_page ?? 1)"
          @click="page += 1"
        >
          Siguiente
        </NxButton>
      </div>
    </template>
  </div>
</template>
