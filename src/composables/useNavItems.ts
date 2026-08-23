import { computed } from 'vue'

import router from '@/router'
import { useAuthStore } from '@/stores/auth.store'
import { hasFeature } from '@/utils/hasFeature'

import { adminNavItems } from '@/router/navigation'
import type { NavItem } from '@/types/navigation'

import { useBusiness } from './useBusiness'
import { usePermissions } from './usePermissions'

// adminNavItems es la lista estatica portada del menu legacy (ver ese
// archivo) - la mayoria queda disabled hasta que exista el modulo. Esta
// capa saca del menu por completo cualquier item que el usuario actual no
// pueda usar:
//  1. featureKey que el negocio no tiene contratado - grisado
//     ("proximamente") es solo para un modulo que SI esta en su plan pero
//     que el frontend aun no construyo; un feature que el negocio ni
//     siquiera contrato no deberia aparecer ni grisado.
//  2. requiresAdmin/requiresPermission de la RUTA real del item, resuelto
//     contra el router (no una copia a mano de esos gates aca) - un
//     empleado sin el permiso de un modulo no debe verlo en el menu,
//     aunque el negocio si tenga el feature contratado.
//
// Version anterior de este archivo (bug reportado 2026-08-22): solo 8
// items tenian gate de permiso, hardcodeados por label, y encima la logica
// solo podia "habilitar" un item que la lista base ya traia habilitado -
// nunca ocultaba nada. Resultado real: un empleado sin ningun permiso veia
// el mismo menu completo que el admin. Resolver contra el router en vez de
// duplicar los permisos aca es a proposito: el guard de router/index.ts y
// esto SIEMPRE tienen que decir lo mismo, y la unica forma de garantizarlo
// es que compartan la fuente en vez de mantener dos listas en paralelo.
export function useNavItems() {
  const { data: business } = useBusiness()
  const { hasPermission } = usePermissions()
  const auth = useAuthStore()

  const isAdmin = computed(() => auth.user?.roles?.includes('admin') === true)

  function isRouteAccessible(routeName: string): boolean {
    const route = router.getRoutes().find((r) => r.name === routeName)
    if (!route) {
      return true
    }
    if (route.meta.requiresAdmin && !isAdmin.value) {
      return false
    }
    if (route.meta.requiresPermission) {
      const required = Array.isArray(route.meta.requiresPermission)
        ? route.meta.requiresPermission
        : [route.meta.requiresPermission]
      if (!isAdmin.value && !required.some((p) => hasPermission(p))) {
        return false
      }
    }
    return true
  }

  return computed<NavItem[]>(() =>
    adminNavItems.filter(
      (item) =>
        (!item.featureKey || hasFeature(business.value, item.featureKey)) &&
        (!item.routeName || isRouteAccessible(item.routeName)),
    ),
  )
}
