<script setup lang="ts">
// Los recorridos guiados que ve el comerciante dentro de la app.
//
// Lee del registro en `@/tours`, que es el MISMO que corre en producción: no
// hay copia en base de datos que mantener sincronizada. Esa duplicación es
// justo lo que dejó desactualizadas a las guías de ayuda viejas
// (support_guide_articles): prosa escrita a mano, sin nadie que la revisara
// cuando la pantalla cambiaba, y encima sin ninguna pantalla del negocio que
// las mostrara.
//
// Es de solo lectura a propósito. Cada paso se ancla a un selector CSS de un
// componente real; si se pudieran editar desde acá, un cambio de marcado
// dejaría el paso apuntando a nada — sin error, en silencio, que es el peor
// modo de romperse.
import { computed, ref } from 'vue'

import { NxCard, NxPageHeader } from '@/ui'
import { TOURS } from '@/tours'

const expandedKey = ref<string | null>(TOURS[0]?.key ?? null)

function toggle(key: string): void {
  expandedKey.value = expandedKey.value === key ? null : key
}

const totalSteps = computed(() => TOURS.reduce((sum, tour) => sum + tour.steps.length, 0))
</script>

<template>
  <div class="flex flex-col gap-4">
    <NxPageHeader
      title="Guías de la app"
      subtitle="Los recorridos guiados que ve el comerciante dentro de cada módulo."
      icon="pi pi-book"
      compact
    />

    <p class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
      {{ TOURS.length }} recorridos, {{ totalSteps }} pasos en total. Se muestran la primera vez que
      el dueño entra a cada módulo y se pueden relanzar desde el signo de pregunta de cada pantalla.
      Esta vista es de solo lectura: los pasos van anclados a elementos reales de cada pantalla, así
      que viven en el código y se editan con un despliegue.
    </p>

    <NxCard v-for="tour in TOURS" :key="tour.key" class="p-0">
      <button
        type="button"
        class="flex w-full items-start gap-3 px-5 py-4 text-left"
        @click="toggle(tour.key)"
      >
        <i
          :class="expandedKey === tour.key ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
          class="mt-1 text-xs text-slate-400"
        />
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-sm font-semibold text-slate-900">{{ tour.title }}</p>
            <span
              class="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700"
            >
              {{ tour.module }}
            </span>
            <span class="text-xs text-slate-400">{{ tour.steps.length }} pasos</span>
          </div>
          <p class="mt-0.5 text-xs text-slate-500">{{ tour.description }}</p>
        </div>
      </button>

      <ol v-if="expandedKey === tour.key" class="border-t border-slate-100 bg-slate-50 px-5 py-3">
        <li
          v-for="(step, index) in tour.steps"
          :key="index"
          class="flex gap-3 border-b border-slate-200/60 py-2 last:border-0"
        >
          <span
            class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white"
          >
            {{ index + 1 }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-slate-800">{{ step.title }}</p>
            <p class="text-sm text-slate-600">{{ step.body }}</p>
            <!-- El ancla se muestra a propósito: es lo que hay que revisar
                 cuando alguien rediseña esa pantalla. -->
            <p class="mt-0.5 font-mono text-xs text-slate-400">
              {{ step.target || 'paso centrado, sin ancla' }}
            </p>
          </div>
        </li>
      </ol>
    </NxCard>
  </div>
</template>
