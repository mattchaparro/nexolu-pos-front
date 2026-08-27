import type { SaleItemLine } from '@/types/dailySummary'
import type { ReceiptEntityType } from '@/types/receipt'

// Forma comun a la que se mapean ventas/servicios/apartados/fiados para
// poder renderizar una sola fila reusable tanto en la vista agrupada por
// canal como en la vista "todo junto" (que necesita una columna de canal
// por fila, ver DailySummaryView.vue).
export interface TransactionRow {
  key: string
  channelKey: 'sales' | 'services' | 'layaways' | 'receivables'
  channelLabel: string
  title: string
  subtitle: string
  amount: number
  paymentBadges: { label: string; amount?: number }[]
  flags: { label: string; badgeClass: string }[]
  items: SaleItemLine[] | null
  receipt: { type: ReceiptEntityType; id: number; title: string; phone?: string | null } | null
  reverse: { entityId: number; label: string; confirmText: string } | null
}
