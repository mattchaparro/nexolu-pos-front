<script setup lang="ts">
// Calcado de Components/AiChat/ConsejoDelDiaCard.vue del legacy: tip fijo y
// gratis sobre el Asistente de IA (sin llamada a IA), con el mismo robot.
// A diferencia de AiInsightCard/OnboardingWhatsAppCard, no depende del
// modulo de chat IA (todavia no migrado) - no llama a la API ni enlaza a
// ninguna pantalla, asi que se puede portar ya.
//
// El indice rota una vez al dia (dia del año % cantidad de consejos), asi
// que es estable durante el dia y cambia solo.
import aiRobot from '@/assets/ai-robot.png'

const CONSEJOS = [
  'Puedes hablarle al Asistente de fechas como "ayer", "esta semana" o "el mes pasado", sin escribir la fecha exacta.',
  'El Asistente recuerda la conversación: si preguntas por mayo, luego puedes decir "y quién vendió más" sin repetir el mes.',
  'Al final de cada respuesta el Asistente sugiere preguntas relacionadas. Tócalas para profundizar más rápido.',
  'El Asistente puede preparar un gasto o una entrada de inventario, pero nada se guarda hasta que tú confirmes la tarjeta.',
  'Puedes pedirle al Asistente que te cree un recordatorio: "recuérdame pagar a Postobón el 30".',
  '¿Cómo voy hoy? ¿Qué cambió esta semana? Pregúntaselo al Asistente para un resumen rápido sin entrar a reportes.',
  'Nunca escribe solo: puede preparar registros, pero nada queda guardado hasta que tú confirmes.',
]

const diaDelAnio = Math.floor(
  (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
)
const consejo = CONSEJOS[diaDelAnio % CONSEJOS.length]
</script>

<template>
  <div
    class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
  >
    <img :src="aiRobot" alt="Asistente de IA" class="h-10 w-10 shrink-0 object-contain" />
    <div class="min-w-0">
      <p class="mb-0.5 text-xs font-bold uppercase tracking-wide text-indigo-500">
        Consejo del día
      </p>
      <p class="text-sm leading-snug text-slate-700">{{ consejo }}</p>
    </div>
  </div>
</template>
