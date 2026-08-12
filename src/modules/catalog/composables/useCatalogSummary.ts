import { useQuery } from '@tanstack/vue-query'
import type { ComputedRef } from 'vue'

import { fetchIngredientsSummary, fetchProductsSummary, fetchServicesSummary } from '../services/catalogService'

export function useProductsSummary() {
  return useQuery({
    queryKey: ['products', 'summary'] as const,
    queryFn: fetchProductsSummary,
  })
}

export function useIngredientsSummary(enabled: ComputedRef<boolean>) {
  return useQuery({
    queryKey: ['ingredients', 'summary'] as const,
    queryFn: fetchIngredientsSummary,
    enabled,
  })
}

export function useServicesSummary(enabled: ComputedRef<boolean>) {
  return useQuery({
    queryKey: ['products', 'services-summary'] as const,
    queryFn: fetchServicesSummary,
    enabled,
  })
}
