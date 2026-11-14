import { computed } from 'vue'

import { usePermissions } from '@/composables/usePermissions'
import { useAuthStore } from '@/stores/auth.store'

/**
 * Fijar y ordenar productos cambia lo que ve todo el mostrador, asi que lo
 * puede hacer quien edita el catalogo (inventory.add, el mismo permiso que
 * exige el backend) o el administrador.
 */
export function useCanOrganizeProducts() {
  const auth = useAuthStore()
  const { hasPermission } = usePermissions()

  return computed(() => auth.user?.roles?.includes('admin') === true || hasPermission('inventory.add'))
}
