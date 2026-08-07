# Estado del backend por módulo del menú

Antes de empezar un módulo nuevo del frontend, revisar esta tabla. Si dice
"Falta backend", ese trabajo se hace primero en `nexolu-pos-api` (y se tacha
acá) - no tiene sentido construir pantallas contra un endpoint que no existe.
Si dice "Listo", el backend ya tiene todo lo necesario y el trabajo pendiente
es solo frontend.

Fuente: `routes/api.php` de `nexolu-pos-api` (revisado 2026-08-07) +
`docs/MIGRATION_BACKLOG.md` de ese mismo repo, que es la fuente de verdad
para lo que falta del lado del backend.

| Módulo (menú) | Backend | Detalle |
|---|---|---|
| Inicio (Dashboard) | ✅ Listo | `GET /business`, `GET /dashboard/summary`. Implementado. |
| Asistente IA | ✅ Listo | `POST /ai/chat`, `/ai/drafts/{id}/confirm|discard`, `GET /insights`, `POST /insights/{tipo}/refresh`, `/ai/channels/whatsapp/*`. Ningún endpoint falta - lo que falta es el módulo de frontend (chat UI) en sí. |
| Vender | ✅ Listo | `sales` (index/show/store) + `POST /sales/{sale}/reverse`. |
| Cuentas abiertas | ✅ Listo | `tables`, `open-tabs` (+ items/partial-payments/close). |
| Servicios | ✅ Listo | `service-orders` (+ pay/cancel). |
| Agenda | ✅ Listo | `appointments` (+ reschedule/status). |
| Fiados | ✅ Listo | `receivables` (+ collect). |
| Apartados | ✅ Listo | `layaways` (+ payments/items/complete/cancel). |
| Comandera | ✅ Listo | `kitchen/tickets` (+ status). |
| Catálogo | ✅ Listo | `product-categories`, `products`, `ingredients`, `ingredient-stock-movements`. |
| Turnos de caja | ✅ Listo | `cash-shifts` (+ current/close), `cash-closings` (+ preview/undo). |
| Resumen del día | ❌ Falta backend | Legacy: `Admin/ReportsController@daily`. No existe controller de reportes en `nexolu-pos-api` - ver "Reportes de ventas/inventario/proveedores" en `MIGRATION_BACKLOG.md`. |
| Gastos | ✅ Listo | `expense-types`, `expenses`, `fixed-expense-templates` (+ register-now/toggle-reminder). |
| Planificador | ✅ Listo | Es el módulo de Recordatorios: `reminders` (+ complete/postpone). |
| Descuentos | ✅ Listo | `discounts`. |
| Reportes | ❌ Falta backend | Legacy: `Admin/ReportsController` (516 líneas: resumen diario, historial de ventas, ventas por vendedor, exports), `Admin/InventoryReportsController` (márgenes, valorización) y `Admin/SupplierReportsController` (historial de compras). Ninguno de los 3 existe en `nexolu-pos-api`. Las capabilities de IA cubren un subconjunto (sales summary/by-day) pero no hay endpoint de reporte dedicado ni exports. Ver `MIGRATION_BACKLOG.md`. |
| Usuarios | ✅ Listo | `employees` (+ permission-catalog/permissions/toggle). |
| Auditoría | ❌ Falta backend | Legacy tiene `Admin/AuditLogsController` (auditoría a nivel del negocio, para el propio admin). En `nexolu-pos-api` solo existe el equivalente de SuperAdmin (`Api/V1/SuperAdmin/AuditLogController`, para la plataforma) - no hay endpoint de auditoría scoped al negocio del usuario logueado. |
| Ajustes | ✅ Listo | `GET/PUT /settings`. |
| Mi negocio | ✅ Listo | `GET/PUT /business` (mismo endpoint que ya usa el header del Dashboard). |

## Pendientes ya identificados fuera del menú principal

- **Navbar (dropdown de perfil/ayuda + badge de turno de caja)**: backend
  listo (`/business`, `/subscription/status`, `support-tickets`,
  `cash-shifts/current`) - lo que falta es el primitivo `NxDropdown` y las
  pantallas de Perfil/Suscripción/Soporte en el frontend, no backend.
- **Tarjeta de insight IA / onboarding de WhatsApp (Dashboard)**: backend
  listo (`/insights`, `/ai/channels/whatsapp/*`) - bloqueadas porque ambas
  enlazan a la conversación del Asistente, que es el módulo "Asistente IA"
  de más arriba (frontend, no backend).

## Cómo mantener esto actualizado

Cuando se arranca un módulo nuevo del menú:
1. Buscarlo en esta tabla.
2. Si dice "Falta backend", ir primero a `nexolu-pos-api`, construir el
   endpoint (con sus tests, según las reglas de ese repo) y volver acá a
   marcarlo ✅.
3. Si dice "Listo", construir el frontend directamente.
4. Si al construir un módulo aparece un gap que esta tabla no había
   detectado, agregarlo acá en el momento (no esperar a otra revisión).
