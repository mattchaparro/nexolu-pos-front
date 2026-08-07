const TOKEN_KEY = 'nexolu_auth_token'

// Unica fuente de verdad del nombre de la llave en localStorage - el
// auth store la escribe, el interceptor de axios solo la lee.
export const tokenStorage = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  clear: (): void => localStorage.removeItem(TOKEN_KEY),
}
