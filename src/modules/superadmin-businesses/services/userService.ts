import { httpClient } from '@/services/http/client'

export interface CreateUserPayload {
  name: string
  email: string
  password: string
  business_id: number
  role: 'admin' | 'employee'
}

// Respuesta cruda de Api\V1\UserResource (nexolu-pos-api) - mas campos que
// SuperAdminBusinessTeamMember, pero solo se usa el id/nombre para el toast;
// el listado real se refresca invalidando la query del negocio.
export interface CreatedUser {
  id: number
  name: string
  email: string
}

export async function createUser(payload: CreateUserPayload): Promise<CreatedUser> {
  const { data } = await httpClient.post<CreatedUser>('/superadmin/users', payload)
  return data
}

export async function toggleUser(id: number): Promise<void> {
  await httpClient.patch(`/superadmin/users/${id}/toggle`)
}

export async function resetUserPassword(id: number): Promise<string> {
  const { data } = await httpClient.post<{ password: string }>(`/superadmin/users/${id}/reset-password`)
  return data.password
}
