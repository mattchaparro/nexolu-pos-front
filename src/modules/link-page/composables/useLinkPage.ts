import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'

import {
  type BrandImageKind,
  deleteBrandImage,
  deleteLinkPageIcon,
  deleteLinkPageLogo,
  fetchLinkPage,
  type LinkPagePayload,
  type LinkPageState,
  updateLinkPage,
  uploadBrandImage,
  uploadLinkPageIcon,
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

  const uploadIconMutation = useMutation({
    mutationFn: (file: File) => uploadLinkPageIcon(file),
    onSuccess: onSaved,
  })

  const deleteIconMutation = useMutation({
    mutationFn: () => deleteLinkPageIcon(),
    onSuccess: onSaved,
  })

  const uploadBrandImageMutation = useMutation({
    mutationFn: ({ kind, file }: { kind: BrandImageKind; file: File }) => uploadBrandImage(kind, file),
    onSuccess: onSaved,
  })

  const deleteBrandImageMutation = useMutation({
    mutationFn: (kind: BrandImageKind) => deleteBrandImage(kind),
    onSuccess: onSaved,
  })

  return {
    linkPageQuery,
    uploadBrandImageMutation,
    deleteBrandImageMutation,
    updateMutation,
    uploadLogoMutation,
    deleteLogoMutation,
    uploadIconMutation,
    deleteIconMutation,
  }
}
