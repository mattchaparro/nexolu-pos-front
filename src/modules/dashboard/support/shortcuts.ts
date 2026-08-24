import type { DashboardShortcut } from '@/types/dashboard'
import type { NavItem } from '@/types/navigation'

export interface ResolvedShortcut {
  routeName: string
  label: string
  icon: string
  color: 'primary' | 'outline'
}

const MAX_DEFAULT_SHORTCUTS = 4

/** Candidatos validos para un atajo: con ruta propia, no el Inicio, no un modulo todavia sin construir. */
export function eligibleNavItems(navItems: NavItem[]): NavItem[] {
  return navItems.filter((item) => item.routeName && item.routeName !== 'dashboard' && !item.disabled)
}

/**
 * Sin personalizacion todavia (shortcuts === null): arma un default a partir
 * de los primeros items que el usuario puede ver (useNavItems() ya filtro
 * por permiso/feature) - el primero en indigo (destacado, tipicamente
 * "Vender"), el resto neutro. A diferencia del legacy no hace falta una
 * lista separada admin/empleado: el mismo useNavItems() ya devuelve solo lo
 * que cada quien puede usar.
 */
export function getDefaultShortcuts(navItems: NavItem[]): ResolvedShortcut[] {
  return eligibleNavItems(navItems)
    .slice(0, MAX_DEFAULT_SHORTCUTS)
    .map((item, index) => ({
      routeName: item.routeName as string,
      label: item.label,
      icon: item.icon,
      color: index === 0 ? 'primary' : 'outline',
    }))
}

/**
 * Resuelve los atajos guardados contra la lista de nav items ACTUAL del
 * usuario - un atajo cuya ruta ya no existe, o que el usuario ya no puede
 * ver (permiso/feature quitado despues de guardarlo), se descarta en vez de
 * romper el grid, mismo criterio que el legacy con admin.json.
 */
export function resolveShortcuts(
  saved: DashboardShortcut[] | null,
  navItems: NavItem[],
): ResolvedShortcut[] {
  if (saved === null) {
    return getDefaultShortcuts(navItems)
  }

  const byRouteName = new Map(eligibleNavItems(navItems).map((item) => [item.routeName, item]))

  return saved
    .map((shortcut): ResolvedShortcut | null => {
      const item = byRouteName.get(shortcut.route_name)
      if (!item || !item.routeName) {
        return null
      }
      return { routeName: item.routeName, label: item.label, icon: item.icon, color: shortcut.color }
    })
    .filter((s): s is ResolvedShortcut => s !== null)
}
