const TOKEN_KEY = 'nexolu_auth_token'
// Token del super admin mientras impersona a otro usuario (ver
// ImpersonateController::start en la API - "volver" no es un endpoint,
// es dejar de usar el token de impersonacion) - guardarlo aparte permite
// restaurar la sesion original sin pedir contraseña de nuevo.
const IMPERSONATOR_TOKEN_KEY = 'nexolu_impersonator_token'

// Unica fuente de verdad del nombre de la llave en localStorage - el
// auth store la escribe, el interceptor de axios solo la lee.
export const tokenStorage = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  clear: (): void => localStorage.removeItem(TOKEN_KEY),
  getImpersonator: (): string | null => localStorage.getItem(IMPERSONATOR_TOKEN_KEY),
  setImpersonator: (token: string): void => localStorage.setItem(IMPERSONATOR_TOKEN_KEY, token),
  clearImpersonator: (): void => localStorage.removeItem(IMPERSONATOR_TOKEN_KEY),
}
