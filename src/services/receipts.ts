import { httpClient } from '@/services/http/client'
import type { ReceiptEntityType, SendReceiptPayload } from '@/types/receipt'

// Compartido entre modulos (Vender/Cuentas abiertas usan 'sale', Ordenes de
// servicio 'service-order', Apartados 'layaway') - no vive dentro de un
// modulo puntual, mismo criterio que services/business.ts.
const ENDPOINT_BY_TYPE: Record<ReceiptEntityType, string> = {
  sale: 'sales',
  'service-order': 'service-orders',
  layaway: 'layaways',
}

// responseType 'blob': el endpoint esta detras de auth:sanctum (Bearer
// token), asi que no se puede abrir la URL directo en una pestaña nueva
// (una navegacion de browser no manda el header Authorization) - se trae
// el PDF con axios (que si lo manda via el interceptor) y se arma un
// object URL local para abrirlo/imprimirlo.
export async function fetchReceiptPdf(type: ReceiptEntityType, id: number): Promise<Blob> {
  const { data } = await httpClient.get(`/${ENDPOINT_BY_TYPE[type]}/${id}/receipt`, { responseType: 'blob' })
  return data
}

// El PDF de arriba es para descargar/adjuntar en el envio; esto es distinto:
// un HTML de solo impresion (ver receipts.print.* en el backend) que el
// navegador puede imprimir directo contra una impresora termica sin pasar
// por un visor de PDF (que suele agregar margenes/escalado y rompe el ancho
// del ticket). Mismo problema de auth que arriba, mismo fix: blob + object
// URL, solo que aca el blob es text/html en vez de application/pdf.
export async function fetchReceiptPrintHtml(type: ReceiptEntityType, id: number): Promise<Blob> {
  const { data } = await httpClient.get(`/${ENDPOINT_BY_TYPE[type]}/${id}/receipt/print`, { responseType: 'blob' })
  return data
}

export async function sendReceipt(type: ReceiptEntityType, id: number, payload: SendReceiptPayload): Promise<void> {
  await httpClient.post(`/${ENDPOINT_BY_TYPE[type]}/${id}/receipt/send`, payload)
}
