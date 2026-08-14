import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { fetchDiscounts } from '../services/discountService'

export function useDiscounts(search: Ref<string>, page: Ref<number>) {
  return useQuery({
    queryKey: computed(() => ['discounts', 'list', search.value, page.value] as const),
    queryFn: () => fetchDiscounts({ search: search.value || undefined, page: page.value }),
    placeholderData: keepPreviousData,
  })
}
