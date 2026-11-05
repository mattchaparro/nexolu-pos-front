import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'

import type { SupplierReportFilters } from '@/types/supplierReport'

import { fetchSupplierReport } from '../services/supplierReportService'

export function useSupplierReport(filters: Ref<SupplierReportFilters>, page: Ref<number>) {
  return useQuery({
    queryKey: computed(() => ['supplier-report', filters.value, page.value] as const),
    queryFn: () => fetchSupplierReport(filters.value, page.value),
    placeholderData: keepPreviousData,
  })
}
