import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import type { LayawayStatus } from '@/types/layaway'

import { fetchLayaways } from '../services/layawayService'

export function useLayaways(status: Ref<LayawayStatus | ''>, search: Ref<string>, page: Ref<number>) {
  return useQuery({
    queryKey: computed(() => ['layaways', status.value, search.value, page.value] as const),
    queryFn: () =>
      fetchLayaways({
        status: status.value || undefined,
        search: search.value || undefined,
        page: page.value,
      }),
    placeholderData: keepPreviousData,
  })
}
