/** Usuario visto desde el panel de plataforma (UserResource con `business`). */
export interface PlatformUser {
  id: number
  name: string
  last_name: string | null
  full_name: string
  email: string
  username: string | null
  cellphone: string | null
  is_active: boolean
  is_business_owner: boolean
  business_id: number | null
  business: { id: number; name: string } | null
  roles: string[]
  last_active_at: string | null
}
