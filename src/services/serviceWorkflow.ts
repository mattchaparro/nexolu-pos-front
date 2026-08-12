import { httpClient } from '@/services/http/client'
import type { ServiceWorkflow } from '@/types/serviceWorkflow'

// Compartido entre Ordenes de servicio y Agenda (ambas muestran/mueven la
// etapa de una ServiceOrder) - no vive dentro de un modulo puntual, ver
// README.md "Modulos independientes".
export async function fetchServiceWorkflow(): Promise<ServiceWorkflow | null> {
  const { data } = await httpClient.get<ServiceWorkflow | null>('/service-workflow')
  return data
}
