<script setup lang="ts">
// La cola de "ponerse al dia": si el dueño se olvido de cerrar varios dias
// seguidos, en vez de un selector de fecha libre (donde es facil elegir mal)
// se los muestra en orden y lo guia a cerrarlos uno por uno, empezando por
// el mas antiguo - que es el unico que puede cerrar de una vez sin dejar un
// hueco en el historial (cash_closings_business_id_date_unique + el dueño
// necesita el mismo orden para que "base para el dia siguiente" encadene bien).
const props = defineProps<{ dates: string[]; selected: string }>()
const emit = defineEmits<{ select: [date: string] }>()

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}
</script>

<template>
  <div class="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
    <div class="flex items-center gap-2">
      <i class="pi pi-exclamation-triangle text-amber-600" />
      <p class="text-sm font-semibold text-amber-800">
        Tienes {{ props.dates.length }} {{ props.dates.length === 1 ? 'día' : 'días' }} sin cerrar
      </p>
    </div>
    <p class="text-xs text-amber-700">Ciérralos en orden, empezando por el más antiguo, para que la base del día siguiente encadene bien.</p>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="date in props.dates"
        :key="date"
        type="button"
        class="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
        :class="
          date === props.selected
            ? 'border-amber-600 bg-amber-600 text-white'
            : 'border-amber-300 bg-white text-amber-700 hover:bg-amber-100'
        "
        @click="emit('select', date)"
      >
        {{ formatDate(date) }}
      </button>
    </div>
  </div>
</template>
