import { computed } from 'vue'

import { hasFeature } from '@/utils/hasFeature'

import { adminNavItems } from '@/router/navigation'
import type { NavItem } from '@/types/navigation'

import { useBusiness } from './useBusiness'
import { usePermissions } from './usePermissions'

// adminNavItems es la lista estatica portada del menu legacy (ver ese
// archivo) - la mayoria queda disabled hasta que exista el modulo. Esta
// capa hace 2 cosas sin tocar la lista base:
//  1. Saca del menu por completo cualquier item cuyo featureKey el
//     negocio no tenga habilitado - grisado ("proximamente") es solo para
//     un modulo que SI esta en su plan pero que el frontend aun no
//     construyo; un feature que el negocio ni siquiera contrato no
//     deberia aparecer ni grisado.
//  2. Habilita en vivo los items ya migrados que ademas dependen de un
//     permiso del negocio (Servicios/Agenda/Apartados).
// Mismos gates que routes/api.php en la API y que el meta requiresFeature/
// requiresPermission del router (ver router/index.ts) - la nav solo
// decide que MOSTRAR, el guard del router y el backend siguen siendo la
// autoridad real si alguien escribe la URL a mano.
export function useNavItems() {
  const { data: business } = useBusiness()
  const { hasPermission } = usePermissions()

  // Servicios (feature:services) y Agenda (feature:scheduling) son features
  // independientes del negocio, ambos con el mismo permiso de empleado
  // (permission:appointments.manage, ver routes/api.php) - un negocio puede
  // tener uno sin el otro (ej. reparaciones a domicilio sin calendario).
  const showServices = computed(
    () => business.value?.can_access_services === true && hasPermission('appointments.manage'),
  )
  const showAgenda = computed(
    () => business.value?.can_access_scheduling === true && hasPermission('appointments.manage'),
  )
  const showLayaways = computed(() => business.value?.can_access_layaways === true && hasPermission('layaways.manage'))
  // Descuentos no tiene un "can_access_x" precalculado en BusinessResource
  // (a diferencia de servicios/agenda/apartados) porque no depende de un OR
  // entre varias features - solo del feature 'discounts' (ya filtrado abajo
  // por featureKey) mas este permiso.
  const showDiscounts = computed(() => hasPermission('discounts.manage'))

  return computed<NavItem[]>(() =>
    adminNavItems
      .filter((item) => !item.featureKey || hasFeature(business.value, item.featureKey))
      .map((item) => {
        if (item.label === 'Servicios' && showServices.value) {
          return { ...item, routeName: 'service-orders.index', disabled: false }
        }
        if (item.label === 'Agenda' && showAgenda.value) {
          return { ...item, routeName: 'appointments.index', disabled: false }
        }
        if (item.label === 'Apartados' && showLayaways.value) {
          return { ...item, routeName: 'layaways.index', disabled: false }
        }
        if (item.label === 'Descuentos' && showDiscounts.value) {
          return { ...item, routeName: 'discounts.index', disabled: false }
        }
        return item
      }),
  )
}
