import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { type Ref, unref } from 'vue'

import { fetchAiUsage, markQuestionReviewed } from '../services/aiUsageService'

export function useAiUsage(includeReviewed: Ref<boolean>) {
  return useQuery({
    // includeReviewed va en la key: cambiarlo trae otro conjunto de filas, no
    // un filtro sobre el mismo.
    queryKey: ['superadmin', 'ai-usage', includeReviewed],
    queryFn: () => fetchAiUsage(unref(includeReviewed)),
  })
}

export function useMarkQuestionReviewed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: markQuestionReviewed,
    // Se refresca todo el panel y no solo la lista: marcar una pregunta como
    // revisada la saca del conteo, y dejar el resto de la pantalla con datos
    // de antes hace dudar de si el clic hizo algo.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['superadmin', 'ai-usage'] }),
  })
}
