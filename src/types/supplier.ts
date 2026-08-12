// Refleja SupplierResource (app/Http/Resources/Api/V1/SupplierResource.php)
// en nexolu-pos-api.
export interface Supplier {
  id: number
  business_id: number
  name: string
  tax_id: string | null
  phone: string | null
  address: string | null
  notes: string | null
  has_pending_visit_reminder?: boolean
  next_visit_reminder_due_date?: string | null
}

// Payload de Store/UpdateSupplierRequest.
export interface SupplierPayload {
  name: string
  tax_id?: string | null
  phone?: string | null
  address?: string | null
  notes?: string | null
}

// Recurrencias que ofrece el formulario - subconjunto de Reminder::RECURRENCES
// (el backend soporta daily/yearly tambien, pero "recordar visita de
// proveedor" nunca las necesito, igual que en el legacy).
export type SupplierReminderRecurrence = 'none' | 'weekly' | 'monthly'

// Payload de RemindSupplierVisitRequest.
export interface RemindSupplierVisitPayload {
  due_date: string
  recurrence?: SupplierReminderRecurrence
  end_date?: string | null
}
