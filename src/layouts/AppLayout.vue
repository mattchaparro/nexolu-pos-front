<script setup lang="ts">
// Distribucion real: sidebar + navbar, calcados de Layouts/AppLayout.vue
// del legacy (Sidebar.vue + NavBarProfile.vue). De los banners del legacy
// (impersonacion, stock bajo, turno vencido, suscripcion, anuncios) solo
// el de impersonacion existe aca (ver ImpersonateController en la API) -
// los demas quedan para cuando existan esos modulos.
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { homeRouteFor } from '@/router'
import logo from '@/assets/nexolu-logo.png'
import BranchSwitcher from '@/components/BranchSwitcher.vue'
import WelcomeExperienceModal from '@/components/WelcomeExperienceModal.vue'
import { useNavItems } from '@/composables/useNavItems'
import { useAuthStore } from '@/stores/auth.store'
import { NxNavbar, NxSidebar } from '@/ui'

const auth = useAuthStore()
const router = useRouter()
const navItems = useNavItems()
// Ajustes y Mi suscripcion solo tienen sentido para quien administra el
// negocio (mismo gate que ya tenian sus rutas via requiresAdmin, ver
// router/index.ts) - ahora viven en el dropdown de perfil en vez del menu
// lateral (ver NxNavbar.vue).
const isAdmin = computed(() => auth.user?.roles?.includes('admin') === true)

async function handleLogout(): Promise<void> {
  await auth.logout()
  router.push({ name: 'login' })
}

async function stopImpersonating(): Promise<void> {
  await auth.stopImpersonating()
  await router.push(homeRouteFor(auth.user))
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-slate-50">
    <div v-if="auth.isImpersonating" class="flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-white">
      <i class="pi pi-user" />
      <span>Estás viendo este negocio como {{ auth.user?.full_name ?? 'otro usuario' }}</span>
      <button type="button" class="rounded-lg bg-white/20 px-2.5 py-1 font-semibold hover:bg-white/30" @click="stopImpersonating">
        Dejar de impersonar
      </button>
    </div>
    <div class="flex min-h-0 flex-1">
      <NxSidebar :items="navItems" :logo="logo" />
      <div class="flex min-w-0 flex-1 flex-col">
        <NxNavbar
          :logo="logo"
          :user-name="auth.user?.full_name ?? ''"
          show-profile-link
          :show-settings-link="isAdmin"
          :show-subscription-link="isAdmin"
          @logout="handleLogout"
        >
          <template #actions>
            <BranchSwitcher />
            <RouterLink
              v-if="auth.user?.roles?.includes('superadmin')"
              :to="{ name: 'superadmin.businesses.index' }"
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
    <WelcomeExperienceModal />
  </div>
</template>
