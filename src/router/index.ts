import { createRouter, createWebHistory } from 'vue-router'

import { fetchBusiness } from '@/services/business'
import { queryClient } from '@/services/query/queryClient'
import { useAuthStore } from '@/stores/auth.store'
import { useFlashStore } from '@/stores/flash.store'
import type { User } from '@/types/auth'
import { hasFeature } from '@/utils/hasFeature'

// Meta de negocio (no de vue-router): que feature flag y/o permiso
// necesita cada ruta, ademas de requiresAuth/requiresSuperAdmin ya
// existentes. Sin esto, un empleado sin el permiso o un negocio sin el
// feature podian navegar directo a la URL (la nav ya oculta el link, ver
// useNavItems, pero eso no bloquea escribirla a mano) y quedarse en una
// pantalla que solo falla en silencio contra la API (403 sin manejar).
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresSuperAdmin?: boolean
    requiresFeature?: string
    // Basta con tener uno de la lista - mismo criterio que el middleware
    // permission:x,y del backend (ver routes/api.php).
    requiresPermission?: string | string[]
    // Caso especial: "puede acceder a Compras" no es un feature flag
    // simple, es el OR ya calculado en Business::canAccessPurchases()
    // (ver business.can_access_purchases) - no vale la pena generalizar
    // requiresFeature para este unico caso compuesto.
    requiresPurchasesAccess?: boolean
  }
}

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
      path: '/olvide-mi-contrasena',
      component: () => import('@/layouts/AuthLayout.vue'),
      children: [
        {
          path: '',
          name: 'forgot-password',
          component: () => import('@/modules/auth/views/ForgotPasswordView.vue'),
        },
      ],
    },
    {
      path: '/restablecer-contrasena',
      component: () => import('@/layouts/AuthLayout.vue'),
      children: [
        {
          path: '',
          name: 'reset-password',
          component: () => import('@/modules/auth/views/ResetPasswordView.vue'),
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
          meta: { requiresFeature: 'open_tabs' },
        },
        {
          path: 'catalogo',
          name: 'catalog.index',
          component: () => import('@/modules/catalog/views/CatalogView.vue'),
          meta: { requiresPermission: 'inventory.view' },
        },
        {
          path: 'clientes',
          name: 'clients.index',
          component: () => import('@/modules/clients/views/ClientsView.vue'),
          meta: { requiresFeature: 'clients', requiresPermission: 'clients.manage' },
        },
        {
          path: 'catalogo/categorias',
          name: 'catalog.categories.index',
          component: () => import('@/modules/catalog/views/CategoriesView.vue'),
          meta: { requiresPermission: 'inventory.view' },
        },
        {
          path: 'catalogo/edicion-masiva',
          name: 'catalog.bulk-update',
          component: () => import('@/modules/catalog/views/BulkStockUpdateView.vue'),
          meta: { requiresPermission: 'inventory.adjust' },
        },
        {
          path: 'catalogo/productos/nuevo',
          name: 'catalog.products.create',
          component: () => import('@/modules/catalog/views/ProductFormView.vue'),
          meta: { requiresPermission: 'inventory.add' },
        },
        {
          path: 'catalogo/productos/:id/editar',
          name: 'catalog.products.edit',
          component: () => import('@/modules/catalog/views/ProductFormView.vue'),
          meta: { requiresPermission: 'inventory.add' },
        },
        {
          path: 'catalogo/productos/:id/movimientos',
          name: 'catalog.products.stock-history',
          component: () => import('@/modules/catalog/views/StockMovementHistoryView.vue'),
          meta: { stockSubjectKind: 'product', requiresPermission: 'inventory.view' },
        },
        {
          path: 'catalogo/insumos/:id/movimientos',
          name: 'catalog.ingredients.stock-history',
          component: () => import('@/modules/catalog/views/StockMovementHistoryView.vue'),
          meta: { stockSubjectKind: 'ingredient', requiresPermission: 'inventory.view' },
        },
        {
          path: 'servicios',
          name: 'services.index',
          component: () => import('@/modules/catalog/views/ServicesView.vue'),
          // Pestaña "Servicios" del hub de Catalogo: productos is_service=true,
          // no ordenes de servicio - gate igual al de CatalogHubTabs
          // (permission:inventory.view en /products, feature:services).
          meta: { requiresFeature: 'services', requiresPermission: 'inventory.view' },
        },
        {
          path: 'catalogo/servicios/nuevo',
          name: 'catalog.services.create',
          component: () => import('@/modules/catalog/views/ProductFormView.vue'),
          meta: { requiresFeature: 'services', requiresPermission: 'inventory.add' },
        },
        {
          path: 'proveedores',
          name: 'suppliers.index',
          component: () => import('@/modules/suppliers/views/SuppliersView.vue'),
          meta: { requiresPurchasesAccess: true, requiresPermission: 'purchases.manage' },
        },
        {
          path: 'compras',
          name: 'purchases.index',
          component: () => import('@/modules/purchases/views/PurchasesView.vue'),
          meta: { requiresPurchasesAccess: true, requiresPermission: 'purchases.manage' },
        },
        {
          path: 'compras/nueva',
          name: 'purchases.create',
          component: () => import('@/modules/purchases/views/PurchaseFormView.vue'),
          meta: { requiresPurchasesAccess: true, requiresPermission: 'purchases.manage' },
        },
        {
          path: 'compras/:id',
          name: 'purchases.show',
          component: () => import('@/modules/purchases/views/PurchaseShowView.vue'),
          meta: { requiresPurchasesAccess: true, requiresPermission: 'purchases.manage' },
        },
        {
          path: 'apartados',
          name: 'layaways.index',
          component: () => import('@/modules/layaways/views/LayawaysView.vue'),
          meta: { requiresFeature: 'layaway', requiresPermission: 'layaways.manage' },
        },
        {
          path: 'apartados/nuevo',
          name: 'layaways.create',
          component: () => import('@/modules/layaways/views/LayawayFormView.vue'),
          meta: { requiresFeature: 'layaway', requiresPermission: 'layaways.manage' },
        },
        {
          path: 'apartados/:id',
          name: 'layaways.show',
          component: () => import('@/modules/layaways/views/LayawayShowView.vue'),
          meta: { requiresFeature: 'layaway', requiresPermission: 'layaways.manage' },
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
          meta: { requiresFeature: 'services', requiresPermission: 'appointments.manage' },
        },
        {
          path: 'ordenes-servicio/nueva',
          name: 'service-orders.create',
          component: () => import('@/modules/service-orders/views/ServiceOrderFormView.vue'),
          meta: { requiresFeature: 'services', requiresPermission: 'appointments.manage' },
        },
        {
          path: 'ordenes-servicio/:id',
          name: 'service-orders.show',
          component: () => import('@/modules/service-orders/views/ServiceOrderShowView.vue'),
          meta: { requiresFeature: 'services', requiresPermission: 'appointments.manage' },
        },
        {
          path: 'ordenes-servicio/:id/editar',
          name: 'service-orders.edit',
          component: () => import('@/modules/service-orders/views/ServiceOrderFormView.vue'),
          meta: { requiresFeature: 'services', requiresPermission: 'appointments.manage' },
        },
        {
          path: 'agenda',
          name: 'appointments.index',
          component: () => import('@/modules/appointments/views/AgendaView.vue'),
          meta: { requiresFeature: 'scheduling', requiresPermission: 'appointments.manage' },
        },
        {
          // Sin requiresFeature/requiresPermission: a diferencia de los modulos
          // de arriba, Ajustes no depende de un feature flag propio - cada
          // seccion adentro decide si aplica segun el negocio (ver
          // BusinessSettingsView.vue).
          path: 'ajustes',
          name: 'business-settings.index',
          component: () => import('@/modules/settings/views/BusinessSettingsView.vue'),
        },
        {
          // Tampoco depende de un feature flag - cualquier usuario del
          // negocio puede ver/pagar la suscripcion, igual que en el legacy
          // (SubscriptionController::billing no restringe por rol).
          path: 'suscripcion',
          name: 'subscription.index',
          component: () => import('@/modules/subscription/views/SubscriptionView.vue'),
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
          path: 'comunicaciones',
          name: 'superadmin.communications.index',
          component: () =>
            import('@/modules/superadmin-communications/views/SuperAdminCommunicationsView.vue'),
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

  // Un super admin no tiene business_id (ver DatabaseSeeder) - no aplica
  // feature/permiso de negocio a su navegacion (nunca visita estas rutas,
  // pero por si acaso no lo bloqueamos por datos que no tiene).
  const isBusinessRoute =
    (to.meta.requiresFeature || to.meta.requiresPermission || to.meta.requiresPurchasesAccess) &&
    !auth.user?.roles?.includes('superadmin')

  if (isBusinessRoute && to.meta.requiresPermission) {
    const required = Array.isArray(to.meta.requiresPermission)
      ? to.meta.requiresPermission
      : [to.meta.requiresPermission]
    const isAdmin = auth.user?.roles?.includes('admin') ?? false
    const hasAny = required.some((p) => auth.user?.permissions?.includes(p))
    if (!isAdmin && !hasAny) {
      useFlashStore().set('No tienes permiso para acceder a esta sección.', 'warn')
      return { name: 'dashboard' }
    }
  }

  if (isBusinessRoute && (to.meta.requiresFeature || to.meta.requiresPurchasesAccess)) {
    try {
      const business = await queryClient.ensureQueryData({ queryKey: ['business'], queryFn: fetchBusiness })
      const allowed = to.meta.requiresPurchasesAccess
        ? business.can_access_purchases
        : hasFeature(business, to.meta.requiresFeature as string)
      if (!allowed) {
        useFlashStore().set('Este módulo no está disponible en tu plan.', 'warn')
        return { name: 'dashboard' }
      }
    } catch {
      // Si /business falla aca, el endpoint real de la pantalla va a fallar
      // igual y mostrar su propio error - no vale la pena bloquear la
      // navegacion por un problema de red al validar el gate en el cliente.
    }
  }
})

export default router
