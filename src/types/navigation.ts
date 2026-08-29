export interface NavItem {
  label: string
  icon: string
  routeName?: string
  /** true = todavia no existe el modulo en el frontend nuevo */
  disabled?: boolean
  /**
   * Feature flag del negocio (ver App\Support\BusinessFeaturePresets en
   * nexolu-pos-api) del que depende este item - si el negocio no lo tiene
   * habilitado, useNavItems() lo saca del menu por completo (no solo
   * deshabilitado): un item grisado todavia sugiere "disponible pronto",
   * que es enganoso para un feature que el negocio ni siquiera tiene
   * contratado.
   */
  featureKey?: string
  /**
   * Contador que se pinta sobre el icono. Lo resuelve useNavItems() en
   * tiempo de ejecucion, no la lista estatica: un badge es un dato del
   * negocio, no parte de la definicion del menu.
   */
  badge?: number
}
