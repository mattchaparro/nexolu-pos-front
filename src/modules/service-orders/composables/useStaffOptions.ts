import { useQuery } from '@tanstack/vue-query'

import { httpClient } from '@/services/http/client'

// Lista minima de personal (para asignar quien atendio cada item) - GET
// /employees no pagina restringido por permiso (ver comentario en
// routes/api.php: cualquier usuario del negocio puede listar), no hace
// falta un modulo de Empleados completo para este picker de solo lectura.
export interface StaffOption {
  id: number
  name: string
  is_active: boolean
}

// GET /employees no pagina (Eloquent::get(), no paginate()) - a diferencia
// de un listado paginado, serializa como array plano, no {data:[...]} (ver
// fetchCategories en catalog/services/catalogService.ts, mismo caso).
export function useStaffOptions() {
  return useQuery({
    queryKey: ['employees', 'staff-options'] as const,
    queryFn: async () => {
      const { data } = await httpClient.get<StaffOption[]>('/employees')
      return data.filter((e) => e.is_active)
    },
  })
}
