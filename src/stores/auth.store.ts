import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { httpClient } from '@/services/http/client'
import { tokenStorage } from '@/services/http/tokenStorage'
import type { AuthResponse, LoginCredentials, User } from '@/types/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(tokenStorage.get())

  const isAuthenticated = computed(() => Boolean(token.value))

  function setSession(data: AuthResponse): void {
    token.value = data.token
    user.value = data.user
    tokenStorage.set(data.token)
  }

  function clearSession(): void {
    token.value = null
    user.value = null
    tokenStorage.clear()
  }

  async function login(credentials: LoginCredentials): Promise<void> {
    const { data } = await httpClient.post<AuthResponse>('/login', credentials)
    setSession(data)
  }

  /** Rehidrata al usuario a partir del token guardado (recarga de pagina). */
  async function fetchCurrentUser(): Promise<User> {
    const { data } = await httpClient.get<User>('/me')
    user.value = data
    return data
  }

  async function logout(): Promise<void> {
    try {
      await httpClient.post('/logout')
    } finally {
      clearSession()
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    login,
    logout,
    fetchCurrentUser,
    clearSession,
  }
})
