import { useQuery } from '@tanstack/vue-query'
import { computed, onScopeDispose, ref } from 'vue'

import type { TerminalCharge } from '@/types/terminal'
import { extractErrorMessage } from '@/utils/extractErrorMessage'

import {
  cancelTerminalCharge,
  fetchTerminalCharge,
  fetchTerminals,
  startTerminalCharge,
} from '../services/terminalService'

/**
 * La espera del datáfono.
 *
 * No hay websockets en el stack, así que se consulta cada 2 segundos —
 * mismo criterio que la comandera. Y no hay tope de tiempo: si el aparato
 * está bloqueado, Bold encola el cobro y puede tardar. Quien corta es el
 * cajero, o el vencimiento del backend a los 30 minutos.
 */
const POLL_INTERVAL_MS = 2000

export function useTerminals(enabled = true) {
  return useQuery({
    queryKey: ['terminals'],
    queryFn: fetchTerminals,
    enabled,
    // Cambian poco: se sincronizan a mano desde Ajustes.
    staleTime: 5 * 60 * 1000,
  })
}

export function useTerminalCharge() {
  const charge = ref<TerminalCharge | null>(null)
  const errorMessage = ref<string | null>(null)
  const starting = ref(false)
  let timer: number | undefined

  const isWaiting = computed(() => charge.value?.status === 'pending')
  const isApproved = computed(() => charge.value?.status === 'approved')

  function stopPolling(): void {
    window.clearTimeout(timer)
    timer = undefined
  }

  // Si el modal se cierra a mitad de la espera, el timer tiene que morir con
  // él o queda consultando para siempre en segundo plano.
  onScopeDispose(stopPolling)

  function poll(reference: string): void {
    stopPolling()
    timer = window.setTimeout(async () => {
      try {
        charge.value = await fetchTerminalCharge(reference)
      } catch {
        // Un fallo de red puntual no debe abortar la espera: el cobro puede
        // estar aprobándose en este momento.
      }
      if (charge.value?.status === 'pending') {
        poll(reference)
      }
    }, POLL_INTERVAL_MS)
  }

  async function start(terminalId: number, amount: number): Promise<void> {
    errorMessage.value = null
    starting.value = true
    try {
      charge.value = await startTerminalCharge(terminalId, amount)
      poll(charge.value.reference)
    } catch (error) {
      errorMessage.value = extractErrorMessage(error, 'No pudimos iniciar el cobro en el datáfono.')
    } finally {
      starting.value = false
    }
  }

  async function cancel(): Promise<void> {
    stopPolling()
    const reference = charge.value?.reference
    charge.value = null
    if (reference) {
      try {
        await cancelTerminalCharge(reference)
      } catch {
        // Cancelar es del lado del POS: si falla, el cobro vence solo.
      }
    }
  }

  function reset(): void {
    stopPolling()
    charge.value = null
    errorMessage.value = null
  }

  return { charge, errorMessage, starting, isWaiting, isApproved, start, cancel, reset }
}
