import type { Sale } from '@/types/sale'

/**
 * Saldo de una cuenta abierta con abonos. Unica fuente de este calculo en el
 * front: los chips de Vender, el panel de edicion, la barra movil y el panel
 * de Cuentas abiertas muestran TODOS el saldo pendiente, no el total (mejora
 * deliberada sobre el legacy, decision del usuario 2026-09-03 - alla el
 * saldo solo se veia al entrar al modal de cobro).
 *
 * balance_due/amount_paid los calcula el backend cuando la venta viene con
 * los abonos cargados; el fallback suma/resta localmente por si llegara una
 * Sale sin esa relacion.
 */
export function salePartialPaid(sale: Sale): number {
  if (sale.amount_paid !== null && sale.amount_paid !== undefined) {
    return Number(sale.amount_paid)
  }
  return (sale.partial_payments ?? []).reduce((sum, p) => sum + Number(p.amount || 0), 0)
}

export function saleRemaining(sale: Sale): number {
  if (sale.balance_due !== null && sale.balance_due !== undefined) {
    return Number(sale.balance_due)
  }
  return Number(sale.total) - salePartialPaid(sale)
}

export function saleHasPartialPayments(sale: Sale | null | undefined): boolean {
  return !!sale && salePartialPaid(sale) > 0
}
