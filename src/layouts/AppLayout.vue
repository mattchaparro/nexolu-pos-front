<script setup lang="ts">
// Distribucion real: sidebar + navbar, calcados de Layouts/AppLayout.vue
// del legacy (Sidebar.vue + NavBarProfile.vue). Los banners del legacy
// (impersonacion, stock bajo, turno vencido, suscripcion, anuncios)
// quedan para cuando existan esos modulos - no son parte de la
// navegacion base.
import { useRouter } from 'vue-router'

import logo from '@/assets/nexolu-logo.png'
import { useNavItems } from '@/composables/useNavItems'
import { useAuthStore } from '@/stores/auth.store'
import { NxNavbar, NxSidebar } from '@/ui'

const auth = useAuthStore()
const router = useRouter()
const navItems = useNavItems()

async function handleLogout(): Promise<void> {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="flex min-h-screen bg-slate-50">
    <NxSidebar :items="navItems" :logo="logo" />
    <div class="flex min-w-0 flex-1 flex-col">
      <NxNavbar :logo="logo" :user-name="auth.user?.full_name ?? ''" @logout="handleLogout">
        <template v-if="auth.user?.roles?.includes('superadmin')" #actions>
          <RouterLink
            :to="{ name: 'superadmin.workflows.index' }"
            class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white"
          >
            <i class="pi pi-shield" />
            Panel Super Admin
          </RouterLink>
        </template>
      </NxNavbar>
      <main class="flex-1 p-6 pb-20 lg:pb-6">
        <router-view />
      </main>
    </div>
  </div>
</template>
