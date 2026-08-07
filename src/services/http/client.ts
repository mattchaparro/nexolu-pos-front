import axios from 'axios'

import router from '@/router'

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

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && router.currentRoute.value.name !== 'login') {
      tokenStorage.clear()
      router.push({ name: 'login' })
    }
    return Promise.reject(error)
  },
)
