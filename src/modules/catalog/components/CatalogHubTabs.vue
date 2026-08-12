<script setup lang="ts">
// Franja de navegacion entre las secciones del "hub" de Catalogo/Compras -
// puerto liviano de CatalogHubLayout.vue del legacy (que envuelve paginas
// separadas con una barra de tabs persistente). A diferencia del legacy no
// incluye Articulos/Categorias como tabs propias aca: esas viven como
// sub-tabs internas de CatalogView (ver ese archivo) - esta franja es solo
// para saltar entre las secciones que SI son paginas separadas (Catalogo,
// Compras, Proveedores). Servicios queda fuera por ahora, se agrega cuando
// ese modulo exista.
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { useBusiness } from '@/composables/useBusiness'
import { usePermissions } from '@/composables/usePermissions'

const route = useRoute()
const { data: business } = useBusiness()
const { hasPermission } = usePermissions()

// Mismo gate que el backend (EnsureBusinessCanAccessPurchases +
// permission:purchases.manage en routes/api.php) - can_access_purchases ya
// viene computado del modelo, no se replica la logica de feature_flags/plan.
const showPurchasesTabs = computed(() => business.value?.can_access_purchases === true && hasPermission('purchases.manage'))

function isActive(prefix: string): boolean {
  return typeof route.name === 'string' && route.name.startsWith(prefix)
}
</script>

<template>
  <nav class="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1.5" aria-label="Secciones del catálogo">
    <RouterLink
      :to="{ name: 'catalog.index' }"
      class="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors sm:px-4"
      :class="isActive('catalog.') ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-white/60'"
    >
      <i class="pi pi-box text-sm" />
      Artículos
    </RouterLink>
    <RouterLink
      v-if="showPurchasesTabs"
      :to="{ name: 'purchases.index' }"
      class="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors sm:px-4"
      :class="isActive('purchases.') ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-white/60'"
    >
      <i class="pi pi-shopping-cart text-sm" />
      Compras
    </RouterLink>
    <RouterLink
      v-if="showPurchasesTabs"
      :to="{ name: 'suppliers.index' }"
      class="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors sm:px-4"
      :class="isActive('suppliers.') ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-white/60'"
    >
      <i class="pi pi-truck text-sm" />
      Proveedores
    </RouterLink>
  </nav>
</template>
