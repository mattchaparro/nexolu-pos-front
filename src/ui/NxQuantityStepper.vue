<script setup lang="ts">
// Stepper de cantidad (- N +) compartido por los tres carritos del POS
// (venta directa, items nuevos de una cuenta, items ya guardados). Antes
// cada uno lo dibujaba a mano y habian quedado distintos - en uno el +/-
// terminaba abajo a la izquierda y en otro a la derecha. Un solo componente
// garantiza que se vean y se toquen igual en todos lados.
//
// Emite INTENCION (decrement/increment), no un valor nuevo: cada carrito
// hace algo distinto al tocar +/- (uno edita un borrador local, otro emite
// update:quantity con el numero calculado), asi que quien manda el cambio
// es el padre. El stepper solo dice "el cajero quiere uno mas / uno menos".
//
// select-none + touch-manipulation: tocar +/- rapido cuenta como doble tap,
// y el navegador respondia seleccionando la cifra de al lado y abriendo
// "Buscar en Google" encima del carrito. touch-manipulation ademas quita el
// retardo de ~300ms de espera por doble-tap-para-zoom: responde mas rapido.
defineProps<{
  quantity: number
  disableDecrement?: boolean
  disableIncrement?: boolean
}>()

const emit = defineEmits<{
  decrement: []
  increment: []
}>()
</script>

<template>
  <div class="inline-flex select-none touch-manipulation items-center gap-1.5">
    <button
      type="button"
      class="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40"
      :disabled="disableDecrement"
      @click="emit('decrement')"
    >
      <i class="pi pi-minus text-xs" />
    </button>
    <span class="w-6 text-center text-sm font-semibold text-slate-900">{{ quantity }}</span>
    <button
      type="button"
      class="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40"
      :disabled="disableIncrement"
      @click="emit('increment')"
    >
      <i class="pi pi-plus text-xs" />
    </button>
  </div>
</template>
