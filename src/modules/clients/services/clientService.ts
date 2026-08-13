import { httpClient } from '@/services/http/client'
import type { Client, ClientPayload, ClientSearchResult } from '@/types/client'
import type { PaginatedResponse } from '@/types/pagination'

// GET /clients/search (no /clients?search=): liviano, sin permission
// clients.manage - cualquiera que pueda vender/agendar/apartar necesita
// poder buscar un cliente en el momento, no solo quien administra el
// directorio completo (ver ClientPicker.vue y routes/api.php).
export async function searchClients(search: string): Promise<ClientSearchResult[]> {
  const { data } = await httpClient.get<ClientSearchResult[]>('/clients/search', {
    params: { q: search || undefined },
  })
  return data
}

export interface FetchClientsParams {
  search?: string
  page?: number
}

// A diferencia de searchClients() (solo el array, para el picker), esta
// devuelve la respuesta paginada completa - la usa ClientsView.vue para el
// total/paginador del DataTable.
export async function fetchClients(params: FetchClientsParams = {}): Promise<PaginatedResponse<Client>> {
  const { data } = await httpClient.get<PaginatedResponse<Client>>('/clients', { params })
  return data
}

export async function createClient(payload: ClientPayload): Promise<Client> {
  const { data } = await httpClient.post<Client>('/clients', payload)
  return data
}

export async function updateClient(id: number, payload: Partial<ClientPayload>): Promise<Client> {
  const { data } = await httpClient.put<Client>(`/clients/${id}`, payload)
  return data
}

export async function deleteClient(id: number): Promise<void> {
  await httpClient.delete(`/clients/${id}`)
}
