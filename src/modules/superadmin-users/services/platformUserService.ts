import { httpClient } from '@/services/http/client'
import type { PaginatedResponse } from '@/types/pagination'
import type { PlatformUser } from '@/types/platformUser'

export interface FetchPlatformUsersParams {
  search?: string
  business_id?: number
  page?: number
}

export async function fetchPlatformUsers(
  params: FetchPlatformUsersParams = {},
): Promise<PaginatedResponse<PlatformUser>> {
  const { data } = await httpClient.get<PaginatedResponse<PlatformUser>>('/superadmin/users', { params })
  return data
}

export async function togglePlatformUser(userId: number): Promise<void> {
  await httpClient.patch(`/superadmin/users/${userId}/toggle`)
}

/** Devuelve la contraseña nueva UNA sola vez: no se persiste en claro. */
export async function resetPlatformUserPassword(userId: number): Promise<string> {
  const { data } = await httpClient.post<{ password: string }>(`/superadmin/users/${userId}/reset-password`)
  return data.password
}
