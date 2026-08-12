<script setup lang="ts">
// Panel de super admin - area separada del menu de negocio (mismo enfoque
// que el legacy, ver Sidebar.vue: el rol determina un menu entero distinto,
// no items mezclados en el de un negocio). Por ahora solo tiene Negocios y
// Workflows; una barra secundaria simple (no un NxSidebar completo) alcanza
// mientras sean pocas secciones - ver README.md "Modulos independientes".
import { useRouter } from 'vue-router'

import logo from '@/assets/nexolu-logo.png'
import { useAuthStore } from '@/stores/auth.store'
import { NxNavbar } from '@/ui'

const auth = useAuthStore()
const router = useRouter()

async function handleLogout(): Promise<void> {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-slate-50">
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
    <div class="border-b border-slate-200 bg-white px-4 sm:px-6">
      <nav class="flex h-12 items-center gap-1">
        <span class="mr-4 text-xs font-semibold tracking-wide text-slate-400 uppercase"
          >Super Admin</span
        >
        <RouterLink
          :to="{ name: 'superadmin.businesses.index' }"
          class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
          active-class="!bg-indigo-50 !text-indigo-700"
        >
          <i class="pi pi-building mr-1.5" />
          Negocios
        </RouterLink>
        <RouterLink
          :to="{ name: 'superadmin.workflows.index' }"
          class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
          active-class="!bg-indigo-50 !text-indigo-700"
        >
          <i class="pi pi-sitemap mr-1.5" />
          Workflows
        </RouterLink>
      </nav>
    </div>
    <main class="flex-1 p-6">
      <router-view />
    </main>
  </div>
</template>
