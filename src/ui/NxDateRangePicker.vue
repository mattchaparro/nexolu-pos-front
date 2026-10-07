<script setup lang="ts">
// Un solo campo para filtrar por fechas: un clic elige un dia, un segundo
// clic lo vuelve rango. Reemplaza el par "Desde/Hasta", que obligaba a
// escribir la misma fecha dos veces para ver un solo dia.
import { computed, ref, useId, watch } from 'vue'
import PrimeDatePicker from 'primevue/datepicker'
import PrimeFloatLabel from 'primevue/floatlabel'

const props = withDefaults(
  defineProps<{
    /** ISO 'YYYY-MM-DD'; '' o null = sin filtro. */
    from?: string | null
    to?: string | null
    label?: string
    maxDate?: string | null
    /** Permite dejar el filtro vacio (listas que por defecto muestran todo). */
    clearable?: boolean
  }>(),
  { from: null, to: null, label: 'Fechas', maxDate: undefined, clearable: false },
)

const emit = defineEmits<{ 'update:from': [value: string]; 'update:to': [value: string] }>()

const inputId = useId()

function isoToDate(iso: string | null | undefined): Date | null {
  if (!iso) {
    return null
  }
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year!, month! - 1, day || 1)
}

function dateToIso(date: Date | null | undefined): string {
  if (!date) {
    return ''
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// El valor de PrimeVue vive aparte: tras el primer clic es [dia, null] y hay
// que dejarlo asi para que el segundo clic complete el rango, aunque hacia
// afuera ya se emitio "desde = hasta = ese dia".
const draft = ref<(Date | null)[] | null>(null)

function syncFromProps(): void {
  const start = isoToDate(props.from)
  if (!start) {
    draft.value = null
    return
  }
  const end = isoToDate(props.to)
  const current = draft.value
  const sameStart = dateToIso(current?.[0]) === props.from
  const currentEnd = dateToIso(current?.[1] ?? current?.[0])
  if (sameStart && currentEnd === (props.to || props.from)) {
    return
  }
  draft.value = end && dateToIso(end) !== props.from ? [start, end] : [start, null]
}

watch(() => [props.from, props.to], syncFromProps, { immediate: true })

function onUpdate(value: Date | Date[] | (Date | null)[] | null | undefined): void {
  const range = Array.isArray(value) ? value : null
  draft.value = range
  const start = dateToIso(range?.[0])
  emit('update:from', start)
  emit('update:to', range?.[1] ? dateToIso(range[1]) : start)
}

const maxDateValue = computed(() => isoToDate(props.maxDate) ?? undefined)
</script>

<template>
  <PrimeFloatLabel variant="on">
    <PrimeDatePicker
      :input-id="inputId"
      :model-value="draft"
      selection-mode="range"
      :manual-input="false"
      hide-on-range-selection
      date-format="dd/mm/yy"
      :max-date="maxDateValue"
      :show-clear="clearable"
      show-icon
      icon-display="input"
      fluid
      @update:model-value="onUpdate"
    />
    <label :for="inputId">{{ label }}</label>
  </PrimeFloatLabel>
</template>
