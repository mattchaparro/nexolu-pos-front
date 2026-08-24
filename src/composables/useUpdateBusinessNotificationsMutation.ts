import { useMutation, useQueryClient } from '@tanstack/vue-query'

import { updateBusinessNotifications } from '@/services/business'

export function useUpdateBusinessNotificationsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { preferences: Record<string, boolean>; schedule: Record<string, string> }) =>
      updateBusinessNotifications(payload.preferences, payload.schedule),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['business'] }),
  })
}
