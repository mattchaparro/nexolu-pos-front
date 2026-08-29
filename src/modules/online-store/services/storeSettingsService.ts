import { httpClient } from '@/services/http/client'
import type { StoreImageSlot, StoreSettings, StoreSettingsPayload } from '@/types/store'

// El backend crea la fila la primera vez que se consulta (ver
// BusinessStoreSettingsController): para el comerciante la tienda existe
// desde que le habilitan el modulo, solo que apagada.
export async function fetchStoreSettings(): Promise<StoreSettings> {
  const { data } = await httpClient.get<StoreSettings>('/store-settings')
  return data
}

export async function updateStoreSettings(payload: StoreSettingsPayload): Promise<StoreSettings> {
  const { data } = await httpClient.put<StoreSettings>('/store-settings', payload)
  return data
}

// Ranuras fijas (logo, banner, hero, story): cada imagen tiene su sitio en la
// tienda y reemplaza a la anterior, no es una galeria.
export async function uploadStoreImage(slot: StoreImageSlot, file: File): Promise<StoreSettings> {
  const form = new FormData()
  form.append('image', file)
  const { data } = await httpClient.post<StoreSettings>(`/store-settings/images/${slot}`, form)
  return data
}

export async function deleteStoreImage(slot: StoreImageSlot): Promise<StoreSettings> {
  const { data } = await httpClient.delete<StoreSettings>(`/store-settings/images/${slot}`)
  return data
}
