// Refleja UserResource (app/Http/Resources/Api/V1/UserResource.php) en
// nexolu-pos-api - mantener sincronizado si el resource cambia.
export interface User {
  id: number
  name: string
  last_name: string | null
  full_name: string
  email: string
  username: string | null
  cellphone: string | null
  is_active: boolean
  is_business_owner: boolean
  business_id: number
  roles?: string[]
  permissions?: string[]
  last_active_at: string | null
}

export interface LoginCredentials {
  email: string
  password: string
  device_name: string
}

export interface AuthResponse {
  token: string
  user: User
}
