import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import { fetchExpenses } from '../services/expenseService'

export function useExpenses(
  month: Ref<number>,
  year: Ref<number>,
  typeId: Ref<number | null>,
  search: Ref<string>,
  page: Ref<number>,
  sort: Ref<string | undefined>,
  direction: Ref<'asc' | 'desc' | undefined>,
) {
  return useQuery({
    queryKey: computed(
      () => ['expenses', month.value, year.value, typeId.value, search.value, page.value, sort.value, direction.value] as const,
    ),
    queryFn: () =>
      fetchExpenses({
        month: month.value,
        year: year.value,
        type_id: typeId.value ?? undefined,
        search: search.value || undefined,
        page: page.value,
        sort: sort.value,
        direction: direction.value,
      }),
    placeholderData: keepPreviousData,
  })
}
