// Refleja BillingProfileResource (nexolu-pos-api) - un unico perfil de
// facturacion por negocio (nunca por usuario), todo opcional. Se pide una
// vez (registro o primer pago por PSE) y de ahi en adelante queda
// prellenado con opcion de actualizarlo.
export interface BillingProfile {
  document_type: 'CC' | 'NIT' | 'CE' | null
  document_number: string | null
  full_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
}

export type UpdateBillingProfilePayload = Partial<BillingProfile>
