import type { Business } from '@/types/business'

/**
 * Espejo (parcial) de Business::hasFeature() en nexolu-pos-api: null/array
 * vacio = todo habilitado (negocios antiguos sin JSON), clave presente =
 * su valor. La rama de "clave ausente pero hay plan" del backend no se
 * puede replicar aca (BusinessResource no expone los defaults del plan),
 * asi que una clave ausente con feature_flags no-vacio se asume habilitada
 * - el servidor sigue siendo la fuente de verdad real en cada endpoint
 * gateado por `feature:`, esto solo decide que UI mostrar.
 */
export function hasFeature(business: Business | undefined | null, feature: string): boolean {
  const flags = business?.feature_flags
  if (!flags || Object.keys(flags).length === 0) {
    return true
  }

  return feature in flags ? Boolean(flags[feature]) : true
}
