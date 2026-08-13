<script setup lang="ts">
// Solo lectura: documenta que trae cada plan y para que sirve cada bandera -
// consume FeatureCatalogController::index (nexolu-pos-api), que a su vez
// refleja BusinessFeaturePresets::catalog()/basic()/full(). El mapeo
// plan -> funciones sigue siendo codigo, no editable desde aca (misma
// decision que la pestaña "Features" del detalle de negocio, que edita
// negocio por negocio, no el catalogo global).
import { computed } from 'vue'

import { NxCard, NxPageHeader } from '@/ui'
import { formatCop } from '@/utils/formatCop'

import { useFeatureCatalog } from '../composables/useFeatureCatalog'

const catalogQuery = useFeatureCatalog()

const groups = computed(() => {
  const features = catalogQuery.data.value?.features ?? []
  const order: string[] = []
  const byGroup = new Map<string, typeof features>()

  for (const feature of features) {
    if (!byGroup.has(feature.group)) {
      byGroup.set(feature.group, [])
      order.push(feature.group)
    }
    byGroup.get(feature.group)!.push(feature)
  }

  return order.map((group) => ({ group, features: byGroup.get(group)! }))
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <NxPageHeader title="Planes y Funciones" icon="pi pi-sitemap" compact />

    <div v-if="catalogQuery.isPending.value" class="h-64 animate-pulse rounded-xl bg-slate-100" />

    <template v-else-if="catalogQuery.data.value">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NxCard>
          <div class="flex items-baseline justify-between">
            <p class="text-sm font-semibold text-slate-700">Plan Básico</p>
            <p class="text-lg font-bold text-slate-900">
              {{ formatCop(catalogQuery.data.value.plans.basic.price_cop) }}<span class="text-xs font-normal text-slate-400">/mes</span>
            </p>
          </div>
        </NxCard>
        <NxCard>
          <div class="flex items-baseline justify-between">
            <p class="text-sm font-semibold text-slate-700">Plan Full</p>
            <p class="text-lg font-bold text-slate-900">
              {{ formatCop(catalogQuery.data.value.plans.full.price_cop) }}<span class="text-xs font-normal text-slate-400">/mes</span>
            </p>
          </div>
        </NxCard>
      </div>

      <p class="text-xs text-slate-400">
        Este mapeo de plan a funciones vive en código (BusinessFeaturePresets) - esta pantalla es solo para consultarlo. Para
        habilitar o apagar una función puntual en un negocio especifico, usa la pestaña "Features" de su ficha.
      </p>

      <div v-for="section in groups" :key="section.group" class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table class="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <th class="px-4 py-2.5">{{ section.group }}</th>
              <th class="w-24 px-4 py-2.5 text-center">Básico</th>
              <th class="w-24 px-4 py-2.5 text-center">Full</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="feature in section.features" :key="feature.key">
              <td class="px-4 py-3">
                <p class="font-medium text-slate-800">{{ feature.label }}</p>
                <p class="text-xs text-slate-400">{{ feature.description }}</p>
              </td>
              <td class="px-4 py-3 text-center">
                <i
                  class="pi"
                  :class="feature.basic ? 'pi-check-circle text-emerald-500' : 'pi-times-circle text-slate-300'"
                  :aria-label="feature.basic ? 'Incluido en Básico' : 'No incluido en Básico'"
                />
              </td>
              <td class="px-4 py-3 text-center">
                <i
                  class="pi"
                  :class="feature.full ? 'pi-check-circle text-emerald-500' : 'pi-times-circle text-slate-300'"
                  :aria-label="feature.full ? 'Incluido en Full' : 'No incluido en Full'"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
