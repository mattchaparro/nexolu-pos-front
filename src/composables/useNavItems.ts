import { computed } from 'vue'

import { adminNavItems } from '@/router/navigation'
import type { NavItem } from '@/types/navigation'

import { useBusiness } from './useBusiness'
import { usePermissions } from './usePermissions'

// adminNavItems es la lista estatica portada del menu legacy (ver ese
// archivo) - la mayoria queda disabled hasta que exista el modulo. Esta
// capa habilita en vivo los items ya migrados que ademas dependen de un
// feature flag + permiso del negocio (Servicios/Apartados), sin tocar la
// lista base.
export function useNavItems() {
  const { data: business } = useBusiness()
  const { hasPermission } = usePermissions()

  const showServiceOrders = computed(() => business.value?.can_access_services === true && hasPermission('appointments.manage'))
  const showLayaways = computed(() => business.value?.can_access_layaways === true && hasPermission('layaways.manage'))

  return computed<NavItem[]>(() =>
    adminNavItems.map((item) => {
      if (item.label === 'Servicios' && showServiceOrders.value) {
        return { ...item, routeName: 'service-orders.index', disabled: false }
      }
      if (item.label === 'Apartados' && showLayaways.value) {
        return { ...item, routeName: 'layaways.index', disabled: false }
      }
      return item
    }),
  )
}
