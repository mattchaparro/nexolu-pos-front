// Preguntas sugeridas del Asistente. Cada una fue probada contra el asistente
// real con datos (no son ejemplos decorativos): un boton que responde "no
// puedo" es peor que no tener boton.
//
// A proposito NO esta "cuanto vendi hoy": eso ya lo dice el Resumen del dia.
// Van las que necesitan cruzar datos y que nadie arma a mano: margenes,
// comparar meses, que reponer, quien debe.
//
// `permission`/`feature` son los mismos que exige la herramienta que la
// responde (App\Capabilities\* en nexolu-pos-api): sin ellos el asistente
// contestaria que no tiene acceso, asi que el boton ni se muestra.

export type SuggestionGroup = 'ganancias' | 'ventas' | 'inventario' | 'clientes' | 'registrar'

export interface AiSuggestion {
  text: string
  group: SuggestionGroup
  permission: string
  feature?: string
  /** 'draft': se escribe en el campo para completarlo (montos, nombres) en vez de enviarse. */
  mode?: 'ask' | 'draft'
}

export const SUGGESTION_GROUPS: Record<SuggestionGroup, { label: string; icon: string }> = {
  ganancias: { label: 'Ganancias', icon: 'pi pi-chart-line' },
  ventas: { label: 'Ventas', icon: 'pi pi-shopping-cart' },
  inventario: { label: 'Inventario', icon: 'pi pi-box' },
  clientes: { label: 'Clientes y plata', icon: 'pi pi-wallet' },
  registrar: { label: 'Registrar', icon: 'pi pi-pencil' },
}

export const AI_SUGGESTIONS: AiSuggestion[] = [
  { group: 'ganancias', text: '¿Cuáles son los productos que más ganancia me dejan?', permission: 'reports.inventory', feature: 'inventory' },
  { group: 'ganancias', text: '¿Qué productos me dejan menos margen?', permission: 'reports.inventory', feature: 'inventory' },
  {
    group: 'ganancias',
    text: 'Si un producto me cuesta $20.000, ¿a cuánto lo vendo para ganar el 35%?',
    permission: 'reports.inventory',
    feature: 'inventory',
    mode: 'draft',
  },
  { group: 'ventas', text: '¿Cómo voy este mes comparado con el mes pasado?', permission: 'reports.sales' },
  { group: 'ventas', text: '¿Cuáles fueron mis mejores días de venta este mes?', permission: 'reports.sales' },
  { group: 'ventas', text: '¿Qué productos casi no se venden?', permission: 'reports.sales', feature: 'inventory' },
  { group: 'ventas', text: '¿Quién de mi equipo vendió más este mes?', permission: 'reports.sales_by_seller' },
  { group: 'inventario', text: '¿Qué debo reponer esta semana?', permission: 'inventory.view', feature: 'inventory' },
  { group: 'inventario', text: '¿Qué productos están agotados?', permission: 'inventory.view' },
  { group: 'clientes', text: '¿Quiénes me deben plata y cuánto?', permission: 'receivables.manage', feature: 'receivables' },
  { group: 'clientes', text: '¿Quiénes son mis mejores clientes?', permission: 'clients.manage' },
  { group: 'clientes', text: '¿En qué se me fue la plata este mes?', permission: 'expenses.manage', feature: 'expenses' },
  { group: 'clientes', text: '¿Cuánto le debo a mis proveedores?', permission: 'purchases.manage', feature: 'inventory' },
  {
    group: 'registrar',
    text: 'Registra un gasto de $50.000 en arriendo',
    permission: 'expenses.create',
    feature: 'expenses',
    mode: 'draft',
  },
  {
    group: 'registrar',
    text: 'Crea el cliente Ana Ruiz, celular 3001234567',
    permission: 'clients.manage',
    feature: 'clients',
    mode: 'draft',
  },
]
