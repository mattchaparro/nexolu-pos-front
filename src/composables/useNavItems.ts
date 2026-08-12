import { computed } from 'vue'

import { hasFeature } from '@/utils/hasFeature'

import { adminNavItems } from '@/router/navigation'
import type { NavItem } from '@/types/navigation'

import { useBusiness } from './useBusiness'
import { usePermissions } from './usePermissions'

// adminNavItems es la lista estatica portada del menu legacy (ver ese
// archivo) - la mayoria queda disabled hasta que exista el modulo. Esta
// capa habilita en vivo los items ya migrados que ademas dependen de un
// feature flag y/o permiso del negocio, sin tocar la lista base. Mismos
// gates que routes/api.php en la API y que el meta requiresFeature/
// requiresPermission del router (ver router/index.ts) - la nav solo
// decide que MOSTRAR, el guard del router y el backend siguen siendo la
// autoridad real si alguien escribe la URL a mano.
export function useNavItems() {
  const { data: business } = useBusiness()
  const { hasPermission } = usePermissions()

  // Servicios y Agenda comparten el mismo gate en el backend
  // (feature:services + permission:appointments.manage, ver routes/api.php).
  const showServicesAndAgenda = computed(
    () => business.value?.can_access_services === true && hasPermission('appointments.manage'),
  )
  const showLayaways = computed(() => business.value?.can_access_layaways === true && hasPermission('layaways.manage'))
  const showOpenTabs = computed(() => hasFeature(business.value, 'open_tabs'))

  return computed<NavItem[]>(() =>
    adminNavItems.map((item) => {
      if (item.label === 'Cuentas abiertas' && !showOpenTabs.value) {
        return { ...item, disabled: true }
      }
      if (item.label === 'Servicios' && showServicesAndAgenda.value) {
        return { ...item, routeName: 'service-orders.index', disabled: false }
      }
      if (item.label === 'Agenda' && showServicesAndAgenda.value) {
        return { ...item, routeName: 'appointments.index', disabled: false }
      }
      if (item.label === 'Apartados' && showLayaways.value) {
        return { ...item, routeName: 'layaways.index', disabled: false }
      }
      return item
    }),
  )
}
