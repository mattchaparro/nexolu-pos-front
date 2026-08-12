// Espejo de ReceiptPdfService::TYPES en nexolu-pos-api - los 3 tipos de
// venta que hoy tienen un comprobante descargable/enviable (ver
// ReceiptActionsModal.vue). Vender y Cuentas abiertas comparten el mismo
// 'sale' (cerrar una cuenta abierta tambien crea un registro Sale).
export type ReceiptEntityType = 'sale' | 'service-order' | 'layaway'

export type ReceiptChannel = 'whatsapp' | 'email'

export interface SendReceiptPayload {
  channel: ReceiptChannel
  to: string
}
