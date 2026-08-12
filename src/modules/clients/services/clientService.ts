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
