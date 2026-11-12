import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'

import { fetchLinkPage, updateLinkPage, type BioLink } from '../services/linkPageService'

export function useLinkPage() {
  const queryClient = useQueryClient()

  const linkPageQuery = useQuery({
    queryKey: ['link-page'],
    queryFn: fetchLinkPage,
  })

  const updateMutation = useMutation({
    mutationFn: (payload: { enabled?: boolean; bio_links?: BioLink[] }) => updateLinkPage(payload),
    onSuccess: (state) => queryClient.setQueryData(['link-page'], state),
  })

  return { linkPageQuery, updateMutation }
}
