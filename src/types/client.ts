// Refleja ClientResource (app/Http/Resources/Api/V1) en nexolu-pos-api.
// Consumido por ClientsView.vue (pantalla de gestion) y por ClientPicker.vue
// (buscador embebido en Ordenes de servicio/otros formularios).
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

// Respuesta liviana de GET /clients/search (id/name/phone/email nada mas,
// hasta 10 resultados) - distinta de Client, que trae todo lo que devuelve
// el CRUD completo (GET /clients, gateado por clients.manage).
export interface ClientSearchResult {
  id: number
  name: string
  phone: string | null
  email: string | null
}
