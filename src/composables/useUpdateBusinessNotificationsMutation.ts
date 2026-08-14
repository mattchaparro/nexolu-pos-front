import { useMutation, useQueryClient } from '@tanstack/vue-query'

import { updateBusinessNotifications } from '@/services/business'

export function useUpdateBusinessNotificationsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateBusinessNotifications,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['business'] }),
  })
}
