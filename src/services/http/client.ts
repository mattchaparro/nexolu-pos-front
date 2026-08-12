import axios from 'axios'

import router from '@/router'
import { useFlashStore } from '@/stores/flash.store'

import { tokenStorage } from './tokenStorage'

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    Accept: 'application/json',
  },
})

httpClient.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Antes de este interceptor, un 401 (token vencido, ver config/sanctum.php
// en la API - expira a las 4h) limpiaba la sesion y redirigia a /login en
// silencio: el usuario solo veia pantallas vacias hasta notar que estaba
// en el login otra vez, sin saber por que. Sanctum no maneja refresh
// tokens (son PATs planos) y este es un POS por turnos, no una app de
// sesion larga - visibilizar el 401 con un mensaje y volver a pedir
// credenciales es la solucion correcta, no vale la pena la complejidad de
// un refresh token para esto.
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const onLogin = router.currentRoute.value.name === 'login'

    if (status === 401 && !onLogin) {
      tokenStorage.clear()
      useFlashStore().set('Tu sesión expiró. Inicia sesión de nuevo.', 'warn')
      router.push({ name: 'login' })
    } else if (status === 403 && !onLogin) {
      // El guard del router (ver router/index.ts) ya bloquea la mayoria de
      // estos casos antes de llegar aca, pero no cubre acciones dentro de
      // una pantalla ya cargada (ej. un permiso que el admin le quito al
      // empleado a mitad de turno) - sin esto esa pantalla se quedaba con
      // un error silencioso en la consola y nada visible para el usuario.
      const message = error.response?.data?.message ?? 'No tienes permiso para esta acción.'
      useFlashStore().set(message, 'error')
    }

    return Promise.reject(error)
  },
)
