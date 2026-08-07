<script setup lang="ts">
// Shell minimo para poder validar el guard de auth de punta a punta.
// El sidebar/navbar real (NxSidebar, NxNavbar) se construye en la
// iteracion del modulo Dashboard, replicando la distribucion del legacy.
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'
import { NxButton } from '@/ui'

const auth = useAuthStore()
const router = useRouter()

async function handleLogout(): Promise<void> {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <header
      class="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3"
    >
      <span class="font-semibold text-indigo-700">Nexolú POS</span>
      <div class="flex items-center gap-3">
        <span class="text-sm text-slate-600">{{ auth.user?.full_name }}</span>
        <NxButton variant="ghost" size="sm" @click="handleLogout">Cerrar sesión</NxButton>
      </div>
    </header>
    <main class="p-6">
      <router-view />
    </main>
  </div>
</template>
