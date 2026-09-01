<script setup lang="ts">
/**
 * Selector de sede de la barra superior.
 *
 * Es la unica forma de cambiar de sede en toda la app: elegida aca, viaja en
 * el header X-Branch-Id (ver services/http/client.ts) y ninguna pantalla
 * tiene que pedirla ni pasarla.
 *
 * No se muestra si el negocio tiene una sola sede: para el monosede -- que
 * hoy son todos -- un selector con una sola opcion es ruido puro.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { useBranches } from '@/composables/useBranches'
import { ALL_BRANCHES } from '@/services/http/branchStorage'
import { useBranchStore } from '@/stores/branch.store'
import type { Branch } from '@/types/branch'

const { branches, canViewAllBranches, hasMultipleBranches } = useBranches()
const branchStore = useBranchStore()

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const currentLabel = computed(() => {
  if (branchStore.isAllBranches) {
    return 'Todas las sedes'
  }

  const current = branches.value.find((branch: Branch) => branch.id === branchStore.active)

  return current?.name ?? branchStore.activeBranch?.name ?? 'Sede'
})

function choose(value: number | typeof ALL_BRANCHES, branch: Branch | null): void {
  branchStore.setActive(value, branch)
  open.value = false
}

// Cerrar al hacer click afuera, mismo comportamiento que el menu de perfil
// de la barra (NxNavbar): sin esto el desplegable se queda abierto encima
// de la pantalla y hay que volver al boton para cerrarlo.
//
// El boton que abre lleva @click.stop: sin eso su propio click sigue
// burbujeando hasta aca y cierra el desplegable en el mismo gesto que lo
// abrio, asi que no se abria nunca.
function handleClickOutside(event: MouseEvent): void {
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div v-if="hasMultipleBranches" ref="rootRef" class="relative">
    <button
      type="button"
      class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white"
      :aria-expanded="open"
      aria-haspopup="true"
      @click.stop="open = !open"
    >
      <i class="pi pi-map-marker text-xs" />
      <span class="max-w-[10rem] truncate">{{ currentLabel }}</span>
      <i class="pi pi-angle-down text-xs text-white/70" />
    </button>

    <div
      v-if="open"
      class="absolute right-0 top-full z-30 mt-2 w-64 rounded-lg border border-slate-200 bg-white py-1.5 text-slate-700 shadow-lg"
    >
      <p class="px-4 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Sede
      </p>

      <button
        v-for="branch in branches"
        :key="branch.id"
        type="button"
        class="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm hover:bg-slate-50"
        :class="{ 'font-semibold text-indigo-700': branchStore.active === branch.id }"
        @click="choose(branch.id, branch)"
      >
        <span class="min-w-0">
          <span class="block truncate">{{ branch.name }}</span>
          <span v-if="branch.is_main" class="text-xs text-slate-400">Principal</span>
        </span>
        <i v-if="branchStore.active === branch.id" class="pi pi-check text-xs text-indigo-600" />
      </button>

      <!-- Solo si el backend dice que este usuario puede: ofrecerlo a quien
           no puede daria un 403 al elegirlo. -->
      <template v-if="canViewAllBranches">
        <div class="my-1 border-t border-slate-100" />
        <button
          type="button"
          class="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm hover:bg-slate-50"
          :class="{ 'font-semibold text-indigo-700': branchStore.isAllBranches }"
          @click="choose(ALL_BRANCHES, null)"
        >
          <span>
            <span class="block">Todas las sedes</span>
            <span class="text-xs text-slate-400">Consolidado, solo lectura</span>
          </span>
          <i v-if="branchStore.isAllBranches" class="pi pi-check text-xs text-indigo-600" />
        </button>
      </template>
    </div>
  </div>
</template>
