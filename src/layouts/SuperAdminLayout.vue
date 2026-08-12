<script setup lang="ts">
// Panel de super admin - mismo layout que el de negocio (sidebar +
// navbar, ver AppLayout.vue) pero con su propio menu (superadminNavItems,
// portado 1:1 de menu/superadmin.json del legacy) en vez de items
// mezclados con el de un negocio - mismo enfoque que el legacy, donde
// Sidebar.vue cambia el menu entero segun el rol.
import { useRouter } from 'vue-router'

import { superadminNavItems } from '@/router/navigation'
import logo from '@/assets/nexolu-logo.png'
import { useAuthStore } from '@/stores/auth.store'
import { NxNavbar, NxSidebar } from '@/ui'

const auth = useAuthStore()
const router = useRouter()

async function handleLogout(): Promise<void> {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="flex min-h-screen bg-slate-50">
    <NxSidebar :items="superadminNavItems" :logo="logo" />
    <div class="flex min-w-0 flex-1 flex-col">
      <NxNavbar :logo="logo" :user-name="auth.user?.full_name ?? ''" @logout="handleLogout">
        <template #actions>
          <RouterLink
            :to="{ name: 'dashboard' }"
            class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white"
          >
            <i class="pi pi-arrow-left" />
            Volver al negocio
          </RouterLink>
        </template>
      </NxNavbar>
      <main class="flex-1 p-6 pb-20 lg:pb-6">
        <router-view />
      </main>
    </div>
  </div>
</template>
