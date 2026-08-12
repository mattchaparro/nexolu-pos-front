// Refleja ClientResource (app/Http/Resources/Api/V1) en nexolu-pos-api. Sin
// modulo de gestion propio todavia (no hay pantalla "Clientes") - por ahora
// solo lo consume el picker de cliente de Ordenes de servicio.
export interface Client {
  id: number
  business_id: number
  name: string
  phone: string | null
  email: string | null
  notes: string | null
}

export interface ClientPayload {
  name: string
  phone?: string | null
  email?: string | null
  notes?: string | null
}
