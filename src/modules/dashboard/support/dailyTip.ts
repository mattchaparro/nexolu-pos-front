// Consejo del día sobre el Asistente de IA (sin llamada a IA). Antes era una
// tarjeta aparte en Inicio, debajo del resumen inteligente; ahora es una línea
// al pie de esa misma tarjeta. Rota una vez al día (día del año % cantidad).
const TIPS = [
  'Puedes hablarle al Asistente de fechas como "ayer", "esta semana" o "el mes pasado", sin escribir la fecha exacta.',
  'El Asistente recuerda la conversación: si preguntas por mayo, luego puedes decir "y quién vendió más" sin repetir el mes.',
  'Al final de cada respuesta el Asistente sugiere preguntas relacionadas. Tócalas para profundizar más rápido.',
  'El Asistente puede preparar un gasto o una entrada de inventario, pero nada se guarda hasta que tú confirmes la tarjeta.',
  'Puedes pedirle al Asistente que te cree un recordatorio: "recuérdame pagar a Postobón el 30".',
  '¿Cómo voy hoy? ¿Qué cambió esta semana? Pregúntaselo al Asistente para un resumen rápido sin entrar a reportes.',
  'Nunca escribe solo: puede preparar registros, pero nada queda guardado hasta que tú confirmes.',
]

export function dailyTip(now: Date = new Date()): string {
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
  return TIPS[dayOfYear % TIPS.length]!
}
