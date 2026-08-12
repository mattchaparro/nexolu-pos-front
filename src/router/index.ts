import { createRouter, createWebHistory } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'

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
      ],
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }
})

export default router
