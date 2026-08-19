// Badges de marca por medio de pago (assets estaticos en src/assets/payment-methods)
// en vez de un icono generico de PrimeIcons - asi el usuario reconoce Nequi/PSE/
// Bancolombia de un vistazo, igual que en cualquier checkout. CARD no tiene una
// sola marca (Wompi acepta Visa/Mastercard/etc.), asi que usa un icono de tarjeta
// generico con los colores de Nexolu en vez de imitar el logo de una franquicia.
import bancolombiaIcon from '@/assets/payment-methods/bancolombia.svg'
import cardIcon from '@/assets/payment-methods/card.svg'
import nequiIcon from '@/assets/payment-methods/nequi.svg'
import pseIcon from '@/assets/payment-methods/pse.svg'

export type PaymentMethodImageType = 'CARD' | 'NEQUI' | 'PSE' | 'BANCOLOMBIA_TRANSFER'

const PAYMENT_METHOD_IMAGES: Record<PaymentMethodImageType, string> = {
  CARD: cardIcon,
  NEQUI: nequiIcon,
  PSE: pseIcon,
  BANCOLOMBIA_TRANSFER: bancolombiaIcon,
}

export function paymentMethodImage(type: string): string | undefined {
  return PAYMENT_METHOD_IMAGES[type as PaymentMethodImageType]
}
