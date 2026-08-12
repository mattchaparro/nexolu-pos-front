import { computed } from 'vue'

import { useAuthStore } from '@/stores/auth.store'

// Primer uso de permissions (UserResource ya los expone en /login y /me,
// pero hasta ahora ningun modulo del frontend los necesitaba - Catalogo
// solo gateaba por feature flag). Proveedores/Compras requieren ademas el
// permiso purchases.manage (ver routes/api.php: middleware('permission:
// purchases.manage') dentro de can-access-purchases).
export function usePermissions() {
  const auth = useAuthStore()

  function hasPermission(code: string): boolean {
    return auth.user?.permissions?.includes(code) ?? false
  }

  return { hasPermission, permissions: computed(() => auth.user?.permissions ?? []) }
}
