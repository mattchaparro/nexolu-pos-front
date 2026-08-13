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

// Refleja RegisterRequest (nexolu-pos-api) - plan + feature_flags son el
// camino "plan primero" del wizard publico: el usuario elige basic/full y
// feature_flags solo puede apagar banderas que ese plan trae encendidas por
// defecto (el backend clampa cualquier intento de prender una fuera del
// plan - ver BusinessRegistrationService::register()).
export interface RegisterPayload {
  business_name: string
  owner_name: string
  email: string
  password: string
  password_confirmation: string
  // Opcional: solo se manda si el negocio usa un numero DISTINTO al de
  // WhatsApp para facturas/reportes - si no, el backend lo deja igual al
  // whatsapp_number ya verificado (ver BusinessRegistrationService::register()).
  phone?: string
  // Obligatorio: es el canal de notificaciones, y el wizard lo verifica con
  // un OTP justo despues de crear la cuenta (ver RegisterView.vue paso 3).
  whatsapp_number: string
  nit?: string
  address?: string
  plan: 'basic' | 'full'
  feature_flags: Record<string, boolean>
  device_name: string
}

export interface AuthResponse {
  token: string
  user: User
}
