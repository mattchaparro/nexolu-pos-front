// Calcado de resolvePaymentIcon() en SalesTerminal.vue del legacy (mismo
// heuristico por id, traducido a PrimeIcons en vez de Material Icons).
export function resolvePaymentMethodIcon(methodId: string): string {
  const id = methodId.toLowerCase()

  if (id === 'cash' || id === 'efectivo') {
    return 'pi pi-money-bill'
  }
  if (id === 'credit' || id === 'fiado' || id === 'credito' || id === 'crédito') {
    return 'pi pi-receipt'
  }
  if (id.includes('nequi') || id.includes('daviplata') || id.includes('transfer')) {
    return 'pi pi-arrow-right-arrow-left'
  }

  return 'pi pi-wallet'
}
