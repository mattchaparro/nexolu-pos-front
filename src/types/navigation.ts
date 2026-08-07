export interface NavItem {
  label: string
  icon: string
  routeName?: string
  /** true = todavia no existe el modulo en el frontend nuevo */
  disabled?: boolean
}
