// Bienvenida del negocio recien migrado desde legacy (ver
// CheckBusinessMigrationStatus en pos-saas, que agrega ?bienvenida=1 al
// redirect final). Dos pasos separados a proposito:
//
// 1. stashPendingWelcomeFromUrl() - se llama una sola vez, sincronico, en
//    main.ts antes de que exista sesion/router - guarda la intencion en
//    localStorage porque el guard de /iniciar-sesion no preserva query
//    params (perderia el flag si esperaramos a estar autenticados).
// 2. useWelcomeExperience() - composable que consume ese flag ya
//    autenticado (ver AppLayout.vue), para mostrar el modal una sola vez.
import { ref } from 'vue'

const PENDING_KEY = 'nx_bienvenida_pendiente'
const SEEN_KEY = 'nx_bienvenida_vista'

export function stashPendingWelcomeFromUrl(): void {
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('bienvenida') === '1') {
      localStorage.setItem(PENDING_KEY, '1')
    }
  } catch {
    // localStorage puede fallar (modo privado) - sin bienvenida no rompe nada.
  }
}

export function useWelcomeExperience() {
  let pending = false
  let seen = false
  try {
    pending = localStorage.getItem(PENDING_KEY) === '1'
    seen = localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    // ver arriba
  }

  const showWelcome = ref(pending && !seen)

  function dismiss(): void {
    showWelcome.value = false
    try {
      localStorage.setItem(SEEN_KEY, '1')
      localStorage.removeItem(PENDING_KEY)
    } catch {
      // ver arriba
    }
  }

  return { showWelcome, dismiss }
}
