import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'

import {
  deleteLibraryImage,
  fetchStoreImages,
  uploadLibraryImage,
} from '../services/storeSettingsService'

export function useStoreImageLibrary() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['store-images'] })

  const imagesQuery = useQuery({ queryKey: ['store-images'], queryFn: fetchStoreImages })

  const uploadMutation = useMutation({ mutationFn: uploadLibraryImage, onSuccess: invalidate })
  const deleteMutation = useMutation({ mutationFn: deleteLibraryImage, onSuccess: invalidate })

  return { imagesQuery, uploadMutation, deleteMutation }
}
