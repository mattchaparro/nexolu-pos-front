import { useMutation } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'

import { impersonateUser } from '../services/businessService'

/** Impersonar un usuario y entrar directo a su dashboard de negocio. */
export function useImpersonate() {
  const auth = useAuthStore()
  const router = useRouter()

  const impersonateMutation = useMutation({
    mutationFn: impersonateUser,
    onSuccess: async (data) => {
      auth.impersonate(data)
      await router.push({ name: 'dashboard' })
    },
  })

  return { impersonateMutation }
}
