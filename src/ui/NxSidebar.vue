<script setup lang="ts">
// Sidebar de escritorio, calcado de Components/Menu/Sidebar.vue del
// legacy: logo arriba, boton de colapsar, lista de items con icono +
// label. PrimeIcons en vez de Material Icons (sistema unico de iconos).
// El menu movil (bottom nav) del legacy queda pendiente para una
// iteracion aparte - por ahora el sidebar solo se muestra en desktop
// (lg:flex), igual que hace el legacy con el suyo.
import { ref } from 'vue'
import { useRoute } from 'vue-router'

import type { NavItem } from '@/types/navigation'

defineProps<{
  items: NavItem[]
  logo: string
}>()

const collapsed = ref(false)
const route = useRoute()

function isActive(item: NavItem): boolean {
  return Boolean(item.routeName) && route.name === item.routeName
}
</script>

<template>
  <aside
    :class="collapsed ? 'w-16' : 'w-64'"
    class="hidden flex-col bg-indigo-900 transition-all duration-200 lg:flex"
  >
    <div class="flex items-center justify-center py-6">
      <img
        :src="logo"
        alt="Nexolú POS"
        :class="collapsed ? 'h-7' : 'h-9'"
        class="w-auto rounded-lg bg-white px-2 py-1"
      />
    </div>

    <button
      type="button"
      class="mx-3 mb-2 flex items-center justify-end rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
      :title="collapsed ? 'Expandir menú' : 'Colapsar menú'"
      @click="collapsed = !collapsed"
    >
      <i :class="collapsed ? 'pi pi-angle-right' : 'pi pi-angle-left'" />
    </button>

    <nav class="flex-1 overflow-y-auto px-3 pb-4">
      <ul class="space-y-1">
        <li v-for="item in items" :key="item.label">
          <RouterLink
            v-if="!item.disabled && item.routeName"
            :to="{ name: item.routeName }"
            class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            :class="
              isActive(item)
                ? 'bg-white/20 text-white'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            "
          >
            <i :class="item.icon" class="w-5 text-center text-lg" />
            <span v-if="!collapsed">{{ item.label }}</span>
          </RouterLink>
          <span
            v-else
            class="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/40"
            :title="item.disabled ? 'Próximamente' : undefined"
          >
            <i :class="item.icon" class="w-5 text-center text-lg" />
            <span v-if="!collapsed">{{ item.label }}</span>
          </span>
        </li>
      </ul>
    </nav>
  </aside>
</template>
