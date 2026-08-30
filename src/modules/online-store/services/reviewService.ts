import { httpClient } from '@/services/http/client'
import type { PaginatedResponse } from '@/types/pagination'

/**
 * Moderación de opiniones de la tienda online.
 *
 * No hay `create` ni edición del texto a propósito: el comerciante decide qué
 * se publica, no qué dicen sus clientes (ver ProductReviewModerationController
 * en nexolu-pos-api).
 */
export type ReviewStatus = 'pending' | 'approved' | 'hidden'

export interface ProductReview {
  id: number
  rating: number
  comment: string | null
  author_name: string
  status: ReviewStatus
  product: { id: number; name: string } | null
  order_id: number
  created_at: string | null
  moderated_at: string | null
}

export async function fetchReviews(params: {
  status?: ReviewStatus | 'all'
  page?: number
}): Promise<PaginatedResponse<ProductReview>> {
  const { data } = await httpClient.get<PaginatedResponse<ProductReview>>('/store-reviews', {
    params,
  })
  return data
}

export async function fetchPendingReviewCount(): Promise<number> {
  const { data } = await httpClient.get<{ pending: number }>('/store-reviews/pending-count')
  return data.pending
}

export async function moderateReview(
  id: number,
  status: Extract<ReviewStatus, 'approved' | 'hidden'>,
): Promise<ProductReview> {
  const { data } = await httpClient.patch<ProductReview>(`/store-reviews/${id}`, { status })
  return data
}
