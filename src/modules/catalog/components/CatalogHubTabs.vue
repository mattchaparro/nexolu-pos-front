<script setup lang="ts">
// Franja de navegacion entre las secciones del "hub" de Catalogo/Compras -
// puerto de CatalogHubLayout.vue del legacy (mismas 5 pestañas: Articulos,
// Compras, Servicios, Proveedores, Categorias). Articulos por dentro tiene
// sus propias sub-tabs Productos/Ingredientes (ver CatalogView.vue), pero
// Categorias es una pagina de nivel superior aca, igual que en el legacy -
// no una sub-tab mas de Articulos.
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { useBusiness } from '@/composables/useBusiness'
import { usePermissions } from '@/composables/usePermissions'
import { hasFeature } from '@/utils/hasFeature'

const route = useRoute()
const { data: business } = useBusiness()
const { hasPermission } = usePermissions()

// Mismo gate que el backend (EnsureBusinessCanAccessPurchases +
// permission:purchases.manage en routes/api.php) - can_access_purchases ya
// viene computado del modelo, no se replica la logica de feature_flags/plan.
const showPurchasesTabs = computed(() => business.value?.can_access_purchases === true && hasPermission('purchases.manage'))
// Idem para Servicios (feature 'services'), administrado con los mismos
// permisos inventory.* que Productos - ver BusinessResource.
const showServicesTab = computed(() => business.value?.can_access_services === true && hasPermission('inventory.view'))
// Idem para Atributos (feature 'variants'): hasFeature() lee
// resolved_features (el mapa que YA resolvio el backend), no el JSON crudo
// de feature_flags - un negocio del plan Full creado antes de que existiera
// la bandera no tiene la clave en el JSON, pero SI tiene la funcion
// habilitada por el default de su plan. Leyendo el JSON crudo, la ruta
// catalog.attributes.index (gateada con requiresFeature -> hasFeature) lo
// dejaba entrar mientras esta pestaña se quedaba oculta.
const showAttributesTab = computed(() => hasFeature(business.value, 'variants') && hasPermission('inventory.view'))

// El formulario de "Nuevo servicio" (catalog.services.create) vive bajo el
// prefijo de rutas 'catalog.' pero pertenece visualmente a la seccion
// Servicios, no a Articulos - se resuelve la seccion activa explicito en
// vez de un simple startsWith(prefijo) para no marcar las dos tabs a la vez.
const activeSection = computed<'catalog' | 'purchases' | 'suppliers' | 'services' | 'categories' | 'attributes' | null>(() => {
  const name = route.name
  if (typeof name !== 'string') {
    return null
  }
  if (name === 'catalog.services.create' || name.startsWith('services.')) {
    return 'services'
  }
  if (name === 'catalog.categories.index') {
    return 'categories'
  }
  if (name === 'catalog.attributes.index') {
    return 'attributes'
  }
  if (name.startsWith('catalog.')) {
    return 'catalog'
  }
  if (name.startsWith('purchases.')) {
    return 'purchases'
  }
  if (name.startsWith('suppliers.')) {
    return 'suppliers'
  }
  return null
})
</script>

<template>
  <nav class="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1.5" aria-label="Secciones del catálogo">
    <RouterLink
      :to="{ name: 'catalog.index' }"
      class="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors sm:px-4"
      :class="activeSection === 'catalog' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-white/60'"
    >
      <i class="pi pi-box text-sm" />
      Artículos
    </RouterLink>
    <RouterLink
      v-if="showPurchasesTabs"
      :to="{ name: 'purchases.index' }"
      class="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors sm:px-4"
      :class="activeSection === 'purchases' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-white/60'"
    >
      <i class="pi pi-shopping-cart text-sm" />
      Compras
    </RouterLink>
    <RouterLink
      v-if="showServicesTab"
      :to="{ name: 'services.index' }"
      class="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors sm:px-4"
      :class="activeSection === 'services' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-white/60'"
    >
      <i class="pi pi-wrench text-sm" />
      Servicios
    </RouterLink>
    <RouterLink
      v-if="showPurchasesTabs"
      :to="{ name: 'suppliers.index' }"
      class="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors sm:px-4"
      :class="activeSection === 'suppliers' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-white/60'"
    >
      <i class="pi pi-truck text-sm" />
      Proveedores
    </RouterLink>
    <RouterLink
      :to="{ name: 'catalog.categories.index' }"
      class="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors sm:px-4"
      :class="activeSection === 'categories' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-white/60'"
    >
      <i class="pi pi-tags text-sm" />
      Categorías
    </RouterLink>
    <RouterLink
      v-if="showAttributesTab"
      :to="{ name: 'catalog.attributes.index' }"
      class="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors sm:px-4"
      :class="activeSection === 'attributes' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-white/60'"
    >
      <i class="pi pi-sliders-h text-sm" />
      Atributos
    </RouterLink>
  </nav>
</template>
