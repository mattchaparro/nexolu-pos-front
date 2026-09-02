import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'

import { fetchCronJobs, runCronJobNow, toggleCronJob } from '../services/cronJobService'

const QUERY_KEY = ['superadmin', 'cron-jobs']

export function useCronJobs() {
  return useQuery({ queryKey: QUERY_KEY, queryFn: fetchCronJobs })
}

export function useToggleCronJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: toggleCronJob,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useRunCronJobNow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: runCronJobNow,
    // Se refresca la lista al terminar: correr un job escribe una fila nueva
    // en su historial, y el punto de darle "Ejecutar" es justamente ver como
    // le fue.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
