# Nexolú POS - Frontend

SPA nueva del POS de Nexolú. Vue 3 + Vite, consume exclusivamente
`nexolu-pos-api` (Laravel API-first). Sin Inertia, sin Blade, sin SSR - el
backend solo sirve JSON.

Reemplaza gradualmente al frontend Inertia del monolito legacy
(`pos-saas-legacy`), modulo por modulo. Mientras dura la migracion, ambos
frontends conviven contra APIs distintas (legacy contra el monolito, este
contra `nexolu-pos-api`).

## Stack

Vue 3, Vite, Vue Router, Pinia, Axios, TanStack Query, Tailwind CSS v4,
PrimeVue (unstyled) + PrimeIcons, VeeValidate + Zod, VueUse.

## Arquitectura

### Modulos independientes

```
src/
  modules/        # auth, dashboard, sales, inventory, customers, expenses, cash, reports, settings...
    <modulo>/
      views/       # pantallas (rutas)
      components/  # componentes propios del modulo
      composables/ # logica reutilizable del modulo (useX)
      services/    # llamadas a la API de este modulo
  components/      # componentes compartidos entre modulos (no genericos de UI)
  layouts/         # AuthLayout, AppLayout
  router/          # definicion de rutas + guards
  services/
    http/          # cliente axios + manejo de token
    query/         # queryClient de TanStack Query
  stores/          # Pinia (estado verdaderamente global: auth, sesion)
  composables/     # composables compartidos entre modulos
  ui/              # Nexolu UI - ver abajo
  utils/
  types/           # tipos compartidos (reflejan los API Resources de Laravel)
```

Cada modulo es dueño de sus propias vistas, componentes, composables y
llamadas a la API. Pinia se reserva para estado realmente global (sesion);
el estado de servidor (listados, detalle, mutaciones) vive en TanStack
Query, no en stores.

### Nexolú UI

Ninguna pantalla importa `primevue` directamente. Todo pasa por `src/ui`
(`NxButton`, `NxInput`, `NxInputNumber`, `NxCard`, ...): por dentro usan
PrimeVue con un tema propio (Aura + indigo de marca, `src/theme/nexoluPreset.ts`),
pero cada wrapper decide que props expone y aporta el resto del estilo con
Tailwind. Esto desacopla la app de PrimeVue y nos da una identidad visual
propia y consistente.

Todo campo de un formulario (nombre, teléfono, correo, etc.) usa `NxInput`/
`NxInputNumber` con la prop `label` - Float Label variante "on" de PrimeVue
(el label flota sobre el borde al enfocar o llenar el campo), nunca un
`<label>` aparte ni un `placeholder` como sustituto de label. Los campos
de solo filtro/búsqueda (buscador de productos, de mesas) no son parte de
"un formulario" y se quedan con placeholder simple, sin label flotante.
`NxInputNumber` formatea todo monto en pesos colombianos (`es-CO`, sin
decimales) por defecto - usarlo para cualquier precio/abono/vuelto en vez
de un `<input type="number">` suelto.

### Sistema de color

El legacy no tenia un estandar de color - botones de "guardar" en rojo,
verde o morado segun la pantalla, sin ningun criterio. Para no repetir
eso, el nuevo frontend restringe deliberadamente que colores se pueden
usar y para que (ver comentario en `src/style.css`):

| Color | Uso |
|---|---|
| `indigo` | Marca: acciones primarias, links, foco |
| `slate` | Neutros: texto, bordes, fondos |
| `emerald` | Exito / confirmacion (nunca decorativo) |
| `red` | Destructivo (eliminar, cancelar algo irreversible) |
| `amber` | Advertencia |

Ningun otro color de Tailwind sin decidirlo explicitamente primero. Los
tokens salen del paquete de colores propio de Tailwind v4 (no se
redefinen valores hex a mano), asi que cualquier variante (`indigo-600`,
`slate-50`, etc.) esta disponible sin configuracion adicional.

### API

`src/services/http/client.ts` - instancia de axios con `VITE_API_BASE_URL`
como base, interceptor que agrega el Bearer token (Sanctum) y redirige a
`/login` en un 401. `src/stores/auth.store.ts` es la unica fuente de
verdad de la sesion.

### PrimeVue - licencia

PrimeVue v5 requiere una license key configurada; sin ella se ve un
watermark ("Invalid PrimeUI License") en desarrollo y produccion.
Pendiente: configurar `VITE_PRIMEVUE_LICENSE_KEY` (o el mecanismo que
indique la documentacion oficial) una vez se confirme donde vivira la key.

## Desarrollo

```bash
npm install
cp .env.example .env   # apuntar VITE_API_BASE_URL a nexolu-pos-api local
npm run dev
```

```bash
npm run type-check   # vue-tsc
npm run lint         # eslint --fix
npm run format       # prettier
npm run build         # type-check + build de produccion
```

## Estado de la migracion

- [x] Scaffold (Vite + stack completo + Tailwind/PrimeVue + Nexolu UI base)
- [x] Modulo Auth (login)
- [x] Modulo Dashboard (widgets base + consejo del dia; insight IA, onboarding
      de WhatsApp y atajos personalizables quedan para cuando existan sus
      modulos dependientes - ver `docs/BACKEND_READINESS.md`)
- [x] Modulo Vender (venta directa: carrito, descuentos, cargos, domicilio,
      cortesia, fiado, cobro en efectivo con vueltas). Cuentas
      abiertas/mesas quedan para su propio modulo - ver
      `docs/BACKEND_READINESS.md`.
- [x] Modulo Cuentas abiertas (mesas + cuentas por nombre, agregar/editar
      items, cobro con cortesia/cargos/abonos parciales/pago dividido)
- [ ] Resto de modulos: inventory, customers, expenses, cash, reports, settings

Antes de arrancar el siguiente modulo, revisar `docs/BACKEND_READINESS.md`:
lista, por item del menu, si el backend de `nexolu-pos-api` ya esta listo o
falta construirlo primero.
