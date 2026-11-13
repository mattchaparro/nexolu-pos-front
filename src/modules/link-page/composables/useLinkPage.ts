import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'

import {
  deleteLinkPageLogo,
  fetchLinkPage,
  type LinkPagePayload,
  type LinkPageState,
  updateLinkPage,
  uploadLinkPageLogo,
} from '../services/linkPageService'

export function useLinkPage() {
  const queryClient = useQueryClient()

  const linkPageQuery = useQuery({
    queryKey: ['link-page'],
    queryFn: fetchLinkPage,
  })

  const onSaved = (state: LinkPageState) => {
    queryClient.setQueryData(['link-page'], state)
    // Las redes y el logo también son del negocio y de la tienda.
    queryClient.invalidateQueries({ queryKey: ['business'] })
    queryClient.invalidateQueries({ queryKey: ['store-settings'] })
  }

  const updateMutation = useMutation({
    mutationFn: (payload: LinkPagePayload) => updateLinkPage(payload),
    onSuccess: onSaved,
  })

  const uploadLogoMutation = useMutation({
    mutationFn: (file: File) => uploadLinkPageLogo(file),
    onSuccess: onSaved,
  })

  const deleteLogoMutation = useMutation({
    mutationFn: () => deleteLinkPageLogo(),
    onSuccess: onSaved,
  })

  return { linkPageQuery, updateMutation, uploadLogoMutation, deleteLogoMutation }
}
