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
  { label: 'Cuentas abiertas', icon: 'pi pi-receipt', routeName: 'open-tabs.index' },
  { label: 'Servicios', icon: 'pi pi-wrench', disabled: true },
  { label: 'Agenda', icon: 'pi pi-calendar', disabled: true },
  { label: 'Fiados', icon: 'pi pi-wallet', disabled: true },
  { label: 'Apartados', icon: 'pi pi-bookmark', disabled: true },
  { label: 'Comandera', icon: 'pi pi-list', disabled: true },
  { label: 'Catálogo', icon: 'pi pi-shop', routeName: 'catalog.index' },
  { label: 'Turnos de caja', icon: 'pi pi-clock', disabled: true },
  { label: 'Resumen del día', icon: 'pi pi-chart-bar', disabled: true },
  { label: 'Gastos', icon: 'pi pi-money-bill', disabled: true },
  { label: 'Planificador', icon: 'pi pi-calendar-clock', disabled: true },
  { label: 'Descuentos', icon: 'pi pi-tag', disabled: true },
  { label: 'Reportes', icon: 'pi pi-chart-line', disabled: true },
  { label: 'Usuarios', icon: 'pi pi-users', disabled: true },
  { label: 'Auditoría', icon: 'pi pi-history', disabled: true },
  { label: 'Ajustes', icon: 'pi pi-cog', disabled: true },
  { label: 'Mi negocio', icon: 'pi pi-building', disabled: true },
]
