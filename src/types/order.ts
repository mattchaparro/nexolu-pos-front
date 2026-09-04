/**
 * Pedido de la tienda online, del lado del COMERCIANTE.
 *
 * El comprador ve una version recortada de esto (ver StorefrontOrderResource
 * en la API): aqui llegan telefono, correo, notas y la bitacora de estados.
 */
export type OrderStatus =
  'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled' | 'expired'

export interface OrderItem {
  id: number
  product_id: number
  product_variant_id: number | null
  product_name: string
  variant_label: string | null
  quantity: number
  unit_price: number
  subtotal: number
}

export interface OrderHistoryEntry {
  from_status: OrderStatus | null
  to_status: OrderStatus
  note: string | null
  user: string | null
  at: string | null
}

/** Por dónde se le puede escribir al comprador. */
export type OrderContactChannel = 'whatsapp' | 'email'

export interface OrderNoteDelivery {
  status: 'sent' | 'failed' | string
  error: string | null
}

export interface OrderNote {
  id: number
  /** internal = solo el equipo. customer = se le mandó al comprador. */
  visibility: 'internal' | 'customer'
  body: string
  channels: OrderContactChannel[]
  /**
   * Qué dijo cada canal. WhatsApp con texto libre solo se entrega dentro de
   * la ventana de 24h de Meta, así que un fallo aquí es lo normal, no la
   * excepción: hay que mostrarlo.
   */
  delivery: Partial<Record<OrderContactChannel, OrderNoteDelivery>>
  user: string | null
  at: string | null
}

export interface Order {
  id: number
  number: number
  status: OrderStatus
  subtotal: number
  shipping_fee: number
  total: number
  customer_name: string
  customer_phone: string
  customer_email: string | null
  is_pickup: boolean
  shipping_address: string | null
  shipping_city: string | null
  shipping_notes: string | null
  /** El cupón que redimió el comprador. Nulo si no usó ninguno. */
  coupon_code: string | null
  discount_amount: number
  /** Con qué pagó ('bold', 'wompi'). Nulo si no pagó en línea. */
  payment_provider: string | null
  /** Cuándo entró la plata. Nulo = todavía no ha pagado. */
  paid_at: string | null
  sale_id: number | null
  client_id: number | null
  confirmed_at: string | null
  expires_at: string | null
  created_at: string | null
  /**
   * A donde puede moverse este pedido. Viene del backend a proposito: la
   * maquina de estados vive en Order::TRANSITIONS y la UI la dibuja, no la
   * reimplementa.
   */
  available_transitions: OrderStatus[]
  items?: OrderItem[]
  history?: OrderHistoryEntry[]
  notes?: OrderNote[]
  /**
   * Por dónde se le puede escribir HOY: compró como invitado y pudo dejar
   * solo el teléfono. Solo viene en el detalle.
   */
  contact_channels?: OrderContactChannel[]
}
