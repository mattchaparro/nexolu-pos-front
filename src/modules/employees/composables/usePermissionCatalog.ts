import { useQuery } from '@tanstack/vue-query'

import { fetchPermissionCatalog } from '../services/employeeService'

// feature:permissions_management gatea este endpoint en el backend - si el
// negocio no lo tiene, la query falla en silencio (isError) y
// EmployeePermissionsModal.vue no debe abrirse para ese caso (ver
// UsersView.vue, que ya oculta la accion "Permisos" sin el feature).
export function usePermissionCatalog(enabled: boolean) {
  return useQuery({
    queryKey: ['employees', 'permission-catalog'] as const,
    queryFn: fetchPermissionCatalog,
    enabled,
  })
}
