// Llamadas DIRECTAS a Wompi (nunca al Core ni a este backend) usando la
// public_key que devuelve `payment_init` - el numero de tarjeta y el
// celular de Nequi no deben tocar nuestros servidores. Ver
// docs/APP_INTEGRATION.md (repo nexolu-payments-core) seccion 2b/2d.

function wompiBaseUrl(publicKey: string): string {
  return publicKey.includes('_test_') ? 'https://sandbox.wompi.co/v1' : 'https://production.wompi.co/v1'
}

export interface CardInput {
  number: string
  cvc: string
  exp_month: string
  exp_year: string
  card_holder: string
}

export interface CardToken {
  id: string
  brand: string
  last_four: string
}

export async function tokenizeCard(publicKey: string, card: CardInput): Promise<CardToken> {
  const response = await fetch(`${wompiBaseUrl(publicKey)}/tokens/cards`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${publicKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(card),
  })
  const body = await response.json()
  if (!response.ok) {
    throw new Error(body?.error?.reason ?? 'No pudimos validar la tarjeta con Wompi.')
  }
  return { id: body.data.id, brand: body.data.brand, last_four: body.data.last_four }
}

export interface NequiToken {
  id: string
  status: string
}

export async function tokenizeNequi(publicKey: string, phoneNumber: string): Promise<NequiToken> {
  const response = await fetch(`${wompiBaseUrl(publicKey)}/tokens/nequi`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${publicKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: phoneNumber }),
  })
  const body = await response.json()
  if (!response.ok) {
    throw new Error(body?.error?.reason ?? 'No pudimos iniciar la suscripción de Nequi.')
  }
  return { id: body.data.id, status: body.data.status }
}

/**
 * El usuario tiene que aceptar un push notification en su app Nequi para
 * pasar de PENDING a APPROVED (una unica vez, no en cada cobro futuro) -
 * esto hace polling directo a Wompi (llave publica) hasta que eso pase.
 */
export async function fetchNequiTokenStatus(publicKey: string, tokenId: string): Promise<string> {
  const response = await fetch(`${wompiBaseUrl(publicKey)}/tokens/nequi/${tokenId}`, {
    headers: { Authorization: `Bearer ${publicKey}` },
  })
  const body = await response.json()
  return body?.data?.status ?? 'PENDING'
}
