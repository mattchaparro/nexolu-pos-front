import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { fetchSalesBySeller } from '../services/salesBySellerService'

export function useSalesBySeller(from: Ref<string>, to: Ref<string>) {
  return useQuery({
    queryKey: computed(() => ['sales-by-seller', from.value, to.value]),
    queryFn: () => fetchSalesBySeller(from.value, to.value),
  })
}
