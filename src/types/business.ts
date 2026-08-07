// Refleja BusinessResource (app/Http/Resources/Api/V1/BusinessResource.php)
// en nexolu-pos-api - mantener sincronizado si el endpoint cambia. Por ahora
// solo se tipan los campos que el frontend consume (el header del
// Dashboard); se amplia cuando exista el modulo de Ajustes/Mi negocio.
export interface Business {
  id: number
  name: string
}
