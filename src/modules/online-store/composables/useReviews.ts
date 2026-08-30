import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import {
  fetchPendingReviewCount,
  fetchReviews,
  moderateReview,
  type ReviewStatus,
} from '../services/reviewService'

export function useReviews(status: Ref<ReviewStatus | 'all'>, page: Ref<number>) {
  return useQuery({
    queryKey: computed(() => ['store-reviews', 'list', status.value, page.value] as const),
    queryFn: () => fetchReviews({ status: status.value, page: page.value }),
    placeholderData: keepPreviousData,
  })
}

/**
 * Para el badge de la navegación. Se refresca solo, como la bandeja de
 * pedidos: una opinión entra sin que nadie toque el POS.
 */
export function usePendingReviewCount(enabled: Ref<boolean>) {
  return useQuery({
    queryKey: ['store-reviews', 'pending-count'],
    queryFn: fetchPendingReviewCount,
    enabled,
    refetchInterval: 120_000,
  })
}

export function useReviewModeration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { id: number; status: 'approved' | 'hidden' }) =>
      moderateReview(params.id, params.status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['store-reviews'] })
    },
  })
}
