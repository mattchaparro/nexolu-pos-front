// Refleja PurchaseResource/PurchaseLineResource/PurchasePaymentResource
// (app/Http/Resources/Api/V1) en nexolu-pos-api.
import type { Ingredient, Product, ProductVariant } from './product'
import type { Supplier } from './supplier'

export type PurchasePaymentStatus = 'pending' | 'paid'

// Una linea es de producto O de insumo, nunca ambos - pero el campo que no
// aplica no llega como `null` en el JSON, sino como el resource completo
// "vacio" (todos sus campos en null): PurchaseLineResource envuelve
// whenLoaded('product')/whenLoaded('ingredient') sin importar cual de los
// dos esta realmente seteado (mismo patron que SupplierResource cuando no
// hay reminders cargados). Comprobar `line.product?.id != null`, no
// `line.product !== null`.
export interface PurchaseLine {
  id: number
  product: Partial<Product> | null
  /** Presente cuando el producto de la linea tiene variantes. */
  product_variant: Partial<ProductVariant> | null
  ingredient: Partial<Ingredient> | null
  quantity: number
  unit_cost_cop: number
  line_total_cop: number
  notes: string | null
}

export interface PurchasePayment {
  id: number
  amount: number
  payment_method: string
  notes: string | null
  recorded_by_user_id: number
  created_at: string
}

export interface Purchase {
  id: number
  business_id: number
  supplier_id: number | null
  purchased_at: string
  invoice_number: string | null
  notes: string | null
  payment_status: PurchasePaymentStatus
  paid_at: string | null
  total: number
  paid: number
  balance: number
  user_id: number
  supplier: Partial<Supplier> | null
  lines: PurchaseLine[]
  payments: PurchasePayment[]
  created_at: string
}

export interface PurchaseLineInput {
  product_id?: number | null
  /** Obligatorio si el producto tiene variantes (product.has_variants). */
  product_variant_id?: number | null
  ingredient_id?: number | null
  quantity: number
  line_total_cop: number
  notes?: string | null
}

// Payload de StorePurchaseRequest.
export interface PurchasePayload {
  supplier_id?: number | null
  purchased_at: string
  invoice_number?: string | null
  notes?: string | null
  is_credit?: boolean
  create_expense?: boolean
  expense_payment_method?: string | null
  payment_reminder_title?: string | null
  payment_reminder_date?: string | null
  payment_reminder_recurrence?: 'none' | 'weekly' | 'monthly'
  payment_reminder_end_date?: string | null
  payment_reminder_notes?: string | null
  lines: PurchaseLineInput[]
}

// Payload de PayPurchaseRequest ("abonar").
export interface PayPurchasePayload {
  amount: number
  payment_method: string
}
