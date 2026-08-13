// Refleja CommunicationController::index (nexolu-pos-api) - une email_logs
// y whatsapp_logs en una sola bitacora filtrable por canal/negocio.
export type CommunicationChannel = 'email' | 'whatsapp'

export interface CommunicationLogEntry {
  uid: string
  channel: CommunicationChannel
  business_id: number | null
  business_name: string | null
  type: string
  recipient: string
  subject: string | null
  status: 'sent' | 'failed'
  error: string | null
  created_at: string
}
