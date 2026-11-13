import type { User } from '@/types/auth'

export const DELIVERIES_PERMISSION = 'deliveries.handle'

/**
 * Empleado que SOLO hace domicilios: entra directo a Domicilios y su menú es
 * solo esa pantalla. Si además tiene otros permisos (cajero que también
 * lleva pedidos) usa el POS normal y ve Domicilios con su contador.
 */
export function isCourierOnly(user: User | null | undefined): boolean {
  if (!user || user.roles?.includes('admin') || user.roles?.includes('superadmin')) {
    return false
  }
  const permissions = user.permissions ?? []
  return permissions.length === 1 && permissions[0] === DELIVERIES_PERMISSION
}
