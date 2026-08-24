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
    // Restringido a rol admin (dueño incluido, siempre admin) - a diferencia
    // de requiresPermission, no existe un permiso del catalogo para esto:
    // EmployeeController::store/update/toggle/destroy exigen hasRole('admin')
    // directo, no un permiso granular (ver PermissionCatalog, que no tiene
    // "employees.manage"). Usar requiresPermission con un nombre inventado
    // solo "funcionaria" por el bypass de admin del guard, pero mentiria
    // sobre que exige un permiso real.
    requiresAdmin?: boolean
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
      // Fuera de AuthLayout a proposito: el paso 2 (tarjetas de plan +
      // panel de resumen) necesita mas ancho que el formulario angosto de
      // AuthLayout (max-w-md) - RegisterView.vue trae su propio layout.
      path: '/registro',
      name: 'register',
      component: () => import('@/modules/auth/views/RegisterView.vue'),
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
          // Sin requiresAdmin/requiresPermission a proposito: cualquier
          // usuario autenticado (admin o empleado) edita su propio perfil,
          // no es una pantalla de negocio (ver BusinessSettingsView.vue,
          // esa si requiresAdmin).
          path: 'mi-perfil',
          name: 'profile.index',
          component: () => import('@/modules/profile/views/ProfileView.vue'),
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
          path: 'planificador',
          name: 'reminders.index',
          component: () => import('@/modules/reminders/views/RemindersView.vue'),
          meta: { requiresFeature: 'reminders', requiresPermission: 'reminders.manage' },
        },
        {
          path: 'gastos',
          name: 'expenses.index',
          component: () => import('@/modules/expenses/views/ExpensesView.vue'),
          // expenses.create O expenses.manage (basta uno de los dos para
          // ver el listado - mismo criterio que el backend: permission:expenses.create,expenses.manage).
          meta: { requiresFeature: 'expenses', requiresPermission: ['expenses.create', 'expenses.manage'] },
        },
        {
          path: 'descuentos',
          name: 'discounts.index',
          component: () => import('@/modules/discounts/views/DiscountsView.vue'),
          meta: { requiresFeature: 'discounts', requiresPermission: 'discounts.manage' },
        },
        {
          path: 'fiados',
          name: 'receivables.index',
          component: () => import('@/modules/receivables/views/FiadosView.vue'),
          meta: { requiresFeature: 'receivables', requiresPermission: 'receivables.manage' },
        },
        {
          // Sin requiresPermission: la ruta del backend (routes/api.php,
          // grupo feature:kitchen_board) no tiene middleware permission: -
          // la comandera es accesible por igual a admin y a cualquier
          // empleado, a diferencia de los demas modulos de esta lista.
          path: 'comandera',
          name: 'kitchen.index',
          component: () => import('@/modules/kitchen/views/KitchenBoardView.vue'),
          meta: { requiresFeature: 'kitchen_board' },
        },
        {
          // Sin requiresFeature: EmployeeController::store/update/toggle/destroy
          // no estan detras de feature:permissions_management (solo
          // catalog/updatePermissions lo estan, ver EmployeeTest::
          // test_can_still_list_and_create_employees_without_the_feature) -
          // gestionar el equipo es basico, no un extra de plan. requiresAdmin
          // porque el backend exige hasRole('admin') directo, no un permiso
          // del catalogo (ver la nota del meta requiresAdmin arriba).
          path: 'usuarios',
          name: 'employees.index',
          component: () => import('@/modules/employees/views/UsersView.vue'),
          meta: { requiresAdmin: true },
        },
        {
          path: 'auditoria',
          name: 'audit-logs.index',
          component: () => import('@/modules/audit-logs/views/AuditLogView.vue'),
          meta: { requiresFeature: 'audit_logs', requiresPermission: 'audit_logs.view' },
        },
        {
          // Sin requiresFeature: no es un extra de plan (igual que Ajustes),
          // reports.daily_summary - permiso propio (antes compartia
          // reports.sales con los otros 3 reportes de ventas, separado a
          // pedido explicito - ver PermissionCatalog en nexolu-pos-api).
          path: 'resumen-del-dia',
          name: 'daily-summary.index',
          component: () => import('@/modules/daily-summary/views/DailySummaryView.vue'),
          meta: { requiresPermission: 'reports.daily_summary' },
        },
        {
          // reports.business_overview - idem, permiso propio.
          path: 'mi-negocio',
          name: 'business-overview.index',
          component: () => import('@/modules/business-overview/views/BusinessOverviewView.vue'),
          meta: { requiresPermission: 'reports.business_overview' },
        },
        {
          // Hub "Reportes": tarjetas que enlazan a Resumen del dia/Mi negocio
          // (ya existian) y a los reportes nuevos - cada tarjeta se gatea
          // aparte adentro (ReportsHubView.vue), asi que la ruta en si solo
          // exige estar autenticado en un negocio (sin permiso unico: no
          // existe un permiso que cubra "puede ver ALGUN reporte").
          path: 'reportes',
          name: 'reports.index',
          component: () => import('@/modules/reports/views/ReportsHubView.vue'),
        },
        {
          // reports.sales ahora es puntual a este reporte (Historial de
          // ventas) - antes cubria los 4 de la seccion, ver la nota arriba.
          path: 'reportes/historial-ventas',
          name: 'sales-history.index',
          component: () => import('@/modules/sales-history/views/SalesHistoryView.vue'),
          meta: { requiresPermission: 'reports.sales' },
        },
        {
          path: 'reportes/ventas-por-vendedor',
          name: 'sales-by-seller.index',
          component: () => import('@/modules/sales-by-seller/views/SalesBySellerView.vue'),
          meta: { requiresPermission: 'reports.sales_by_seller' },
        },
        {
          // Sin requiresFeature: el gate real es un OR (inventory_advanced ||
          // ingredients) que el backend ya resuelve con un 403 - no vale la
          // pena generalizar requiresFeature para este unico caso compuesto
          // (mismo criterio que requiresPurchasesAccess), la pantalla misma
          // maneja el 403 mostrando su propio mensaje.
          path: 'reportes/inventario',
          name: 'inventory-reports.index',
          component: () => import('@/modules/inventory-reports/views/InventoryReportsView.vue'),
          meta: { requiresPermission: 'reports.inventory' },
        },
        {
          path: 'reportes/contabilidad',
          name: 'accounting.index',
          component: () => import('@/modules/accounting/views/AccountingView.vue'),
          meta: { requiresFeature: 'managerial_accounting', requiresPermission: 'accounting.manage' },
        },
        {
          // Alguno de los dos permisos alcanza para ver la pantalla - dentro,
          // cada pestaña (Mi turno / Cierre de caja) se muestra u oculta
          // segun cual de los dos tenga el usuario (ver CashShiftsView.vue).
          path: 'turnos-de-caja',
          name: 'cash-shifts.index',
          component: () => import('@/modules/cash-shifts/views/CashShiftsView.vue'),
          meta: { requiresFeature: 'cash_closing', requiresPermission: ['cash_shift.manage', 'cash_closing.manage'] },
        },
        {
          // Sin requiresFeature/requiresPermission: a diferencia de los modulos
          // de arriba, Ajustes no depende de un feature flag propio - cada
          // seccion adentro decide si aplica segun el negocio (ver
          // BusinessSettingsView.vue). requiresAdmin: configuracion del
          // negocio no es delegable via permisos de empleado (ver
          // EnsureBusinessAdmin en nexolu-pos-api) - mismo criterio que
          // Usuarios, mas abajo.
          path: 'ajustes',
          name: 'business-settings.index',
          component: () => import('@/modules/settings/views/BusinessSettingsView.vue'),
          meta: { requiresAdmin: true },
        },
        {
          // requiresAdmin: ver la suscripcion (y sobre todo poder cobrarla)
          // tampoco es delegable via permisos de empleado - mismo criterio
          // que Ajustes arriba (antes esta ruta no tenia ningun guard, ver
          // el bug reportado 2026-08-22: un empleado nuevo veia y podia usar
          // esta pantalla igual que el admin).
          path: 'suscripcion',
          name: 'subscription.index',
          component: () => import('@/modules/subscription/views/SubscriptionView.vue'),
          meta: { requiresAdmin: true },
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
          path: 'plantillas-whatsapp',
          name: 'superadmin.whatsapp-templates.index',
          component: () =>
            import('@/modules/superadmin-whatsapp-templates/views/SuperAdminWhatsAppTemplatesView.vue'),
        },
        {
          path: 'planes-y-funciones',
          name: 'superadmin.feature-catalog.index',
          component: () =>
            import('@/modules/superadmin-feature-catalog/views/SuperAdminFeatureCatalogView.vue'),
        },
        {
          path: 'medios-de-pago',
          name: 'superadmin.pos-payment-methods.index',
          component: () =>
            import('@/modules/superadmin-payment-methods/views/SuperAdminPosPaymentMethodsView.vue'),
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

  if (
    to.meta.requiresAdmin &&
    !auth.user?.roles?.includes('admin') &&
    !auth.user?.roles?.includes('superadmin')
  ) {
    useFlashStore().set('Solo un administrador puede acceder a esta sección.', 'warn')
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
