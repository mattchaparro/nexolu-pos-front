import { httpClient } from '@/services/http/client'
import type { AiInsight } from '@/types/aiInsight'

/**
 * Un solo insight, por tipo.
 *
 * Siempre con `type`: sin el, la API genera los siete del catalogo -- seis
 * llamadas de IA, con su costo real, para tarjetas que nadie va a ver.
 */
export async function fetchInsight(type: string): Promise<AiInsight | null> {
  const { data } = await httpClient.get<{ data: AiInsight[] }>('/insights', { params: { type } })
  return data.data[0] ?? null
}

/** A diferencia del listado, refresh devuelve UN objeto, no una lista. */
export async function refreshInsight(type: string): Promise<AiInsight | null> {
  const { data } = await httpClient.post<{ data: AiInsight | null }>(`/insights/${type}/refresh`)
  return data.data ?? null
}
