import { httpClient } from '@/services/http/client'
import type { Business, BusinessPaymentMethod } from '@/types/business'

// Compartido entre modulos (Dashboard lo usa para el nombre del negocio,
// Vender para metodos de pago/cargos/domicilio, Ajustes para editarlo) - no
// vive dentro de un modulo puntual, ver README.md "Modulos independientes".
export async function fetchBusiness(): Promise<Business> {
  const { data } = await httpClient.get<Business>('/business')
  return data
}

export type UpdateBusinessPayload = Partial<
  Pick<
    Business,
    | 'name'
    | 'owner_name'
    | 'phone'
    | 'whatsapp_number'
    | 'instagram_handle'
    | 'tiktok_handle'
    | 'nit'
    | 'address'
    | 'ticket_paper_width'
    | 'invoice_prefix'
    | 'ticket_header_tagline'
    | 'ticket_thanks_message'
    | 'ticket_footer_text'
    | 'delivery_enabled'
    | 'delivery_fee'
    | 'low_stock_alert_threshold'
    | 'low_stock_email_enabled'
    | 'low_stock_email'
    | 'layaway_allowed_category_ids'
    | 'email_header_color'
    | 'email_footer_text'
    | 'email_whatsapp_cta'
    | 'service_orders_show_catalog'
    | 'service_orders_default_service_name'
  >
> & {
  payment_methods?: BusinessPaymentMethod[]
  service_charge_enabled?: boolean
  service_charge_rate?: number
  ipoconsumo_enabled?: boolean
  ipoconsumo_rate?: number
}

export async function updateBusiness(payload: UpdateBusinessPayload): Promise<Business> {
  const { data } = await httpClient.put<Business>('/business', payload)
  return data
}

export async function updateBusinessNotifications(preferences: Record<string, boolean>): Promise<void> {
  await httpClient.put('/business/notifications', { preferences })
}

export async function clearLowStockSnooze(): Promise<void> {
  await httpClient.delete('/business/low-stock-snooze')
}
