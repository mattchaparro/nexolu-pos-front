import { httpClient } from '@/services/http/client'
import type { Client, ClientPayload } from '@/types/client'
import type { PaginatedResponse } from '@/types/pagination'

// ClientController::index() no acepta per_page (fijo en 25) - igual que
// SupplierController, el tope lo pone el backend.
export async function searchClients(search: string): Promise<Client[]> {
  const { data } = await httpClient.get<PaginatedResponse<Client>>('/clients', {
    params: { search: search || undefined },
  })
  return data.data
}

export async function createClient(payload: ClientPayload): Promise<Client> {
  const { data } = await httpClient.post<Client>('/clients', payload)
  return data
}
