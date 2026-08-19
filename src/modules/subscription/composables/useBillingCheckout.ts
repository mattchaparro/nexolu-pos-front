import { ref } from 'vue'

import { useUpdateBillingProfile } from '@/composables/useBillingProfile'

/**
 * Estado + guardado de los datos de facturacion para un pago - usado por
 * TODOS los medios de pago (tarjeta, Nequi, PSE, Boton Bancolombia, fuente
 * guardada, widget de Wompi), nunca solo por algunos - ver
 * BillingDetailsFields.vue para el prefill y el modo resumen/formulario.
 * Cada modal de pago instancia su propia copia (no es un singleton
 * compartido): cada pago es su propia "sesion" de confirmacion, aunque el
 * dato de fondo (el billing profile del negocio) sea el mismo.
 */
export function useBillingCheckout() {
  const documentType = ref<'CC' | 'NIT' | 'CE'>('CC')
  const documentNumber = ref('')
  const fullName = ref('')
  const phone = ref('')
  const email = ref('')
  const address = ref('')
  const city = ref('')
  const valid = ref(false)

  const updateBillingProfileMutation = useUpdateBillingProfile()

  /** Fire-and-forget a proposito: nunca debe bloquear ni tumbar el pago en si. */
  function save(): void {
    updateBillingProfileMutation.mutate({
      document_type: documentType.value,
      document_number: documentNumber.value,
      full_name: fullName.value.trim(),
      phone: phone.value,
      email: email.value || undefined,
      address: address.value || undefined,
      city: city.value || undefined,
    })
  }

  return { documentType, documentNumber, fullName, phone, email, address, city, valid, save }
}
