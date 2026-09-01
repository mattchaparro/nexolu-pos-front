const BRANCH_KEY = 'nexolu_active_branch'

/** Valor especial: ver todas las sedes a la vez (solo admin). */
export const ALL_BRANCHES = 'all'

export type ActiveBranch = number | typeof ALL_BRANCHES | null

/**
 * Sede activa, en localStorage y no solo en Pinia, por la misma razon que el
 * token (ver tokenStorage): el interceptor de axios la necesita en cada
 * peticion, incluidas las que salen antes de que Pinia hidrate, y tiene que
 * sobrevivir una recarga de pagina - si no, el cajero volveria a la sede por
 * defecto cada vez que refresca, y podria vender en el local equivocado sin
 * darse cuenta.
 *
 * Unica fuente de verdad del nombre de la llave: el store la escribe, el
 * interceptor solo la lee.
 */
export const branchStorage = {
  get(): ActiveBranch {
    const raw = localStorage.getItem(BRANCH_KEY)
    if (!raw) {
      return null
    }
    if (raw === ALL_BRANCHES) {
      return ALL_BRANCHES
    }
    const id = Number(raw)
    return Number.isInteger(id) && id > 0 ? id : null
  },
  set(value: ActiveBranch): void {
    if (value === null) {
      localStorage.removeItem(BRANCH_KEY)
      return
    }
    localStorage.setItem(BRANCH_KEY, String(value))
  },
  clear(): void {
    localStorage.removeItem(BRANCH_KEY)
  },
}
