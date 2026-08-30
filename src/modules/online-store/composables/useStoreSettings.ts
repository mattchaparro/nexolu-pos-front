import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'

import type { StoreImageSlot, StoreSettingsPayload } from '@/types/store'

import {
  deleteStoreImage,
  fetchStoreSettings,
  updateStoreSettings,
  uploadStoreImage,
} from '../services/storeSettingsService'

export function useStoreSettings() {
  const queryClient = useQueryClient()

  const settingsQuery = useQuery({
    queryKey: ['store-settings'],
    queryFn: fetchStoreSettings,
  })

  const updateMutation = useMutation({
    mutationFn: (payload: StoreSettingsPayload) => updateStoreSettings(payload),
    onSuccess: (settings) => {
      // La respuesta ya trae el estado final: se escribe directo en vez de
      // invalidar, para que el interruptor no parpadee.
      queryClient.setQueryData(['store-settings'], settings)
    },
  })

  const uploadImageMutation = useMutation({
    mutationFn: (params: { slot: StoreImageSlot; file: File }) =>
      uploadStoreImage(params.slot, params.file),
    onSuccess: (settings) => queryClient.setQueryData(['store-settings'], settings),
  })

  const deleteImageMutation = useMutation({
    mutationFn: (slot: StoreImageSlot) => deleteStoreImage(slot),
    onSuccess: (settings) => queryClient.setQueryData(['store-settings'], settings),
  })

  return { settingsQuery, updateMutation, uploadImageMutation, deleteImageMutation }
}
