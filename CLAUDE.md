# nexolu-pos-front

SPA nueva del POS de Nexolú (Vue 3 + Vite). Consume exclusivamente
`nexolu-pos-api`. Sin Inertia, sin Blade, sin SSR. Reemplaza
gradualmente al frontend Inertia del monolito legacy (`pos-saas-legacy`
/ `pos.nexolu.co`), módulo por módulo.

## Alcance: solo la app autenticada

Este repo cubre exclusivamente lo que hay **después del login** (auth,
dashboard, sales, inventory, ...). El home/marketing público de
`pos.nexolu.co` (SEO, landing, contenido pre-login) queda **fuera de
alcance** a propósito: una SPA client-rendered es mala opción para
contenido que vive de indexación (los crawlers no ven HTML real hasta
que se ejecuta el JS). El marketing site sigue sirviéndose desde el
monolito legacy por ahora; si en el futuro se migra, evaluar SSR/SSG
aparte, no meterlo en esta SPA.

## Reglas del proyecto (inamovibles)

### Rutas del frontend en español

Todo `path` de Vue Router debe estar en **español** (`/iniciar-sesion`,
no `/login`) - mejora indexación SEO, legibilidad de URLs para el
usuario final, y es la convención que vamos a mantener en todo el
proyecto de acá en adelante.

Esto **no** aplica al `name` interno de la ruta ni a ningún otro
identificador de código (componentes, variables, stores, etc.) - esos
siguen en inglés, como cualquier otro identificador (ver convención de
"Language" más abajo). Ejemplo:

```ts
{
  path: '/iniciar-sesion',   // en español - esto es lo que ve el usuario/Google
  name: 'login',             // en ingles - esto es codigo
  component: () => import('@/modules/auth/views/LoginView.vue'),
}
```

### Language

Igual que en `nexolu-pos-api`: identificadores de código (componentes,
variables, funciones, stores, nombres de archivo) en **inglés**. Textos
visibles al usuario (labels, mensajes de validación, copy) en
**español**, siguiendo lo que ya usa el legacy salvo que se decida
mejorarlo explícitamente. Comentarios pueden ir en español.

### Evolución, no rediseño

El objetivo es que el usuario sienta que "todo sigue en el mismo lugar,
pero funciona más rápido" - no un rediseño visual completo. Antes de
cambiar el look de una pantalla, mirar cómo se ve HOY en
`pos.nexolu.co` (o el código fuente en `pos-saas-legacy`) y partir de
ahí. No asumir que "más sobrio" significa "sacar todo lo decorativo" -
confirmar con el usuario antes de simplificar algo que ya existe.

### Sistema de color

El legacy no tiene un estándar (botones de guardar en rojo, verde o
morado según la pantalla, sin criterio). El nuevo frontend restringe
deliberadamente qué colores se pueden usar y para qué - ver el
comentario en `src/style.css`:

| Color | Uso |
|---|---|
| `indigo` | Marca: acciones primarias, links, foco, degradados de marca |
| `slate` | Neutros: texto, bordes, fondos |
| `emerald` | Éxito / confirmación (nunca decorativo) |
| `red` | Destructivo (eliminar, cancelar algo irreversible) |
| `amber` | Advertencia |

Ningún otro color de Tailwind sin decidirlo explícitamente primero con
el usuario.

### Nexolú UI

Ninguna pantalla importa `primevue` directamente - todo pasa por
`src/ui` (`NxButton`, `NxInput`, `NxCard`, `NxFormField`, ...). Por
dentro pueden usar PrimeVue en modo `unstyled` (comportamiento/
accesibilidad, cero estilo visual propio); el estilo lo pone siempre
Tailwind desde el wrapper.

### Formularios: VeeValidate + Zod

`useForm({ validationSchema: toTypedSchema(zodSchema) })` de
vee-validate 4.15.1 + `@vee-validate/zod` 4.15.1 tiene un bug de
integración conocido: los mensajes personalizados de Zod se pierden y
vee-validate muestra un "Required" genérico en inglés (confirmado:
`toTypedSchema(schema).parse()` llamado directo SÍ devuelve el mensaje
correcto - el bug está en cómo `useForm` consume ese resultado
internamente). Mientras no se actualice/parchee esa integración, el
patrón a usar es: `useForm()` sin `validationSchema`, validar con
`zodSchema.safeParse(values)` dentro del handler de submit, y pasar los
mensajes a vee-validate con `setErrors()`. Ver
`src/modules/auth/views/LoginView.vue` para el ejemplo de referencia.

## Arquitectura

Ver `README.md` para la estructura de carpetas completa y el detalle
del stack (Vue 3, Vite, Vue Router, Pinia, Axios, TanStack Query,
Tailwind v4, PrimeVue unstyled, VeeValidate + Zod, VueUse).
