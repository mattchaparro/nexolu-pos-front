import { createRouter, createWebHistory } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'
import type { User } from '@/types/auth'

// Compartido con LoginView (redirige aca justo despues de loguearse) y el
// guard de aca abajo (redirige aca si un usuario ya autenticado visita
// /iniciar-sesion) - un solo lugar que decide "a donde va cada rol" para
// que no queden dos copias de esta regla desincronizadas (ver bug real:
// el guard tenia 'dashboard' fijo, asi que un super admin ya autenticado
// que volvia a /iniciar-sesion terminaba en el dashboard de negocio, que
// le rompe por no tener business_id).
export function homeRouteFor(user: User | null): { name: string } {
  return { name: user?.roles?.includes('superadmin') ? 'superadmin.businesses.index' : 'dashboard' }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      // Path en espanol (regla del proyecto, ver CLAUDE.md) - el `name`
      // interno sigue en ingles como cualquier otro identificador de codigo.
      path: '/iniciar-sesion',
      component: () => import('@/layouts/AuthLayout.vue'),
      children: [
        {
          path: '',
          name: 'login',
          component: () => import('@/modules/auth/views/LoginView.vue'),
        },
      ],
    },
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/modules/dashboard/views/DashboardView.vue'),
        },
        {
          path: 'vender',
          name: 'sales.create',
          component: () => import('@/modules/sales/views/SellView.vue'),
        },
        {
          path: 'cuentas-abiertas',
          name: 'open-tabs.index',
          component: () => import('@/modules/open-tabs/views/OpenTabsView.vue'),
        },
        {
          path: 'catalogo',
          name: 'catalog.index',
          component: () => import('@/modules/catalog/views/CatalogView.vue'),
        },
        {
          path: 'catalogo/categorias',
          name: 'catalog.categories.index',
          component: () => import('@/modules/catalog/views/CategoriesView.vue'),
        },
        {
          path: 'catalogo/edicion-masiva',
          name: 'catalog.bulk-update',
          component: () => import('@/modules/catalog/views/BulkStockUpdateView.vue'),
        },
        {
          path: 'catalogo/productos/nuevo',
          name: 'catalog.products.create',
          component: () => import('@/modules/catalog/views/ProductFormView.vue'),
        },
        {
          path: 'catalogo/productos/:id/editar',
          name: 'catalog.products.edit',
          component: () => import('@/modules/catalog/views/ProductFormView.vue'),
        },
        {
          path: 'catalogo/productos/:id/movimientos',
          name: 'catalog.products.stock-history',
          component: () => import('@/modules/catalog/views/StockMovementHistoryView.vue'),
          meta: { stockSubjectKind: 'product' },
        },
        {
          path: 'catalogo/insumos/:id/movimientos',
          name: 'catalog.ingredients.stock-history',
          component: () => import('@/modules/catalog/views/StockMovementHistoryView.vue'),
          meta: { stockSubjectKind: 'ingredient' },
        },
        {
          path: 'servicios',
          name: 'services.index',
          component: () => import('@/modules/catalog/views/ServicesView.vue'),
        },
        {
          path: 'catalogo/servicios/nuevo',
          name: 'catalog.services.create',
          component: () => import('@/modules/catalog/views/ProductFormView.vue'),
        },
        {
          path: 'proveedores',
          name: 'suppliers.index',
          component: () => import('@/modules/suppliers/views/SuppliersView.vue'),
        },
        {
          path: 'compras',
          name: 'purchases.index',
          component: () => import('@/modules/purchases/views/PurchasesView.vue'),
        },
        {
          path: 'compras/nueva',
          name: 'purchases.create',
          component: () => import('@/modules/purchases/views/PurchaseFormView.vue'),
        },
        {
          path: 'compras/:id',
          name: 'purchases.show',
          component: () => import('@/modules/purchases/views/PurchaseShowView.vue'),
        },
        {
          path: 'apartados',
          name: 'layaways.index',
          component: () => import('@/modules/layaways/views/LayawaysView.vue'),
        },
        {
          path: 'apartados/nuevo',
          name: 'layaways.create',
          component: () => import('@/modules/layaways/views/LayawayFormView.vue'),
        },
        {
          path: 'apartados/:id',
          name: 'layaways.show',
          component: () => import('@/modules/layaways/views/LayawayShowView.vue'),
        },
        {
          // "Servicios" (el nombre del menu) ya esta tomado por la pestaña de
          // Catalogo (productos is_service=true, ver 'services.index' arriba)
          // - esto es la orden de trabajo/cobro, path/name distintos para no
          // chocar aunque ambos se llamen "Servicios" en el menu (mismo caso
          // que el legacy, que tampoco los unifica).
          path: 'ordenes-servicio',
          name: 'service-orders.index',
          component: () => import('@/modules/service-orders/views/ServiceOrdersView.vue'),
        },
        {
          path: 'ordenes-servicio/nueva',
          name: 'service-orders.create',
          component: () => import('@/modules/service-orders/views/ServiceOrderFormView.vue'),
        },
        {
          path: 'ordenes-servicio/:id',
          name: 'service-orders.show',
          component: () => import('@/modules/service-orders/views/ServiceOrderShowView.vue'),
        },
        {
          path: 'ordenes-servicio/:id/editar',
          name: 'service-orders.edit',
          component: () => import('@/modules/service-orders/views/ServiceOrderFormView.vue'),
        },
        {
          path: 'agenda',
          name: 'appointments.index',
          component: () => import('@/modules/appointments/views/AgendaView.vue'),
        },
      ],
    },
    {
      // Panel aparte, no una seccion del menu de negocio: mismo enfoque que
      // el legacy (Sidebar.vue cambia todo el menu segun el rol en vez de
      // mezclar items de super admin en el de negocio, ver menu/superadmin.json).
      path: '/superadmin',
      component: () => import('@/layouts/SuperAdminLayout.vue'),
      meta: { requiresAuth: true, requiresSuperAdmin: true },
      children: [
        {
          path: 'negocios',
          name: 'superadmin.businesses.index',
          component: () =>
            import('@/modules/superadmin-businesses/views/SuperAdminBusinessesView.vue'),
        },
        {
          path: 'negocios/:id',
          name: 'superadmin.businesses.show',
          component: () =>
            import('@/modules/superadmin-businesses/views/SuperAdminBusinessShowView.vue'),
        },
        {
          path: 'workflows',
          name: 'superadmin.workflows.index',
          component: () =>
            import('@/modules/superadmin-workflows/views/SuperAdminWorkflowsView.vue'),
        },
        {
          path: 'workflows/:id',
          name: 'superadmin.workflows.show',
          component: () =>
            import('@/modules/superadmin-workflows/views/SuperAdminWorkflowShowView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // auth.user solo se llena en memoria al hacer login() - una recarga de
  // pagina conserva el token (localStorage) pero pierde el store de Pinia,
  // asi que sin esto cualquier guard/gate basado en auth.user (roles,
  // permisos) fallaria en falso tras un F5 con sesion todavia valida. Va
  // antes de los checks de abajo (no solo bajo requiresAuth) porque el
  // redirect de /iniciar-sesion tambien depende de auth.user.roles.
  if (auth.isAuthenticated && !auth.user) {
    try {
      await auth.fetchCurrentUser()
    } catch {
      auth.clearSession()
    }
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.name === 'login' && auth.isAuthenticated) {
    return homeRouteFor(auth.user)
  }

  if (to.meta.requiresSuperAdmin && !auth.user?.roles?.includes('superadmin')) {
    return { name: 'dashboard' }
  }
})

export default router
