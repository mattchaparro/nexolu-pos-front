import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { fetchPlatformUsers, resetPlatformUserPassword, togglePlatformUser } from '../services/platformUserService'

const QUERY_KEY = ['superadmin', 'platform-users']

export function usePlatformUsers(search: Ref<string>, businessId: Ref<number | null>, page: Ref<number>) {
  return useQuery({
    queryKey: computed(() => [...QUERY_KEY, search.value, businessId.value, page.value] as const),
    queryFn: () =>
      fetchPlatformUsers({
        search: search.value || undefined,
        business_id: businessId.value ?? undefined,
        page: page.value,
      }),
    placeholderData: keepPreviousData,
  })
}

export function useTogglePlatformUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: togglePlatformUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useResetPlatformUserPassword() {
  // Sin invalidar la lista: resetear la contraseña no cambia nada de lo que
  // se ve en la tabla, y refrescarla borraria la contraseña recien mostrada.
  return useMutation({ mutationFn: resetPlatformUserPassword })
}
