<script setup lang="ts">
import { computed, onBeforeUnmount, useId } from 'vue'
import PrimeFloatLabel from 'primevue/floatlabel'
import PrimeIconField from 'primevue/iconfield'
import PrimeInputIcon from 'primevue/inputicon'
import PrimeInputText from 'primevue/inputtext'
import PrimeMessage from 'primevue/message'

export type NxInputSize = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    type?: string
    // Label flotante (Float Label variante "on" de PrimeVue) - estandar
    // para todo campo de un formulario que pide un dato (nombre, telefono,
    // correo, etc.). Sin label queda como placeholder simple, para
    // buscadores/filtros que no son "un formulario" (ver ProductGrid).
    label?: string
    placeholder?: string
    disabled?: boolean
    invalid?: boolean
    /** Mensaje de error, se muestra debajo del campo y lo marca invalido. */
    error?: string
    required?: boolean
    size?: NxInputSize
    id?: string
    autocomplete?: string
    /** PrimeIcon (ej. "pi pi-search") a la izquierda del texto. */
    icon?: string
    /** Muestra una X a la derecha para vaciar el campo cuando tiene texto. */
    clearable?: boolean
    // Buscadores (Vender, Catalogo, etc): en movil, el teclado on-screen se
    // queda tapando media pantalla de resultados hasta que el usuario lo
    // cierra a mano. Con esto, el campo se auto-desenfoca solito un rato
    // despues de la ultima tecla - el teclado se guarda sin que el usuario
    // tenga que hacerlo. No usar en campos de formulario normales (nombre,
    // telefono, etc.) donde perder el foco a mitad de escritura seria
    // molesto - es opt-in a proposito, no el comportamiento por defecto.
    blurAfterTyping?: boolean
  }>(),
  {
    modelValue: '',
    type: 'text',
    label: undefined,
    placeholder: undefined,
    disabled: false,
    invalid: false,
    error: undefined,
    required: false,
    size: 'md',
    id: undefined,
    autocomplete: undefined,
    icon: undefined,
    clearable: false,
    blurAfterTyping: false,
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

let blurTimer: ReturnType<typeof window.setTimeout> | undefined
function handleUpdate(value: string): void {
  emit('update:modelValue', value)
  if (props.blurAfterTyping) {
    window.clearTimeout(blurTimer)
    blurTimer = window.setTimeout(() => {
      ;(document.activeElement as HTMLElement | null)?.blur()
    }, 1200)
  }
}
onBeforeUnmount(() => window.clearTimeout(blurTimer))

const generatedId = useId()
const inputId = computed(() => props.id ?? generatedId)

const showClear = computed(() => props.clearable && Boolean(props.modelValue))
const isInvalid = computed(() => props.invalid || Boolean(props.error))

// PrimeVue solo tiene "small"/"large" nativos - "md" es su tamaño por
// defecto (undefined).
const primeSize = computed<'small' | 'large' | undefined>(() => {
  if (props.size === 'sm') {
    return 'small'
  }
  if (props.size === 'lg') {
    return 'large'
  }
  return undefined
})

// font-size fijo en 16px pase lo que pase el size: por debajo de eso Safari
// en iOS hace zoom automatico al enfocar el input (ver nota historica en
// git blame), y el tema de Aura si varia el font-size por tamaño.
const fontSizeStyle = { fontSize: '16px' }

// Con label, el label flotante hace de placeholder (queda centrado hasta
// foco/valor) - pasar los dos a la vez deja el label "flotado" fijo desde
// el arranque (regla CSS :has(input[placeholder]) de FloatLabel).
//
// date/time/etc: el navegador dibuja sus propios segmentos (dd/mm/aaaa)
// dentro del input SIEMPRE, esten vacios o no - eso no es un placeholder
// que FloatLabel pueda detectar (no hay :placeholder-shown real, y sin
// valor el input no tiene la clase .p-filled), asi que sin esto el label
// se queda centrado en reposo tapando esos segmentos nativos ("dos campos
// superpuestos"). Forzar el atributo placeholder (aunque sea vacio) activa
// la regla :has(input[placeholder]) y deja el label flotado siempre.
const alwaysFloatingTypes = ['date', 'time', 'datetime-local', 'month', 'week']
const effectivePlaceholder = computed(() => {
  if (alwaysFloatingTypes.includes(props.type)) {
    return props.placeholder ?? ''
  }
  return props.label ? undefined : props.placeholder
})
</script>

<template>
  <div class="flex flex-col gap-1">
    <PrimeFloatLabel variant="on">
      <PrimeIconField v-if="icon || showClear">
        <PrimeInputIcon v-if="icon" :class="icon" />
        <PrimeInputText
          :id="inputId"
          :model-value="modelValue"
          :type="type"
          :placeholder="effectivePlaceholder"
          :disabled="disabled"
          :invalid="isInvalid"
          :autocomplete="autocomplete"
          :size="primeSize"
          :style="fontSizeStyle"
          fluid
          @update:model-value="(value) => handleUpdate(value as string)"
        />
        <PrimeInputIcon
          v-if="showClear"
          class="pi pi-times cursor-pointer"
          role="button"
          aria-label="Limpiar"
          @click="emit('update:modelValue', '')"
        />
      </PrimeIconField>
      <PrimeInputText
        v-else
        :id="inputId"
        :model-value="modelValue"
        :type="type"
        :placeholder="effectivePlaceholder"
        :disabled="disabled"
        :invalid="isInvalid"
        :autocomplete="autocomplete"
        :size="primeSize"
        :style="fontSizeStyle"
        fluid
        @update:model-value="(value) => handleUpdate(value as string)"
      />
      <label v-if="label" :for="inputId"
        >{{ label }}<span v-if="required" class="text-red-600"> *</span></label
      >
    </PrimeFloatLabel>
    <PrimeMessage v-if="error" severity="error" size="small" variant="simple">{{
      error
    }}</PrimeMessage>
  </div>
</template>
