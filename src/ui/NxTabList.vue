<script setup lang="ts">
// `wrap`: las pestañas envuelven a una segunda fila en vez de esconderse
// tras un scroll horizontal con flechitas. En un modal angosto (PaymentModal
// en un telefono: 4 pestañas), la ultima quedaba cortada y "Abonar" era
// invisible sin scrollear - reporte real de un negocio: "queda escondida y
// no queda claro que toca moverse para verla". Con wrap, todas las opciones
// se ven siempre.
//
// Opt-in y no default: pantallas con muchas pestañas (Ajustes tiene 9) estan
// pensadas para el scroll horizontal y envolverlas las volveria un bloque de
// tres filas.
//
// En modo wrap se oculta el activeBar (el subrayado animado): esta
// posicionado absoluto al fondo del contenedor, y con dos filas subrayaria
// la fila equivocada. La pestaña activa se sigue distinguiendo por el color
// de texto/icono que el tema ya le pone.
import PrimeTabList from 'primevue/tablist'

withDefaults(defineProps<{ wrap?: boolean }>(), { wrap: false })
</script>

<template>
  <PrimeTabList
    :pt="
      wrap
        ? {
            // .p-tablist-content ya es display:flex con overflow-x:auto y
            // las pestañas son sus hijos directos (verificado en
            // @primeuix/styles/tabs) - alcanza con permitirle envolver.
            content: { class: 'flex-wrap !overflow-visible' },
            activeBar: { class: '!hidden' },
          }
        : undefined
    "
  >
    <slot />
  </PrimeTabList>
</template>
