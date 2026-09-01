import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { ALL_BRANCHES, branchStorage, type ActiveBranch } from '@/services/http/branchStorage'
import { queryClient } from '@/services/query/queryClient'
import type { Branch } from '@/types/branch'

/**
 * Sede activa del usuario. Pequeño a proposito: la lista de sedes es estado
 * de servidor y vive en TanStack Query (ver useBranches) - aca solo esta la
 * eleccion, que es lo unico que la app necesita recordar entre recargas.
 */
export const useBranchStore = defineStore('branch', () => {
  const active = ref<ActiveBranch>(branchStorage.get())
  /** Copia de la sede elegida, para pintar su nombre sin esperar al query. */
  const activeBranch = ref<Branch | null>(null)

  const isAllBranches = computed(() => active.value === ALL_BRANCHES)

  /**
   * Cambiar de sede invalida TODO el cache.
   *
   * Los ~60 queryKey de la app (['products'], ['sales',...]) no llevan la
   * sede: son el mismo cache en memoria durante toda la vida de la SPA. Sin
   * limpiarlo, el cajero que cambia de local sigue viendo el stock y las
   * ventas del anterior hasta que algo fuerce un refetch. Es exactamente el
   * bug que ya se pago con la impersonacion de superadmin (ver el comentario
   * en auth.store.ts), y prefijar 60 llaves a mano es mucho mas facil de
   * olvidar en la llave numero 61 que limpiar de golpe.
   */
  function setActive(value: ActiveBranch, branch: Branch | null = null): void {
    if (active.value === value) {
      return
    }

    active.value = value
    activeBranch.value = branch
    branchStorage.set(value)
    queryClient.clear()
  }

  /**
   * Deja la sede que el backend resolvio, sin limpiar cache: no es un cambio
   * de sede sino enterarse de cual estaba usando (primer arranque, o una
   * guardada que ya no es accesible y el backend descarto).
   */
  function syncFromServer(branchId: number | null, branch: Branch | null): void {
    if (active.value === ALL_BRANCHES) {
      return
    }

    active.value = branchId
    activeBranch.value = branch
    branchStorage.set(branchId)
  }

  function clear(): void {
    active.value = null
    activeBranch.value = null
    branchStorage.clear()
  }

  return { active, activeBranch, isAllBranches, setActive, syncFromServer, clear }
})
