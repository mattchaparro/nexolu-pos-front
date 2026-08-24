import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { httpClient } from '@/services/http/client'
import { tokenStorage } from '@/services/http/tokenStorage'
import { queryClient } from '@/services/query/queryClient'
import type {
  AuthResponse,
  LoginCredentials,
  RegisterPayload,
  UpdatePasswordPayload,
  UpdateProfilePayload,
  User,
} from '@/types/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(tokenStorage.get())
  // Token del super admin guardado mientras impersona (ver tokenStorage) -
  // su sola presencia es lo que dice "hay una sesion real detras de esta".
  const impersonatorToken = ref<string | null>(tokenStorage.getImpersonator())

  const isAuthenticated = computed(() => Boolean(token.value))
  const isImpersonating = computed(() => Boolean(impersonatorToken.value))

  // Los queryKey (['business'], ['products','admin',...], etc.) no estan
  // scopeados por negocio/usuario - son el mismo cache en memoria durante
  // toda la vida de la SPA. Sin limpiarlo en cada cambio de identidad, un
  // super admin que impersona el negocio A y despues el negocio B podia
  // seguir viendo el menu/feature-gating de A (cache todavia "fresco" por
  // staleTime) hasta que algo forzara un refetch - el bug real reportado
  // ("veo modulos que se que el negocio no tiene habilitados").
  function setSession(data: AuthResponse): void {
    queryClient.clear()
    token.value = data.token
    user.value = data.user
    tokenStorage.set(data.token)
  }

  function clearSession(): void {
    queryClient.clear()
    token.value = null
    user.value = null
    tokenStorage.clear()
    impersonatorToken.value = null
    tokenStorage.clearImpersonator()
  }

  async function login(credentials: LoginCredentials): Promise<void> {
    const { data } = await httpClient.post<AuthResponse>('/login', credentials)
    setSession(data)
  }

  // Responde igual que login() (token + user) - deja al dueño autenticado
  // de una vez, sin pedirle iniciar sesion despues de registrarse.
  async function register(payload: RegisterPayload): Promise<void> {
    const { data } = await httpClient.post<AuthResponse>('/register', payload)
    setSession(data)
  }

  // Sin sesion de por medio (no hay token que guardar) - el backend
  // responde siempre el mismo mensaje generico, exista o no ese correo
  // (AuthController::forgotPassword), asi que no hay nada que ramificar aca.
  async function forgotPassword(email: string): Promise<string> {
    const { data } = await httpClient.post<{ message: string }>('/forgot-password', { email })
    return data.message
  }

  async function resetPassword(payload: {
    token: string
    email: string
    password: string
    password_confirmation: string
  }): Promise<string> {
    const { data } = await httpClient.post<{ message: string }>('/reset-password', payload)
    return data.message
  }

  /** Rehidrata al usuario a partir del token guardado (recarga de pagina). */
  async function fetchCurrentUser(): Promise<User> {
    const { data } = await httpClient.get<User>('/me')
    user.value = data
    return data
  }

  /** Perfil propio (nombre, apellido, correo, celular) - actualiza el usuario en memoria con la respuesta. */
  async function updateProfile(payload: UpdateProfilePayload): Promise<User> {
    const { data } = await httpClient.put<User>('/me', payload)
    user.value = data
    return data
  }

  /** Cambio de contraseña autoservicio - exige la contraseña actual (ver UpdatePasswordRequest). */
  async function updatePassword(payload: UpdatePasswordPayload): Promise<void> {
    await httpClient.put('/me/password', payload)
  }

  async function logout(): Promise<void> {
    try {
      await httpClient.post('/logout')
    } finally {
      clearSession()
    }
  }

  // ImpersonateController::start (SuperAdmin) devuelve un token nuevo para
  // el usuario destino - no hay "sesion" que cambiar en una API stateless,
  // asi que impersonar es guardar el token actual del super admin aparte y
  // adoptar el nuevo como si fuera un login normal.
  function impersonate(data: AuthResponse): void {
    if (token.value) {
      impersonatorToken.value = token.value
      tokenStorage.setImpersonator(token.value)
    }
    setSession(data)
  }

  /** Vuelve a la sesion del super admin sin pedir contraseña de nuevo. */
  async function stopImpersonating(): Promise<void> {
    const original = impersonatorToken.value
    if (!original) {
      return
    }
    try {
      await httpClient.post('/logout')
    } catch {
      // El token de impersonacion puede ya haber expirado - no bloquea volver.
    }
    queryClient.clear()
    impersonatorToken.value = null
    tokenStorage.clearImpersonator()
    token.value = original
    tokenStorage.set(original)
    user.value = null
    await fetchCurrentUser()
  }

  return {
    user,
    token,
    isAuthenticated,
    isImpersonating,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    fetchCurrentUser,
    updateProfile,
    updatePassword,
    clearSession,
    impersonate,
    stopImpersonating,
  }
})
