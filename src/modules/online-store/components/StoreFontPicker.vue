<script setup lang="ts">
// Elegir tipografía viendo cómo se ve, no leyendo un nombre.
//
// Las familias son las MISMAS que aplica la tienda
// (nexolu-store-front/src/composables/useTheme.ts). Si divergen, el
// comerciante elige una cosa y publica otra — por eso están copiadas
// literalmente y no aproximadas con fuentes del sistema.
import { onMounted } from 'vue'

const model = defineModel<string>({ required: true })

interface FontOption {
  value: string
  label: string
  hint: string
  heading: string
  body: string
  google: string
}

const FONTS: FontOption[] = [
  {
    value: 'moderna',
    label: 'Moderna',
    hint: 'Limpia y neutra. Sirve para casi todo.',
    heading: "'Inter', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    google: 'Inter:wght@400;600;800',
  },
  {
    value: 'editorial',
    label: 'Editorial',
    hint: 'Con carácter, tipo revista.',
    heading: "'Zilla Slab', Georgia, serif",
    body: "'Karla', system-ui, sans-serif",
    google: 'Zilla+Slab:wght@600;700|Karla:wght@400;600',
  },
  {
    value: 'calida',
    label: 'Cálida',
    hint: 'Amable y artesanal. Va bien con comida.',
    heading: "'Fraunces', Georgia, serif",
    body: "'Nunito Sans', system-ui, sans-serif",
    google: 'Fraunces:wght@600;700|Nunito+Sans:wght@400;600',
  },
  {
    value: 'tecnica',
    label: 'Técnica',
    hint: 'Geométrica y precisa.',
    heading: "'Space Grotesk', system-ui, sans-serif",
    body: "'IBM Plex Sans', system-ui, sans-serif",
    google: 'Space+Grotesk:wght@600;700|IBM+Plex+Sans:wght@400;500',
  },
]

// Se cargan las cuatro de una: son muestras que hay que poder comparar
// lado a lado, y pedirlas al elegir haría que la que se está mirando sea
// la única que todavía no se ve.
onMounted(() => {
  if (document.getElementById('nx-store-fonts')) {
    return
  }
  const link = document.createElement('link')
  link.id = 'nx-store-fonts'
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?${FONTS.map((f) => `family=${f.google}`).join('&')}&display=swap`
  document.head.appendChild(link)
})
</script>

<template>
  <div class="grid gap-2 sm:grid-cols-2">
    <button
      v-for="font in FONTS"
      :key="font.value"
      type="button"
      class="rounded-xl border-2 p-3 text-left transition"
      :class="
        model === font.value
          ? 'border-indigo-600 bg-indigo-50/50'
          : 'border-slate-200 hover:border-slate-300'
      "
      @click="model = font.value"
    >
      <span class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-700">{{ font.label }}</span>
        <i v-if="model === font.value" class="pi pi-check text-xs text-indigo-600" />
      </span>

      <!-- La muestra usa las familias de verdad: es el punto. -->
      <span class="mt-2 block text-lg leading-tight text-slate-900" :style="{ fontFamily: font.heading }">
        Café de finca
      </span>
      <span class="mt-0.5 block text-xs text-slate-500" :style="{ fontFamily: font.body }">
        Tostado en lotes pequeños, cerca de ti.
      </span>

      <span class="mt-2 block text-[11px] text-slate-400">{{ font.hint }}</span>
    </button>
  </div>
</template>
