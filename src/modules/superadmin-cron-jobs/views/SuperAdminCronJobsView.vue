<script setup lang="ts">
// Tareas programadas de esta API: prender/apagar sin redeploy y disparar una
// puntual fuera de su horario. Consume CronJobController (nexolu-pos-api),
// cuyo catalogo (App\Support\CronJobCatalog) es la unica fuente de verdad de
// que jobs existen.
//
// Evolucion de SuperAdmin/CronJobs.vue del legacy: misma tarjeta por job,
// mismo indicador de estado, mismo historial expandible. Cambia solo lo que
// el stack nuevo hace distinto (fechas en ISO que se formatean aca, y un
// error de "Ejecutar" que se muestra en linea en vez de un flash de Inertia).
import { computed, ref } from 'vue'

import { NxButton, NxCard, NxPageHeader, NxSwitch } from '@/ui'
import type { CronJob, CronJobRun } from '@/types/cronJob'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import { useCronJobs, useRunCronJobNow, useToggleCronJob } from '../composables/useCronJobs'

const jobsQuery = useCronJobs()
const toggleJob = useToggleCronJob()
const runNow = useRunCronJobNow()

const expandedKey = ref<string | null>(null)

function toggleHistory(key: string): void {
  expandedKey.value = expandedKey.value === key ? null : key
}

const runError = computed(() =>
  runNow.error.value ? extractErrorMessage(runNow.error.value, 'No pudimos ejecutar el job.') : null,
)

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isRunning(job: CronJob): boolean {
  return runNow.isPending.value && runNow.variables.value === job.key
}

function statusClass(run: CronJobRun): string {
  return run.status === 'success' ? 'text-emerald-600' : 'text-red-600'
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <NxPageHeader
      title="Cron jobs"
      subtitle="Tareas programadas del sistema — actívalas, desactívalas o ejecútalas manualmente."
      icon="pi pi-clock"
      compact
    />

    <p v-if="runError" class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {{ runError }}
    </p>

    <div v-if="jobsQuery.isPending.value" class="h-64 animate-pulse rounded-xl bg-slate-100" />

    <template v-else>
      <NxCard v-for="job in jobsQuery.data.value ?? []" :key="job.key" class="p-0">
        <div class="flex items-start gap-4 px-5 py-4">
          <span
            class="mt-1.5 inline-block size-3 shrink-0 rounded-full"
            :class="job.enabled ? 'bg-emerald-400' : 'bg-slate-300'"
          />

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-sm font-semibold text-slate-900">{{ job.name }}</p>
              <span
                class="rounded-full px-2 py-0.5 text-xs font-semibold"
                :class="job.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'"
              >
                {{ job.enabled ? 'Activo' : 'Desactivado' }}
              </span>
            </div>

            <p class="mt-0.5 text-xs leading-relaxed text-slate-500">{{ job.description }}</p>

            <div class="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
              <i class="pi pi-clock text-[11px]" />
              <span class="font-mono">{{ job.schedule }}</span>
              <span class="text-slate-300">·</span>
              <span class="font-mono">{{ job.command }}</span>
            </div>

            <div class="mt-2 flex flex-wrap items-center gap-2">
              <template v-if="job.last_run">
                <span
                  class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold"
                  :class="
                    job.last_run.status === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  "
                >
                  <i :class="job.last_run.status === 'success' ? 'pi pi-check-circle' : 'pi pi-times-circle'" class="text-[11px]" />
                  {{ job.last_run.status === 'success' ? 'OK' : 'Error' }}
                </span>
                <span class="text-xs text-slate-400">
                  Última ejecución:
                  <strong class="text-slate-600">{{ formatDateTime(job.last_run.ran_at) }}</strong>
                </span>
                <span
                  v-if="job.last_run.triggered_by === 'manual'"
                  class="rounded-full border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600"
                >
                  Manual
                </span>
                <p v-if="job.last_run.output" class="w-full text-xs" :class="statusClass(job.last_run)">
                  {{ job.last_run.output }}
                </p>
              </template>
              <span v-else class="text-xs italic text-slate-400">Sin ejecuciones registradas</span>
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <NxButton
              v-if="job.recent_logs.length > 0"
              size="sm"
              variant="outline"
              :icon="expandedKey === job.key ? 'pi pi-chevron-up' : 'pi pi-history'"
              @click="toggleHistory(job.key)"
            />
            <NxButton
              size="sm"
              variant="outline"
              icon="pi pi-play"
              :loading="isRunning(job)"
              @click="runNow.mutate(job.key)"
            >
              {{ isRunning(job) ? 'Corriendo…' : 'Ejecutar' }}
            </NxButton>
            <!-- Sin confirmacion a proposito: apagar un job es reversible con
                 el mismo clic, y el cambio queda en auditoria. -->
            <NxSwitch
              :model-value="job.enabled"
              :disabled="toggleJob.isPending.value"
              @update:model-value="toggleJob.mutate(job.key)"
            />
          </div>
        </div>

        <div v-if="expandedKey === job.key" class="border-t border-slate-100 bg-slate-50 px-5 py-3">
          <p class="mb-2 text-xs font-semibold uppercase text-slate-500">Historial reciente</p>
          <div class="space-y-1.5">
            <div v-for="(log, index) in job.recent_logs" :key="index" class="flex items-start gap-2 text-xs">
              <i
                :class="log.status === 'success' ? 'pi pi-check-circle text-emerald-500' : 'pi pi-times-circle text-red-500'"
                class="mt-0.5 shrink-0 text-[11px]"
              />
              <span class="shrink-0 font-mono text-slate-400">{{ formatDateTime(log.ran_at) }}</span>
              <span
                v-if="log.triggered_by === 'manual'"
                class="shrink-0 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600"
              >
                manual
              </span>
              <span class="break-words" :class="log.status === 'success' ? 'text-slate-600' : 'text-red-600'">
                {{ log.output || '—' }}
              </span>
            </div>
          </div>
        </div>
      </NxCard>

      <p class="pt-2 text-center text-xs text-slate-400">
        Los cambios se aplican en la próxima corrida del scheduler
        (<code class="font-mono">* * * * * php artisan schedule:run</code>).
      </p>
    </template>
  </div>
</template>
