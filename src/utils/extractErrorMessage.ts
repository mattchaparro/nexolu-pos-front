/** Primer mensaje de error util de una respuesta de axios (422 de validacion o message generico). */
export function extractErrorMessage(error: unknown, fallback: string): string {
  const response = (
    error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
  ).response
  const firstFieldError = response?.data?.errors
    ? Object.values(response.data.errors)[0]?.[0]
    : undefined
  return firstFieldError ?? response?.data?.message ?? fallback
}
