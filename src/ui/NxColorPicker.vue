<script setup lang="ts">
// Selector de color: muestra + rueda de PrimeVue + el hexadecimal escrito.
//
// Los tres van juntos a proposito. La rueda es para explorar, el hex es para
// pegar el color exacto de una marca (que es como llega casi siempre: "mi
// color es #C8102E"), y la muestra es para ver el resultado sin abrir nada.
//
// El modelo es SIEMPRE '#rrggbb'. PrimeVue trabaja sin '#', asi que la
// conversion vive aca y no la repite cada pantalla.
import PrimeColorPicker from 'primevue/colorpicker'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  modelValue: string
  label?: string
  /** Colores sugeridos, para que el comerciante no arranque de cero. */
  swatches?: string[]
  disabled?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const HEX = /^#[0-9a-fA-F]{6}$/

/** Lo que se escribe en el campo de texto, que puede estar a medio teclear. */
const typed = ref(props.modelValue)

watch(
  () => props.modelValue,
  (value) => {
    // No se pisa lo que el usuario esta escribiendo si ya coincide.
    if (value.toLowerCase() !== typed.value.toLowerCase()) {
      typed.value = value
    }
  },
)

const wheel = computed({
  get: () => props.modelValue.replace('#', ''),
  set: (value: string) => commit(`#${value.replace('#', '')}`),
})

function commit(value: string): void {
  if (HEX.test(value)) {
    emit('update:modelValue', value.toLowerCase())
  }
}

/**
 * Se emite solo cuando el hexadecimal esta completo: emitir a media escritura
 * mandaria '#4f4' al tema y la vista previa parpadearia con colores basura.
 */
function onTyped(value: string): void {
  const normalized = value.startsWith('#') ? value : `#${value}`
  typed.value = normalized
  commit(normalized)
}

const isValid = computed(() => HEX.test(typed.value))
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" class="text-xs font-semibold text-slate-600">{{ label }}</label>

    <div class="flex items-center gap-2">
      <PrimeColorPicker v-model="wheel" :disabled="disabled" format="hex" />

      <input
        :value="typed"
        type="text"
        maxlength="7"
        spellcheck="false"
        class="w-28 rounded-lg border px-2.5 py-1.5 font-mono text-sm uppercase outline-none focus:border-indigo-500"
        :class="isValid ? 'border-slate-200 text-slate-700' : 'border-red-300 text-red-600'"
        :disabled="disabled"
        @input="onTyped(($event.target as HTMLInputElement).value)"
      />

      <span
        class="h-8 w-8 shrink-0 rounded-lg border border-slate-200"
        :style="{ backgroundColor: isValid ? typed : 'transparent' }"
        aria-hidden="true"
      />
    </div>

    <div v-if="swatches?.length" class="flex flex-wrap gap-1.5">
      <button
        v-for="swatch in swatches"
        :key="swatch"
        type="button"
        class="h-6 w-6 rounded-md border transition hover:scale-110"
        :class="
          swatch.toLowerCase() === modelValue.toLowerCase()
            ? 'border-slate-900 ring-2 ring-slate-900/20'
            : 'border-slate-200'
        "
        :style="{ backgroundColor: swatch }"
        :title="swatch"
        :disabled="disabled"
        @click="commit(swatch)"
      />
    </div>
  </div>
</template>
