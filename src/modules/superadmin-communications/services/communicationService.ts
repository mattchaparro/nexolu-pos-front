import { httpClient } from '@/services/http/client'
import type { PaginatedResponse } from '@/types/pagination'
import type { CommunicationChannel, CommunicationLogEntry, SendBusinessCommunicationPayload } from '@/types/superadmin/communication'

export interface FetchCommunicationsParams {
  channel?: CommunicationChannel
  business_id?: number
  page?: number
}

export async function fetchCommunications(params: FetchCommunicationsParams = {}): Promise<PaginatedResponse<CommunicationLogEntry>> {
  const { data } = await httpClient.get<PaginatedResponse<CommunicationLogEntry>>('/superadmin/communications', { params })
  return data
}

export interface BusinessOption {
  id: number
  name: string
}

export async function searchBusinesses(search: string): Promise<BusinessOption[]> {
  const { data } = await httpClient.get<PaginatedResponse<BusinessOption>>('/superadmin/businesses', { params: { search } })
  return data.data
}

export async function sendBusinessCommunication(businessId: number, payload: SendBusinessCommunicationPayload): Promise<void> {
  await httpClient.post(`/superadmin/businesses/${businessId}/communications`, payload)
}
