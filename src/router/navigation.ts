import type { NavItem } from '@/types/navigation'

// Menu del admin portado 1:1 de pos-saas-legacy/resources/js/menu/admin.json
// (mismo orden, mismos labels) - la mayoria queda `disabled` (modulo
// todavia no migrado) para que el menu se vea completo y familiar sin
// enlazar a rutas que no existen. Ir habilitando a medida que cada
// modulo se construya.
export const adminNavItems: NavItem[] = [
  { label: 'Inicio', icon: 'pi pi-home', routeName: 'dashboard' },
  { label: 'Asistente IA', icon: 'pi pi-comments', disabled: true },
  { label: 'Vender', icon: 'pi pi-shopping-cart', routeName: 'sales.create' },
  { label: 'Cuentas abiertas', icon: 'pi pi-receipt', routeName: 'open-tabs.index', featureKey: 'open_tabs' },
  { label: 'Servicios', icon: 'pi pi-wrench', routeName: 'service-orders.index', featureKey: 'services' },
  { label: 'Agenda', icon: 'pi pi-calendar', routeName: 'appointments.index', featureKey: 'scheduling' },
  { label: 'Fiados', icon: 'pi pi-wallet', routeName: 'receivables.index', featureKey: 'receivables' },
  { label: 'Apartados', icon: 'pi pi-bookmark', routeName: 'layaways.index', featureKey: 'layaway' },
  { label: 'Comandera', icon: 'pi pi-list', routeName: 'kitchen.index', featureKey: 'kitchen_board' },
  { label: 'Catálogo', icon: 'pi pi-shop', routeName: 'catalog.index' },
  // Sin equivalente en admin.json del legacy a proposito: legacy tiene las
  // rutas/controlador de clientes (Admin\ClientsController) pero ningun
  // item de menu ni pantalla que enlace a ellas - el modulo era inalcanzable
  // salvo escribiendo la URL a mano. Se agrega aca como item real, no un
  // gap que se repite.
  { label: 'Clientes', icon: 'pi pi-users', routeName: 'clients.index', featureKey: 'clients' },
  { label: 'Turnos de caja', icon: 'pi pi-clock', routeName: 'cash-shifts.index', featureKey: 'cash_closing' },
  { label: 'Resumen del día', icon: 'pi pi-chart-bar', routeName: 'daily-summary.index' },
  { label: 'Gastos', icon: 'pi pi-money-bill', routeName: 'expenses.index', featureKey: 'expenses' },
  { label: 'Planificador', icon: 'pi pi-calendar-clock', routeName: 'reminders.index', featureKey: 'reminders' },
  { label: 'Descuentos', icon: 'pi pi-tag', routeName: 'discounts.index', featureKey: 'discounts' },
  { label: 'Reportes', icon: 'pi pi-chart-line', disabled: true },
  // Sin featureKey: gestionar el equipo (alta/baja/roles) no es un extra de
  // plan, solo la edicion granular de permisos lo es (feature
  // permissions_management, que UsersView.vue chequea aparte para mostrar o
  // no la accion "Permisos" por fila) - ver la nota en el meta requiresAdmin
  // de router/index.ts.
  { label: 'Usuarios', icon: 'pi pi-users', routeName: 'employees.index' },
  { label: 'Auditoría', icon: 'pi pi-history', routeName: 'audit-logs.index', featureKey: 'audit_logs' },
  { label: 'Ajustes', icon: 'pi pi-cog', routeName: 'business-settings.index' },
  { label: 'Mi suscripción', icon: 'pi pi-credit-card', routeName: 'subscription.index' },
  { label: 'Mi negocio', icon: 'pi pi-building', disabled: true },
]

// Menu de super admin portado 1:1 de pos-saas-legacy/resources/js/menu/superadmin.json
// (mismo orden, mismos labels) - mismo criterio que adminNavItems: la
// mayoria queda `disabled` hasta que ese modulo exista en el frontend
// nuevo. "Asistente IA" en el legacy es un item con 2 hijos (Uso y costos,
// Ajustes de IA) - NavItem no soporta anidamiento (ningun menu lo necesito
// hasta ahora), asi que quedan como dos items planos.
export const superadminNavItems: NavItem[] = [
  { label: 'Dashboard', icon: 'pi pi-th-large', disabled: true },
  { label: 'Negocios', icon: 'pi pi-building', routeName: 'superadmin.businesses.index' },
  { label: 'Finanzas', icon: 'pi pi-wallet', disabled: true },
  { label: 'Uso y costos IA', icon: 'pi pi-comments', disabled: true },
  { label: 'Ajustes de IA', icon: 'pi pi-comments', disabled: true },
  { label: 'Usuarios (plataforma)', icon: 'pi pi-users', disabled: true },
  { label: 'Auditoría', icon: 'pi pi-history', disabled: true },
  { label: 'Sistema', icon: 'pi pi-server', disabled: true },
  { label: 'Tickets soporte', icon: 'pi pi-ticket', disabled: true },
  { label: 'Guías ayuda', icon: 'pi pi-book', disabled: true },
  { label: 'Ajustes globales', icon: 'pi pi-cog', disabled: true },
  { label: 'Transacciones suscripción', icon: 'pi pi-receipt', disabled: true },
  { label: 'Comunicaciones', icon: 'pi pi-envelope', routeName: 'superadmin.communications.index' },
  // Sin equivalente en superadmin.json del legacy a proposito (igual que
  // 'Clientes' en adminNavItems): pantalla nueva de solo lectura sobre las
  // plantillas/flows de WhatsApp ya configurados en config/services.php.
  { label: 'Plantillas WhatsApp', icon: 'pi pi-file-edit', routeName: 'superadmin.whatsapp-templates.index' },
  // Idem: documentacion de solo lectura de que trae cada plan (Basico/Full)
  // y para que sirve cada bandera - sin equivalente en el legacy (ahi la
  // comparacion de planes solo vive en la landing publica, desconectada del
  // panel de superadmin).
  { label: 'Planes y Funciones', icon: 'pi pi-sitemap', routeName: 'superadmin.feature-catalog.index' },
  { label: 'Cron jobs', icon: 'pi pi-clock', disabled: true },
  { label: 'Workflows servicio', icon: 'pi pi-sitemap', routeName: 'superadmin.workflows.index' },
  // Idem: sin equivalente en el legacy - catalogo normalizado de medios de
  // pago del POS (ver docs/CUTOVER_TODO.md sobre la normalizacion pendiente).
  { label: 'Medios de pago', icon: 'pi pi-wallet', routeName: 'superadmin.pos-payment-methods.index' },
]
