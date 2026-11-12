<script setup lang="ts">
// Un extra opcional del producto (receta, combo, opciones...) plegado: la
// mayoría de productos no los usa, y abiertos todos a la vez convertían el
// formulario en una pared. Arranca abierto si ya tiene algo cargado.
import { ref, watch } from 'vue'

const props = defineProps<{
  title: string
  hint: string
  icon: string
  /** Ya tiene datos: se muestra abierto y con la marca "en uso". */
  inUse?: boolean
}>()

const open = ref(props.inUse === true)

// Al editar, los datos llegan después de montar: abrir entonces.
watch(
  () => props.inUse,
  (value) => {
    if (value) {
      open.value = true
    }
  },
)
</script>

<template>
  <div class="rounded-lg border border-slate-200">
    <button
      type="button"
      class="flex w-full items-center gap-3 px-3 py-3 text-left sm:px-4"
      :aria-expanded="open"
      @click="open = !open"
    >
      <i :class="icon" class="text-slate-400" />
      <span class="min-w-0 flex-1">
        <span class="flex items-center gap-2 text-sm font-semibold text-slate-700">
          {{ title }}
          <span
            v-if="inUse"
            class="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
          >
            En uso
          </span>
        </span>
        <span class="block text-xs text-slate-500">{{ hint }}</span>
      </span>
      <i
        class="pi pi-chevron-down text-xs text-slate-400 transition-transform"
        :class="{ 'rotate-180': open }"
      />
    </button>
    <div v-if="open" class="border-t border-slate-100 px-3 py-3 sm:px-4">
      <slot />
    </div>
  </div>
</template>
